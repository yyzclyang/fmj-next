import type { Game } from '@/game/game';
import type { CombatEnterFightParams, CombatInitFightParams, CombatRuntimeSnapshot } from '@/combat';
import { CharacterState, Direction, type Player, type WalkingSprite } from '@/characters';
import type { ResImage } from '@/lib/res-image';
import type { ResMap } from '@/lib/res-map';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_TRANSPARENT } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import type { ScreenOverlay } from '@/screens/screen-overlay';
import type { ScriptOperation, ScriptProcess, ScriptProcessSnapshot } from '@/script/script-process';
import {
  MAP_VIEW_TILE_HEIGHT,
  MAP_VIEW_TILE_WIDTH,
  ORIGIN_SCREEN_HEIGHT,
  ORIGIN_SCREEN_WIDTH,
} from '@/utils/constants';
import { KeyCode } from '@/utils/key-code';
import { createLogger } from '@/utils/logger';
import { clamp } from '@/utils/math';
import { ScreenCombat } from './combat/screen-combat';
import { LearnMagicPage } from './combat/ui/success-pages';

export type Facing = Direction;
export type SceneObjectKind = 'npc' | 'box';

export interface SceneObject {
  id: number;
  eventId: number;
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
  eventId?: number;
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

export interface ActorMoveIntervalSnapshot {
  id: number;
  interval: number;
}

export interface MainSceneRuntimeSnapshot {
  scriptProcess: ScriptProcessSnapshot | null;
  combat: CombatRuntimeSnapshot | null;
  sceneObjects: SceneObjectSnapshot[];
  actorMoveIntervals?: ActorMoveIntervalSnapshot[];
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
const MOVIE_SCREEN_SCALE = 2;
const WALL_WALKING_BOUNDARY_OFFSET = 4;
const logger = createLogger('主场景');

export interface MovieParams {
  readonly type: number;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly controlFlags: number;
}

interface StartChapterOptions {
  readonly returnToMenuOnCallback?: boolean;
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
  private facingValue: Facing = Direction.South;
  private playerStepValue = 0;
  private overlayValue: ScreenOverlay | null = null;
  private readonly actorMoveIntervals = new Map<number, number>();
  private returnToMenuOnCallback = false;

  constructor(private readonly game: Game) {
    logger.log('初始化', `地图=${this.game.state.mapType}:${this.game.state.mapIndex}`);
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
    this.syncVisiblePlayer();
    logger.log('快照', `对象=${this.sceneObjectsValue.size}, 玩家=${this.playerActorIdValue}`);
    return {
      scriptProcess: this.scriptProcess?.createSnapshot() ?? null,
      combat: this.game.combat.createSnapshot(),
      sceneObjects: [...this.sceneObjectsValue.values()].map(obj => this.createSceneObjectSnapshot(obj)),
      actorMoveIntervals: [...this.actorMoveIntervals].map(([id, interval]) => ({ id, interval })),
      hasPlayer: this.hasPlayerValue,
      playerActorId: this.playerActorIdValue,
      playerFacing: this.facingValue,
      playerStep: this.playerStepValue,
    };
  }

  restoreSnapshot(snapshot: MainSceneRuntimeSnapshot): void {
    logger.log(
      '恢复',
      `对象=${snapshot.sceneObjects.length}, 玩家=${snapshot.playerActorId}, 脚本=${snapshot.scriptProcess ? '有' : '无'}`
    );
    this.game.combat.restoreSnapshot(snapshot.combat);
    this.sceneObjectsValue.clear();
    for (const obj of snapshot.sceneObjects) {
      this.sceneObjectsValue.set(obj.id, this.restoreSceneObject(obj));
    }
    this.actorMoveIntervals.clear();
    for (const item of snapshot.actorMoveIntervals ?? []) {
      this.actorMoveIntervals.set(item.id, item.interval);
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
      if (process.busy) process.timerStep(delta);
      return;
    }

    // Kotlin 版只在脚本空闲时推进 NPC 自走，避免剧情指令和巡逻同时改位置。
    this.updateSceneObjects(delta);
    process?.timerStep(delta);
  }

  move(key: KeyCode): void {
    if (!this.canControlPlayer()) return;

    switch (key) {
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

  startChapter(type: number, index: number, options: StartChapterOptions = {}): void {
    logger.log('脚本', `startChapter GUT ${type}:${index}`);
    this.scriptProcess?.stop();
    this.overlayValue = null;
    this.returnToMenuOnCallback = options.returnToMenuOnCallback ?? false;
    this.deleteAllNpc();
    this.game.state.scriptType = type;
    this.game.state.scriptIndex = index;
    this.game.resetLocalVariables();
    this.scriptProcess = this.game.scriptVm.loadScript(type, index);
    this.scriptProcess.start();
  }

  triggerEvent(eventId: number): boolean {
    return this.scriptProcess?.triggerEvent(eventId) ?? false;
  }

  callChapter(type: number, index: number, parentProcess = this.scriptProcess): ScriptProcess {
    logger.log('脚本', `callChapter GUT ${type}:${index}, 父进程=${parentProcess ? '有' : '无'}`);
    const childProcess = this.game.scriptVm.loadScript(type, index);
    childProcess.parent = parentProcess;
    this.scriptProcess = childProcess;
    childProcess.start();
    return childProcess;
  }

  handleScriptCallback(process: ScriptProcess): boolean {
    if (this.scriptProcess !== process) {
      logger.warn('脚本', 'CALLBACK 已忽略: process 不是当前进程');
      return false;
    }
    while (process.parent) {
      process.stop();
      process = process.parent;
    }
    process.stop();
    if (this.returnToMenuOnCallback) {
      logger.log('脚本', 'CALLBACK 返回开始菜单');
      this.returnToMenuOnCallback = false;
      this.scriptProcess = null;
      this.game.returnToMenu();
    }
    return true;
  }

  initFight(params: CombatInitFightParams): void {
    logger.log('遇敌', `初始化 怪物=${params.monsterTypes.filter(type => type > 0).join(',')} 背景=${params.scrb}`);
    this.game.combat.initFight(params);
  }

  fightEnable(): void {
    logger.log('遇敌', '开启随机战斗');
    this.game.combat.fightEnable();
  }

  fightDisable(): void {
    logger.log('遇敌', '关闭随机战斗');
    this.game.combat.fightDisable();
  }

  enterFight(params: CombatEnterFightParams, process: ScriptProcess): void {
    const scene = this.game.mainScene;
    if (!scene) throw new Error('主场景不存在，无法进入战斗');
    if (this.scriptProcess !== process) throw new Error('只有当前脚本进程可以启动战斗');
    logger.log(
      '战斗',
      `进入 怪物=${params.monsterTypes.filter(type => type > 0).join(',')}, 最大回合=${params.roundMax}, 胜利=${params.winAddress}, 失败=${params.lossAddress}`
    );
    process.pause();
    const nextCommandIndex = process.getCurrentCommandIndex();
    const session = this.game.combat.enterFight(
      params,
      result => {
        logger.log('战斗', `结束 结果=${result}`);
        if (result === 'win') process.gotoAddress(params.winAddress);
        if (result === 'loss') process.gotoAddress(params.lossAddress);
        // maxRound: 继续执行 ENTERFIGHT 的下一条指令
        // 回合事件会改变 currentIndex，需要恢复到战斗开始时的位置
        if (result === 'maxRound') process.gotoCommand(nextCommandIndex);
        if (result === 'flee') {
        }
        process.start();
      },
      eventId => {
        logger.log('战斗', `回合事件=${eventId}`);
        if (!process.triggerEvent(eventId)) return;
        process.step(0);
      }
    );
    scene.screenStack.push(new ScreenCombat(this.game, session));
  }

  startDebugCombat(params: CombatEnterFightParams): void {
    const scene = this.game.mainScene;
    if (!scene) throw new Error('主场景不存在，无法调试进入战斗');
    logger.log(
      '调试战斗',
      `进入 怪物=${params.monsterTypes.filter(type => type > 0).join(',')} 背景=${params.background.scrb}`
    );
    const session = this.game.combat.enterFight(
      params,
      result => {
        logger.log('调试战斗', `结束 结果=${result} 胜利=${params.winAddress} 失败=${params.lossAddress}`);
        if (result === 'loss') scene.showMessage('战斗失败');
      },
      eventId => {
        logger.log('调试战斗', `回合事件=${eventId}`);
      }
    );
    scene.screenStack.push(new ScreenCombat(this.game, session, { allowDebugWin: true }));
  }

  returnToParentScript(process: ScriptProcess): boolean {
    if (this.scriptProcess !== process) {
      logger.warn('脚本', 'returnToParent 已忽略: process 不是当前进程');
      return false;
    }
    const parent = process.parent;
    process.parent = null;
    process.stop();
    if (!parent) {
      logger.log('脚本', 'returnToParent 无父进程，返回开始菜单');
      this.scriptProcess = null;
      this.game.returnToMenu();
      return true;
    }
    this.scriptProcess = parent;
    parent.start();
    logger.log('脚本', 'returnToParent 恢复父进程');
    return true;
  }

  loadMap(type: number, index: number, screenX: number, screenY: number): void {
    const mapRes = this.game.datLib.getMap(type, index);
    if (!mapRes) {
      throw new Error(`Missing map ${type}:${index}`);
    }

    this.currentMapValue = mapRes;
    this.tileSetValue = this.loadTileSet(mapRes);
    this.game.state.mapType = type;
    this.game.state.mapIndex = index;
    this.game.state.mapScreenX = screenX;
    this.game.state.mapScreenY = screenY;
    this.game.state.sceneName = mapRes.mapName;
    logger.log('地图', `加载 ${type}:${index} ${mapRes.mapName || '未命名'} 屏幕=(${screenX},${screenY})`);

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
    this.setResourcePlayerMapPosition(
      player,
      this.game.state.mapScreenX + screenX,
      this.game.state.mapScreenY + screenY
    );
    this.refreshVisibleControlPlayer();
  }

  createNpc(id: number, resId: number, x: number, y: number): void {
    const npcRes = this.game.datLib.getNpc(resId);
    if (!npcRes) logger.warn('对象', `CREATENPC 资源缺失 ARS 2-${resId}, 编号=${id}`);
    const walkingSprite = npcRes?.walkingSprite ?? null;
    const direction = npcRes?.direction ?? Direction.South;
    const step = npcRes?.step ?? 0;
    const state = npcRes?.state ?? CharacterState.Stop;
    const delay = npcRes?.delay ?? 0;
    this.sceneObjectsValue.set(
      id,
      this.createSceneObject({
        id,
        eventId: id,
        kind: 'npc',
        x,
        y,
        resId,
        walkingSprite,
        direction,
        step,
        state,
        delay,
      })
    );
  }

  createBox(id: number, resId: number, x: number, y: number): void {
    const boxRes = this.game.datLib.getSceneObj(resId);
    if (!boxRes) logger.warn('对象', `CREATEBOX 资源缺失 ARS 4-${resId}, 编号=${id}`);
    const walkingSprite = boxRes?.walkingSprite ?? null;
    const direction = boxRes?.direction ?? Direction.North;
    const state = boxRes?.state ?? CharacterState.Stop;
    const delay = boxRes?.delay ?? 0;
    const step = this.game.isBoxCollected(this.getBoxEventKey(x, y, resId)) ? 2 : (boxRes?.step ?? 0);
    this.sceneObjectsValue.set(
      id,
      this.createSceneObject({
        id,
        eventId: id,
        kind: 'box',
        x,
        y,
        resId,
        walkingSprite,
        direction,
        step,
        state,
        delay,
      })
    );
  }

  deleteNpc(id: number): void {
    this.sceneObjectsValue.delete(id);
    this.actorMoveIntervals.delete(id);
  }

  deleteBox(id: number): void {
    this.sceneObjectsValue.delete(id);
    this.actorMoveIntervals.delete(id);
  }

  deleteAllNpc(): void {
    this.sceneObjectsValue.clear();
    this.actorMoveIntervals.clear();
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
    if (!obj) {
      this.warnMissingActor('MOVE', id);
      return;
    }
    obj.x = x;
    obj.y = y;
  }

  createMoveActorOperation(id: number, x: number, y: number): ScriptOperation | null {
    const actor = this.getActorPosition(id);
    if (!actor) return null;
    const moveInterval = this.getActorMoveInterval(id);
    let elapsed = moveInterval;

    return {
      update: delta => {
        elapsed += delta;
        if (elapsed < moveInterval) return true;
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

  setActorEvent(actorId: number, eventId: number): void {
    const obj = this.sceneObjectsValue.get(actorId);
    if (!obj) {
      this.warnMissingActor('ACTOREVENT', actorId);
      return;
    }
    obj.eventId = eventId;
  }

  setActorMoveInterval(actorId: number, speed: number): void {
    if (speed <= 0) {
      this.actorMoveIntervals.delete(actorId);
      return;
    }
    this.actorMoveIntervals.set(actorId, Math.max(20, Math.trunc(speed)));
  }

  faceActorTowardActor(actorId: number, targetActorId: number): void {
    const actor = this.getActorPosition(actorId);
    const target = this.getActorPosition(targetActorId);
    if (!actor) {
      this.warnMissingActor('FACETOFACE 来源', actorId);
      return;
    }
    if (!target) {
      this.warnMissingActor('FACETOFACE 目标', targetActorId);
      return;
    }
    if (actor.x < target.x) {
      this.setActorFacing(actorId, Direction.East);
      this.setActorFacing(targetActorId, Direction.West);
    } else if (actor.x > target.x) {
      this.setActorFacing(actorId, Direction.West);
      this.setActorFacing(targetActorId, Direction.East);
    }
    // C 引擎在横向判断后继续判断纵向；斜向时纵向会覆盖横向。
    if (actor.y < target.y) {
      this.setActorFacing(actorId, Direction.South);
      this.setActorFacing(targetActorId, Direction.North);
    } else if (actor.y > target.y) {
      this.setActorFacing(actorId, Direction.North);
      this.setActorFacing(targetActorId, Direction.South);
    }
  }

  setNpcMoveMode(id: number, state: number): void {
    const npc = this.sceneObjectsValue.get(id);
    if (!npc) {
      this.warnMissingActor('NPCMOVEMOD', id);
      return;
    }
    npc.state = toNpcMoveModeState(state);
    npc.stateElapsed = 0;
    npc.pauseRemaining = npc.delay * 100;
  }

  setActorPose(id: number, facing: Facing, step: number): void {
    if (id === 0) {
      this.facingValue = facing;
      this.playerStepValue = step;
      this.syncVisiblePlayer();
      return;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) {
      this.warnMissingActor('NPCSTEP', id);
      return;
    }
    obj.direction = facing;
    obj.step = step;
  }

  createActorPoseOperation(id: number, facing: Facing, step: number): ScriptOperation | null {
    const actor = this.getActorPosition(id);
    if (!actor) {
      this.warnMissingActor('NPCSTEP', id);
      return null;
    }
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
    const movieAnimation = this.game.datLib.getSrs(params.type, params.index);
    if (!movieAnimation) {
      logger.warn('动画', `MOVIE 资源缺失 SRS ${params.type}:${params.index}`);
      return;
    }

    movieAnimation.setIteratorNum(5);
    movieAnimation.start();

    let skipped = false;
    const skippable = (params.controlFlags & 1) === 1;
    const drawsOverScene = (params.controlFlags & 2) === 2;
    const frameSurface = new Surface(ORIGIN_SCREEN_WIDTH, ORIGIN_SCREEN_HEIGHT);

    const overlay: ScreenOverlay = {
      coversScreen: !drawsOverScene,
      draw: surface => {
        frameSurface.drawColor(COLOR_TRANSPARENT);
        movieAnimation.draw(frameSurface, params.x, params.y);
        surface.drawScaledSurface(frameSurface, 0, 0, MOVIE_SCREEN_SCALE);
      },
      onKey: () => {
        if (skippable) skipped = true;
      },
    };
    const operation: ScriptOperation = {
      update: delta => !skipped && movieAnimation.update(delta),
    };

    process.wait(this.withOverlay(operation, overlay));
  }

  clearOverlay(): void {
    this.overlayValue = null;
  }

  showLearnMagic(playerName: string, magicName: string, process: ScriptProcess): void {
    const page = new LearnMagicPage(this.game, playerName, magicName);
    let elapsed = 0;
    let skipped = false;
    const overlay: ScreenOverlay = {
      coversScreen: false,
      draw: surface => page.draw(surface),
      onKey: () => { skipped = true; },
    };
    const operation: ScriptOperation = {
      update: delta => {
        if (skipped) return false;
        elapsed += delta;
        return elapsed < 1000;
      },
    };
    process.wait(this.withOverlay(operation, overlay));
  }

  openBox(id: number): void {
    const obj = this.sceneObjectsValue.get(id);
    if (!obj || obj.kind !== 'box') {
      logger.warn('对象', `BOXOPEN 目标不是箱子，编号=${id}`);
      return;
    }
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

    this.facingValue = Direction.West;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x - 1, y);
    this.stepActorPose(0, Direction.West);
    if (!this.canPlayerStepTo(x - 1, y)) return;
    this.setPlayerMapPosition(x - 1, y);
    if (this.getPlayerScreenPosition().x <= PLAYER_SCREEN_X) {
      this.game.state.mapScreenX -= 1;
    }
  }

  private walkRight(): void {
    if (!this.currentMapValue) return;

    this.facingValue = Direction.East;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x + 1, y);
    this.stepActorPose(0, Direction.East);
    if (!this.canPlayerStepTo(x + 1, y)) return;
    this.setPlayerMapPosition(x + 1, y);
    if (this.getPlayerScreenPosition().x >= PLAYER_SCREEN_X) {
      this.game.state.mapScreenX += 1;
    }
  }

  private walkUp(): void {
    if (!this.currentMapValue) return;

    this.facingValue = Direction.North;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x, y - 1);
    this.stepActorPose(0, Direction.North);
    if (!this.canPlayerStepTo(x, y - 1)) return;
    this.setPlayerMapPosition(x, y - 1);
    if (this.getPlayerScreenPosition().y <= PLAYER_SCREEN_Y) {
      this.game.state.mapScreenY -= 1;
    }
  }

  private walkDown(): void {
    if (!this.currentMapValue) return;

    this.facingValue = Direction.South;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x, y + 1);
    this.stepActorPose(0, Direction.South);
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
    const scriptEventId = eventId + 40;
    const message = `坐标=(${x},${y}) 地图事件=${eventId} 脚本事件=${scriptEventId}`;
    if (!this.scriptProcess?.hasRegisteredEvent(scriptEventId)) {
      logger.log('地图事件', `${message} 无脚本处理`);
      return;
    }
    const triggered = this.scriptProcess.triggerEvent(scriptEventId);
    if (triggered) {
      logger.log('地图事件', message);
    } else {
      logger.warn('地图事件', `${message} 未触发`);
    }
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
      if (obj.eventId <= 0) {
        logger.log('对象事件', `${obj.kind} 编号=${obj.id} 无事件`);
        return;
      }
      const triggered = this.scriptProcess?.triggerEvent(obj.eventId) ?? false;
      if (!triggered) {
        logger.warn('对象事件', `${obj.kind} 编号=${obj.id} 事件=${obj.eventId} 未触发`);
      } else {
        logger.log('对象事件', `${obj.kind} 编号=${obj.id} 事件=${obj.eventId}`);
      }
      return;
    }
    this.triggerMapEvent(pos.x, pos.y);
  }

  private canPlayerStepTo(x: number, y: number): boolean {
    const map = this.currentMapValue;
    if (!map || !this.isWithinBypassBounds(x, y, map)) return false;
    if (this.canPlayerWalkNormally(x, y)) return true;
    if (this.hasSceneObjectAt(x, y)) return false;
    return this.game.state.allowWallWalking || this.isPlayerStuck();
  }

  private canPlayerWalkNormally(x: number, y: number): boolean {
    return this.currentMapValue?.canPlayerWalk(x, y) === true && !this.hasSceneObjectAt(x, y);
  }

  private isPlayerStuck(): boolean {
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    return (
      !this.canPlayerWalkNormally(x - 1, y) &&
      !this.canPlayerWalkNormally(x + 1, y) &&
      !this.canPlayerWalkNormally(x, y - 1) &&
      !this.canPlayerWalkNormally(x, y + 1)
    );
  }

  private isWithinBypassBounds(x: number, y: number, map: ResMap): boolean {
    return (
      x >= -WALL_WALKING_BOUNDARY_OFFSET &&
      x < map.mapWidth + WALL_WALKING_BOUNDARY_OFFSET &&
      y >= -WALL_WALKING_BOUNDARY_OFFSET &&
      y < map.mapHeight + WALL_WALKING_BOUNDARY_OFFSET
    );
  }

  private hasSceneObjectAt(x: number, y: number): boolean {
    return this.getSceneObjectAt(x, y) !== null;
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
      case Direction.West:
        x -= 1;
        break;
      case Direction.East:
        x += 1;
        break;
      case Direction.North:
        y -= 1;
        break;
      case Direction.South:
        y += 1;
        break;
    }

    return { x, y };
  }

  private getBoxEventKey(x: number, y: number, resId: number): string {
    return `${this.game.state.mapType}_${this.game.state.mapIndex}_${x}_${y}_4_${resId}`;
  }

  private loadTileSet(map: ResMap): ResImage | null {
    return this.game.datLib.getImage(ResourceType.TIL, 1, map.tilIndex);
  }

  private setPlayerMapPosition(mapX: number, mapY: number): void {
    this.setVisiblePlayerMapPosition(mapX, mapY);
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

  private getActorMoveInterval(id: number): number {
    return this.actorMoveIntervals.get(id) ?? SCRIPT_MOVE_INTERVAL;
  }

  private createSceneObjectSnapshot(obj: SceneObject): SceneObjectSnapshot {
    return {
      id: obj.id,
      eventId: obj.eventId,
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
    let walkingSprite: WalkingSprite | null = null;
    if (snapshot.kind === 'npc') {
      const res = this.game.datLib.getNpc(snapshot.resId);
      if (!res) throw new Error(`读档 NPC 资源不存在: ARS 2-${snapshot.resId}`);
      walkingSprite = res.walkingSprite;
    } else {
      const res = this.game.datLib.getSceneObj(snapshot.resId);
      if (!res) throw new Error(`读档场景物件资源不存在: ARS 4-${snapshot.resId}`);
      walkingSprite = res.walkingSprite;
    }
    return {
      ...snapshot,
      eventId: snapshot.eventId ?? snapshot.id,
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

  private warnMissingActor(action: string, id: number): void {
    logger.warn('对象', `${action} 目标不存在，编号=${id}`);
  }
}

function getFacingToward(x: number, y: number, targetX: number, targetY: number): Facing {
  if (targetX < x) return Direction.West;
  if (targetX > x) return Direction.East;
  if (targetY < y) return Direction.North;
  return Direction.South;
}

function toNpcMoveModeState(mode: number): CharacterState {
  if (mode === 0) return CharacterState.Stop;
  if (mode === 1) return CharacterState.Pause;
  return CharacterState.Active;
}

function getNextX(x: number, facing: Facing): number {
  if (facing === Direction.West) return x - 1;
  if (facing === Direction.East) return x + 1;
  return x;
}

function getNextY(y: number, facing: Facing): number {
  if (facing === Direction.North) return y - 1;
  if (facing === Direction.South) return y + 1;
  return y;
}

function randomFacing(): Facing {
  switch (Math.trunc(Math.random() * 4)) {
    case 0:
      return Direction.North;
    case 1:
      return Direction.East;
    case 2:
      return Direction.South;
    default:
      return Direction.West;
  }
}
