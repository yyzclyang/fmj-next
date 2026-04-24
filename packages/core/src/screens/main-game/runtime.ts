import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResMap } from '@/lib/res-map';
import { ResourceType } from '@/lib/resource-utils';
import type { ScriptOperation, ScriptProcess } from '@/script/script-process';
import { MAP_VIEW_TILE_HEIGHT, MAP_VIEW_TILE_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { clamp } from '@/shared/math';

export type Facing = typeof KeyCode.Up | typeof KeyCode.Down | typeof KeyCode.Left | typeof KeyCode.Right;
export type SceneObjectKind = 'npc' | 'box';

export interface SceneObject {
  id: number;
  kind: SceneObjectKind;
  x: number;
  y: number;
  resId: number;
  direction: Facing;
  step: number;
}

const PLAYER_SCREEN_X = 9;
const PLAYER_SCREEN_Y = 5;
const SCRIPT_MOVE_INTERVAL = 100;
const SCRIPT_POSE_WAIT = 300;

// 主场景运行时只负责地图、对象、交互和脚本入口，不处理具体 UI。
export class MainSceneRuntime {
  private currentMapValue: ResMap | null = null;
  private tileSetValue: ResImage | null = null;
  private scriptProcess: ScriptProcess | null = null;
  private readonly sceneObjectsValue = new Map<number, SceneObject>();
  private playerMapXValue = 0;
  private playerMapYValue = 0;
  private hasPlayerValue = false;
  private facingValue: Facing = KeyCode.Down;
  private playerStepValue = 0;

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

  update(delta = 0): void {
    this.scriptProcess?.step(delta);
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
    this.game.clearPendingBoxEvent();
    this.game.state.scriptType = type;
    this.game.state.scriptIndex = index;
    this.scriptProcess = this.game.scriptVm.loadScript(type, index);
    this.scriptProcess.start();
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

  createActor(screenActorId: number, screenX: number, screenY: number): void {
    if (screenActorId < 0) return;
    this.hasPlayerValue = true;
    this.playerStepValue = 0;
    this.setPlayerMapPosition(this.game.state.mapScreenX + screenX, this.game.state.mapScreenY + screenY);
  }

  createNpc(id: number, resId: number, x: number, y: number): void {
    this.sceneObjectsValue.set(id, { id, kind: 'npc', x, y, resId, direction: KeyCode.Down, step: 0 });
  }

  createBox(id: number, resId: number, x: number, y: number): void {
    const step = this.game.isBoxCollected(this.getBoxEventKey(x, y, resId)) ? 2 : 0;
    this.sceneObjectsValue.set(id, { id, kind: 'box', x, y, resId, direction: KeyCode.Down, step });
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
        this.stepActorPose(id, facing);
        this.setActorMapPosition(id, getNextX(pos.x, facing), getNextY(pos.y, facing));
        return true;
      },
    };
  }

  setActorPose(id: number, facing: Facing, step: number): void {
    if (id === 0) {
      this.facingValue = facing;
      this.playerStepValue = step;
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
    this.playerStepValue = 0;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x - 1, y);
    if (!this.canPlayerStepTo(x - 1, y)) return;

    this.setPlayerMapPosition(x - 1, y);
    if (this.getPlayerScreenPosition().x <= PLAYER_SCREEN_X) {
      this.game.state.mapScreenX -= 1;
    }
  }

  private walkRight(): void {
    if (!this.currentMapValue) return;

    this.facingValue = KeyCode.Right;
    this.playerStepValue = 0;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x + 1, y);
    if (!this.canPlayerStepTo(x + 1, y)) return;

    this.setPlayerMapPosition(x + 1, y);
    if (this.getPlayerScreenPosition().x >= PLAYER_SCREEN_X) {
      this.game.state.mapScreenX += 1;
    }
  }

  private walkUp(): void {
    if (!this.currentMapValue) return;

    this.facingValue = KeyCode.Up;
    this.playerStepValue = 0;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x, y - 1);
    if (!this.canPlayerStepTo(x, y - 1)) return;

    this.setPlayerMapPosition(x, y - 1);
    if (this.getPlayerScreenPosition().y <= PLAYER_SCREEN_Y) {
      this.game.state.mapScreenY -= 1;
    }
  }

  private walkDown(): void {
    if (!this.currentMapValue) return;

    this.facingValue = KeyCode.Down;
    this.playerStepValue = 0;
    const x = this.playerMapXValue;
    const y = this.playerMapYValue;
    this.triggerMapEvent(x, y + 1);
    if (!this.canPlayerStepTo(x, y + 1)) return;

    this.setPlayerMapPosition(x, y + 1);
    if (this.getPlayerScreenPosition().y >= PLAYER_SCREEN_Y) {
      this.game.state.mapScreenY += 1;
    }
  }

  private triggerMapEvent(x: number, y: number): void {
    const eventId = this.currentMapValue?.getEventNum(x, y) ?? 0;
    if (eventId <= 0) return;
    this.scriptProcess?.triggerEvent(eventId + 40);
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
    this.playerMapXValue = start.x;
    this.playerMapYValue = start.y;
    this.game.state.playerMapX = start.x;
    this.game.state.playerMapY = start.y;
  }

  private getActorPosition(id: number): { x: number; y: number } | null {
    if (id === 0) {
      return this.hasPlayerValue ? { x: this.playerMapXValue, y: this.playerMapYValue } : null;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return null;
    return { x: obj.x, y: obj.y };
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

  private stepActorPose(id: number, facing: Facing): void {
    if (id === 0) {
      this.facingValue = facing;
      this.playerStepValue = (this.playerStepValue + 1) % 4;
      return;
    }

    const obj = this.sceneObjectsValue.get(id);
    if (!obj) return;
    obj.direction = facing;
    obj.step = (obj.step + 1) % 4;
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
