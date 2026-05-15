import type { Game } from '@/game/game';
import { MonsterFightingFrame, PlayerFightingFrame, type Monster, type Player } from '@/characters';
import { STATUS_FLAGS_ALL } from '@/characters/status';
import type { BaseGoods } from '@/goods';
import { Bitmap } from '@/rendering/bitmap';
import { COLOR_BLACK, type Color } from '@/rendering/color';
import { createPixelBuffer, fillPixelBuffer } from '@/rendering/pixel-buffer';
import { Surface } from '@/rendering/surface';
import { ResourceType } from '@/lib/resource-utils';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '@/utils/constants';
import type { CombatAction } from './combat-actions';
import {
  captureCombatLogStates,
  logCombatFighterEffects,
  logCombatFinish,
  logCombatSettlement,
  logCombatStart,
} from './combat-log';

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

export type CombatFinishResult = 'win' | 'loss' | 'maxRound' | 'flee';

type CombatFinishCallback = (result: CombatFinishResult) => void;
type CombatRoundEventCallback = (eventId: number) => void;

export interface CombatGoodsAward {
  readonly goods: BaseGoods;
  readonly count: number;
}

export interface CombatLevelUpStats {
  readonly hp: number;
  readonly mp: number;
  readonly hpMax: number;
  readonly mpMax: number;
  readonly attack: number;
  readonly defense: number;
  readonly agility: number;
  readonly spirit: number;
  readonly luck: number;
}

export interface CombatLevelUpAward {
  readonly player: Player;
  readonly previousLevel: number;
  readonly currentLevel: number;
  readonly oldMagicCount: number;
  readonly newMagicCount: number;
  readonly previousStats: CombatLevelUpStats;
  readonly currentStats: CombatLevelUpStats;
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
  private readonly defendingPlayers = new Set<Player>();
  private winSettlement: CombatWinSettlement | null = null;

  constructor(
    private readonly runtime: CombatRuntime,
    readonly params: CombatEnterFightParams,
    readonly isRandomFight: boolean,
    players: readonly Player[],
    monsters: readonly Monster[],
    background: Bitmap | null,
    private readonly onFinish: CombatFinishCallback,
    private readonly onRoundEvent: CombatRoundEventCallback | null
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

  triggerRoundEvent(eventId: number): void {
    this.onRoundEvent?.(eventId);
  }

  getLastPlayerActions(): Map<number, CombatAction> {
    return this.runtime.getLastPlayerActions();
  }

  rememberPlayerAction(playerId: number, action: CombatAction): void {
    this.runtime.rememberPlayerAction(playerId, action);
  }

  clearDefendingPlayers(): void {
    this.defendingPlayers.clear();
  }

  setPlayerDefending(player: Player): void {
    this.defendingPlayers.add(player);
  }

  isPlayerDefending(player: Player): boolean {
    return this.defendingPlayers.has(player);
  }
}

const MAX_COMBAT_PLAYERS = 3;
const DEFAULT_RANDOM_ENCOUNTER_RATE = 1 / 20;
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
  private randomEncounterRate = DEFAULT_RANDOM_ENCOUNTER_RATE;
  private activeSession: CombatSession | null = null;
  // 重复行动按角色资源 id 记录，避免队伍站位变化后串用别人的动作。
  private readonly lastPlayerActions = new Map<number, CombatAction>();

  constructor(private readonly game: Game) {}

  reset(): void {
    if (this.activeSession) throw new Error('战斗中不能重置战斗运行时');
    this.randomFightConfig = null;
    this.randomFightEnabled = false;
    this.randomEncounterRate = DEFAULT_RANDOM_ENCOUNTER_RATE;
    this.lastPlayerActions.clear();
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

  setRandomEncounterRate(rate: number | null): number {
    this.randomEncounterRate = rate ?? DEFAULT_RANDOM_ENCOUNTER_RATE;
    return this.randomEncounterRate;
  }

  getLastPlayerActions(): Map<number, CombatAction> {
    return new Map(this.lastPlayerActions);
  }

  rememberPlayerAction(playerId: number, action: CombatAction): void {
    this.lastPlayerActions.set(playerId, action);
  }

  enterFight(
    params: CombatEnterFightParams,
    onFinish: CombatFinishCallback,
    onRoundEvent: CombatRoundEventCallback | null = null
  ): CombatSession {
    return this.createSession(params, false, onFinish, onRoundEvent);
  }

  startRandomFight(onFinish: CombatFinishCallback): CombatSession | null {
    const config = this.randomFightConfig;
    if (!this.randomFightEnabled || !config || config.monsterTypes.length === 0) return null;
    if (this.random() >= this.randomEncounterRate) return null;
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
      true,
      onFinish,
      null
    );
  }

  private createSession(
    params: CombatEnterFightParams,
    isRandomFight: boolean,
    onFinish: CombatFinishCallback,
    onRoundEvent: CombatRoundEventCallback | null
  ): CombatSession {
    if (this.activeSession) throw new Error('战斗已经开始，不能重复进入');
    const monsters = this.loadMonsters(params.monsterTypes);
    if (monsters.length === 0) throw new Error('战斗没有有效怪物');
    const players = this.loadPlayers();
    const session = new CombatSession(
      this,
      params,
      isRandomFight,
      players,
      monsters,
      this.createBackground(params.background),
      onFinish,
      onRoundEvent
    );
    this.prepareFighters(session);
    this.activeSession = session;
    logCombatStart(params, isRandomFight, session.players, session.monsters);
    return session;
  }

  finish(session: CombatSession, result: CombatFinishResult): void {
    if (this.activeSession !== session) throw new Error('结束了不属于当前运行时的战斗');
    if (result === 'win') session.settleWin();
    logCombatFinish(result);
    const recoverBefore = result === 'win' || result === 'flee' ? captureCombatLogStates(session.players) : null;
    this.activeSession = null;
    if (result === 'win' && recoverBefore) {
      this.recoverPlayersAfterWin(session.players);
      logCombatFighterEffects('战斗结束恢复', recoverBefore, session.players);
    } else if (result === 'flee' && recoverBefore) {
      this.revivePlayersAfterFlee(session.players);
      logCombatFighterEffects('逃跑恢复', recoverBefore, session.players);
    }
    session.notifyFinish(result);
  }

  private recoverPlayersAfterWin(players: readonly Player[]): void {
    const percent = Math.trunc(this.random() * 10) + 15;
    for (const player of players) {
      if (player.hp <= 0) {
        player.hp = 1;
        continue;
      }
      player.hp += Math.trunc(((player.hpMax - player.hp) * percent) / 100);
      player.mp += Math.trunc(((player.mpMax - player.mp) * percent) / 100);
      if (player.hp > player.hpMax) player.hp = player.hpMax;
      if (player.mp > player.mpMax) player.mp = player.mpMax;
    }
  }

  private revivePlayersAfterFlee(players: readonly Player[]): void {
    for (const player of players) {
      if (player.hp <= 0) player.hp = 1;
    }
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
        const res = this.game.datLib.getMonster(index);
        if (!res) throw new Error(`战斗怪物资源不存在: ARS 3-${index}`);
        return res;
      });
  }

  private prepareFighters(session: CombatSession): void {
    session.players.forEach((player, i) => {
      const pos = PLAYER_POS[Math.min(i, PLAYER_POS.length - 1)]!;
      const sprite = player.fightingSprite;
      if (!sprite) throw new Error(`角色缺少战斗图: ${player.name}`);
      player.activeStatuses.clearFlags(STATUS_FLAGS_ALL);
      sprite.setCombatPos(pos.x, pos.y);
      sprite.currentFrame =
        player.hp <= 0
          ? PlayerFightingFrame.Dead
          : player.hp < player.hpMax / 4
            ? PlayerFightingFrame.Weak
            : PlayerFightingFrame.Idle;
    });

    session.monsters.forEach((monster, i) => {
      monster.hp = monster.hpMax;
      monster.mp = monster.mpMax;
      monster.activeStatuses.clearFlags(STATUS_FLAGS_ALL);
      const sprite = monster.fightingSprite;
      if (!sprite) throw new Error(`怪物缺少战斗图: ${monster.name}`);
      const posIndex = session.monsters.length === 1 ? 1 : i;
      const pos = MONSTER_BASE_POS[Math.min(posIndex, MONSTER_BASE_POS.length - 1)]!;
      sprite.setCombatPos(
        pos.x - Math.floor(sprite.width / 6) + Math.floor(sprite.width / 2),
        pos.y - Math.floor(sprite.height / 10) + Math.floor(sprite.height / 2)
      );
      sprite.currentFrame = MonsterFightingFrame.Idle;
    });
  }

  private createBackground(ids: CombatBackgroundIds): Bitmap | null {
    if (ids.scrb <= 0 && ids.scrl <= 0 && ids.scrr <= 0) return null;
    const bg = this.game.datLib.getImage(ResourceType.PIC, 4, ids.scrb);
    if (!bg) throw new Error(`战斗背景资源不存在: PIC 4-${ids.scrb}`);
    const bitmap = bg.getBitmap(0);
    if (!bitmap) throw new Error(`战斗背景没有可绘制位图: PIC 4-${ids.scrb}`);
    const width = Math.max(bitmap.width, Math.floor(SCREEN_WIDTH / 2));
    const height = Math.max(bitmap.height, Math.floor(SCREEN_HEIGHT / 2));
    const pixels = createPixelBuffer(width, height);
    fillPixelBuffer(pixels, COLOR_BLACK);
    const surface = new Surface(width, height, pixels);

    surface.drawBitmap(bitmap, 0, 0);
    if (ids.scrl > 0) {
      const left = this.game.datLib.getImage(ResourceType.PIC, 4, ids.scrl);
      if (!left) throw new Error(`战斗左侧背景资源不存在: PIC 4-${ids.scrl}`);
      left.draw(surface, 1, 0, height - left.height);
    }
    if (ids.scrr > 0) {
      const right = this.game.datLib.getImage(ResourceType.PIC, 4, ids.scrr);
      if (!right) throw new Error(`战斗右侧背景资源不存在: PIC 4-${ids.scrr}`);
      right.draw(surface, 1, width - right.width, 0);
    }
    return scaleBitmap(new Bitmap(width, height, pixels), SCREEN_WIDTH, SCREEN_HEIGHT);
  }

  settleWin(session: CombatSession): CombatWinSettlement {
    if (this.activeSession !== session) throw new Error('结算了不属于当前运行时的战斗');
    const exp = session.monsters.reduce((sum, monster) => sum + monster.exp, 0);
    const money = session.monsters.reduce((sum, monster) => sum + monster.money, 0);
    this.game.state.money += money;
    const settlement = {
      exp,
      money,
      goods: this.applyDrops(session),
      levelUps: this.applyExperience(session.players, exp),
    };
    logCombatSettlement(settlement);
    return settlement;
  }

  private applyExperience(players: readonly Player[], exp: number): CombatLevelUpAward[] {
    const res: CombatLevelUpAward[] = [];
    for (const player of players) {
      if (!player.isAlive) continue;
      const chain = player.levelUpChain;
      if (!chain || chain.maxLevel <= 0) {
        player.exp += exp;
        continue;
      }
      if (player.level >= chain.maxLevel) continue;
      let remainingExp = player.exp + exp;
      while (player.level < chain.maxLevel) {
        const nextExp = chain.getNextLevelExp(player.level);
        if (nextExp <= 0 || remainingExp < nextExp) break;

        const previousLevel = player.level;
        const oldMagicCount = chain.getLearnMagicCount(previousLevel);
        const previousStats = captureLevelUpStats(player);
        if (!player.levelUp(previousLevel + 1)) break;
        remainingExp -= nextExp;

        res.push({
          player,
          previousLevel,
          currentLevel: player.level,
          oldMagicCount,
          newMagicCount: chain.getLearnMagicCount(player.level),
          previousStats,
          currentStats: captureLevelUpStats(player),
        });
      }
      player.exp = remainingExp;
    }
    return res;
  }

  private applyDrops(session: CombatSession): CombatGoodsAward[] {
    const res: CombatGoodsAward[] = [];
    const controlPlayer = this.game.getPlayer(this.game.state.controlActorId) ?? session.players[0] ?? null;
    const playerLuck = Math.max(0, controlPlayer?.luck ?? 0);
    for (const monster of session.monsters) {
      const drop = monster.dropGoods;
      if (!drop) continue;
      const roll = Math.trunc(this.random() * 0x10000);
      const playerRoll = (roll % Math.max(1, playerLuck)) + 1;
      const monsterRoll = monster.luck > 0 ? roll % monster.luck : 0;
      if (playerRoll <= monsterRoll || roll % 4 === 0) continue;
      const goods = this.game.bag.addGoods(drop.goods.type, drop.goods.index, drop.count);
      if (!goods) throw new Error(`战斗掉落物品不存在: GRS ${drop.goods.type}-${drop.goods.index}`);
      res.push({ goods, count: drop.count });
    }
    return res;
  }
}

function captureLevelUpStats(player: Player): CombatLevelUpStats {
  return {
    hp: player.hp,
    mp: player.mp,
    hpMax: player.hpMax,
    mpMax: player.mpMax,
    attack: player.attack,
    defense: player.defense,
    agility: player.agility,
    spirit: player.spirit,
    luck: player.luck,
  };
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
  return createSolidBackground(COLOR_BLACK);
}

function createSolidBackground(color: Color): Bitmap {
  const pixels = createPixelBuffer(SCREEN_WIDTH, SCREEN_HEIGHT);
  fillPixelBuffer(pixels, color);
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
