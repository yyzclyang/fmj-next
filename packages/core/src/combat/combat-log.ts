import type { FightingCharacter } from '@/characters';
import { createLogger } from '@/utils/logger';
import type {
  CombatEnterFightParams,
  CombatFinishResult,
  CombatLevelUpAward,
  CombatWinSettlement,
} from './combat-runtime';

export interface CombatFighterLogState {
  readonly hp: number;
  readonly mp: number;
  readonly hpMax: number;
  readonly mpMax: number;
  readonly attack: number;
  readonly defense: number;
  readonly agility: number;
  readonly spirit: number;
  readonly luck: number;
  readonly statuses: readonly { readonly value: number; readonly round: number }[];
}

const STATUS_NAMES = ['睡眠', '封印', '混乱', '中毒', '全体攻击', '攻击', '防御', '身法'] as const;
const logger = createLogger('战斗');

export function captureCombatLogStates(
  fighters: readonly FightingCharacter[]
): Map<FightingCharacter, CombatFighterLogState> {
  const res = new Map<FightingCharacter, CombatFighterLogState>();
  for (const fighter of fighters) {
    if (res.has(fighter)) continue;
    res.set(fighter, {
      hp: fighter.hp,
      mp: fighter.mp,
      hpMax: fighter.totalHpMax,
      mpMax: fighter.totalMpMax,
      attack: fighter.totalAttack,
      defense: fighter.totalDefense,
      agility: fighter.totalAgility,
      spirit: fighter.totalSpirit,
      luck: fighter.totalLuck,
      statuses: fighter.activeStatuses.slots.map(status => ({ value: status.value, round: status.round })),
    });
  }
  return res;
}

export function logCombatStart(
  params: CombatEnterFightParams,
  isRandomFight: boolean,
  players: readonly FightingCharacter[],
  monsters: readonly FightingCharacter[]
): void {
  logger.log(
    '开始',
    `${isRandomFight ? '随机战斗' : '脚本战斗'} ` +
      `我方=${players.map(formatFighterSummary).join(', ')} ` +
      `敌方=${monsters.map(formatFighterSummary).join(', ')} ` +
      `背景=${params.background.scrb}/${params.background.scrl}/${params.background.scrr}`
  );
}

export function logCombatFinish(result: CombatFinishResult): void {
  logger.log('结束', formatFinishResult(result));
}

export function logCombatAction(message: string): void {
  logger.log('动作', message);
}

export function logCombatEffect(message: string): void {
  logger.log('效果', message);
}

export function logCombatMenu(message: string): void {
  logger.log('菜单', message);
}

export function logCombatMiss(actor: FightingCharacter, target: FightingCharacter, actionName = '攻击'): void {
  logger.log('效果', `${actor.name}${actionName}${target.name}: Miss`);
}

export function logCombatFighterEffects(
  title: string,
  before: Map<FightingCharacter, CombatFighterLogState>,
  fighters: readonly FightingCharacter[]
): void {
  for (const fighter of fighters) {
    const snapshot = before.get(fighter);
    if (!snapshot) continue;
    const changes = formatFighterChanges(snapshot, fighter);
    if (changes.length > 0) logger.log('效果', `${title}: ${fighter.name} ${changes.join(', ')}`);
  }
}

export function logCombatSettlement(settlement: CombatWinSettlement): void {
  logger.log('结算', `经验 +${settlement.exp}, 金钱 +${settlement.money}`);
  if (settlement.goods.length === 0) {
    logger.log('结算', '掉落: 无');
  } else {
    logger.log('结算', `掉落: ${settlement.goods.map(item => `${item.goods.name} x${item.count}`).join(', ')}`);
  }
  for (const award of settlement.levelUps) logCombatLevelUp(award);
}

function logCombatLevelUp(award: CombatLevelUpAward): void {
  const changes = formatLevelUpChanges(award);
  const detail = changes.length > 0 ? `, ${changes.join(', ')}` : '';
  logger.log('升级', `${award.player.name} ${award.previousLevel} -> ${award.currentLevel}${detail}`);
  for (const magicName of getLearnedMagicNames(award)) {
    logger.log('升级', `${award.player.name} 学会 ${magicName}`);
  }
}

function formatFighterSummary(fighter: FightingCharacter): string {
  return `${fighter.name}(HP ${fighter.hp}/${fighter.totalHpMax}, MP ${fighter.mp}/${fighter.totalMpMax})`;
}

function formatFighterChanges(before: CombatFighterLogState, fighter: FightingCharacter): string[] {
  return [
    ...formatValueChange('HP', before.hp, fighter.hp, '伤害', '回复'),
    ...formatValueChange('MP', before.mp, fighter.mp, '损失', '回复'),
    ...formatStatChange('生命上限', before.hpMax, fighter.totalHpMax),
    ...formatStatChange('真气上限', before.mpMax, fighter.totalMpMax),
    ...formatStatChange('攻击', before.attack, fighter.totalAttack),
    ...formatStatChange('防御', before.defense, fighter.totalDefense),
    ...formatStatChange('身法', before.agility, fighter.totalAgility),
    ...formatStatChange('灵力', before.spirit, fighter.totalSpirit),
    ...formatStatChange('幸运', before.luck, fighter.totalLuck),
    ...formatStatusChanges(before, fighter),
  ];
}

function formatValueChange(
  label: string,
  before: number,
  after: number,
  decreaseLabel: string,
  increaseLabel: string
): string[] {
  const diff = after - before;
  if (diff === 0) return [];
  const effect = diff < 0 ? `${decreaseLabel}${-diff}` : `${increaseLabel}${diff}`;
  return [`${label}${effect} (${before}->${after})`];
}

function formatStatChange(label: string, before: number, after: number): string[] {
  const diff = after - before;
  if (diff === 0) return [];
  return [`${label} ${diff > 0 ? '+' : ''}${diff} (${before}->${after})`];
}

function formatStatusChanges(before: CombatFighterLogState, fighter: FightingCharacter): string[] {
  const res: string[] = [];
  for (let i = 0; i < fighter.activeStatuses.slots.length; i += 1) {
    const oldStatus = before.statuses[i];
    const status = fighter.activeStatuses.slots[i];
    if (!oldStatus || !status || (oldStatus.value === status.value && oldStatus.round === status.round)) continue;
    res.push(`${STATUS_NAMES[i] ?? `状态${i}`} ${oldStatus.value}/${oldStatus.round}->${status.value}/${status.round}`);
  }
  return res.length > 0 ? [`状态变化 ${res.join('; ')}`] : [];
}

function formatLevelUpChanges(award: CombatLevelUpAward): string[] {
  const oldStats = award.previousStats;
  const newStats = award.currentStats;
  return [
    ...formatStatChange('生命', oldStats.hpMax, newStats.hpMax),
    ...formatStatChange('真气', oldStats.mpMax, newStats.mpMax),
    ...formatStatChange('攻击', oldStats.attack, newStats.attack),
    ...formatStatChange('防御', oldStats.defense, newStats.defense),
    ...formatStatChange('身法', oldStats.agility, newStats.agility),
    ...formatStatChange('灵力', oldStats.spirit, newStats.spirit),
    ...formatStatChange('幸运', oldStats.luck, newStats.luck),
  ];
}

function getLearnedMagicNames(award: CombatLevelUpAward): string[] {
  const chain = award.player.magicChain;
  if (!chain) return [];
  const maxCount = Math.min(award.newMagicCount, chain.getMagicCount());
  const res: string[] = [];
  for (let i = award.oldMagicCount; i < maxCount; i += 1) {
    const magic = chain.getMagic(i);
    if (magic) res.push(magic.name);
  }
  return res;
}

function formatFinishResult(result: CombatFinishResult): string {
  switch (result) {
    case 'win':
      return '胜利';
    case 'loss':
      return '失败';
    case 'flee':
      return '逃跑';
    case 'maxRound':
      return '达到最大回合';
  }
  return result;
}
