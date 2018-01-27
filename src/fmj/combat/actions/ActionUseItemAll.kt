package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Player
import fmj.combat.anim.RaiseAnimation
import fmj.goods.BaseGoods
import fmj.lib.ResSrs

import graphics.Canvas

class ActionUseItemAll(attacker: FightingCharacter,
                       targets: List<FightingCharacter>, internal var goods: BaseGoods) : ActionMultiTarget(attacker, targets) {

    private var mState = 1

    internal var mAni: ResSrs? = null

    internal var ox: Int = 0
    internal var oy: Int = 0

    override fun preproccess() {
        ox = mAttacker!!.combatX
        oy = mAttacker!!.combatY
        //		mAni = magic.getMagicAni(); TODO null fix
        mAni!!.start()
        mAni!!.setIteratorNum(2)
        mRaiseAnis.add(RaiseAnimation(10, 20, 10, 0))
        mRaiseAnis.add(RaiseAnimation(30, 10, 10, 0))
    }

    override fun update(delta: Long): Boolean {
        super.update(delta)
        when (mState) {
            STATE_PRE -> if (mCurrentFrame < 10) {
                if (mAttacker is Player) {
                    (mAttacker as Player).fightingSprite!!.currentFrame = mCurrentFrame * 3 / 10 + 6
                } else {
                    mAttacker!!.setCombatPos(ox + 2, oy + 2)
                }
            } else {
                mState = STATE_ANI
            }

            STATE_ANI -> if (!mAni!!.update(delta)) { // 魔法动画完成
                mState = STATE_AFT
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
        if (mState == STATE_ANI) {
            mAni!!.draw(canvas, 0, 0)
        } else if (mState == STATE_AFT) {
            drawRaiseAnimation(canvas)
        }
    }

    companion object {

        private val STATE_PRE = 1 // 起手动画
        private val STATE_ANI = 2 // 魔法动画
        private val STATE_AFT = 3 // 伤害动画
    }

}
