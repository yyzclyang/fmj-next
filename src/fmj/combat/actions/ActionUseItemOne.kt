package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Player
import fmj.combat.anim.RaiseAnimation
import fmj.goods.BaseGoods
import fmj.goods.GoodsMedicine
import fmj.lib.DatLib
import fmj.lib.ResSrs

import graphics.Canvas

class ActionUseItemOne(attacker: FightingCharacter, target: FightingCharacter, internal var goods: BaseGoods) : ActionSingleTarget(attacker, target) {

    private var mState = 1

    internal var mAni: ResSrs = ResSrs() // TODO

    internal var mAnix: Int = 0
    internal var mAniy: Int = 0

    internal var ox: Int = 0
    internal var oy: Int = 0

    override fun preproccess() {
        // TODO 记下伤害值、异常状态
        var hp = 0
        if (goods is GoodsMedicine) {
            mAni = (goods as GoodsMedicine).ani!!
            hp = mTarget.hp
            (goods as GoodsMedicine).eat(mTarget as Player)
            hp = mTarget.hp - hp
        } else {
            mAni = DatLib.Companion.getRes(DatLib.ResType.SRS, 2, 1) as ResSrs
        }
        mAni.startAni()
        mAni.setIteratorNum(2)
        mAnix = mTarget.combatX
        mAniy = mTarget.combatY
        mRaiseAni = RaiseAnimation(mTarget.combatX, mTarget.combatTop, hp, 0)
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

            STATE_ANI -> if (!mAni.update(delta)) { // 魔法动画完成
                mState = STATE_AFT
                if (mAttacker is Player) {
                    (mAttacker as Player).setFrameByState()
                } else {
                    mAttacker!!.fightingSprite!!.move(-2, -2)
                }
            }

            STATE_AFT -> return mRaiseAni!!.update(delta)
        }//			break;
        return true
    }

    override fun draw(canvas: Canvas) {
        if (mState == STATE_ANI) {
            mAni.drawAbsolutely(canvas, mAnix, mAniy)
        } else if (mState == STATE_AFT) {
            mRaiseAni!!.draw(canvas)
        }
    }

    companion object {

        private val STATE_PRE = 1 // 起手动画
        private val STATE_ANI = 2 // 魔法动画
        private val STATE_AFT = 3 // 伤害动画
    }

}
