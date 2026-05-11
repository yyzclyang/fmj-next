import type { FightingCharacter, Monster, Player } from '@/characters';
import {
  type BaseGoods,
  GoodsHiddenWeapon,
  GoodsMedicine,
  GoodsMedicinePermanent,
  GoodsMedicineLife,
  GoodsWeapon,
} from '@/goods';
import { type BaseMagic, MagicAttack, MagicAuxiliary, MagicEnhance, MagicRestore, MagicSpecial } from '@/magic';

export type CombatPhase =
  | 'selectAction'
  | 'selectTarget'
  | 'selectPlayerTarget'
  | 'miscMenu'
  | 'goodsMenu'
  | 'statusMenu'
  | 'performing'
  | 'success';
export type ActionIconIndex = 1 | 2 | 3 | 4;
export type CombatActor = Player | Monster;
export type CombatMedicineGoods = GoodsMedicine | GoodsMedicineLife | GoodsMedicinePermanent;
export type CombatThrowableGoods = GoodsHiddenWeapon | GoodsWeapon;
export type CombatHelpMagic = MagicRestore | MagicAuxiliary | MagicEnhance;
export type CombatAction =
  | AttackAction
  | AttackAllAction
  | DefendAction
  | FleeAction
  | ThrowItemAction
  | UseItemAction
  | MagicAttackAction
  | MagicHelpAction
  | SpecialMagicAction
  | CoopAction
  | NopAction;

export type MonsterTargetMode =
  | { kind: 'attack' }
  | { kind: 'coop' }
  | { kind: 'throwItem'; goods: CombatThrowableGoods }
  | { kind: 'magicAttack'; magic: MagicAttack }
  | { kind: 'specialMagic'; magic: MagicSpecial };
export type PlayerTargetMode =
  | { kind: 'useItem'; goods: CombatMedicineGoods; allowDead: boolean }
  | { kind: 'magicHelp'; magic: CombatHelpMagic; allowDead: boolean };

export interface AttackAction {
  readonly kind: 'attack';
  readonly actor: CombatActor;
  target: FightingCharacter;
}

export interface AttackAllAction {
  readonly kind: 'attackAll';
  readonly actor: CombatActor;
  readonly targets: readonly FightingCharacter[];
}

export interface DefendAction {
  readonly kind: 'defend';
  readonly actor: Player;
}

export interface FleeAction {
  readonly kind: 'flee';
  readonly actor: Player;
  readonly succeed: boolean;
}

export interface ThrowItemAction {
  readonly kind: 'throwItem';
  readonly actor: Player;
  readonly goods: CombatThrowableGoods;
  readonly targets: readonly Monster[];
  readonly targetAll: boolean;
}

export interface UseItemAction {
  readonly kind: 'useItem';
  readonly actor: Player;
  readonly goods: CombatMedicineGoods;
  readonly targets: readonly Player[];
  readonly targetAll: boolean;
}

export interface MagicAttackAction {
  readonly kind: 'magicAttack';
  readonly actor: CombatActor;
  readonly magic: MagicAttack;
  readonly targets: readonly FightingCharacter[];
  readonly targetAll: boolean;
}

export interface MagicHelpAction {
  readonly kind: 'magicHelp';
  readonly actor: CombatActor;
  readonly magic: CombatHelpMagic;
  readonly targets: readonly FightingCharacter[];
  readonly targetAll: boolean;
}

export interface SpecialMagicAction {
  readonly kind: 'specialMagic';
  readonly actor: Player;
  target: Monster;
  readonly magic: MagicSpecial;
}

export interface CoopAction {
  readonly kind: 'coop';
  readonly actor: Player;
  readonly actors: readonly Player[];
  readonly magic: MagicAttack | null;
  readonly targets: readonly Monster[];
  readonly targetAll: boolean;
}

export interface NopAction {
  readonly kind: 'nop';
  readonly actor: CombatActor;
}

export function isCombatMedicineGoods(goods: BaseGoods): goods is CombatMedicineGoods {
  return (
    goods instanceof GoodsMedicine || goods instanceof GoodsMedicineLife || goods instanceof GoodsMedicinePermanent
  );
}

export function isCombatThrowableGoods(goods: BaseGoods): goods is CombatThrowableGoods {
  return goods instanceof GoodsHiddenWeapon || goods instanceof GoodsWeapon;
}

export function isCombatHelpMagic(magic: BaseMagic): magic is CombatHelpMagic {
  return magic instanceof MagicRestore || magic instanceof MagicAuxiliary || magic instanceof MagicEnhance;
}
