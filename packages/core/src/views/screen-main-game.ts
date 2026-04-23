import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResMap } from '@/lib/res-map';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import type { ScriptProcess } from '@/script/script-process';
import { MAP_TILE_SIZE, MAP_VIEW_TILE_HEIGHT, MAP_VIEW_TILE_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from './base-screen';

type Facing = typeof KeyCode.Up | typeof KeyCode.Down | typeof KeyCode.Left | typeof KeyCode.Right;

const PLAYER_SCREEN_X = 9;
const PLAYER_SCREEN_Y = 5;
const HUD_LEFT = 2;
const HUD_TOP = 2;
const HUD_LINE_GAP = 16;
const PLAYER_WIDTH = 10;
const PLAYER_HEIGHT = 12;

// 这是当前最小主场景，负责承接启动章节、地图和占位主角移动。
export class ScreenMainGame extends BaseScreen {
  private currentMap: ResMap | null = null;
  private tileSet: ResImage | null = null;
  private scriptProcess: ScriptProcess | null = null;
  private playerMapX = 0;
  private playerMapY = 0;
  private hasPlayer = false;
  private facing: Facing = KeyCode.Down;

  constructor(game: Game) {
    super(game);
    if (this.game.state.mapType > 0 && this.game.state.mapIndex > 0) {
      this.loadMap(
        this.game.state.mapType,
        this.game.state.mapIndex,
        this.game.state.mapScreenX,
        this.game.state.mapScreenY
      );
    }

    if (this.game.state.playerMapX > 0 || this.game.state.playerMapY > 0) {
      this.hasPlayer = true;
      this.setPlayerMapPosition(this.game.state.playerMapX, this.game.state.playerMapY);
    }
  }

  override update(delta: number): void {
    void delta;
    this.scriptProcess?.step();
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.drawMap(surface);
    if (this.hasPlayer) {
      this.drawPlayer(surface);
    }
    this.drawHud(surface);
  }

  override onKeyDown(key: KeyCode): void {
    if (this.scriptProcess?.running || !this.currentMap || !this.hasPlayer) {
      return;
    }

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

  private drawMap(surface: Surface): void {
    if (!this.currentMap) return;

    for (let y = 0; y < MAP_VIEW_TILE_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_VIEW_TILE_WIDTH; x += 1) {
        const mapX = this.game.state.mapScreenX + x;
        const mapY = this.game.state.mapScreenY + y;
        const drawX = x * MAP_TILE_SIZE;
        const drawY = y * MAP_TILE_SIZE;

        if (this.tileSet) {
          const tileX = clamp(mapX, 0, this.currentMap.mapWidth - 1);
          const tileY = clamp(mapY, 0, this.currentMap.mapHeight - 1);
          const tileIndex = this.currentMap.getTileIndex(tileX, tileY);
          if (tileIndex >= 0) {
            this.tileSet.draw(surface, tileIndex + 1, drawX, drawY);
            continue;
          }
        }

        const walkable = this.currentMap.canWalk(mapX, mapY);
        surface.fillRect(drawX, drawY, MAP_TILE_SIZE, MAP_TILE_SIZE, walkable ? COLOR_WHITE : COLOR_BLACK);
      }
    }
  }

  private drawPlayer(surface: Surface): void {
    const pos = this.getPlayerScreenPosition();
    const left = pos.x * MAP_TILE_SIZE + Math.floor((MAP_TILE_SIZE - PLAYER_WIDTH) / 2);
    const top = pos.y * MAP_TILE_SIZE + (MAP_TILE_SIZE - PLAYER_HEIGHT);
    surface.fillRect(left, top, PLAYER_WIDTH, PLAYER_HEIGHT, COLOR_BLACK);
    surface.fillRect(left + 1, top + 1, PLAYER_WIDTH - 2, PLAYER_HEIGHT - 2, COLOR_WHITE);

    switch (this.facing) {
      case KeyCode.Left:
        surface.fillRect(left + 1, top + 5, 3, 2, COLOR_BLACK);
        return;
      case KeyCode.Right:
        surface.fillRect(left + PLAYER_WIDTH - 4, top + 5, 3, 2, COLOR_BLACK);
        return;
      case KeyCode.Up:
        surface.fillRect(left + 4, top + 1, 2, 3, COLOR_BLACK);
        return;
      case KeyCode.Down:
        surface.fillRect(left + 4, top + PLAYER_HEIGHT - 4, 2, 3, COLOR_BLACK);
        return;
    }
  }

  private drawHud(surface: Surface): void {
    const mapName = this.game.state.sceneName || this.currentMap?.mapName || 'Map';
    TextRender.drawText(surface, mapName, HUD_LEFT, HUD_TOP);

    if (!this.hasPlayer) return;
    TextRender.drawText(surface, `${this.playerMapX},${this.playerMapY}`, HUD_LEFT, HUD_TOP + HUD_LINE_GAP);
  }

  private walkLeft(): void {
    if (!this.currentMap) return;

    this.facing = KeyCode.Left;
    const x = this.playerMapX;
    const y = this.playerMapY;
    if (!this.currentMap.canPlayerWalk(x - 1, y)) return;

    this.setPlayerMapPosition(x - 1, y);
    if (this.getPlayerScreenPosition().x <= PLAYER_SCREEN_X) {
      this.game.state.mapScreenX -= 1;
    }
  }

  private walkRight(): void {
    if (!this.currentMap) return;

    this.facing = KeyCode.Right;
    const x = this.playerMapX;
    const y = this.playerMapY;
    if (!this.currentMap.canPlayerWalk(x + 1, y)) return;

    this.setPlayerMapPosition(x + 1, y);
    if (this.getPlayerScreenPosition().x >= PLAYER_SCREEN_X) {
      this.game.state.mapScreenX += 1;
    }
  }

  private walkUp(): void {
    if (!this.currentMap) return;

    this.facing = KeyCode.Up;
    const x = this.playerMapX;
    const y = this.playerMapY;
    if (!this.currentMap.canPlayerWalk(x, y - 1)) return;

    this.setPlayerMapPosition(x, y - 1);
    if (this.getPlayerScreenPosition().y <= PLAYER_SCREEN_Y) {
      this.game.state.mapScreenY -= 1;
    }
  }

  private walkDown(): void {
    if (!this.currentMap) return;

    this.facing = KeyCode.Down;
    const x = this.playerMapX;
    const y = this.playerMapY;
    if (!this.currentMap.canPlayerWalk(x, y + 1)) return;

    this.setPlayerMapPosition(x, y + 1);
    if (this.getPlayerScreenPosition().y >= PLAYER_SCREEN_Y) {
      this.game.state.mapScreenY += 1;
    }
  }

  startChapter(type: number, index: number): void {
    this.scriptProcess?.stop();
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

    this.currentMap = mapRes;
    this.tileSet = this.loadTileSet(mapRes);
    this.game.state.mapType = type;
    this.game.state.mapIndex = index;
    this.game.state.mapScreenX = screenX;
    this.game.state.mapScreenY = screenY;
    this.game.state.sceneName ||= mapRes.mapName;

    if (this.hasPlayer) {
      this.setPlayerMapPosition(screenX + PLAYER_SCREEN_X, screenY + PLAYER_SCREEN_Y);
    }
  }

  createActor(screenActorId: number, screenX: number, screenY: number): void {
    if (screenActorId < 0) return;
    this.hasPlayer = true;
    this.setPlayerMapPosition(this.game.state.mapScreenX + screenX, this.game.state.mapScreenY + screenY);
  }

  setPlayerFacing(facing: Facing): void {
    this.facing = facing;
  }

  setSceneName(name: string): void {
    this.game.state.sceneName = name;
  }

  private getPlayerScreenPosition(): { x: number; y: number } {
    return {
      x: this.playerMapX - this.game.state.mapScreenX,
      y: this.playerMapY - this.game.state.mapScreenY,
    };
  }

  private loadTileSet(map: ResMap): ResImage | null {
    const tileRes = this.game.datLib.getRes(ResourceType.TIL, 1, map.tilIndex);
    return tileRes instanceof ResImage ? tileRes : null;
  }

  private setPlayerMapPosition(mapX: number, mapY: number): void {
    const start = this.resolveStartPosition(mapX, mapY);
    this.playerMapX = start.x;
    this.playerMapY = start.y;
    this.game.state.playerMapX = start.x;
    this.game.state.playerMapY = start.y;
  }

  private resolveStartPosition(x: number, y: number): { x: number; y: number } {
    if (!this.currentMap) {
      return { x, y };
    }

    if (this.currentMap.canPlayerWalk(x, y)) {
      return { x, y };
    }

    for (let radius = 1; radius <= 8; radius += 1) {
      for (let dy = -radius; dy <= radius; dy += 1) {
        for (let dx = -radius; dx <= radius; dx += 1) {
          const nextX = x + dx;
          const nextY = y + dy;
          if (this.currentMap.canPlayerWalk(nextX, nextY)) {
            return { x: nextX, y: nextY };
          }
        }
      }
    }

    return {
      x: clamp(x, 0, this.currentMap.mapWidth - 1),
      y: clamp(y, 0, this.currentMap.mapHeight - 1),
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
