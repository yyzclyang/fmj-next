import type { Game } from '@/game/game';
import { COLOR_BLACK, COLOR_WHITE } from '@/rendering/color';
import { Surface } from '@/rendering/surface';
import { drawText, getTextWidth, wrapTextBlock } from '@/rendering/text-render';
import { Direction, type WalkingSprite } from '@/characters';
import type { Facing, MainSceneRuntime, SceneObject } from './main-game-runtime';
import {
  MAP_TILE_SIZE,
  MAP_VIEW_TILE_HEIGHT,
  MAP_VIEW_TILE_WIDTH,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from '@/utils/constants';
import { KeyCode } from '@/utils/key-code';
import { BaseScreen } from '@/screens/base-screen';
import { clamp } from '@/utils/math';
import { ScreenGameMenu } from './menu/screen-game-menu';
import { ScriptDialogueScreen, ScriptTimedMessageScreen } from './script/dialogue-screen';
import { ScriptGutScreen } from './script/gut-screen';
import {
  drawTipPanel,
  TIP_FRAME_WIDTH,
  TIP_LINE_GAP,
  TIP_MAX_LINES,
  TIP_TEXT_PADDING_X,
  TIP_TEXT_TOP_PADDING,
  TIP_TEXT_WIDTH,
} from './ui-utils';

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
const TIP_DURATION = 1000;
const WALKING_STEP_FRAMES = [0, 1, 2, 1] as const;

// 主场景只保留地图主画面和入口逻辑，脚本消息、GUT 和菜单都交给子 screen。
export class ScreenMainGame extends BaseScreen {
  private tip: TipState | null = null;

  constructor(
    game: Game,
    private readonly runtime: MainSceneRuntime
  ) {
    super(game);
  }

  override update(delta: number): void {
    this.updateTip(delta);
    this.runtime.update(delta);
  }

  draw(surface: Surface): void {
    this.drawMainGame(surface);
  }

  showMessage(text: string, delay?: number): void {
    this.screenStack.push(new InGameMessageScreen(this.game, text, delay ?? TIP_DURATION));
  }

  private drawMainGame(surface: Surface): void {
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
  }

  override onKey(key: KeyCode): boolean | undefined {
    const overlay = this.runtime.overlay;
    if (overlay) {
      if (overlay.onKey?.(key) !== true) return;
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
      case KeyCode.Cancel:
        if (this.runtime.canOpenInGameMenu) {
          this.screenStack.push(new ScreenGameMenu(this.game));
        }
        return;
      case KeyCode.Search:
        this.callFunctionChapter(6);
        return;
      case KeyCode.Insert:
        this.callFunctionChapter(7);
        return;
      case KeyCode.Modify:
        this.callFunctionChapter(8);
        return;
      case KeyCode.Delete:
        this.callFunctionChapter(9);
        return;
    }
  }

  private callFunctionChapter(index: number): void {
    if (!this.runtime.canOpenInGameMenu) return;
    this.runtime.callChapter(0, index);
  }

  showDialogue(text: string, onClose: () => void, headImageIndex = 0): void {
    const screen = new ScriptDialogueScreen(this.game, text, onClose, headImageIndex);
    if (screen.isEmpty) {
      onClose();
      return;
    }
    this.screenStack.push(screen);
  }

  showTip(text: string, kind: TipKind = 'message'): void {
    const textWidth = kind === 'information' ? TIP_FRAME_WIDTH : TIP_TEXT_WIDTH;
    const lines = wrapTextBlock(text, textWidth).slice(0, TIP_MAX_LINES);
    if (lines.length === 0) return;
    this.tip = { text, kind, lines, elapsed: 0 };
  }

  showTimedMessage(text: string, delay: number, onClose: () => void): void {
    this.screenStack.push(new ScriptTimedMessageScreen(this.game, text, delay, onClose));
  }

  showGut(topImageIndex: number, bottomImageIndex: number, text: string, onClose: () => void): void {
    this.screenStack.push(new ScriptGutScreen(this.game, topImageIndex, bottomImageIndex, text, onClose));
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
    if (!this.game.state.showPosition) return;
    const mapName = this.game.state.sceneName || this.runtime.currentMap?.mapName || 'Map';
    drawText(surface, mapName, MAP_INFO_LEFT, MAP_INFO_TOP);

    if (!this.runtime.hasPlayer) return;
    drawText(
      surface,
      `${this.runtime.playerMapX},${this.runtime.playerMapY}`,
      MAP_INFO_LEFT,
      MAP_INFO_TOP + MAP_INFO_LINE_GAP
    );
  }

  private drawTip(surface: Surface): void {
    const tip = this.tip;
    if (!tip) return;
    const layout = getTipLayout(tip);
    drawTipPanel(surface, layout.left, layout.top, layout.height);
    for (let i = 0; i < layout.lines.length; i += 1) {
      const line = layout.lines[i] ?? '';
      const textWidth = getTextWidth(line);
      const left =
        tip.kind === 'information' ? layout.left + Math.floor((TIP_FRAME_WIDTH - textWidth) / 2) : layout.textLeft;
      drawText(surface, line, left, layout.textTop + i * TIP_LINE_GAP);
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
      left < SCREEN_WIDTH &&
      top + image.height > 0 &&
      top < SCREEN_HEIGHT
    ) {
      image.draw(surface, getWalkingFrame(facing, step), left, top);
    }
    return true;
  }
}

class InGameMessageScreen extends BaseScreen {
  private readonly lines: string[];
  private elapsed = 0;

  constructor(
    game: Game,
    text: string,
    private readonly delay: number
  ) {
    super(game);
    this.lines = wrapTextBlock(text, TIP_TEXT_WIDTH).slice(0, TIP_MAX_LINES);
  }

  override update(delta: number): void {
    this.elapsed += delta;
    if (this.elapsed >= this.delay) {
      this.close();
    }
  }

  override draw(surface: Surface): void {
    const lineCount = Math.max(1, this.lines.length);
    const height = lineCount * TIP_LINE_GAP + 20;
    const left = Math.floor((SCREEN_WIDTH - TIP_FRAME_WIDTH) / 2);
    const top = Math.floor((SCREEN_HEIGHT - height) / 2);
    drawTipPanel(surface, left, top, height);
    for (let index = 0; index < lineCount; index += 1) {
      drawText(surface, this.lines[index] ?? '', left + TIP_TEXT_PADDING_X, top + 2 + index * TIP_LINE_GAP);
    }
  }

  override onKey(): boolean | undefined {
    this.close();
    return undefined;
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
    case Direction.North:
      return 1;
    case Direction.East:
      return 4;
    case Direction.South:
      return 7;
    case Direction.West:
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
    case Direction.West:
      surface.fillRect(left + 1, top + 5, 3, 2, COLOR_BLACK);
      return;
    case Direction.East:
      surface.fillRect(left + width - 4, top + 5, 3, 2, COLOR_BLACK);
      return;
    case Direction.North:
      surface.fillRect(left + Math.floor(width / 2) - 1, top + 1, 2, 3, COLOR_BLACK);
      return;
    case Direction.South:
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
