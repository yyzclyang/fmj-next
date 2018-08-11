package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Player
import fmj.combat.anim.RaiseAnimation
import fmj.lib.ResSrs
import fmj.magic.BaseMagic

import graphics.Canvas

class ActionMagicHelpAll(attacker: FightingCharacter,
                         targets: List<FightingCharacter>, internal var magic: BaseMagic) : ActionMultiTarget(attacker, targets) {

    private var state = 1

    private var animation: ResSrs = magic.magicAni!!

    internal var ox: Int = 0
    internal var oy: Int = 0

    override fun preproccess() {
        val attacker = mAttacker?:return
        mTargets.forEach { it.backupStatus() }

        ox = attacker.combatX
        oy = attacker.combatY
        animation.start()
        animation.setIteratorNum(2)
        mTargets.forEach {
            magic.use(mAttacker!!, it)
        }
        mRaiseAnimations.addAll(mTargets.map { it.diffToAnimation(false) })
    }

    override fun update(delta: Long): Boolean {
        super.update(delta)
        when (state) {
            STATE_PRE -> if (mCurrentFrame < 10) {
                if (mAttacker is Player) {
                    mAttacker!!.fightingSprite!!.currentFrame = mCurrentFrame * 3 / 10 + 6
                } else {
                    mAttacker!!.setCombatPos(ox + 2, oy + 2)
                }
            } else {
                state = STATE_ANI
            }

            STATE_ANI -> if (!animation.update(delta)) { // 魔法动画完成
                state = STATE_AFT
                if (mAttacker is Player) {
                    (mAttacker as Player).setFrameByState()
                } else {
                    mAttacker!!.fightingSprite!!.move(-2, -2)
                }
            }

            STATE_AFT -> return updateRaiseAnimation(delta)
        }//			break;
        return true
    }

    override fun draw(canvas: Canvas) {
        if (state == STATE_ANI) {
            animation.draw(canvas, 0, 0)
        } else if (state == STATE_AFT) {
            drawRaiseAnimation(canvas)
        }
    }

    companion object {

        private val STATE_PRE = 1 // 起手动画
        private val STATE_ANI = 2 // 魔法动画
        private val STATE_AFT = 3 // 伤害动画
    }

}
