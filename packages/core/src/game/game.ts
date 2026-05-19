import { DatLib } from '@/lib/dat-lib';
import { CombatRuntime } from '@/combat';
import { BaseGoods, GoodsEquipment } from '@/goods';
import { CharacterState, Direction, Player } from '@/characters';
import type { StatusSlot } from '@/characters';
import { GoodsBag } from '@/goods/goods-bag';
import { Surface } from '@/rendering/surface';
import type { PixelBuffer } from '@/rendering/pixel-buffer';
import type { EngineHost } from '@/runtime/engine-host';
import { MainSceneRuntime, type MainSceneRuntimeSnapshot } from '@/screens/main-game/main-game-runtime';
import { ScriptVm } from '@/script/script-vm';
import { KeyCode } from '@/utils/key-code';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/utils/constants';
import { ScreenMainGame } from '@/screens/main-game/screen-main-game';
import { ScreenSrsTransition } from '@/screens/srs-transition/screen-srs-transition';
import { ScreenStartMenu } from '@/screens/start-menu/screen-start-menu';
import { ScreenStack } from '@/screens/screen-stack';
import { ScreenViewType } from '@/screens/screen-view-type';
import { createLogger } from '@/utils/logger';
import { toUint8 } from '@/utils/integer';
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

const logger = createLogger('游戏');

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
    logger.log(
      '初始化',
      `DAT=${datLibBuffer.byteLength} bytes, 伤害公式=${this.damageFormula}, 允许Miss=${this.state.allowFightMiss}`
    );
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
    logger.log(
      '存档',
      `槽位=${slot}, 场景=${this.state.sceneName || '未命名'}, 队伍=${this.state.partyActorIds.join(',')}`
    );
    return payload.summary;
  }

  loadSlot(slot: number): boolean {
    const payload = this.readSavePayload(slot);
    if (!payload) {
      logger.log('读档', `槽位=${slot} 为空`);
      return false;
    }
    try {
      this.applyLoadedState(toLoadedGameState(payload), payload.state.players ?? [], payload.state.mainScene ?? null);
    } catch {
      throw new Error(CORRUPT_SAVE_MESSAGE);
    }
    logger.log('读档', `槽位=${slot}, 保存时间=${payload.summary.savedAt}, 场景=${this.state.sceneName || '未命名'}`);
    return true;
  }

  start(): void {
    logger.log('启动', '进入开发 Logo');
    this.mainScene = null;
    this.mainSceneRuntime = null;
    this.combat.reset();
    this.screenStack.replaceAll(new ScreenSrsTransition(this, ScreenViewType.DevLogo));
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
    logger.log('新游戏', '重置状态并进入开场章节');
    this.resetRunState();
    this.replaceWithMainScene();
    this.mainSceneRuntime?.startChapter(1 /* 开场章节类型。 */, 1 /* 开场章节索引。 */);
  }

  startMenuChapter(index: number): void {
    logger.log('菜单剧情', `重置状态并进入 GUT 0:${index}`);
    this.resetRunState();
    this.replaceWithMainScene();
    this.mainSceneRuntime?.startChapter(0 /* 菜单剧情类型。 */, index, { returnToMenuOnCallback: true });
  }

  returnToMenu(): void {
    logger.log('菜单', '返回开始菜单');
    this.mainScene = null;
    this.mainSceneRuntime = null;
    this.screenStack.replaceAll(new ScreenStartMenu(this));
  }

  requestExit(): void {
    this.host.requestExit?.();
  }

  private createInitialState(): GameState {
    const state = createInitialGameState();
    state.useOriginalDamageFormula = this.engineOptions.damageFormula !== 'simplified';
    state.allowFightMiss = this.engineOptions.allowFightMiss !== false;
    return state;
  }

  applyLoadedState(
    state: GameState,
    playerSnapshots: readonly SavePlayerState[] = [],
    runtimeSnapshot: MainSceneRuntimeSnapshot | null = null
  ): void {
    logger.log(
      '状态',
      `应用读档状态 地图=${state.mapType}:${state.mapIndex}, 脚本=${state.scriptType}:${state.scriptIndex}, 运行时=${runtimeSnapshot ? '有' : '无'}`
    );
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
    this.state.money = Math.max(0, this.state.money + value);
    this.mainScene?.showTip(`获得金钱:${value}`);
  }

  setMoney(value: number): void {
    this.state.money = Math.max(0, value);
  }

  useMoney(value: number): void {
    this.state.money = Math.max(0, this.state.money - value);
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
    if (actorId <= 0) {
      logger.warn('队伍', `添加角色失败，角色 id 非法: ${actorId}`);
      return null;
    }
    const player = this.getPlayer(actorId);
    if (!player) {
      logger.warn('队伍', `添加角色失败，资源缺失: ${actorId}`);
      return null;
    }
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
    if (!this.state.partyActorIds.includes(actorId)) {
      logger.warn('队伍', `设置控制角色失败，不在队伍中: ${actorId}`);
      return null;
    }
    const player = this.getPlayer(actorId);
    if (!player) {
      logger.warn('队伍', `设置控制角色失败，资源缺失: ${actorId}`);
      return null;
    }
    this.state.partyActorIds = [actorId, ...this.state.partyActorIds.filter(id => id !== actorId)];
    this.state.controlActorId = actorId;
    return player;
  }

  playMusic(type: number, index: number): void {
    logger.log('音乐', `播放 ${type}:${index}`);
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
    return this.state.scriptVariables[toUint8(index)] ?? 0;
  }

  setVariable(index: number, value: number): void {
    this.state.scriptVariables[toUint8(index)] = toUint8(value);
  }

  addVariable(index: number, value: number): void {
    const key = toUint8(index);
    this.state.scriptVariables[key] = toUint8((this.state.scriptVariables[key] ?? 0) + value);
  }

  subVariable(index: number, value: number): void {
    const key = toUint8(index);
    this.state.scriptVariables[key] = toUint8((this.state.scriptVariables[key] ?? 0) - value);
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
    return eventId !== undefined && this.hasEvent(eventId);
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

  private resetRunState(): void {
    this.boxEventMap.clear();
    this.pendingBoxEventKey = null;
    this.combat.reset();
    this.state = this.createInitialState();
  }

  private replaceWithMainScene(): void {
    logger.log('场景', '进入主场景');
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
    if (blockedMessage) {
      logger.warn('存档', `阻止存档: ${blockedMessage}`);
      throw new Error(blockedMessage);
    }
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
    player.hpMax = Math.trunc(snapshot.hpMax);
    player.mpMax = Math.trunc(snapshot.mpMax);
    player.attack = Math.trunc(snapshot.attack);
    player.defense = Math.trunc(snapshot.defense);
    player.agility = Math.trunc(snapshot.agility);
    player.spirit = Math.trunc(snapshot.spirit);
    player.luck = Math.trunc(snapshot.luck);
    player.exp = snapshot.exp;
    player.restoreOnHitEffectConfig(snapshot.onHitEffectFlags, snapshot.onHitEffectRounds);
    player.coopMagicIndex = snapshot.coopMagicIndex;
    player.hpPerRound = snapshot.hpPerRound;
    player.mpPerRound = snapshot.mpPerRound;
    this.restorePlayerEquipment(player, snapshot.equipment);
    player.hp = snapshot.hp;
    player.mp = snapshot.mp;
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
