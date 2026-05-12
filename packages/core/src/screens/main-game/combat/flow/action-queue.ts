import type { CombatAction } from '@/combat/combat-actions';
import type { CombatFinishResult, CombatSession } from '@/combat/combat-runtime';
import { isConfusing, isSleeping } from '@/combat/combat-effects';
import type { Game } from '@/game/game';
import { createMonsterAction } from '../actions/monster-ai';
import type { CombatActionAnimation } from '../animations/animation-types';
import { clearActionQueueAndRestoreItems, getActionPriority, restoreActionGoods } from './action-utils';
import { type CombatActionPreparer, type PreparedCombatAction } from '../prepare/action-preparer';
import { finishActionState, resetFighterFrames } from './post-action';
import { getRandomAlivePlayer, hasAlivePlayers, isAllMonsterDead } from '../actions/targeting';

export type CombatActionQueueResult =
  | { readonly kind: 'running' }
  | { readonly kind: 'finishRound' }
  | { readonly kind: 'startSuccess' }
  | { readonly kind: 'finish'; readonly result: CombatFinishResult };

interface CombatActionQueueOptions {
  readonly game: Game;
  readonly session: CombatSession;
  readonly actionPreparer: CombatActionPreparer;
  readonly actionInterval: number;
}

// 动作队列负责一轮战斗的执行推进，ScreenCombat 只根据返回结果切换阶段。
export class CombatActionQueue {
  private readonly queue: CombatAction[] = [];
  private currentAction: CombatAction | null = null;
  private animation: CombatActionAnimation | null = null;
  private pendingActionResult: CombatFinishResult | null | undefined;
  private actionElapsed = 0;

  constructor(private readonly options: CombatActionQueueOptions) {}

  get length(): number {
    return this.queue.length;
  }

  get currentAnimation(): CombatActionAnimation | null {
    return this.animation;
  }

  push(action: CombatAction): void {
    this.queue.push(action);
  }

  popAndRestore(): CombatAction {
    const action = this.queue.pop();
    if (!action) throw new Error('取消角色行动时没有可撤销的动作');
    restoreActionGoods(this.game, action);
    return action;
  }

  clear(): void {
    this.queue.length = 0;
    this.session.clearDefendingPlayers();
  }

  clearAndRestoreItems(): void {
    clearActionQueueAndRestoreItems(this.game, this.queue);
    this.session.clearDefendingPlayers();
  }

  startPerforming(): void {
    this.session.clearDefendingPlayers();
    this.registerDefendingPlayers();
    this.appendMonsterActions();
    this.queue.sort((a, b) => getActionPriority(b) - getActionPriority(a));
    this.currentAction = null;
    this.animation = null;
    this.actionElapsed = 0;
  }

  update(delta: number): CombatActionQueueResult {
    if (this.pendingActionResult !== undefined) {
      if (this.animation?.update(delta)) return { kind: 'running' };
      const result = this.pendingActionResult;
      this.pendingActionResult = undefined;
      this.animation = null;
      this.actionElapsed = 0;
      resetFighterFrames(this.session.players, this.session.monsters);
      return this.completePendingAction(result);
    }

    while (!this.currentAction) {
      const next = this.queue.shift();
      if (!next) {
        this.session.clearDefendingPlayers();
        return { kind: 'finishRound' };
      }
      const prepared = this.options.actionPreparer.prepare(next);
      this.applyPreparedAction(prepared);
    }

    if (this.animation) {
      if (this.animation.update(delta)) return { kind: 'running' };
    } else {
      this.actionElapsed += delta;
      if (this.actionElapsed < this.options.actionInterval) return { kind: 'running' };
    }

    const action = this.currentAction;
    if (!action) throw new Error('战斗动作队列执行状态异常');
    const result = this.getActionResult(action);
    const postAnimation = finishActionState(this.game, action);
    this.currentAction = null;
    this.actionElapsed = 0;
    resetFighterFrames(this.session.players, this.session.monsters);
    if (postAnimation) {
      this.animation = postAnimation;
      this.pendingActionResult = result;
      return { kind: 'running' };
    }
    this.animation = null;
    return this.completePendingAction(result);
  }

  private applyPreparedAction(prepared: PreparedCombatAction): void {
    this.animation = prepared.animation;
    this.currentAction = prepared.action;
  }

  private appendMonsterActions(): void {
    for (const monster of this.session.monsters) {
      if (!monster.isAlive) continue;
      const target = getRandomAlivePlayer(this.session.players);
      if (!target) return;
      this.queue.push(createMonsterAction(monster, target, this.session.players, this.session.monsters));
    }
  }

  private registerDefendingPlayers(): void {
    for (const action of this.queue) {
      if (action.kind !== 'defend') continue;
      if (!action.actor.isAlive || isSleeping(action.actor) || isConfusing(action.actor)) continue;
      this.session.setPlayerDefending(action.actor);
    }
  }

  private completePendingAction(result: CombatFinishResult | null): CombatActionQueueResult {
    if (result) {
      this.clearAndRestoreItems();
      return { kind: 'finish', result };
    }
    if (isAllMonsterDead(this.session.monsters)) {
      this.clearAndRestoreItems();
      return { kind: 'startSuccess' };
    }
    if (!hasAlivePlayers(this.session.players)) {
      this.clearAndRestoreItems();
      return { kind: 'finish', result: 'loss' };
    }
    return { kind: 'running' };
  }

  private getActionResult(action: CombatAction): CombatFinishResult | null {
    if (action.kind === 'flee' && action.succeed) return 'flee';
    return null;
  }

  private get game(): Game {
    return this.options.game;
  }

  private get session(): CombatSession {
    return this.options.session;
  }
}
