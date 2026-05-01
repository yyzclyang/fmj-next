import { DatLib } from '@/lib/dat-lib';
import { CombatRuntime } from '@/combat';
import { BaseGoods, GoodsEquipment } from '@/goods';
import { Player } from '@/characters';
import type { BuffState } from '@/characters';
import { GoodsBag } from '@/goods/goods-bag';
import { Surface } from '@/rendering/surface';
import { type FrameBuffer, FRAME_HEIGHT, FRAME_WIDTH } from '@/rendering/frame-buffer';
import type { EngineHost } from '@/runtime/engine-host';
import { MainSceneRuntime, type MainSceneRuntimeSnapshot } from '@/screens/main-game/runtime';
import { ScriptVm } from '@/script/script-vm';
import { KeyCode } from '@/shared/key-code';
import { ScreenMainGame } from '@/screens/main-game/screen';
import { ScreenAnimation } from '@/screens/animation/screen';
import { ScreenMenu } from '@/screens/menu/screen';
import { ScreenStack } from '@/screens/screen-stack';
import { ScreenViewType } from '@/screens/screen-view-type';
import { ResourceType } from '@/lib/resource-utils';
import {
  cloneGameState,
  createInitialGameState,
  SCRIPT_LOCAL_VARIABLE_END,
  SCRIPT_LOCAL_VARIABLE_START,
  SCRIPT_VARIABLE_COUNT,
  type GameState,
} from './game-state';
import { DEFAULT_GAME_PROFILE, type GameProfile } from './game-profile';
import {
  createSavePayload,
  decodeSavePayload,
  encodeSavePayload,
  getSaveSlotKey,
  SAVE_SLOT_COUNT,
  toLoadedGameState,
  type SaveGamePayload,
  type SavePlayerState,
  type SaveResourceRef,
  type SaveSlotSummary,
} from './save-game';

const STARTUP_CHAPTER_TYPE = 1;
const STARTUP_CHAPTER_INDEX = 1;

export class Game {
  readonly datLib: DatLib;
  readonly combat = new CombatRuntime(this);
  readonly scriptVm = new ScriptVm(this);
  state: GameState = createInitialGameState();
  mainScene: ScreenMainGame | null = null;
  mainSceneRuntime: MainSceneRuntime | null = null;
  private readonly boxEventMap = new Map<string, number>();
  private pendingBoxEventKey: string | null = null;
  private readonly surface = new Surface(FRAME_WIDTH, FRAME_HEIGHT);
  readonly screenStack = new ScreenStack();
  private readonly host: EngineHost;
  readonly profile: GameProfile;

  constructor(host: EngineHost, datLibBuffer: Uint8Array, profile: GameProfile = DEFAULT_GAME_PROFILE) {
    this.host = host;
    this.profile = profile;
    this.datLib = new DatLib(datLibBuffer);
  }

  get frameBuffer(): FrameBuffer {
    return this.surface.buffer;
  }

  get bag(): GoodsBag {
    return new GoodsBag(this.state.goods, this.datLib);
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
    this.host.saveStore.write(getSaveSlotKey(slot), encodeSavePayload(payload));
    return payload.summary;
  }

  loadSlot(slot: number): boolean {
    const payload = this.readSavePayload(slot);
    if (!payload) return false;
    this.applyLoadedState(toLoadedGameState(payload), payload.state.players ?? [], payload.state.mainScene ?? null);
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
    this.screenStack.onKey(key);
  }

  startNewGame(): void {
    this.boxEventMap.clear();
    this.pendingBoxEventKey = null;
    this.combat.reset();
    const previousVariables = this.profile.compat?.preserveScriptVariablesOnNewGame ? this.state.scriptVariables : null;
    this.state = createInitialGameState();
    if (previousVariables) {
      this.state.scriptVariables = [...previousVariables];
      this.ensureScriptVariableSize();
    }
    this.replaceWithMainScene();
    this.mainSceneRuntime?.startChapter(STARTUP_CHAPTER_TYPE, STARTUP_CHAPTER_INDEX);
  }

  returnToMenu(): void {
    this.mainScene = null;
    this.mainSceneRuntime = null;
    this.screenStack.replaceAll(new ScreenMenu(this));
  }

  requestExit(): void {
    this.host.requestExit?.();
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
  }

  gainGoods(type: number, index: number, count = 1): BaseGoods | null {
    const goods = this.bag.addGoods(type, index, count);
    if (goods) {
      this.mainScene?.showTip(`获得:${goods.name}`);
    }
    return goods;
  }

  deleteGoods(type: number, index: number): boolean {
    return this.bag.deleteGoods(type, index);
  }

  useGoodsNum(type: number, index: number, count: number): boolean {
    return this.bag.useGoodsNum(type, index, count);
  }

  getGoodsNum(type: number, index: number): number {
    return this.bag.getGoodsNum(type, index);
  }

  gainMoney(value: number): void {
    this.state.money += value;
    if (!this.profile.compat?.suppressGainMoneyTip) {
      this.mainScene?.showTip(`获得金钱:${value}`);
    }
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

    const res = this.datLib.getRes(ResourceType.ARS, 1, actorId);
    if (!(res instanceof Player)) return null;
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
    return this.mainSceneRuntime?.getSaveBlockedMessage() ?? '主场景不存在，无法存档';
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
    if (this.profile.compat?.preserveLocalVariablesOnChapterStart) return;
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
    const data = this.host.saveStore.read(getSaveSlotKey(slot));
    return data ? decodeSavePayload(data) : null;
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
    player.level = snapshot.level;
    player.learntMagicCount = snapshot.learntMagicCount;
    if (player.magicChain) player.magicChain.learnNum = snapshot.magicChainLearnNum;
    player.maxHp = snapshot.maxHp;
    player.hp = snapshot.hp;
    player.maxMp = snapshot.maxMp;
    player.mp = snapshot.mp;
    player.attack = snapshot.attack;
    player.defend = snapshot.defend;
    player.speed = snapshot.speed;
    player.lingli = snapshot.lingli;
    player.luck = snapshot.luck;
    player.currentExp = snapshot.currentExp;
    player.totalMaxHp = snapshot.totalMaxHp;
    player.totalMaxMp = snapshot.totalMaxMp;
    player.totalAttack = snapshot.totalAttack;
    player.totalDefend = snapshot.totalDefend;
    player.totalSpeed = snapshot.totalSpeed;
    player.totalLingli = snapshot.totalLingli;
    player.totalLuck = snapshot.totalLuck;
    this.restorePlayerEquipment(player, snapshot.equipment);
    player.restorePrivateLearntMagics(snapshot.privateMagics.map(ref => this.getSaveMagic(ref)));
    restoreBuffs(player.buff.buffs, snapshot.buff);
    restoreBuffs(player.debuff.buffs, snapshot.debuff);
    restoreBuffs(player.atbuff.buffs, snapshot.atbuff);
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

function restoreBuffs(target: BuffState[], source: readonly BuffState[]): void {
  for (let i = 0; i < target.length; i += 1) {
    const buff = target[i];
    const saved = source[i];
    if (!buff) continue;
    buff.value = saved?.value ?? 0;
    buff.round = saved?.round ?? 0;
  }
}
