import { DatLib } from '@/lib/dat-lib';
import { CombatRuntime } from '@/combat';
import { BaseGoods, GoodsEquipment } from '@/goods';
import { CharacterState, Direction, Player } from '@/characters';
import type { StatusSlot } from '@/characters';
import { GoodsBag } from '@/goods/goods-bag';
import { Surface } from '@/rendering/surface';
import type { PixelBuffer } from '@/rendering/pixel-buffer';
import type { EngineHost } from '@/runtime/engine-host';
import { MainSceneRuntime, type MainSceneRuntimeSnapshot } from '@/screens/main-game/runtime';
import { ScriptVm } from '@/script/script-vm';
import { KeyCode } from '@/shared/key-code';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { ScreenMainGame } from '@/screens/main-game/screen';
import { ScreenAnimation } from '@/screens/animation/screen';
import { ScreenMenu } from '@/screens/menu/screen';
import { ScreenStack } from '@/screens/screen-stack';
import { ScreenViewType } from '@/screens/screen-view-type';
import {
  cloneGameState,
  createInitialGameState,
  SCRIPT_LOCAL_VARIABLE_END,
  SCRIPT_LOCAL_VARIABLE_START,
  SCRIPT_VARIABLE_COUNT,
  type GameState,
} from './game-state';
import type { DamageFormula, GameEngineOptions } from './game-engine-options';
import {
  createSavePayload,
  CORRUPT_SAVE_MESSAGE,
  decodeSavePayload,
  encodeSavePayload,
  SAVE_SLOT_COUNT,
  toLoadedGameState,
  type SaveGamePayload,
  type SavePlayerState,
  type SaveResourceRef,
  type SaveSlotSummary,
} from './save-game';

export class Game {
  readonly datLib: DatLib;
  readonly combat = new CombatRuntime(this);
  readonly scriptVm = new ScriptVm(this);
  state: GameState = createInitialGameState();
  mainScene: ScreenMainGame | null = null;
  mainSceneRuntime: MainSceneRuntime | null = null;
  private readonly boxEventMap = new Map<string, number>();
  private pendingBoxEventKey: string | null = null;
  private readonly surface = new Surface(SCREEN_WIDTH, SCREEN_HEIGHT);
  readonly screenStack = new ScreenStack();
  private readonly host: EngineHost;
  readonly engineOptions: GameEngineOptions;

  constructor(host: EngineHost, datLibBuffer: Uint8Array, engineOptions: GameEngineOptions = {}) {
    this.host = host;
    this.engineOptions = engineOptions;
    this.state = this.createInitialState();
    this.datLib = new DatLib(datLibBuffer);
  }

  get frameBuffer(): PixelBuffer {
    return this.surface.buffer;
  }

  get bag(): GoodsBag {
    return new GoodsBag(this.state.goods, this.datLib);
  }

  get damageFormula(): DamageFormula {
    return this.state.useOriginalDamageFormula ? 'original' : 'simplified';
  }

  getStateSnapshot(): GameState {
    return cloneGameState(this.state);
  }

  getSaveSlotSummary(slot: number): SaveSlotSummary | null {
    return this.readSavePayload(slot)?.summary ?? null;
  }

  saveSlot(slot: number): SaveSlotSummary {
    this.assertSaveSlot(slot);
    this.assertCanSaveGame();
    const runtimeSnapshot = this.mainSceneRuntime?.createSnapshot() ?? null;
    if (!runtimeSnapshot) throw new Error('主场景不存在，无法存档');
    const payload = createSavePayload(this.state, slot, runtimeSnapshot);
    this.host.saveStore.write(slot, encodeSavePayload(payload));
    return payload.summary;
  }

  loadSlot(slot: number): boolean {
    const payload = this.readSavePayload(slot);
    if (!payload) return false;
    try {
      this.applyLoadedState(toLoadedGameState(payload), payload.state.players ?? [], payload.state.mainScene ?? null);
    } catch {
      throw new Error(CORRUPT_SAVE_MESSAGE);
    }
    return true;
  }

  start(): void {
    this.mainScene = null;
    this.mainSceneRuntime = null;
    this.combat.reset();
    this.screenStack.replaceAll(new ScreenAnimation(this, ScreenViewType.SCREEN_DEV_LOGO));
    this.draw();
  }

  update(delta: number): void {
    this.screenStack.update(delta);
  }

  draw(): void {
    this.screenStack.draw(this.surface);
  }

  onKey(key: KeyCode): void {
    this.screenStack.dispatchKey(key);
  }

  startNewGame(): void {
    this.boxEventMap.clear();
    this.pendingBoxEventKey = null;
    this.combat.reset();
    this.state = this.createInitialState();
    this.replaceWithMainScene();
    this.mainSceneRuntime?.startChapter(1 /* 开场章节类型。 */, 1 /* 开场章节索引。 */);
  }

  returnToMenu(): void {
    this.mainScene = null;
    this.mainSceneRuntime = null;
    this.screenStack.replaceAll(new ScreenMenu(this));
  }

  requestExit(): void {
    this.host.requestExit?.();
  }

  private createInitialState(): GameState {
    const state = createInitialGameState();
    state.useOriginalDamageFormula = this.engineOptions.damageFormula !== 'simplified';
    if (this.engineOptions.allowFightMiss != null) state.allowFightMiss = this.engineOptions.allowFightMiss;
    return state;
  }

  applyLoadedState(
    state: GameState,
    playerSnapshots: readonly SavePlayerState[] = [],
    runtimeSnapshot: MainSceneRuntimeSnapshot | null = null
  ): void {
    this.boxEventMap.clear();
    this.pendingBoxEventKey = null;
    this.combat.reset();
    this.state = {
      ...createInitialGameState(),
      ...state,
      eventFlags: [...state.eventFlags],
      scriptVariables: [...(state.scriptVariables ?? [])],
      collectedBoxKeys: [...state.collectedBoxKeys],
      players: [...(state.players ?? [])],
      partyActorIds: [...(state.partyActorIds ?? [])],
      controlActorId: state.controlActorId ?? 0,
      goods: state.goods.map(g => ({ ...g })),
      disableSave: false,
    };
    this.ensureScriptVariableSize();
    this.restorePlayerSnapshots(playerSnapshots);
    this.replaceWithMainScene();
    if (runtimeSnapshot) {
      this.mainSceneRuntime?.restoreSnapshot(runtimeSnapshot);
    } else {
      this.mainSceneRuntime?.startChapter(this.state.scriptType, this.state.scriptIndex);
    }
    this.state.sceneName = state.sceneName;
  }

  gainGoods(type: number, index: number, count = 1): BaseGoods | null {
    const goods = this.bag.addGoods(type, index, count);
    if (goods) {
      this.mainScene?.showTip(`获得:${goods.name}`);
    }
    return goods;
  }

  consumeGoods(type: number, index: number, count: number): boolean {
    return this.bag.consumeGoods(type, index, count);
  }

  getGoodsCount(type: number, index: number): number {
    return this.bag.getGoodsCount(type, index);
  }

  gainMoney(value: number): void {
    this.state.money += value;
    this.mainScene?.showTip(`获得金钱:${value}`);
  }

  setMoney(value: number): void {
    this.state.money = value;
  }

  useMoney(value: number): void {
    this.state.money -= value;
  }

  getPlayer(actorId: number): Player | null {
    const player = this.state.players.find(item => item.index === actorId);
    if (player) return player;

    const res = this.datLib.getPlayer(actorId);
    if (!res) return null;
    this.state.players.push(res);
    return res;
  }

  getControlPlayer(): Player | null {
    return this.state.controlActorId > 0 ? this.getPlayer(this.state.controlActorId) : null;
  }

  addActor(actorId: number): Player | null {
    if (actorId <= 0) return null;
    const player = this.getPlayer(actorId);
    if (!player) return null;
    // Kotlin 版 CREATEACTOR 只从 playerList 去重后追加，控制角色始终是队首。
    this.state.partyActorIds = this.state.partyActorIds.filter(id => id !== actorId);
    this.state.partyActorIds.push(actorId);
    this.state.controlActorId = this.state.partyActorIds[0] ?? 0;
    return player;
  }

  deleteActor(actorId: number): void {
    this.state.partyActorIds = this.state.partyActorIds.filter(id => id !== actorId);
    this.state.controlActorId = this.state.partyActorIds[0] ?? 0;
  }

  setControlPlayer(actorId: number): Player | null {
    if (!this.state.partyActorIds.includes(actorId)) return null;
    const player = this.getPlayer(actorId);
    if (!player) return null;
    this.state.partyActorIds = [actorId, ...this.state.partyActorIds.filter(id => id !== actorId)];
    this.state.controlActorId = actorId;
    return player;
  }

  playMusic(type: number, index: number): void {
    this.host.audio.playMusic(`${type}:${index}`);
  }

  hasEvent(eventId: number): boolean {
    return this.state.eventFlags.includes(eventId);
  }

  setEvent(eventId: number): void {
    if (this.hasEvent(eventId)) return;
    this.state.eventFlags.push(eventId);
  }

  clearEvent(eventId: number): void {
    this.state.eventFlags = this.state.eventFlags.filter(id => id !== eventId);
  }

  setSaveDisabled(disabled: boolean): void {
    this.state.disableSave = disabled;
  }

  getSaveBlockedMessage(): string | null {
    if (this.state.disableSave) return '当前不能存档';
    if (!this.mainSceneRuntime) return '主场景不存在，无法存档';
    return this.mainSceneRuntime.getSaveBlockedMessage();
  }

  getVariable(index: number): number {
    return this.state.scriptVariables[index] ?? 0;
  }

  setVariable(index: number, value: number): void {
    if (!this.isValidVariableIndex(index)) return;
    this.state.scriptVariables[index] = value;
  }

  addVariable(index: number, value: number): void {
    if (!this.isValidVariableIndex(index)) return;
    this.state.scriptVariables[index] = (this.state.scriptVariables[index] ?? 0) + value;
  }

  subVariable(index: number, value: number): void {
    if (!this.isValidVariableIndex(index)) return;
    this.state.scriptVariables[index] = (this.state.scriptVariables[index] ?? 0) - value;
  }

  resetLocalVariables(): void {
    for (let index = SCRIPT_LOCAL_VARIABLE_START; index < SCRIPT_LOCAL_VARIABLE_END; index += 1) {
      this.state.scriptVariables[index] = 0;
    }
  }

  rememberBoxEvent(boxKey: string, eventId: number): void {
    if (this.boxEventMap.has(boxKey)) return;
    this.boxEventMap.set(boxKey, eventId);
  }

  isBoxCollected(boxKey: string): boolean {
    if (this.state.collectedBoxKeys.includes(boxKey)) return true;
    const eventId = this.boxEventMap.get(boxKey);
    return eventId != null && this.hasEvent(eventId);
  }

  markBoxCollected(boxKey: string): void {
    if (this.state.collectedBoxKeys.includes(boxKey)) return;
    this.state.collectedBoxKeys.push(boxKey);
  }

  setPendingBoxEvent(boxKey: string | null): void {
    this.pendingBoxEventKey = boxKey;
  }

  consumePendingBoxEvent(): string | null {
    const boxKey = this.pendingBoxEventKey;
    this.pendingBoxEventKey = null;
    return boxKey;
  }

  clearPendingBoxEvent(): void {
    this.pendingBoxEventKey = null;
  }

  private replaceWithMainScene(): void {
    this.mainSceneRuntime = new MainSceneRuntime(this);
    this.mainScene = new ScreenMainGame(this, this.mainSceneRuntime);
    this.screenStack.replaceAll(this.mainScene);
  }

  private ensureScriptVariableSize(): void {
    while (this.state.scriptVariables.length < SCRIPT_VARIABLE_COUNT) {
      this.state.scriptVariables.push(0);
    }
    this.state.scriptVariables = this.state.scriptVariables.slice(0, SCRIPT_VARIABLE_COUNT);
  }

  private isValidVariableIndex(index: number): boolean {
    return index >= 0 && index < SCRIPT_VARIABLE_COUNT;
  }

  private readSavePayload(slot: number): SaveGamePayload | null {
    this.assertSaveSlot(slot);
    try {
      const data = this.host.saveStore.read(slot);
      if (!data) return null;
      return decodeSavePayload(data);
    } catch {
      throw new Error(CORRUPT_SAVE_MESSAGE);
    }
  }

  private assertSaveSlot(slot: number): void {
    if (!Number.isInteger(slot) || slot < 0 || slot >= SAVE_SLOT_COUNT) {
      throw new Error(`存档槽位非法: ${slot}`);
    }
  }

  private assertCanSaveGame(): void {
    const blockedMessage = this.getSaveBlockedMessage();
    if (blockedMessage) throw new Error(blockedMessage);
  }

  private restorePlayerSnapshots(snapshots: readonly SavePlayerState[]): void {
    for (const snapshot of snapshots) {
      const player = this.getPlayer(snapshot.index);
      if (!player) throw new Error(`读档角色资源不存在: ${snapshot.index}`);
      this.restorePlayerSnapshot(player, snapshot);
    }
  }

  private restorePlayerSnapshot(player: Player, snapshot: SavePlayerState): void {
    player.state = restoreSavedCharacterState(snapshot.state, player.state);
    player.direction = restoreSavedDirection(snapshot.direction, player.direction);
    player.step = snapshot.step ?? player.step;
    player.mapX = snapshot.mapX ?? player.mapX;
    player.mapY = snapshot.mapY ?? player.mapY;
    player.level = snapshot.level;
    player.learnedMagicCount = snapshot.learnedMagicCount;
    if (player.magicChain) player.magicChain.learnedMagicCount = snapshot.magicChainLearnedMagicCount;
    player.hpMax = snapshot.hpMax;
    player.hp = snapshot.hp;
    player.mpMax = snapshot.mpMax;
    player.mp = snapshot.mp;
    player.attack = snapshot.attack;
    player.defense = snapshot.defense;
    player.agility = snapshot.agility;
    player.spirit = snapshot.spirit;
    player.luck = snapshot.luck;
    player.exp = snapshot.exp;
    player.restoreOnHitEffectConfig(snapshot.onHitEffectFlags, snapshot.onHitEffectRounds);
    player.coopMagicIndex = snapshot.coopMagicIndex;
    player.hpPerRound = snapshot.hpPerRound;
    player.mpPerRound = snapshot.mpPerRound;
    this.restorePlayerEquipment(player, snapshot.equipment);
    player.restorePrivateLearnedMagics(snapshot.privateMagics.map(ref => this.getSaveMagic(ref)));
    restoreStatusSlots(player.immuneStatuses.slots, snapshot.immuneStatuses);
    restoreStatusSlots(player.activeStatuses.slots, snapshot.activeStatuses);
  }

  private restorePlayerEquipment(player: Player, equipmentRefs: readonly (SaveResourceRef | null)[]): void {
    for (let i = 0; i < player.equipment.length; i += 1) {
      const ref = equipmentRefs[i] ?? null;
      player.equipment[i] = ref ? this.getSaveEquipment(ref) : null;
    }
  }

  private getSaveEquipment(ref: SaveResourceRef): GoodsEquipment {
    const goods = this.datLib.getEquipment(ref.type, ref.index);
    if (!goods) throw new Error(`读档装备资源不存在: GRS ${ref.type}-${ref.index}`);
    return goods;
  }

  private getSaveMagic(ref: SaveResourceRef) {
    const magic = this.datLib.getMagic(ref.type, ref.index);
    if (!magic) throw new Error(`读档魔法资源不存在: MRS ${ref.type}-${ref.index}`);
    return magic;
  }
}

function restoreStatusSlots(target: StatusSlot[], source: readonly StatusSlot[]): void {
  for (let i = 0; i < target.length; i += 1) {
    const slot = target[i];
    const saved = source[i];
    if (!slot) continue;
    slot.value = saved?.value ?? 0;
    slot.round = saved?.round ?? 0;
  }
}

function restoreSavedCharacterState(value: number | undefined, fallback: Player['state']): Player['state'] {
  switch (value) {
    case CharacterState.Stop:
    case CharacterState.ForceMove:
    case CharacterState.Walking:
    case CharacterState.Pause:
    case CharacterState.Active:
      return value;
    default:
      return fallback;
  }
}

function restoreSavedDirection(value: number | undefined, fallback: Player['direction']): Player['direction'] {
  switch (value) {
    case Direction.North:
    case Direction.East:
    case Direction.South:
    case Direction.West:
      return value;
    default:
      return fallback;
  }
}
