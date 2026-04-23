import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResMap } from '@/lib/res-map';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import { MAP_TILE_SIZE, MAP_VIEW_TILE_HEIGHT, MAP_VIEW_TILE_WIDTH, SCREEN_WIDTH } from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from './base-screen';

type Facing = typeof KeyCode.Up | typeof KeyCode.Down | typeof KeyCode.Left | typeof KeyCode.Right;

const PLAYER_SCREEN_X = 9;
const PLAYER_SCREEN_Y = 5;
const HUD_HEIGHT = 16;
const PLAYER_WIDTH = 10;
const PLAYER_HEIGHT = 12;

// 这是接脚本前的最小主场景，只负责把地图和移动链路跑通。
export class ScreenMainGame extends BaseScreen {
  private readonly currentMap: ResMap;
  private readonly tileSet: ResImage | null;
  private playerMapX: number;
  private playerMapY: number;
  private facing: Facing = KeyCode.Down;

  constructor(game: Game) {
    super(game);
    const mapRes = this.game.datLib.getRes(ResourceType.MAP, this.game.state.mapType, this.game.state.mapIndex);
    if (!(mapRes instanceof ResMap)) {
      throw new Error(`Missing map ${this.game.state.mapType}:${this.game.state.mapIndex}`);
    }

    this.currentMap = mapRes;
    this.tileSet = this.loadTileSet();
    this.game.state.sceneName ||= this.currentMap.mapName;

    const start = this.resolveStartPosition(this.game.state.playerMapX, this.game.state.playerMapY);
    this.playerMapX = start.x;
    this.playerMapY = start.y;
    this.centerOnPlayer();
  }

  draw(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.drawMap(surface);
    this.drawPlayer(surface);
    this.drawHud(surface);
  }

  override onKeyDown(key: KeyCode): void {
    switch (key) {
      case KeyCode.Left:
        this.movePlayer(-1, 0, KeyCode.Left);
        return;
      case KeyCode.Right:
        this.movePlayer(1, 0, KeyCode.Right);
        return;
      case KeyCode.Up:
        this.movePlayer(0, -1, KeyCode.Up);
        return;
      case KeyCode.Down:
        this.movePlayer(0, 1, KeyCode.Down);
        return;
    }
  }

  private drawMap(surface: Surface): void {
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
    const left = PLAYER_SCREEN_X * MAP_TILE_SIZE + Math.floor((MAP_TILE_SIZE - PLAYER_WIDTH) / 2);
    const top = PLAYER_SCREEN_Y * MAP_TILE_SIZE + (MAP_TILE_SIZE - PLAYER_HEIGHT);
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
    const text = `${this.game.state.sceneName} ${this.playerMapX},${this.playerMapY}`;
    surface.fillRect(0, 0, SCREEN_WIDTH, HUD_HEIGHT, COLOR_WHITE);
    TextRender.drawText(surface, text, 4, 0);
  }

  private movePlayer(dx: number, dy: number, facing: Facing): void {
    this.facing = facing;
    const nextX = this.playerMapX + dx;
    const nextY = this.playerMapY + dy;
    if (!this.currentMap.canPlayerWalk(nextX, nextY)) return;

    this.playerMapX = nextX;
    this.playerMapY = nextY;
    this.centerOnPlayer();
  }

  private centerOnPlayer(): void {
    this.game.state.playerMapX = this.playerMapX;
    this.game.state.playerMapY = this.playerMapY;
    const maxX = Math.max(0, this.currentMap.mapWidth - MAP_VIEW_TILE_WIDTH);
    const maxY = Math.max(0, this.currentMap.mapHeight - MAP_VIEW_TILE_HEIGHT);
    this.game.state.mapScreenX = clamp(this.playerMapX - PLAYER_SCREEN_X, 0, maxX);
    this.game.state.mapScreenY = clamp(this.playerMapY - PLAYER_SCREEN_Y, 0, maxY);
  }

  private loadTileSet(): ResImage | null {
    const tileRes = this.game.datLib.getRes(ResourceType.TIL, 1, this.currentMap.tilIndex);
    return tileRes instanceof ResImage ? tileRes : null;
  }

  private resolveStartPosition(x: number, y: number): { x: number; y: number } {
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
