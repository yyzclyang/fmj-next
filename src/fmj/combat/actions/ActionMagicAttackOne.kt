package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Player
import fmj.combat.anim.RaiseAnimation
import fmj.lib.ResSrs
import fmj.magic.BaseMagic
import fmj.magic.MagicAttack

import graphics.Canvas

class ActionMagicAttackOne(attacker: FightingCharacter, target: FightingCharacter, private val magic: BaseMagic
) : ActionSingleTarget(attacker, target) {

    private var mState = 1

    private var mAni: ResSrs? = null

    private var mAniX: Int = 0
    private var mAniY: Int = 0

    private var ox: Int = 0
    private var oy: Int = 0

    override fun preproccess() {
        // TODO 记下伤害值、异常状态
        ox = mAttacker!!.combatX
        oy = mAttacker!!.combatY
        mAni = magic.magicAni
        mAni!!.startAni()
        mAni!!.setIteratorNum(2)
        val ohp = mTarget.hp
        if (magic is MagicAttack) {
            magic.use(mAttacker!!, mTarget)
        }
        mAniX = mTarget.combatX
        mAniY = mTarget.combatY - mTarget.fightingSprite!!.height / 2
        mRaiseAni = RaiseAnimation(mTarget.combatX, mTarget.combatY, mTarget.hp - ohp, 0/*FightingCharacter.BUFF_MASK_DU*/)
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
