import type { Game } from '@/game/game';
import type { CombatEnterFightParams, CombatInitFightParams, CombatRuntimeSnapshot } from '@/combat';
import { CharacterState, mapCharacterState, Npc, SceneObj, type Player, type WalkingSprite } from '@/characters';
import { ResImage } from '@/lib/res-image';
import { ResMap } from '@/lib/res-map';
import { ResSrs } from '@/lib/res-srs';
import { ResourceType } from '@/lib/resource-utils';
import type { ScreenOverlay } from '@/screens/screen-overlay';
import type { ScriptOperation, ScriptProcess, ScriptProcessSnapshot } from '@/script/script-process';
import { MAP_VIEW_TILE_HEIGHT, MAP_VIEW_TILE_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { clamp } from '@/shared/math';
import { ScreenCombat } from './combat/screen-combat';

export type Facing = typeof KeyCode.Up | typeof KeyCode.Down | typeof KeyCode.Left | typeof KeyCode.Right;
export type SceneObjectKind = 'npc' | 'box';

export interface SceneObject {
  id: number;
  kind: SceneObjectKind;
  x: number;
  y: number;
  resId: number;
  walkingSprite: WalkingSprite | null;
  direction: Facing;
  step: number;
  state: CharacterState;
  delay: number;
  stateElapsed: number;
  pauseRemaining: number;
}

export interface SceneObjectSnapshot {
  id: number;
  kind: SceneObjectKind;
  x: number;
  y: number;
  resId: number;
  direction: Facing;
  step: number;
  state: CharacterState;
  delay: number;
  stateElapsed: number;
  pauseRemaining: number;
}

export interface MainSceneRuntimeSnapshot {
  scriptProcess: ScriptProcessSnapshot | null;
  combat: CombatRuntimeSnapshot | null;
  sceneObjects: SceneObjectSnapshot[];
  hasPlayer: boolean;
  playerActorId: number;
  playerFacing: Facing;
  playerStep: number;
}

const PLAYER_SCREEN_X = 9;
const PLAYER_SCREEN_Y = 5;
const SCRIPT_MOVE_INTERVAL = 100;
const SCRIPT_POSE_WAIT = 300;
const NPC_WALK_INTERVAL = 500;
const ACTIVE_POSE_INTERVAL = 100;
const MOVIE_BASE_WIDTH = 160;
const MOVIE_BASE_HEIGHT = 96;

export interface MovieParams {
  readonly type: number;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly ctl: number;
}

// 主场景运行时只负责地图、对象、交互和脚本入口，不处理具体 UI。
export class MainSceneRuntime {
  private currentMapValue: ResMap | null = null;
  private tileSetValue: ResImage | null = null;
  private scriptProcess: ScriptProcess | null = null;
  private readonly sceneObjectsValue = new Map<number, SceneObject>();
  private playerMapXValue = 0;
  private playerMapYValue = 0;
  private hasPlayerValue = false;
  private playerWalkingSpriteValue: WalkingSprite | null = null;
  private playerActorIdValue = 0;
  private facingValue: Facing = KeyCode.Down;
  private playerStepValue = 0;
  private overlayValue: ScreenOverlay | null = null;

  constructor(private readonly game: Game) {
    if (this.game.state.mapType > 0 && this.game.state.mapIndex > 0) {
      this.loadMap(
        this.game.state.mapType,
        this.game.state.mapIndex,
        this.game.state.mapScreenX,
        this.game.state.mapScreenY
      );
    }

    if (this.game.state.playerMapX > 0 || this.game.state.playerMapY > 0) {
      this.hasPlayerValue = true;
      const player = this.game.getControlPlayer();
      if (player) {
        this.playerActorIdValue = player.index;
        this.applyVisiblePlayer(player);
      }
      this.setPlayerMapPosition(this.game.state.playerMapX, this.game.state.playerMapY);
    }
  }

  get currentMap(): ResMap | null {
    return this.currentMapValue;
  }

  get tileSet(): ResImage | null {
    return this.tileSetValue;
  }

  get sceneObjects(): IterableIterator<SceneObject> {
    return this.sceneObjectsValue.values();
  }

  get hasPlayer(): boolean {
    return this.hasPlayerValue;
  }

  get playerMapX(): number {
    return this.playerMapXValue;
  }

  get playerMapY(): number {
    return this.playerMapYValue;
  }

  get playerFacing(): Facing {
    return this.facingValue;
  }

  get playerStep(): number {
    return this.playerStepValue;
  }

  get playerWalkingSprite(): WalkingSprite | null {
    return this.playerWalkingSpriteValue;
  }

  get overlay(): ScreenOverlay | null {
    return this.overlayValue;
  }

  get canOpenInGameMenu(): boolean {
    return this.canControlPlayer();
  }

  getSaveBlockedMessage(): string | null {
    if (this.scriptProcess?.parent) return '副本中不能存档';
    if (this.scriptProcess?.running || this.scriptProcess?.hasOperation) return '当前不能存档';
    return null;
  }

  createSnapshot(): MainSceneRuntimeSnapshot {
    const blockedMessage = this.getSaveBlockedMessage();
    if (blockedMessage) throw new Error(blockedMessage);
    return {
      scriptProcess: this.scriptProcess?.createSnapshot() ?? null,
      combat: this.game.combat.createSnapshot(),
      sceneObjects: [...this.sceneObjectsValue.values()].map(obj => this.createSceneObjectSnapshot(obj)),
      hasPlayer: this.hasPlayerValue,
      playerActorId: this.playerActorIdValue,
      playerFacing: this.facingValue,
      playerStep: this.playerStepValue,
    };
  }

  restoreSnapshot(snapshot: MainSceneRuntimeSnapshot): void {
    this.game.combat.restoreSnapshot(snapshot.combat);
    this.sceneObjectsValue.clear();
    for (const obj of snapshot.sceneObjects) {
      this.sceneObjectsValue.set(obj.id, this.restoreSceneObject(obj));
    }
    this.restoreVisiblePlayer(snapshot);
    this.scriptProcess = null;
    if (snapshot.scriptProcess) {
      this.scriptProcess = this.game.scriptVm.loadScript(this.game.state.scriptType, this.game.state.scriptIndex);
      this.scriptProcess.restoreSnapshot(snapshot.scriptProcess);
    }
  }

  update(delta = 0): void {
    const process = this.scriptProcess;
    if (process?.busy) {
      process.step(delta);
      process.timerStep(delta);
      return;
    }

    // Kotlin 版只在脚本空闲时推进 NPC 自走，避免剧情指令和巡逻同时改位置。
    this.updateSceneObjects(delta);
    process?.timerStep(delta);
  }

  move(facing: Facing): void {
    if (!this.canControlPlayer()) return;

    switch (facing) {
      case KeyCode.Left:
        this.walkLeft();
        return;
      case KeyCode.Right:
        this.walkRight();
        return;
      case KeyCode.Up:
        this.walkUp();
        return;
      case KeyCode.Down:
        this.walkDown();
        return;
    }
  }

  interact(): void {
    if (!this.canControlPlayer()) return;
    this.triggerSceneObjectEvent();
  }

  startChapter(type: number, index: number): void {
    this.scriptProcess?.stop();
    this.overlayValue = null;
    this.game.clearPendingBoxEvent();
    this.game.state.scriptType = type;
    this.game.state.scriptIndex = index;
    this.game.resetLocalVariables();
    this.scriptProcess = this.game.scriptVm.loadScript(type, index);
    this.scriptProcess.start();
  }

  startChapterAtOffset(type: number, index: number, offset: number): void {
    if (!Number.isInteger(offset) || offset < 0) throw new Error(`脚本偏移非法: ${offset}`);
    this.scriptProcess?.stop();
    this.overlayValue = null;
    this.game.clearPendingBoxEvent();
    this.game.state.scriptType = type;
    this.game.state.scriptIndex = index;
    this.game.resetLocalVariables();
    this.scriptProcess = this.game.scriptVm.loadScript(type, index);
    this.scriptProcess.startAtOffset(offset);
  }

  triggerEvent(eventId: number): boolean {
    return this.scriptProcess?.triggerEvent(eventId) ?? false;
  }

  callChapter(type: number, index: number, parentProcess = this.scriptProcess): void {
    const childProcess = this.game.scriptVm.loadScript(type, index);
    childProcess.parent = parentProcess;
    this.scriptProcess = childProcess;
    childProcess.start();
  }

  initFight(params: CombatInitFightParams): void {
    this.game.combat.initFight(params);
  }

  fightEnable(): void {
    this.game.combat.fightEnable();
  }

  fightDisable(): void {
    this.game.combat.fightDisable();
  }

  enterFight(params: CombatEnterFightParams, process: ScriptProcess): void {
    const scene = this.game.mainScene;
    if (!scene) throw new Error('主场景不存在，无法进入战斗');
    if (this.scriptProcess !== process) throw new Error('只有当前脚本进程可以启动战斗');
    process.pause();
    const session = this.game.combat.enterFight(
      params,
      result => {
        if (result === 'win') {
          process.gotoAddress(params.winAddress);
        } else if (result === 'loss') {
          process.gotoAddress(params.lossAddress);
        }
        process.start();
      },
      eventId => {
        if (!process.triggerEvent(eventId)) return;
        process.step(0);
      }
    );
    scene.screenStack.push(new ScreenCombat(this.game, session));
  }

  startDebugCombat(params: CombatEnterFightParams): void {
    const scene = this.game.mainScene;
    if (!scene) throw new Error('主场景不存在，无法调试进入战斗');
    const session = this.game.combat.enterFight(params, result => {
      if (result === 'loss') scene.showMessage('战斗失败');
    });
    scene.screenStack.push(new ScreenCombat(this.game, session, { allowDebugWin: true }));
  }

  returnToParentScript(process: ScriptProcess): boolean {
    if (this.scriptProcess !== process) return false;
    const parent = process.parent;
    process.parent = null;
    process.stop();
    if (!parent) return true;
    this.scriptProcess = parent;
    parent.start();
    return true;
  }

  loadMap(type: number, index: number, screenX: number, screenY: number): void {
    const mapRes = this.game.datLib.getRes(ResourceType.MAP, type, index);
    if (!(mapRes instanceof ResMap)) {
      throw new Error(`Missing map ${type}:${index}`);
    }

    this.currentMapValue = mapRes;
    this.tileSetValue = this.loadTileSet(mapRes);
    this.sceneObjectsValue.clear();
    this.game.clearPendingBoxEvent();
    this.game.state.mapType = type;
    this.game.state.mapIndex = index;
    this.game.state.mapScreenX = screenX;
    this.game.state.mapScreenY = screenY;
    this.game.state.sceneName = mapRes.mapName;

    if (this.hasPlayerValue) {
      this.setPlayerMapPosition(screenX + PLAYER_SCREEN_X, screenY + PLAYER_SCREEN_Y);
    }
  }

  setMapScreenPosition(screenX: number, screenY: number): void {
    this.game.state.mapScreenX = screenX;
    this.game.state.mapScreenY = screenY;
    if (this.hasPlayerValue) {
      this.setPlayerMapPosition(screenX + PLAYER_SCREEN_X, screenY + PLAYER_SCREEN_Y);
    }
  }

  createActor(screenActorId: number, screenX: number, screenY: number): void {
    if (screenActorId <= 0) return;
    this.syncVisiblePlayer();
    const player = this.game.addActor(screenActorId);
    if (!player) return;
    this.setResourcePlayerMapPosition(player, this.game.state.mapScreenX + screenX, this.game.state.mapScreenY + screenY);
    this.refreshVisibleControlPlayer();
  }

  createNpc(id: number, resId: number, x: number, y: number): void {
    const npcRes = this.game.datLib.getRes(ResourceType.ARS, 2, resId);
    const walkingSprite = npcRes instanceof Npc ? npcRes.walkingSprite : null;
    const direction = npcRes instanceof Npc ? npcRes.direction : KeyCode.Down;
    const step = npcRes instanceof Npc ? npcRes.step : 0;
    const state = npcRes instanceof Npc ? npcRes.state : CharacterState.Stop;
    const delay = npcRes instanceof Npc ? npcRes.delay : 0;
    this.sceneObjectsValue.set(
      id,
      this.createSceneObject({ id, kind: 'npc', x, y, resId, walkingSprite, direction, step, state, delay })
    );
  }

  createBox(id: number, resId: number, x: number, y: number): void {
    const boxRes = this.game.datLib.getRes(ResourceType.ARS, 4, resId);
    const walkingSprite = boxRes instanceof SceneObj ? boxRes.walkingSprite : null;
    const direction = boxRes instanceof SceneObj ? boxRes.direction : KeyCode.Up;
    const state = boxRes instanceof SceneObj ? boxRes.state : CharacterState.Stop;
    const delay = boxRes instanceof SceneObj ? boxRes.delay : 0;
    const step = this.game.isBoxCollected(this.getBoxEventKey(x, y, resId))
      ? 2
      : boxRes instanceof SceneObj
        ? boxRes.step
        : 0;
    this.sceneObjectsValue.set(
      id,
      this.createSceneObject({ id, kind: 'box', x, y, resId, walkingSprite, direction, step, state, delay })
    );
  }

  deleteNpc(id: number): void {
    this.sceneObjectsValue.delete(id);
  }

  deleteBox(id: number): void {
    this.sceneObjectsValue.delete(id);
  }

  deleteAllNpc(): void {
    this.sceneObjectsValue.clear();
  }

  deleteActor(id: number): void {
    this.syncVisiblePlayer();
    this.game.deleteActor(id);
    this.refreshVisibleControlPlayer();
  }

  setControlPlayer(id: number): void {
    this.syncVisiblePlayer();
    const player = this.game.setControlPlayer(id);
    if (!player) return;
    this.playerActorIdValue = id;
    player.mapX = this.playerMapXValue;
    player.mapY = this.playerMapYValue;
    this.applyVisiblePlayer(player);
    this.hasPlayerValue = true;
  }

  moveActor(id: number, x: number, y: number): void {
    if (id === 0) {
      this.setPlayerMapPosition(x, y);
      return;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return;
    obj.x = x;
    obj.y = y;
  }

  createMoveActorOperation(id: number, x: number, y: number): ScriptOperation | null {
    const actor = this.getActorPosition(id);
    if (!actor) return null;
    let elapsed = SCRIPT_MOVE_INTERVAL;

    return {
      update: delta => {
        elapsed += delta;
        if (elapsed < SCRIPT_MOVE_INTERVAL) return true;
        elapsed = 0;
        const pos = this.getActorPosition(id);
        if (!pos || (pos.x === x && pos.y === y)) return false;
        const facing = getFacingToward(pos.x, pos.y, x, y);
        const nextX = getNextX(pos.x, facing);
        const nextY = getNextY(pos.y, facing);
        // Kotlin 的脚本 MOVE 直接调用 walk(d)，不走 NPC 自走的 ICanWalk 碰撞判断。
        this.stepActorPose(id, facing);
        this.setActorMapPosition(id, nextX, nextY);
        return true;
      },
    };
  }

  faceActorToActor(sourceId: number, targetId: number): void {
    const source = this.getActorPosition(sourceId);
    const target = this.getActorPosition(targetId);
    if (!source || !target) return;
    if (source.x === target.x && source.y === target.y) return;

    const facing = getFacingToward(target.x, target.y, source.x, source.y);
    this.setActorFacing(targetId, facing);
  }

  setNpcMoveMode(id: number, state: number): void {
    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return;
    obj.state = mapCharacterState(state);
    obj.stateElapsed = 0;
    obj.pauseRemaining = obj.delay * 100;
  }

  setActorPose(id: number, facing: Facing, step: number): void {
    if (id === 0) {
      this.facingValue = facing;
      this.playerStepValue = step;
      this.syncVisiblePlayer();
      return;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return;
    obj.direction = facing;
    obj.step = step;
  }

  createActorPoseOperation(id: number, facing: Facing, step: number): ScriptOperation | null {
    const actor = this.getActorPosition(id);
    if (!actor) return null;
    this.setActorPose(id, facing, step);
    if (id !== 0 && !this.isActorVisible(id)) return null;

    let elapsed = 0;

    return {
      update: delta => {
        elapsed += delta;
        return elapsed < SCRIPT_POSE_WAIT;
      },
    };
  }

  playMovie(params: MovieParams, process: ScriptProcess): void {
    const res = this.game.datLib.getRes(ResourceType.SRS, params.type, params.index);
    if (!(res instanceof ResSrs)) return;

    res.setIteratorNum(5);
    res.start();

    let skipped = false;
    const skippable = (params.ctl & 1) === 1;
    const overlayScene = (params.ctl & 2) === 2;
    const x = shouldCenterMovie(params.x, params.y)
      ? params.x + Math.floor((SCREEN_WIDTH - MOVIE_BASE_WIDTH) / 2)
      : params.x;
    const y = shouldCenterMovie(params.x, params.y)
      ? params.y + Math.floor((SCREEN_HEIGHT - MOVIE_BASE_HEIGHT) / 2)
      : params.y;

    const overlay: ScreenOverlay = {
      coversScreen: !overlayScene,
      draw: surface => {
        res.draw(surface, x, y);
      },
      onKey: () => {
        if (skippable) skipped = true;
      },
    };
    const operation: ScriptOperation = {
      update: delta => !skipped && res.update(delta),
    };

    process.wait(this.withOverlay(operation, overlay));
  }

  openBox(id: number): void {
    const obj = this.sceneObjectsValue.get(id);
    if (!obj || obj.kind !== 'box') return;
    obj.step = Math.max(obj.step, 1);
  }

  collectFacingBox(): void {
    const pos = this.getFacingMapPosition();
    const obj = this.getSceneObjectAt(pos.x, pos.y);
    if (!obj || obj.kind !== 'box') return;
    obj.step = 2;
    this.game.markBoxCollected(this.getBoxEventKey(obj.x, obj.y, obj.resId));
  }

  setSceneName(name: string): void {
    this.game.state.sceneName = name;
  }

  getPlayerScreenPosition(): { x: number; y: number } {
    return {
      x: this.playerMapXValue - this.game.state.mapScreenX,
      y: this.playerMapYValue - this.game.state.mapScreenY,
    };
  }

  private walkLeft(): void {
    if (!this.currentMapValue) return;

    this.facingValue = KeyCode.Left;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x - 1, y);
    this.stepActorPose(0, KeyCode.Left);
    if (!this.canPlayerStepTo(x - 1, y)) return;
    this.setPlayerMapPosition(x - 1, y);
    if (this.getPlayerScreenPosition().x <= PLAYER_SCREEN_X) {
      this.game.state.mapScreenX -= 1;
    }
  }

  private walkRight(): void {
    if (!this.currentMapValue) return;

    this.facingValue = KeyCode.Right;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x + 1, y);
    this.stepActorPose(0, KeyCode.Right);
    if (!this.canPlayerStepTo(x + 1, y)) return;
    this.setPlayerMapPosition(x + 1, y);
    if (this.getPlayerScreenPosition().x >= PLAYER_SCREEN_X) {
      this.game.state.mapScreenX += 1;
    }
  }

  private walkUp(): void {
    if (!this.currentMapValue) return;

    this.facingValue = KeyCode.Up;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x, y - 1);
    this.stepActorPose(0, KeyCode.Up);
    if (!this.canPlayerStepTo(x, y - 1)) return;
    this.setPlayerMapPosition(x, y - 1);
    if (this.getPlayerScreenPosition().y <= PLAYER_SCREEN_Y) {
      this.game.state.mapScreenY -= 1;
    }
  }

  private walkDown(): void {
    if (!this.currentMapValue) return;

    this.facingValue = KeyCode.Down;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x, y + 1);
    this.stepActorPose(0, KeyCode.Down);
    if (!this.canPlayerStepTo(x, y + 1)) return;
    this.setPlayerMapPosition(x, y + 1);
    if (this.getPlayerScreenPosition().y >= PLAYER_SCREEN_Y) {
      this.game.state.mapScreenY += 1;
    }
  }

  private triggerMapEvent(x: number, y: number): void {
    const eventId = this.currentMapValue?.getEventNum(x, y) ?? 0;
    if (eventId <= 0) {
      this.tryStartRandomCombat();
      return;
    }
    this.scriptProcess?.triggerEvent(eventId + 40);
  }

  private tryStartRandomCombat(): void {
    const scene = this.game.mainScene;
    if (!scene) throw new Error('主场景不存在，无法进入随机战斗');
    const session = this.game.combat.startRandomFight(result => {
      if (result === 'loss') this.game.returnToMenu();
    });
    if (!session) return;
    scene.screenStack.push(new ScreenCombat(this.game, session));
  }

  private canControlPlayer(): boolean {
    return !this.scriptProcess?.busy && !!this.currentMapValue && this.hasPlayerValue;
  }

  private triggerSceneObjectEvent(): void {
    const pos = this.getFacingMapPosition();
    const obj = this.getSceneObjectAt(pos.x, pos.y);
    if (obj) {
      if (obj.kind === 'box') {
        if (this.game.isBoxCollected(this.getBoxEventKey(obj.x, obj.y, obj.resId))) return;
        this.game.setPendingBoxEvent(this.getBoxEventKey(obj.x, obj.y, obj.resId));
      } else {
        this.game.clearPendingBoxEvent();
      }
      const triggered = this.scriptProcess?.triggerEvent(obj.id) ?? false;
      if (!triggered) {
        this.game.clearPendingBoxEvent();
      }
      return;
    }
    this.game.clearPendingBoxEvent();
    this.triggerMapEvent(pos.x, pos.y);
  }

  private canPlayerStepTo(x: number, y: number): boolean {
    return this.currentMapValue?.canPlayerWalk(x, y) === true && !this.hasSceneObjectAt(x, y);
  }

  private hasSceneObjectAt(x: number, y: number): boolean {
    return this.getSceneObjectAt(x, y) != null;
  }

  private getSceneObjectAt(x: number, y: number): SceneObject | null {
    for (const obj of this.sceneObjectsValue.values()) {
      if (obj.x === x && obj.y === y) {
        return obj;
      }
    }
    return null;
  }

  private getFacingMapPosition(): { x: number; y: number } {
    let x = this.playerMapXValue;
    let y = this.playerMapYValue;

    switch (this.facingValue) {
      case KeyCode.Left:
        x -= 1;
        break;
      case KeyCode.Right:
        x += 1;
        break;
      case KeyCode.Up:
        y -= 1;
        break;
      case KeyCode.Down:
        y += 1;
        break;
    }

    return { x, y };
  }

  private getBoxEventKey(x: number, y: number, resId: number): string {
    return `${this.game.state.mapType}_${this.game.state.mapIndex}_${x}_${y}_4_${resId}`;
  }

  private loadTileSet(map: ResMap): ResImage | null {
    const tileRes = this.game.datLib.getRes(ResourceType.TIL, 1, map.tilIndex);
    return tileRes instanceof ResImage ? tileRes : null;
  }

  private setPlayerMapPosition(mapX: number, mapY: number): void {
    const start = this.resolveStartPosition(mapX, mapY);
    this.setVisiblePlayerMapPosition(start.x, start.y);
  }

  private setResourcePlayerMapPosition(player: Player, mapX: number, mapY: number): void {
    if (!this.currentMapValue) {
      player.mapX = mapX;
      player.mapY = mapY;
      return;
    }

    player.mapX = clamp(mapX, 0, this.currentMapValue.mapWidth - 1);
    player.mapY = clamp(mapY, 0, this.currentMapValue.mapHeight - 1);
  }

  private setVisiblePlayerMapPosition(mapX: number, mapY: number): void {
    this.playerMapXValue = mapX;
    this.playerMapYValue = mapY;
    this.game.state.playerMapX = mapX;
    this.game.state.playerMapY = mapY;
    const player = this.game.getControlPlayer();
    if (player) {
      player.mapX = mapX;
      player.mapY = mapY;
    }
  }

  private applyVisiblePlayer(player: Player): void {
    this.playerWalkingSpriteValue = player.walkingSprite;
    this.facingValue = player.direction;
    this.playerStepValue = player.step;
  }

  private refreshVisibleControlPlayer(): void {
    const player = this.game.getControlPlayer();
    if (!player) {
      this.hasPlayerValue = false;
      this.playerWalkingSpriteValue = null;
      this.playerActorIdValue = 0;
      this.playerStepValue = 0;
      return;
    }

    this.playerActorIdValue = player.index;
    this.applyVisiblePlayer(player);
    this.hasPlayerValue = true;
    this.setVisiblePlayerMapPosition(player.mapX, player.mapY);
  }

  private syncVisiblePlayer(): void {
    const player = this.game.getControlPlayer();
    if (!player) return;
    player.mapX = this.playerMapXValue;
    player.mapY = this.playerMapYValue;
    player.direction = this.facingValue;
    player.step = this.playerStepValue;
  }

  private getActorPosition(id: number): { x: number; y: number } | null {
    if (id === 0) {
      return this.hasPlayerValue ? { x: this.playerMapXValue, y: this.playerMapYValue } : null;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return null;
    return { x: obj.x, y: obj.y };
  }

  private withOverlay(operation: ScriptOperation, overlay: ScreenOverlay): ScriptOperation {
    this.overlayValue = overlay;
    return {
      update: delta => {
        const running = operation.update(delta);
        if (!running) this.overlayValue = null;
        return running;
      },
    };
  }

  private setActorMapPosition(id: number, x: number, y: number): void {
    if (id === 0) {
      this.setPlayerMapPosition(x, y);
      return;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return;
    obj.x = x;
    obj.y = y;
  }

  private setActorFacing(id: number, facing: Facing): void {
    if (id === 0) {
      this.facingValue = facing;
      this.syncVisiblePlayer();
      return;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return;
    obj.direction = facing;
  }

  private stepActorPose(id: number, facing: Facing): void {
    if (id === 0) {
      this.facingValue = facing;
      this.playerStepValue = (this.playerStepValue + 1) % 4;
      this.syncVisiblePlayer();
      return;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return;
    obj.direction = facing;
    obj.step = (obj.step + 1) % 4;
  }

  private updateSceneObjects(delta: number): void {
    for (const obj of this.sceneObjectsValue.values()) {
      switch (obj.state) {
        case CharacterState.Pause:
          obj.pauseRemaining -= delta;
          if (obj.pauseRemaining < 0) {
            obj.state = CharacterState.Walking;
          }
          break;
        case CharacterState.ForceMove:
        case CharacterState.Walking:
          this.updateWalkingNpc(obj, delta);
          break;
        case CharacterState.Active:
          this.updateActiveSceneObject(obj, delta);
          break;
      }
    }
  }

  private updateWalkingNpc(obj: SceneObject, delta: number): void {
    if (obj.kind !== 'npc') return;
    obj.stateElapsed += delta;
    if (obj.stateElapsed < NPC_WALK_INTERVAL) return;
    obj.stateElapsed = 0;

    if (Math.trunc(Math.random() * 5) === 0) {
      obj.pauseRemaining = obj.delay * 100;
      obj.state = CharacterState.Pause;
      return;
    }

    if (Math.trunc(Math.random() * 5) === 0) {
      obj.direction = randomFacing();
    }

    this.tryStepSceneObject(obj);
  }

  private updateActiveSceneObject(obj: SceneObject, delta: number): void {
    obj.stateElapsed += delta;
    while (obj.stateElapsed >= ACTIVE_POSE_INTERVAL) {
      obj.stateElapsed -= ACTIVE_POSE_INTERVAL;
      obj.step = (obj.step + 1) % 4;
    }
  }

  private tryStepSceneObject(obj: SceneObject): void {
    const x = getNextX(obj.x, obj.direction);
    const y = getNextY(obj.y, obj.direction);
    if (!this.canSceneObjectStepTo(obj.id, x, y)) return;
    obj.step = (obj.step + 1) % 4;
    obj.x = x;
    obj.y = y;
  }

  private canSceneObjectStepTo(id: number, x: number, y: number): boolean {
    if (this.currentMapValue?.canWalk(x, y) !== true) return false;
    if (this.hasPlayerValue && this.playerMapXValue === x && this.playerMapYValue === y) return false;

    for (const obj of this.sceneObjectsValue.values()) {
      if (obj.id !== id && obj.x === x && obj.y === y) return false;
    }

    return true;
  }

  private createSceneObject(data: Omit<SceneObject, 'stateElapsed' | 'pauseRemaining'>): SceneObject {
    return {
      ...data,
      stateElapsed: 0,
      pauseRemaining: data.delay * 100,
    };
  }

  private createSceneObjectSnapshot(obj: SceneObject): SceneObjectSnapshot {
    return {
      id: obj.id,
      kind: obj.kind,
      x: obj.x,
      y: obj.y,
      resId: obj.resId,
      direction: obj.direction,
      step: obj.step,
      state: obj.state,
      delay: obj.delay,
      stateElapsed: obj.stateElapsed,
      pauseRemaining: obj.pauseRemaining,
    };
  }

  private restoreSceneObject(snapshot: SceneObjectSnapshot): SceneObject {
    const resType = snapshot.kind === 'npc' ? 2 : 4;
    const res = this.game.datLib.getRes(ResourceType.ARS, resType, snapshot.resId);
    let walkingSprite: WalkingSprite | null = null;
    if (snapshot.kind === 'npc') {
      if (!(res instanceof Npc)) throw new Error(`读档 NPC 资源不存在: ARS 2-${snapshot.resId}`);
      walkingSprite = res.walkingSprite;
    } else {
      if (!(res instanceof SceneObj)) throw new Error(`读档场景物件资源不存在: ARS 4-${snapshot.resId}`);
      walkingSprite = res.walkingSprite;
    }
    return {
      ...snapshot,
      walkingSprite,
    };
  }

  private restoreVisiblePlayer(snapshot: MainSceneRuntimeSnapshot): void {
    if (!snapshot.hasPlayer) {
      this.hasPlayerValue = false;
      this.playerWalkingSpriteValue = null;
      this.playerActorIdValue = 0;
      this.playerStepValue = 0;
      return;
    }

    const actorId = snapshot.playerActorId || this.game.state.controlActorId;
    const player = this.game.getPlayer(actorId);
    if (!player) throw new Error(`读档控制角色资源不存在: ${actorId}`);
    this.hasPlayerValue = true;
    this.playerActorIdValue = actorId;
    this.playerWalkingSpriteValue = player.walkingSprite;
    this.facingValue = snapshot.playerFacing;
    this.playerStepValue = snapshot.playerStep;
    this.setVisiblePlayerMapPosition(this.game.state.playerMapX, this.game.state.playerMapY);
    this.syncVisiblePlayer();
  }

  private isActorVisible(id: number): boolean {
    const pos = this.getActorPosition(id);
    if (!pos) return false;
    const screenX = pos.x - this.game.state.mapScreenX;
    const screenY = pos.y - this.game.state.mapScreenY;
    return screenX >= 0 && screenX < MAP_VIEW_TILE_WIDTH && screenY >= 0 && screenY < MAP_VIEW_TILE_HEIGHT;
  }

  private resolveStartPosition(x: number, y: number): { x: number; y: number } {
    if (!this.currentMapValue) {
      return { x, y };
    }

    if (this.currentMapValue.canPlayerWalk(x, y)) {
      return { x, y };
    }

    for (let radius = 1; radius <= 8; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nextX = x + dx;
          const nextY = y + dy;
          if (this.currentMapValue.canPlayerWalk(nextX, nextY)) {
            return { x: nextX, y: nextY };
          }
        }
      }
    }

    return {
      x: clamp(x, 0, this.currentMapValue.mapWidth - 1),
      y: clamp(y, 0, this.currentMapValue.mapHeight - 1),
    };
  }
}

function shouldCenterMovie(x: number, y: number): boolean {
  return x < MOVIE_BASE_WIDTH && y < MOVIE_BASE_HEIGHT;
}

function getFacingToward(x: number, y: number, targetX: number, targetY: number): Facing {
  if (targetX < x) return KeyCode.Left;
  if (targetX > x) return KeyCode.Right;
  if (targetY < y) return KeyCode.Up;
  return KeyCode.Down;
}

function getNextX(x: number, facing: Facing): number {
  if (facing === KeyCode.Left) return x - 1;
  if (facing === KeyCode.Right) return x + 1;
  return x;
}

function getNextY(y: number, facing: Facing): number {
  if (facing === KeyCode.Up) return y - 1;
  if (facing === KeyCode.Down) return y + 1;
  return y;
}

function randomFacing(): Facing {
  switch (Math.trunc(Math.random() * 4)) {
    case 0:
      return KeyCode.Up;
    case 1:
      return KeyCode.Right;
    case 2:
      return KeyCode.Down;
    default:
      return KeyCode.Left;
  }
}
