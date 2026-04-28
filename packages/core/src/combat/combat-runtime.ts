import type { Game } from '@/game/game';
import { Monster, Player } from '@/characters';
import type { BaseGoods } from '@/goods';
import { Bitmap } from '@/rendering/bitmap';
import { COLOR_BLACK } from '@/rendering/color';
import { clearFrameBuffer, createFrameBuffer } from '@/rendering/frame-buffer';
import { ResourceType } from '@/lib/resource-utils';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/shared/constants';

export interface CombatBackgroundIds {
  readonly scrb: number;
  readonly scrl: number;
  readonly scrr: number;
}

export interface CombatInitFightParams extends CombatBackgroundIds {
  readonly monsterTypes: readonly number[];
}

export interface CombatEnterFightParams {
  readonly roundMax: number;
  readonly monsterTypes: readonly number[];
  readonly background: CombatBackgroundIds;
  readonly eventRounds: readonly number[];
  readonly eventIds: readonly number[];
  readonly lossAddress: number;
  readonly winAddress: number;
}

export type CombatFinishResult = 'win' | 'loss' | 'maxRound';

type CombatFinishCallback = (result: CombatFinishResult) => void;

export interface CombatGoodsAward {
  readonly goods: BaseGoods;
  readonly count: number;
}

export interface CombatLevelUpAward {
  readonly player: Player;
  readonly previousLevel: number;
  readonly oldMagicCount: number;
  readonly newMagicCount: number;
}

export interface CombatWinSettlement {
  readonly exp: number;
  readonly money: number;
  readonly goods: CombatGoodsAward[];
  readonly levelUps: CombatLevelUpAward[];
}

export interface CombatRuntimeSnapshot {
  readonly randomFightEnabled: boolean;
  readonly randomFightConfig: CombatInitFightParams | null;
}

export class CombatSession {
  readonly players: Player[];
  readonly monsters: Monster[];
  readonly background: Bitmap | null;
  private winSettlement: CombatWinSettlement | null = null;

  constructor(
    private readonly runtime: CombatRuntime,
    readonly params: CombatEnterFightParams,
    players: readonly Player[],
    monsters: readonly Monster[],
    background: Bitmap | null,
    private readonly onFinish: CombatFinishCallback
  ) {
    this.players = [...players];
    this.monsters = [...monsters];
    this.background = background;
  }

  finish(result: CombatFinishResult): void {
    this.runtime.finish(this, result);
  }

  settleWin(): CombatWinSettlement {
    if (!this.winSettlement) {
      this.winSettlement = this.runtime.settleWin(this);
    }
    return this.winSettlement;
  }

  notifyFinish(result: CombatFinishResult): void {
    this.onFinish(result);
  }
}

const MAX_COMBAT_PLAYERS = 3;
const PLAYER_POS = [
  { x: 186, y: 148 },
  { x: 218, y: 144 },
  { x: 250, y: 136 },
] as const;
const MONSTER_BASE_POS = [
  { x: 62, y: 43 },
  { x: 94, y: 32 },
  { x: 132, y: 29 },
] as const;

// 战斗运行时只保存脚本配置和当前场次，具体交互由战斗 screen 执行。
export class CombatRuntime {
  private readonly random = Math.random;
  private randomFightConfig: CombatInitFightParams | null = null;
  private randomFightEnabled = false;
  private activeSession: CombatSession | null = null;

  constructor(private readonly game: Game) {}

  reset(): void {
    if (this.activeSession) throw new Error('战斗中不能重置战斗运行时');
    this.randomFightConfig = null;
    this.randomFightEnabled = false;
  }

  createSnapshot(): CombatRuntimeSnapshot {
    if (this.activeSession) throw new Error('战斗中不能存档');
    return {
      randomFightEnabled: this.randomFightEnabled && this.randomFightConfig != null,
      randomFightConfig: this.randomFightConfig ? cloneInitFightParams(this.randomFightConfig) : null,
    };
  }

  restoreSnapshot(snapshot: CombatRuntimeSnapshot | null | undefined): void {
    this.reset();
    if (!snapshot?.randomFightEnabled || !snapshot.randomFightConfig) return;
    this.randomFightConfig = cloneInitFightParams(snapshot.randomFightConfig);
    this.randomFightEnabled = true;
  }

  initFight(params: CombatInitFightParams): void {
    this.randomFightConfig = cloneInitFightParams(params);
    this.randomFightEnabled = true;
  }

  fightEnable(): void {
    this.randomFightEnabled = true;
  }

  fightDisable(): void {
    this.randomFightEnabled = false;
    this.randomFightConfig = null;
  }

  enterFight(params: CombatEnterFightParams, onFinish: CombatFinishCallback): CombatSession {
    return this.createSession(params, onFinish);
  }

  startRandomFight(onFinish: CombatFinishCallback): CombatSession | null {
    const config = this.randomFightConfig;
    if (!this.randomFightEnabled || !config || config.monsterTypes.length === 0) return null;
    if (Math.trunc(this.random() * 20) !== 0) return null;
    const count = Math.trunc(this.random() * 3) + 1;
    const monsterTypes = Array.from({ length: count }, () => {
      const index = Math.trunc(this.random() * config.monsterTypes.length);
      return config.monsterTypes[index] ?? 0;
    });
    return this.createSession(
      {
        roundMax: 0,
        monsterTypes,
        background: config,
        eventRounds: [0, 0, 0],
        eventIds: [0, 0, 0],
        lossAddress: 0,
        winAddress: 0,
      },
      onFinish
    );
  }

  private createSession(params: CombatEnterFightParams, onFinish: CombatFinishCallback): CombatSession {
    if (this.activeSession) throw new Error('战斗已经开始，不能重复进入');
    const monsters = this.loadMonsters(params.monsterTypes);
    if (monsters.length === 0) throw new Error('战斗没有有效怪物');
    const players = this.loadPlayers();
    const session = new CombatSession(this, params, players, monsters, this.createBackground(params.background), onFinish);
    this.prepareFighters(session);
    this.activeSession = session;
    return session;
  }

  finish(session: CombatSession, result: CombatFinishResult): void {
    if (this.activeSession !== session) throw new Error('结束了不属于当前运行时的战斗');
    if (result === 'win') session.settleWin();
    this.activeSession = null;
    session.notifyFinish(result);
  }

  private loadPlayers(): Player[] {
    const players = this.game.state.partyActorIds
      .map(id => this.game.getPlayer(id))
      .filter((player): player is Player => player != null)
      .slice(0, MAX_COMBAT_PLAYERS);
    if (players.length === 0) throw new Error('战斗需要至少一个队伍角色');
    const alivePlayers = players.filter(player => player.hp > 0);
    if (alivePlayers.length > 0) return alivePlayers;
    players[0]!.hp = 1;
    return [players[0]!];
  }

  private loadMonsters(monsterTypes: readonly number[]): Monster[] {
    return monsterTypes
      .filter(type => type > 0)
      .map(index => {
        const res = this.game.datLib.getRes(ResourceType.ARS, 3, index);
        if (!(res instanceof Monster)) throw new Error(`战斗怪物资源不存在: ARS 3-${index}`);
        return res;
      });
  }

  private prepareFighters(session: CombatSession): void {
    session.players.forEach((player, i) => {
      const pos = PLAYER_POS[Math.min(i, PLAYER_POS.length - 1)]!;
      const sprite = player.fightingSprite;
      if (!sprite) throw new Error(`角色缺少战斗图: ${player.name}`);
      sprite.setCombatPos(pos.x, pos.y);
      sprite.currentFrame = player.hp <= 0 ? 12 : player.hp < player.maxHp / 4 ? 11 : 1;
    });

    session.monsters.forEach((monster, i) => {
      monster.hp = monster.maxHp;
      const sprite = monster.fightingSprite;
      if (!sprite) throw new Error(`怪物缺少战斗图: ${monster.name}`);
      const posIndex = session.monsters.length === 1 ? 1 : i;
      const pos = MONSTER_BASE_POS[Math.min(posIndex, MONSTER_BASE_POS.length - 1)]!;
      sprite.setCombatPos(
        pos.x - Math.floor(sprite.width / 6) + Math.floor(sprite.width / 2),
        pos.y - Math.floor(sprite.height / 10) + Math.floor(sprite.height / 2)
      );
      sprite.currentFrame = 1;
    });
  }

  private createBackground(ids: CombatBackgroundIds): Bitmap | null {
    if (ids.scrb <= 0) return null;
    const bg = this.game.datLib.getImage(ResourceType.PIC, 4, ids.scrb);
    if (!bg) throw new Error(`战斗背景资源不存在: PIC 4-${ids.scrb}`);
    const bitmap = bg.getBitmap(0);
    if (!bitmap) throw new Error(`战斗背景没有可绘制位图: PIC 4-${ids.scrb}`);
    return scaleBitmap(bitmap, SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  settleWin(session: CombatSession): CombatWinSettlement {
    if (this.activeSession !== session) throw new Error('结算了不属于当前运行时的战斗');
    const exp = session.monsters.reduce((sum, monster) => sum + monster.exp, 0);
    const money = session.monsters.reduce((sum, monster) => sum + monster.money, 0);
    this.game.state.money += money;
    return {
      exp,
      money,
      goods: this.applyDrops(session),
      levelUps: this.applyExperience(session.players, exp),
    };
  }

  private applyExperience(players: readonly Player[], exp: number): CombatLevelUpAward[] {
    const res: CombatLevelUpAward[] = [];
    for (const player of players) {
      if (!player.isAlive) continue;
      const chain = player.levelUpChain;
      if (!chain || chain.maxLevel <= 0) {
        player.currentExp += exp;
        continue;
      }
      if (player.level >= chain.maxLevel) continue;
      const nextExp = chain.getNextLevelExp(player.level);
      const totalExp = player.currentExp + exp;
      if (totalExp < nextExp) {
        player.currentExp = totalExp;
        continue;
      }
      const previousLevel = player.level;
      const oldMagicCount = chain.getLearnMagicCount(previousLevel);
      const newMagicCount = chain.getLearnMagicCount(previousLevel + 1);
      player.currentExp = totalExp - nextExp;
      if (player.levelUp(previousLevel + 1)) {
        res.push({ player, previousLevel, oldMagicCount, newMagicCount });
      }
    }
    return res;
  }

  private applyDrops(session: CombatSession): CombatGoodsAward[] {
    const res: CombatGoodsAward[] = [];
    const luck = session.players.reduce((max, player) => Math.max(max, player.luck), 10);
    let chance = luck - 10;
    if (chance > 100) chance = 100;
    else if (chance < 0) chance = 10;

    for (const monster of session.monsters) {
      const drop = monster.dropGoods;
      if (!drop || Math.trunc(this.random() * 101) >= chance) continue;
      const goods = this.game.bag.addGoods(drop.goods.type, drop.goods.index, drop.count);
      if (!goods) throw new Error(`战斗掉落物品不存在: GRS ${drop.goods.type}-${drop.goods.index}`);
      res.push({ goods, count: drop.count });
    }
    return res;
  }
}

function scaleBitmap(src: Bitmap, width: number, height: number): Bitmap {
  if (src.width <= 0 || src.height <= 0) return createEmptyBackground();
  const pixels = new Uint8ClampedArray(width * height * 4);
  const xRatio = src.width / width;
  const yRatio = src.height / height;
  for (let y = 0; y < height; y += 1) {
    const srcY = Math.min(src.height - 1, Math.trunc(y * yRatio));
    for (let x = 0; x < width; x += 1) {
      const srcX = Math.min(src.width - 1, Math.trunc(x * xRatio));
      const srcOffset = (srcY * src.width + srcX) * 4;
      const dstOffset = (y * width + x) * 4;
      pixels[dstOffset] = src.pixels[srcOffset] ?? 0;
      pixels[dstOffset + 1] = src.pixels[srcOffset + 1] ?? 0;
      pixels[dstOffset + 2] = src.pixels[srcOffset + 2] ?? 0;
      pixels[dstOffset + 3] = src.pixels[srcOffset + 3] ?? 255;
    }
  }
  return new Bitmap(width, height, pixels);
}

function createEmptyBackground(): Bitmap {
  const pixels = createFrameBuffer();
  clearFrameBuffer(pixels, COLOR_BLACK);
  return new Bitmap(SCREEN_WIDTH, SCREEN_HEIGHT, pixels);
}

function cloneInitFightParams(params: CombatInitFightParams): CombatInitFightParams {
  return {
    monsterTypes: params.monsterTypes.filter(type => type > 0),
    scrb: params.scrb,
    scrl: params.scrl,
    scrr: params.scrr,
  };
}
