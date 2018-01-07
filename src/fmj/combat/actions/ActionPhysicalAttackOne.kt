package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Monster
import fmj.characters.Player
import fmj.combat.anim.RaiseAnimation
import graphics.Canvas
import kotlin.js.Math

class ActionPhysicalAttackOne(attacker: FightingCharacter,
                              target: FightingCharacter) : ActionSingleTarget(attacker, target) {

    private val TOTAL_FRAME = 5
    private var dx: Float = 0.toFloat()
    private var dy: Float = 0.toFloat()
    private var ox: Int = 0
    private var oy: Int = 0

//    private val buffRound: Int = 0

    private var mTotalMark = true

    override fun preproccess() {
        // TODO 记下伤害值、异常状态
        var damage: Int
        ox = mAttacker!!.combatX
        oy = mAttacker!!.combatY
        dx = (mTarget.combatX - mAttacker!!.combatX).toFloat() / TOTAL_FRAME
        dy = (mTarget.combatY - mAttacker!!.combatY).toFloat() / TOTAL_FRAME
        damage = mAttacker!!.attack - mTarget.defend
        if (damage <= 0) {
            damage = 1
        }
        if (mAttacker is Player) {
            damage *= 10
        }
        damage += (Math.random() * 10).toInt()
        mTarget.hp = mTarget.hp - damage
        mRaiseAni = RaiseAnimation(mTarget.combatLeft, mTarget.combatTop, -damage, 0)
    }

    override fun update(delta: Long): Boolean {
        super.update(delta)
        if (mCurrentFrame < TOTAL_FRAME) { // 发起动作
            mAttacker!!.setCombatPos((ox + dx * mCurrentFrame).toInt(), (oy + dy * mCurrentFrame).toInt())
            if (mAttacker is Monster) {
                val fs = (mAttacker as Monster).fightingSprite!!
                fs.currentFrame = fs.frameCnt * mCurrentFrame / TOTAL_FRAME + 1
            } else if (mAttacker is Player) {
                val fs = mAttacker!!.fightingSprite!!
                fs.currentFrame = 5 * mCurrentFrame / TOTAL_FRAME + 1
            }
        } else if (mCurrentFrame > TOTAL_FRAME) { // 扣血、异常状态的动画
            if (!updateRaiseAnimation(delta)) {
                if (mTarget is Player) {
                    (mTarget as Player).setFrameByState()
                } else {
                    mTarget.fightingSprite!!.move(-2, -2)
                }
                return false
            }
        } else if (mTotalMark) {
            mTotalMark = false
            mAttacker!!.setCombatPos(ox, oy)
            if (mAttacker is Monster) {
                val fs = (mAttacker as Monster).fightingSprite!!
                fs.currentFrame = 1
            } else if (mAttacker is Player) {
                (mAttacker as Player).setFrameByState()
            }
            if (mTarget is Player) {
                mTarget.fightingSprite!!.currentFrame = 10
            } else {
                mTarget.fightingSprite!!.move(2, 2)
            }
        }
        return true
    }

    override fun draw(canvas: Canvas) {
        if (mCurrentFrame >= TOTAL_FRAME) {
            drawRaiseAnimation(canvas)
        }
    }

}
