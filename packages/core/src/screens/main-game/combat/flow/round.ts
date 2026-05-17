import type { CombatFinishResult, CombatSession } from '@/combat/combat-runtime';
import {
  getFirstAliveMonsterIndex,
  getFirstAlivePlayerIndex,
  hasAlivePlayers,
  isAllMonsterDead,
} from '../actions/targeting';

export type CombatRoundCompletion =
  | { readonly kind: 'startSuccess' }
  | { readonly kind: 'finish'; readonly result: CombatFinishResult }
  | {
      readonly kind: 'nextRound';
      readonly roundCount: number;
      readonly currentPlayerIndex: number;
      readonly targetIndex: number;
    };

export function triggerRoundEvent(session: CombatSession, roundCount: number): void {
  const rounds = session.params.eventRounds;
  const eventIds = session.params.eventIds;
  for (let i = 0; i < rounds.length; i += 1) {
    const eventId = eventIds[i] ?? 0;
    if (eventId !== 0 && rounds[i] === roundCount) {
      session.triggerRoundEvent(eventId);
    }
  }
}

export function completeRound(session: CombatSession, roundCount: number): CombatRoundCompletion {
  // C 引擎在当前回合动作结算后，用当前回合序号命中上限就退出，且优先于本回合胜负结果。
  if (!session.isRandomFight && session.params.roundMax > 0 && roundCount === session.params.roundMax) {
    return { kind: 'finish', result: 'maxRound' };
  }

  if (isAllMonsterDead(session.monsters)) {
    return { kind: 'startSuccess' };
  }
  if (!hasAlivePlayers(session.players)) {
    return { kind: 'finish', result: 'loss' };
  }

  const nextRoundCount = roundCount + 1;
  return {
    kind: 'nextRound',
    roundCount: nextRoundCount,
    currentPlayerIndex: getFirstAlivePlayerIndex(session.players),
    targetIndex: getFirstAliveMonsterIndex(session.monsters),
  };
}
