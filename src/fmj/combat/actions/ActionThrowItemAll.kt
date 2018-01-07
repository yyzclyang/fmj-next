package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Player
import fmj.combat.anim.RaiseAnimation
import fmj.goods.GoodsHiddenWeapon
import fmj.lib.ResSrs

import graphics.Canvas

class ActionThrowItemAll(attacker: FightingCharacter,
                         targets: List<FightingCharacter>, internal var hiddenWeapon: GoodsHiddenWeapon) : ActionMultiTarget(attacker, targets) {

    private var mState = 1

    private var mAni: ResSrs? = null

    private var ox: Int = 0
    private var oy: Int = 0

    override fun preproccess() {
        // TODO 记下伤害值、异常状态
        ox = mAttacker!!.combatX
        oy = mAttacker!!.combatY
        mAni = hiddenWeapon.ani
        mAni!!.startAni()
        mAni!!.setIteratorNum(2)
        // TODO effect it
        mRaiseAnis!!.add(RaiseAnimation(10, 20, 10, 0))
        mRaiseAnis!!.add(RaiseAnimation(30, 10, 10, 0))
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
                if (!targetIsMonster()) {
                    for (fc in mTargets!!) {
                        fc.fightingSprite!!.currentFrame = 10
                    }
                } else {
                    for (fc in mTargets!!) {
                        fc.fightingSprite!!.move(2, 2)
                    }
                }
            }

            STATE_AFT -> if (!updateRaiseAnimation(delta)) {
                if (targetIsMonster()) {
                    for (fc in mTargets!!) {
                        fc.fightingSprite!!.move(-2, -2)
                    }
                } else {
                    for (fc in mTargets!!) {
                        (fc as Player).setFrameByState()
                    }
                }
                return false
            }
        }
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
