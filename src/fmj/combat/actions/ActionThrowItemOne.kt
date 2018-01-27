package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Player
import fmj.combat.anim.RaiseAnimation
import fmj.goods.GoodsHiddenWeapon
import fmj.lib.ResSrs

import graphics.Canvas

class ActionThrowItemOne(attacker: FightingCharacter, target: FightingCharacter, internal var hiddenWeapon: GoodsHiddenWeapon) : ActionSingleTarget(attacker, target) {

    private var mState = 1

    private var mAni: ResSrs? = null

    private var mAniX: Int = 0
    private var mAniY: Int = 0

    private var ox: Int = 0
    private var oy: Int = 0

    override fun preproccess() {
        // TODO 记下伤害值、异常状态 there is null pointer
        ox = mAttacker!!.combatX
        oy = mAttacker!!.combatY
        mAni = hiddenWeapon.ani
        mAni!!.start()
        mAni!!.setIteratorNum(2)
        // TODO effect it
        mAniX = mTarget.combatX
        mAniY = mTarget.combatY
        mRaiseAni = RaiseAnimation(mAniX, mTarget.combatTop, 10, 0)
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

            STATE_ANI -> if (!mAni!!.update(delta)) {
                mState = STATE_AFT
                if (mAttacker is Player) {
                    (mAttacker as Player).setFrameByState()
                } else {
                    mAttacker!!.fightingSprite!!.move(-2, -2)
                }
                if (mTarget is Player) {
                    mTarget.fightingSprite!!.currentFrame = 10
                } else {
                    mTarget.fightingSprite!!.move(2, 2)
                }
            }

            STATE_AFT -> if (!mRaiseAni!!.update(delta)) {
                if (mTarget is Player) {
                    (mTarget as Player).setFrameByState()
                } else {
                    mTarget.fightingSprite!!.move(-2, -2)
                }
                return false
            }
        }
        return true
    }

    override fun draw(canvas: Canvas) {
        if (mState == STATE_ANI) {
            mAni!!.drawAbsolutely(canvas, mAniX, mAniY)
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
