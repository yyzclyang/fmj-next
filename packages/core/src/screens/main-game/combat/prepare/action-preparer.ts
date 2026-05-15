import type { CombatAction } from '@/combat/combat-actions';
import { isConfusing, isSealed, isSleeping } from '@/combat/combat-effects';
import type { CombatSession } from '@/combat/combat-runtime';
import type { Game } from '@/game/game';
import { createLogger } from '@/utils/logger';
import { type CombatPrepareContext, type PreparedCombatAction, noPreparedAction } from './action-preparer-types';
import { restoreActionGoods } from '../flow/action-utils';
import { createMonsterAction } from '../actions/monster-ai';
import { prepareUseItemAction, prepareThrowItemAction } from './prepare-goods';
import {
  prepareMagicAttackAction,
  prepareMagicHelpAction,
  prepareRolledBackMagicAction,
  prepareSpecialMagicAction,
} from './prepare-magic';
import {
  prepareAttackAction,
  prepareAttackAllAction,
  prepareCoopAction,
  prepareDefendAction,
  prepareFleeAction,
  prepareNopAction,
} from './prepare-physical';

export type { PreparedCombatAction } from './action-preparer-types';

const logger = createLogger('战斗');

interface CombatActionPreparerOptions {
  readonly game: Game;
  readonly session: CombatSession;
  readonly actionInterval: number;
  readonly setMessage: (message: string, duration: number) => void;
}

// 单个动作的数值结算和动画创建集中在这里，ScreenCombat 只负责队列和阶段切换。
export class CombatActionPreparer {
  constructor(private readonly options: CombatActionPreparerOptions) {}

  prepare(action: CombatAction): PreparedCombatAction {
    const ctx = this.context;
    if (!action.actor.isAlive) {
      logger.log('改写', `${action.actor.name} 已倒下，跳过 ${formatActionKind(action)}`);
      restoreActionGoods(this.game, action);
      return noPreparedAction();
    }
    if (action.kind !== 'flee' && isSleeping(action.actor)) {
      logger.log('改写', `${action.actor.name} 睡眠，${formatActionKind(action)} 改为空动作`);
      restoreActionGoods(this.game, action);
      return prepareNopAction(ctx, action.actor);
    }
    if (action.kind !== 'flee' && isConfusing(action.actor)) {
      logger.log('改写', `${action.actor.name} 混乱，${formatActionKind(action)} 改为攻击自己`);
      restoreActionGoods(this.game, action);
      return prepareAttackAction(ctx, { kind: 'attack', actor: action.actor, target: action.actor });
    }
    if (action.kind === 'monsterAuto') {
      const resolved = createMonsterAction(action.actor, this.session.players, this.session.monsters);
      return resolved ? this.prepare(resolved) : noPreparedAction();
    }
    if ((action.kind === 'magicAttack' || action.kind === 'magicHelp') && isSealed(action.actor)) {
      logger.log(
        '改写',
        action.kind === 'magicAttack'
          ? `${action.actor.name} 封咒，攻击法术 ${action.magic.name} 回退为物理攻击`
          : `${action.actor.name} 封咒，辅助法术 ${action.magic.name} 回退为物理攻击`
      );
      return prepareRolledBackMagicAction(ctx, action);
    }
    if (action.kind === 'specialMagic' && isSealed(action.actor)) {
      logger.log('改写', `${action.actor.name} 封咒，特殊法术 ${action.magic.name} 改为普攻`);
      return prepareAttackAction(ctx, { kind: 'attack', actor: action.actor, target: action.target });
    }
    if (action.kind === 'nop') return prepareNopAction(ctx, action.actor);
    if (action.kind === 'defend') return prepareDefendAction(ctx, action);
    if (action.kind === 'flee') return prepareFleeAction(ctx, action);
    if (action.kind === 'throwItem') return prepareThrowItemAction(ctx, action);
    if (action.kind === 'useItem') return prepareUseItemAction(ctx, action);
    if (action.kind === 'magicAttack') return prepareMagicAttackAction(ctx, action);
    if (action.kind === 'magicHelp') return prepareMagicHelpAction(ctx, action);
    if (action.kind === 'specialMagic') return prepareSpecialMagicAction(ctx, action);
    if (action.kind === 'attackAll') return prepareAttackAllAction(ctx, action);
    if (action.kind === 'coop') return prepareCoopAction(ctx, action);
    return prepareAttackAction(ctx, action);
  }

  private setMessage(message: string): void {
    this.options.setMessage(message, this.actionInterval);
  }

  private get game(): Game {
    return this.options.game;
  }

  private get session(): CombatSession {
    return this.options.session;
  }

  private get actionInterval(): number {
    return this.options.actionInterval;
  }

  private get context(): CombatPrepareContext {
    return {
      game: this.game,
      session: this.session,
      actionInterval: this.actionInterval,
      setMessage: message => this.setMessage(message),
    };
  }
}

function formatActionKind(action: CombatAction): string {
  switch (action.kind) {
    case 'attack':
      return `普攻 ${action.target.name}`;
    case 'attackAll':
      return '群攻';
    case 'defend':
      return '防御';
    case 'flee':
      return '逃跑';
    case 'throwItem':
      return `投掷 ${action.goods.name}`;
    case 'useItem':
      return `使用 ${action.goods.name}`;
    case 'magicAttack':
    case 'magicHelp':
    case 'specialMagic':
      return `法术 ${action.magic.name}`;
    case 'monsterAuto':
      return '自动行动';
    case 'coop':
      return `合体 ${action.magic?.name ?? '无'}`;
    case 'nop':
      return '空动作';
  }
}
