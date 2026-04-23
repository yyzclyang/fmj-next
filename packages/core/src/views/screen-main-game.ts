import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResMap } from '@/lib/res-map';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import type { ScriptProcess } from '@/script/script-process';
import {
  MAP_TILE_SIZE,
  MAP_VIEW_TILE_HEIGHT,
  MAP_VIEW_TILE_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from './base-screen';

type Facing = typeof KeyCode.Up | typeof KeyCode.Down | typeof KeyCode.Left | typeof KeyCode.Right;
type SceneObjectKind = 'npc' | 'box';

interface SceneObject {
  id: number;
  kind: SceneObjectKind;
  x: number;
  y: number;
  resId: number;
}

interface DialogueState {
  pages: string[];
  pageIndex: number;
  onClose: () => void;
}

interface GutState {
  topImage: ResImage | null;
  bottomImage: ResImage | null;
  lines: string[];
  scrollY: number;
  step: number;
  interval: number;
  elapsed: number;
  onClose: () => void;
}

const PLAYER_SCREEN_X = 9;
const PLAYER_SCREEN_Y = 5;
const MAP_INFO_LEFT = 2;
const MAP_INFO_TOP = 2;
const MAP_INFO_LINE_GAP = 16;
const PLAYER_WIDTH = 10;
const PLAYER_HEIGHT = 12;
const NPC_WIDTH = 10;
const NPC_HEIGHT = 12;
const BOX_WIDTH = 12;
const BOX_HEIGHT = 10;
const GUT_DEFAULT_STEP = 1;
const GUT_FAST_STEP = 3;
const GUT_DEFAULT_INTERVAL = 50;
const GUT_FAST_INTERVAL = 20;
const GUT_TEXT_SIDE_PADDING = 16;
const GUT_SECTION_GAP = 6;
// 对话框先固定在底部区域，后面接正式界面时再替换样式。
const DIALOG_LEFT = 18;
const DIALOG_TOP = 110;
const DIALOG_WIDTH = 284;
const DIALOG_HEIGHT = 72;
const DIALOG_TEXT_LEFT = DIALOG_LEFT + 10;
const DIALOG_TEXT_TOP = DIALOG_TOP + 8;
const DIALOG_TEXT_WIDTH = DIALOG_WIDTH - 20;
const DIALOG_PAGE_LINES = 4;
const DIALOG_LINE_GAP = 16;

// 这是当前最小主场景，负责承接启动章节、地图和占位主角移动。
export class ScreenMainGame extends BaseScreen {
  private currentMap: ResMap | null = null;
  private tileSet: ResImage | null = null;
  private scriptProcess: ScriptProcess | null = null;
  // 非主角场景对象先统一用占位块表示，后面接正式资源时再细化。
  private readonly sceneObjects = new Map<number, SceneObject>();
  private playerMapX = 0;
  private playerMapY = 0;
  private hasPlayer = false;
  private facing: Facing = KeyCode.Down;
  private dialogue: DialogueState | null = null;
  private gut: GutState | null = null;

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
    this.updateGut(delta);
    if (this.gut) return;
    void delta;
    this.scriptProcess?.step();
  }

  draw(surface: Surface): void {
    if (this.gut) {
      this.drawGut(surface);
      return;
    }

    surface.drawColor(COLOR_WHITE);
    this.drawMap(surface);
    this.drawSceneObjects(surface);
    if (this.hasPlayer) {
      this.drawPlayer(surface);
    }
    this.drawMapInfo(surface);
    this.drawDialogue(surface);
  }

  override onKeyDown(key: KeyCode): void {
    if (this.gut) {
      this.handleGutKeyDown();
      return;
    }

    if (this.dialogue) {
      this.advanceDialogue();
      return;
    }

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

  override onKeyUp(key: KeyCode): void {
    if (!this.gut) return;
    this.handleGutKeyUp(key);
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

  private drawSceneObjects(surface: Surface): void {
    for (const obj of this.sceneObjects.values()) {
      const screenX = obj.x - this.game.state.mapScreenX;
      const screenY = obj.y - this.game.state.mapScreenY;
      if (screenX < 0 || screenX >= MAP_VIEW_TILE_WIDTH || screenY < 0 || screenY >= MAP_VIEW_TILE_HEIGHT) {
        continue;
      }

      if (obj.kind === 'box') {
        this.drawBox(surface, screenX, screenY);
        continue;
      }

      this.drawNpc(surface, screenX, screenY);
    }
  }

  private drawNpc(surface: Surface, screenX: number, screenY: number): void {
    const left = screenX * MAP_TILE_SIZE + Math.floor((MAP_TILE_SIZE - NPC_WIDTH) / 2);
    const top = screenY * MAP_TILE_SIZE + (MAP_TILE_SIZE - NPC_HEIGHT);
    surface.fillRect(left, top, NPC_WIDTH, NPC_HEIGHT, COLOR_BLACK);
    surface.fillRect(left + 1, top + 1, NPC_WIDTH - 2, NPC_HEIGHT - 2, COLOR_WHITE);
    surface.fillRect(left + 4, top + 4, 2, 2, COLOR_BLACK);
  }

  private drawBox(surface: Surface, screenX: number, screenY: number): void {
    const left = screenX * MAP_TILE_SIZE + Math.floor((MAP_TILE_SIZE - BOX_WIDTH) / 2);
    const top = screenY * MAP_TILE_SIZE + (MAP_TILE_SIZE - BOX_HEIGHT);
    surface.fillRect(left, top, BOX_WIDTH, BOX_HEIGHT, COLOR_BLACK);
    surface.fillRect(left + 1, top + 1, BOX_WIDTH - 2, BOX_HEIGHT - 2, COLOR_WHITE);
    surface.fillRect(left + 1, top + 3, BOX_WIDTH - 2, 1, COLOR_BLACK);
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

  private drawMapInfo(surface: Surface): void {
    const mapName = this.game.state.sceneName || this.currentMap?.mapName || 'Map';
    TextRender.drawText(surface, mapName, MAP_INFO_LEFT, MAP_INFO_TOP);

    if (!this.hasPlayer) return;
    TextRender.drawText(
      surface,
      `${this.playerMapX},${this.playerMapY}`,
      MAP_INFO_LEFT,
      MAP_INFO_TOP + MAP_INFO_LINE_GAP
    );
  }

  private drawGut(surface: Surface): void {
    const gut = this.gut;
    if (!gut) return;
    const layout = getGutLayout(gut);

    surface.drawColor(COLOR_WHITE);

    for (let i = 0; i < gut.lines.length; i += 1) {
      const top = gut.scrollY + i * 16;
      if (top + 16 <= layout.textTop || top >= layout.textBottom) {
        continue;
      }
      TextRender.drawText(surface, gut.lines[i] ?? '', layout.textLeft, top);
    }

    if (layout.textTop > 0) {
      surface.fillRect(0, 0, SCREEN_WIDTH, layout.textTop, COLOR_WHITE);
    }
    if (layout.textBottom < SCREEN_HEIGHT) {
      surface.fillRect(0, layout.textBottom, SCREEN_WIDTH, SCREEN_HEIGHT - layout.textBottom, COLOR_WHITE);
    }

    gut.topImage?.draw(surface, 1, layout.topImageLeft, 0);
    gut.bottomImage?.draw(surface, 1, layout.bottomImageLeft, layout.bottomImageTop);
  }

  private drawDialogue(surface: Surface): void {
    if (!this.dialogue) return;

    surface.fillRect(DIALOG_LEFT, DIALOG_TOP, DIALOG_WIDTH, DIALOG_HEIGHT, COLOR_BLACK);
    surface.fillRect(DIALOG_LEFT + 1, DIALOG_TOP + 1, DIALOG_WIDTH - 2, DIALOG_HEIGHT - 2, COLOR_WHITE);

    const page = this.dialogue.pages[this.dialogue.pageIndex] ?? '';
    const lines = page.split('\n');
    for (let i = 0; i < lines.length; i += 1) {
      TextRender.drawText(surface, lines[i] ?? '', DIALOG_TEXT_LEFT, DIALOG_TEXT_TOP + i * DIALOG_LINE_GAP);
    }
  }

  private walkLeft(): void {
    if (!this.currentMap) return;

    this.facing = KeyCode.Left;
    const x = this.playerMapX;
    const y = this.playerMapY;
    this.triggerMapEvent(x - 1, y);
    if (!this.canPlayerStepTo(x - 1, y)) return;

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
    this.triggerMapEvent(x + 1, y);
    if (!this.canPlayerStepTo(x + 1, y)) return;

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
    this.triggerMapEvent(x, y - 1);
    if (!this.canPlayerStepTo(x, y - 1)) return;

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
    this.triggerMapEvent(x, y + 1);
    if (!this.canPlayerStepTo(x, y + 1)) return;

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
    this.sceneObjects.clear();
    this.dialogue = null;
    this.gut = null;
    this.game.state.mapType = type;
    this.game.state.mapIndex = index;
    this.game.state.mapScreenX = screenX;
    this.game.state.mapScreenY = screenY;
    this.game.state.sceneName = mapRes.mapName;

    if (this.hasPlayer) {
      this.setPlayerMapPosition(screenX + PLAYER_SCREEN_X, screenY + PLAYER_SCREEN_Y);
    }
  }

  createActor(screenActorId: number, screenX: number, screenY: number): void {
    if (screenActorId < 0) return;
    this.hasPlayer = true;
    this.setPlayerMapPosition(this.game.state.mapScreenX + screenX, this.game.state.mapScreenY + screenY);
  }

  createNpc(id: number, resId: number, x: number, y: number): void {
    this.sceneObjects.set(id, { id, kind: 'npc', x, y, resId });
  }

  createBox(id: number, resId: number, x: number, y: number): void {
    this.sceneObjects.set(id, { id, kind: 'box', x, y, resId });
  }

  deleteNpc(id: number): void {
    this.sceneObjects.delete(id);
  }

  deleteAllNpc(): void {
    for (const [id, obj] of this.sceneObjects.entries()) {
      if (obj.kind === 'npc') {
        this.sceneObjects.delete(id);
      }
    }
  }

  moveActor(id: number, x: number, y: number): void {
    if (id === 0) {
      this.setPlayerMapPosition(x, y);
      return;
    }

    const obj = this.sceneObjects.get(id);
    if (!obj) return;
    obj.x = x;
    obj.y = y;
  }

  showDialogue(text: string, onClose: () => void): void {
    const pages = paginateDialogue(text);
    if (pages.length === 0) {
      onClose();
      return;
    }

    this.dialogue = {
      pages,
      pageIndex: 0,
      onClose,
    };
  }

  showGut(topImageIndex: number, bottomImageIndex: number, text: string, onClose: () => void): void {
    const topImage = this.loadPicture(topImageIndex);
    const bottomImage = this.loadPicture(bottomImageIndex);
    const layout = getGutLayout({
      topImage,
      bottomImage,
      lines: [],
      scrollY: 0,
      step: 0,
      interval: 0,
      elapsed: 0,
      onClose,
    });
    const lines = wrapTextBlock(text, layout.textWidth);

    this.gut = {
      topImage,
      bottomImage,
      lines,
      scrollY: layout.textBottom,
      step: GUT_DEFAULT_STEP,
      interval: GUT_DEFAULT_INTERVAL,
      elapsed: 0,
      onClose,
    };
  }

  setPlayerFacing(facing: Facing): void {
    this.facing = facing;
  }

  setSceneName(name: string): void {
    this.game.state.sceneName = name;
  }

  private advanceDialogue(): void {
    const dialogue = this.dialogue;
    if (!dialogue) return;

    if (dialogue.pageIndex + 1 < dialogue.pages.length) {
      dialogue.pageIndex += 1;
      return;
    }

    this.dialogue = null;
    dialogue.onClose();
  }

  private updateGut(delta: number): void {
    const gut = this.gut;
    if (!gut) return;
    const layout = getGutLayout(gut);

    gut.elapsed += delta;
    while (gut.elapsed >= gut.interval) {
      gut.elapsed -= gut.interval;
      gut.scrollY -= gut.step;
    }

    const textBottom = gut.scrollY + gut.lines.length * 16;
    if (textBottom < layout.textTop) {
      this.closeGut();
    }
  }

  private handleGutKeyDown(): void {
    const gut = this.gut;
    if (!gut) return;
    gut.step = GUT_FAST_STEP;
    gut.interval = GUT_FAST_INTERVAL;
  }

  private handleGutKeyUp(key: KeyCode): void {
    const gut = this.gut;
    if (!gut) return;

    if (key === KeyCode.Cancel) {
      this.closeGut();
      return;
    }

    gut.step = GUT_DEFAULT_STEP;
    gut.interval = GUT_DEFAULT_INTERVAL;
  }

  private closeGut(): void {
    const onClose = this.gut?.onClose;
    this.gut = null;
    onClose?.();
  }

  private getPlayerScreenPosition(): { x: number; y: number } {
    return {
      x: this.playerMapX - this.game.state.mapScreenX,
      y: this.playerMapY - this.game.state.mapScreenY,
    };
  }

  private triggerMapEvent(x: number, y: number): void {
    const eventId = this.currentMap?.getEventNum(x, y) ?? 0;
    if (eventId <= 0) return;
    this.scriptProcess?.triggerEvent(eventId + 40);
  }

  private canPlayerStepTo(x: number, y: number): boolean {
    return this.currentMap?.canPlayerWalk(x, y) === true && !this.hasSceneObjectAt(x, y);
  }

  private hasSceneObjectAt(x: number, y: number): boolean {
    for (const obj of this.sceneObjects.values()) {
      if (obj.x === x && obj.y === y) {
        return true;
      }
    }

    return false;
  }

  private loadTileSet(map: ResMap): ResImage | null {
    const tileRes = this.game.datLib.getRes(ResourceType.TIL, 1, map.tilIndex);
    return tileRes instanceof ResImage ? tileRes : null;
  }

  private loadPicture(index: number): ResImage | null {
    if (index <= 0) return null;
    const picRes = this.game.datLib.getRes(ResourceType.PIC, 5, index);
    return picRes instanceof ResImage ? picRes : null;
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

function getGutLayout(gut: GutState): {
  topImageLeft: number;
  bottomImageLeft: number;
  bottomImageTop: number;
  textLeft: number;
  textTop: number;
  textWidth: number;
  textBottom: number;
} {
  const topImageLeft = gut.topImage ? Math.max(0, Math.floor((SCREEN_WIDTH - gut.topImage.width) / 2)) : 0;
  const bottomImageTop = gut.bottomImage ? SCREEN_HEIGHT - gut.bottomImage.height : SCREEN_HEIGHT;
  const bottomImageLeft = gut.bottomImage ? Math.max(0, Math.floor((SCREEN_WIDTH - gut.bottomImage.width) / 2)) : 0;
  const textTop = (gut.topImage?.height ?? 0) + GUT_SECTION_GAP;
  const rawTextBottom = bottomImageTop - (gut.bottomImage ? GUT_SECTION_GAP : 0);
  const textBottom = Math.max(textTop, rawTextBottom);

  return {
    topImageLeft,
    bottomImageLeft,
    bottomImageTop,
    textLeft: GUT_TEXT_SIDE_PADDING,
    textTop,
    textWidth: Math.max(16, SCREEN_WIDTH - GUT_TEXT_SIDE_PADDING * 2),
    textBottom,
  };
}

function paginateDialogue(text: string): string[] {
  const normalized = text.replace(/\r/g, '').replace(/\0/g, '');
  if (normalized.length === 0) return [];

  const lines = wrapTextBlock(normalized, DIALOG_TEXT_WIDTH);

  const pages: string[] = [];
  for (let i = 0; i < lines.length; i += DIALOG_PAGE_LINES) {
    pages.push(lines.slice(i, i + DIALOG_PAGE_LINES).join('\n'));
  }

  return pages;
}

function wrapTextBlock(text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const rawLines = text.split('\n');

  for (const line of rawLines) {
    const wrapped = wrapTextLine(line, maxWidth);
    if (wrapped.length === 0) {
      lines.push('');
      continue;
    }

    lines.push(...wrapped);
  }

  return lines;
}

function wrapTextLine(text: string, maxWidth: number): string[] {
  if (text.length === 0) return [''];

  const lines: string[] = [];
  let current = '';
  let width = 0;

  for (const char of text) {
    const charWidth = getTextCharWidth(char);
    if (current.length > 0 && width + charWidth > maxWidth) {
      lines.push(current);
      current = char;
      width = charWidth;
      continue;
    }

    current += char;
    width += charWidth;
  }

  if (current.length > 0) {
    lines.push(current);
  }

  return lines;
}

function getTextCharWidth(char: string): number {
  const code = char.codePointAt(0) ?? 0;
  return code < 0x80 ? 8 : 16;
}
