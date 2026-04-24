import type { Game } from '@/game/game';
import { ResImage } from '@/lib/res-image';
import { ResourceType } from '@/lib/resource-utils';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import { TextRender } from '@/rendering/text-render';
import type { WalkingSprite } from '@/characters';
import type { Facing, MainSceneRuntime, SceneObject } from './runtime';
import {
  MAP_TILE_SIZE,
  MAP_VIEW_TILE_HEIGHT,
  MAP_VIEW_TILE_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from '@/shared/constants';
import { KeyCode } from '@/shared/key-code';
import { BaseScreen } from '@/screens/base-screen';
import { clamp } from '@/shared/math';

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

interface TipState {
  text: string;
  kind: TipKind;
  lines: string[];
  elapsed: number;
}

type TipKind = 'message' | 'information';
type SceneActor = { kind: 'object'; y: number; order: 0; obj: SceneObject } | { kind: 'player'; y: number; order: 1 };

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
const TIP_FRAME_WIDTH = 240;
const TIP_TEXT_WIDTH = 224;
const TIP_TEXT_PADDING_X = 8;
const TIP_TEXT_TOP_PADDING = 2;
const TIP_LINE_GAP = 16;
const TIP_MAX_LINES = 4;
const TIP_DURATION = 1000;
const WALKING_STEP_FRAMES = [0, 1, 2, 1] as const;

// 主场景屏幕层只负责 UI 状态、绘制和输入分发。
export class ScreenMainGame extends BaseScreen {
  private dialogue: DialogueState | null = null;
  private gut: GutState | null = null;
  private tip: TipState | null = null;

  constructor(
    game: Game,
    private readonly runtime: MainSceneRuntime
  ) {
    super(game);
  }

  override update(delta: number): void {
    this.updateGut(delta);
    if (this.gut) return;
    this.updateTip(delta);
    this.runtime.update(delta);
  }

  draw(surface: Surface): void {
    if (this.gut) {
      this.drawGut(surface);
      return;
    }

    const overlay = this.runtime.overlay;
    if (overlay?.coversScreen) {
      surface.drawColor(COLOR_WHITE);
      overlay.draw(surface);
      return;
    }

    this.drawScene(surface);
    overlay?.draw(surface);
    if (!overlay) {
      this.drawTransientUi(surface);
    }
  }

  private drawScene(surface: Surface): void {
    surface.drawColor(COLOR_WHITE);
    this.drawMap(surface);
    this.drawActors(surface);
    this.drawMapInfo(surface);
  }

  private drawTransientUi(surface: Surface): void {
    this.drawTip(surface);
    this.drawDialogue(surface);
  }

  override onKeyDown(key: KeyCode): void {
    const overlay = this.runtime.overlay;
    if (overlay?.onKeyDown) {
      overlay.onKeyDown(key);
      return;
    }

    if (this.gut) {
      this.handleGutKeyDown();
      return;
    }

    if (this.dialogue) {
      this.advanceDialogue();
      return;
    }

    if (this.tip) {
      this.tip = null;
      return;
    }

    switch (key) {
      case KeyCode.Left:
      case KeyCode.Right:
      case KeyCode.Up:
      case KeyCode.Down:
        this.runtime.move(key);
        return;
      case KeyCode.Enter:
        this.runtime.interact();
        return;
    }
  }

  override onKeyUp(key: KeyCode): void {
    const overlay = this.runtime.overlay;
    if (overlay?.onKeyUp) {
      overlay.onKeyUp(key);
      return;
    }

    if (!this.gut) return;
    this.handleGutKeyUp(key);
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

  showTip(text: string, kind: TipKind = 'message'): void {
    const textWidth = kind === 'information' ? TIP_FRAME_WIDTH : TIP_TEXT_WIDTH;
    const lines = wrapTextBlock(text, textWidth).slice(0, TIP_MAX_LINES);
    if (lines.length === 0) return;
    this.tip = { text, kind, lines, elapsed: 0 };
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

  private drawMap(surface: Surface): void {
    const currentMap = this.runtime.currentMap;
    if (!currentMap) return;

    const tileSet = this.runtime.tileSet;
    for (let y = 0; y < MAP_VIEW_TILE_HEIGHT; y += 1) {
      for (let x = 0; x < MAP_VIEW_TILE_WIDTH; x += 1) {
        const mapX = this.game.state.mapScreenX + x;
        const mapY = this.game.state.mapScreenY + y;
        const drawX = x * MAP_TILE_SIZE;
        const drawY = y * MAP_TILE_SIZE;

        if (tileSet) {
          const tileX = clamp(mapX, 0, currentMap.mapWidth - 1);
          const tileY = clamp(mapY, 0, currentMap.mapHeight - 1);
          const tileIndex = currentMap.getTileIndex(tileX, tileY);
          if (tileIndex >= 0) {
            tileSet.draw(surface, tileIndex + 1, drawX, drawY);
            continue;
          }
        }

        const walkable = currentMap.canWalk(mapX, mapY);
        surface.fillRect(drawX, drawY, MAP_TILE_SIZE, MAP_TILE_SIZE, walkable ? COLOR_WHITE : COLOR_BLACK);
      }
    }
  }

  private drawActors(surface: Surface): void {
    const actors: SceneActor[] = [];
    for (const obj of this.runtime.sceneObjects) {
      actors.push({ kind: 'object', y: obj.y, order: 0, obj });
    }
    if (this.runtime.hasPlayer) {
      actors.push({ kind: 'player', y: this.runtime.playerMapY, order: 1 });
    }

    actors.sort((a, b) => a.y - b.y || a.order - b.order);
    for (const actor of actors) {
      if (actor.kind === 'player') {
        this.drawPlayer(surface);
        continue;
      }
      this.drawSceneObject(surface, actor.obj);
    }
  }

  private drawSceneObject(surface: Surface, obj: SceneObject): void {
    const screenX = obj.x - this.game.state.mapScreenX;
    const screenY = obj.y - this.game.state.mapScreenY;

    if (obj.kind === 'box') {
      this.drawBox(surface, screenX, screenY, obj);
      return;
    }

    this.drawNpc(surface, screenX, screenY, obj);
  }

  private drawNpc(surface: Surface, screenX: number, screenY: number, obj: SceneObject): void {
    if (this.drawWalkingSprite(surface, obj.walkingSprite, screenX, screenY, obj.direction, obj.step)) return;

    if (!isTileVisible(screenX, screenY)) return;
    const left = screenX * MAP_TILE_SIZE + Math.floor((MAP_TILE_SIZE - NPC_WIDTH) / 2);
    const top = screenY * MAP_TILE_SIZE + (MAP_TILE_SIZE - NPC_HEIGHT);
    surface.fillRect(left, top, NPC_WIDTH, NPC_HEIGHT, COLOR_BLACK);
    surface.fillRect(left + 1, top + 1, NPC_WIDTH - 2, NPC_HEIGHT - 2, COLOR_WHITE);
    drawFacingMark(surface, left, top, NPC_WIDTH, NPC_HEIGHT, obj.direction);
    if ((obj.step & 1) === 1) {
      surface.fillRect(left + 2, top + NPC_HEIGHT - 3, 2, 1, COLOR_BLACK);
      surface.fillRect(left + NPC_WIDTH - 4, top + NPC_HEIGHT - 3, 2, 1, COLOR_BLACK);
    }
  }

  private drawBox(surface: Surface, screenX: number, screenY: number, obj: SceneObject): void {
    if (this.drawWalkingSprite(surface, obj.walkingSprite, screenX, screenY, obj.direction, obj.step)) return;

    if (!isTileVisible(screenX, screenY)) return;
    const left = screenX * MAP_TILE_SIZE + Math.floor((MAP_TILE_SIZE - BOX_WIDTH) / 2);
    const top = screenY * MAP_TILE_SIZE + (MAP_TILE_SIZE - BOX_HEIGHT);
    surface.fillRect(left, top, BOX_WIDTH, BOX_HEIGHT, COLOR_BLACK);
    surface.fillRect(left + 1, top + 1, BOX_WIDTH - 2, BOX_HEIGHT - 2, COLOR_WHITE);
    if (obj.step >= 2) {
      surface.fillRect(left + 2, top + 2, BOX_WIDTH - 4, BOX_HEIGHT - 4, COLOR_WHITE);
      surface.fillRect(left + 2, top + 4, BOX_WIDTH - 4, 1, COLOR_BLACK);
      surface.fillRect(left + 3, top + 6, BOX_WIDTH - 6, 1, COLOR_BLACK);
      return;
    }
    if (obj.step === 1) {
      surface.fillRect(left + 1, top + 5, BOX_WIDTH - 2, 1, COLOR_BLACK);
      surface.fillRect(left + 3, top + 1, BOX_WIDTH - 5, 1, COLOR_BLACK);
      return;
    }
    surface.fillRect(left + 1, top + 3, BOX_WIDTH - 2, 1, COLOR_BLACK);
  }

  private drawPlayer(surface: Surface): void {
    const pos = this.runtime.getPlayerScreenPosition();
    if (
      this.drawWalkingSprite(
        surface,
        this.runtime.playerWalkingSprite,
        pos.x,
        pos.y,
        this.runtime.playerFacing,
        this.runtime.playerStep
      )
    )
      return;

    if (!isTileVisible(pos.x, pos.y)) return;
    const left = pos.x * MAP_TILE_SIZE + Math.floor((MAP_TILE_SIZE - PLAYER_WIDTH) / 2);
    const top = pos.y * MAP_TILE_SIZE + (MAP_TILE_SIZE - PLAYER_HEIGHT);
    surface.fillRect(left, top, PLAYER_WIDTH, PLAYER_HEIGHT, COLOR_BLACK);
    surface.fillRect(left + 1, top + 1, PLAYER_WIDTH - 2, PLAYER_HEIGHT - 2, COLOR_WHITE);
    drawFacingMark(surface, left, top, PLAYER_WIDTH, PLAYER_HEIGHT, this.runtime.playerFacing);
    if ((this.runtime.playerStep & 1) === 1) {
      surface.fillRect(left + 2, top + PLAYER_HEIGHT - 3, 2, 1, COLOR_BLACK);
      surface.fillRect(left + PLAYER_WIDTH - 4, top + PLAYER_HEIGHT - 3, 2, 1, COLOR_BLACK);
    }
  }

  private drawMapInfo(surface: Surface): void {
    const mapName = this.game.state.sceneName || this.runtime.currentMap?.mapName || 'Map';
    TextRender.drawText(surface, mapName, MAP_INFO_LEFT, MAP_INFO_TOP);

    if (!this.runtime.hasPlayer) return;
    TextRender.drawText(
      surface,
      `${this.runtime.playerMapX},${this.runtime.playerMapY}`,
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

  private drawTip(surface: Surface): void {
    const tip = this.tip;
    if (!tip) return;
    const layout = getTipLayout(tip);
    drawTipFrame(surface, layout.left, layout.top, layout.height);
    for (let i = 0; i < layout.lines.length; i += 1) {
      const line = layout.lines[i] ?? '';
      const textWidth = getTextWidth(line);
      const left =
        tip.kind === 'information' ? layout.left + Math.floor((TIP_FRAME_WIDTH - textWidth) / 2) : layout.textLeft;
      TextRender.drawText(surface, line, left, layout.textTop + i * TIP_LINE_GAP);
    }
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

  private updateTip(delta: number): void {
    const tip = this.tip;
    if (!tip) return;
    tip.elapsed += delta;
    if (tip.elapsed >= TIP_DURATION) {
      this.tip = null;
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

  private loadPicture(index: number): ResImage | null {
    if (index <= 0) return null;
    const picRes = this.game.datLib.getRes(ResourceType.PIC, 5, index);
    return picRes instanceof ResImage ? picRes : null;
  }

  private drawWalkingSprite(
    surface: Surface,
    sprite: WalkingSprite | null,
    screenX: number,
    screenY: number,
    facing: Facing,
    step: number
  ): boolean {
    if (!sprite) return false;

    const image = sprite.image;
    const left = screenX * MAP_TILE_SIZE;
    const top = screenY * MAP_TILE_SIZE + MAP_TILE_SIZE - image.height;
    if (
      left + image.width > 0 &&
      left < SCREEN_WIDTH - MAP_TILE_SIZE &&
      top + image.height > 0 &&
      top < SCREEN_HEIGHT
    ) {
      image.draw(surface, getWalkingFrame(facing, step), left, top);
    }
    return true;
  }
}

function isTileVisible(screenX: number, screenY: number): boolean {
  return screenX >= 0 && screenX < MAP_VIEW_TILE_WIDTH && screenY >= 0 && screenY < MAP_VIEW_TILE_HEIGHT;
}

function getWalkingFrame(facing: Facing, step: number): number {
  const offset = getWalkingDirectionOffset(facing);
  const frame = WALKING_STEP_FRAMES[((step % 4) + 4) % 4] ?? 0;
  return offset + frame;
}

function getWalkingDirectionOffset(facing: Facing): number {
  switch (facing) {
    case KeyCode.Up:
      return 1;
    case KeyCode.Right:
      return 4;
    case KeyCode.Down:
      return 7;
    case KeyCode.Left:
      return 10;
  }
}

function drawFacingMark(
  surface: Surface,
  left: number,
  top: number,
  width: number,
  height: number,
  facing: Facing
): void {
  switch (facing) {
    case KeyCode.Left:
      surface.fillRect(left + 1, top + 5, 3, 2, COLOR_BLACK);
      return;
    case KeyCode.Right:
      surface.fillRect(left + width - 4, top + 5, 3, 2, COLOR_BLACK);
      return;
    case KeyCode.Up:
      surface.fillRect(left + Math.floor(width / 2) - 1, top + 1, 2, 3, COLOR_BLACK);
      return;
    case KeyCode.Down:
      surface.fillRect(left + Math.floor(width / 2) - 1, top + height - 4, 2, 3, COLOR_BLACK);
      return;
  }
}

function getTipLayout(tip: TipState): {
  left: number;
  top: number;
  height: number;
  textLeft: number;
  textTop: number;
  lines: string[];
} {
  const lineCount = tip.kind === 'information' ? 1 : Math.max(1, tip.lines.length);
  const height = tip.kind === 'information' ? 23 : lineCount * TIP_LINE_GAP + 20;
  const left = Math.floor((SCREEN_WIDTH - TIP_FRAME_WIDTH) / 2);
  const top = Math.floor((SCREEN_HEIGHT - height) / 2);

  return {
    left,
    top,
    height,
    textLeft: left + TIP_TEXT_PADDING_X,
    textTop: top + TIP_TEXT_TOP_PADDING,
    lines: tip.kind === 'information' ? [tip.lines[0] ?? tip.text] : tip.lines,
  };
}

function drawTipFrame(surface: Surface, left: number, top: number, height: number): void {
  surface.fillRect(left, top - 2, TIP_FRAME_WIDTH, height + 3, COLOR_BLACK);
  surface.fillRect(left + 1, top - 1, TIP_FRAME_WIDTH - 3, height - 3, COLOR_WHITE);
  surface.fillRect(left + TIP_FRAME_WIDTH - 2, top - 2, 2, 3, COLOR_WHITE);
  surface.fillRect(left, top + height - 2, 4, 2, COLOR_WHITE);
}

function getTextWidth(text: string): number {
  let width = 0;
  for (const char of text) {
    width += getTextCharWidth(char);
  }
  return width;
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
