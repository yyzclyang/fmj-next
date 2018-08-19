package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Player
import fmj.lib.ResSrs
import fmj.magic.MagicAttack

import graphics.Canvas

class ActionMagicAttackAll(attacker: FightingCharacter,
                           targets: List<FightingCharacter>, private val magic: MagicAttack
) : ActionMultiTarget(attacker, targets) {

    private var mState = 1

    private var mAni: ResSrs? = null

    private var ox: Int = 0
    private var oy: Int = 0

    override val isMagic = true

    override fun preproccess() {
        val attacker = mAttacker?:return
        attacker.backupStatus()
        mTargets.forEach { it.backupStatus() }

        ox = attacker.combatX
        oy = attacker.combatY
        mAni = magic.magicAni
        mAni!!.start()
        mAni!!.setIteratorNum(2)
        magic.use(attacker, mTargets)

        mRaiseAnimations.add(attacker.diffToAnimation())
        mRaiseAnimations.addAll(mTargets.map { it.diffToAnimation() })
    }

    override fun update(delta: Long): Boolean {
        super.update(delta)
        when (mState) {
            STATE_PRE -> if (mCurrentFrame < 10) {
                if (mAttacker is Player) {
                    mAttacker!!.fightingSprite!!.currentFrame = mCurrentFrame * 3 / 10 + 6
                } else {
                    mAttacker!!.setCombatPos(ox + 2, oy + 2)
                }
            } else {
                mState = STATE_ANI
            }

            STATE_ANI -> if (!mAni!!.update(delta)) {
                mState = STATE_AFT
                if (mAttacker is Player) {
                    (mAttacker as Player).setFrameByState()
                } else {
                    mAttacker!!.fightingSprite!!.move(-2, -2)
                }
                if (mTargets[0] is Player) {
                    for (fc in mTargets) {
                        fc.fightingSprite!!.currentFrame = 10
                    }
                } else {
                    for (fc in mTargets) {
                        fc.fightingSprite!!.move(2, 2)
                    }
                }
            }

            STATE_AFT -> if (!updateRaiseAnimation(delta)) {
                if (mTargets[0] is Player) {
                    for (fc in mTargets) {
                        (fc as Player).setFrameByState()
                    }
                } else {
                    for (fc in mTargets) {
                        fc.fightingSprite!!.move(-2, -2)
                    }
                }
                return false
            }
        }
        return true
    }

    override fun draw(canvas: Canvas) {
        super.draw(canvas)
        if (mState == STATE_ANI) {
            mAni!!.draw(canvas, 0, 0)
        } else if (mState == STATE_AFT) {
            drawRaiseAnimation(canvas)
        }
    }

    override fun rollbackToPhysical(): Action {
        val attacker = mAttacker!!
        return if (attacker.hasAtbuff(FightingCharacter.BUFF_MASK_ALL))
            ActionPhysicalAttackAll(attacker, mTargets)
        else
            ActionPhysicalAttackOne(attacker, mTargets[0])
    }

    companion object {

        private val STATE_PRE = 1 // 起手动画
        private val STATE_ANI = 2 // 魔法动画
        private val STATE_AFT = 3 // 伤害动画
    }

}
