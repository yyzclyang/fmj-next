package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Monster
import fmj.combat.anim.Animation
import fmj.combat.anim.RaiseAnimation
import fmj.goods.BaseGoods
import graphics.Canvas

abstract class ActionSingleTarget(attacker: FightingCharacter,
                                  protected var mTarget: FightingCharacter) : Action() {

    protected var mRaiseAnimations: MutableList<Animation> = arrayListOf()

    override val isTargetAlive: Boolean
        get() = mTarget.isAlive

    override val isSingleTarget: Boolean
        get() = false

    init {
        mAttacker = attacker
    }

    override fun postExecute() {
        mTarget.isVisiable = mTarget.isAlive
    }

    override fun updateRaiseAnimation(delta: Long): Boolean {
        mRaiseAnimations.removeAll { !it.update(delta) }
        return !mRaiseAnimations.isEmpty()
    }

    override fun drawRaiseAnimation(canvas: Canvas) {
        mRaiseAnimations.forEach {
            it.draw(canvas)
        }
    }

    override fun targetIsMonster(): Boolean {
        return mTarget is Monster
    }

    fun setTarget(fc: FightingCharacter) {
        mTarget = fc
    }

    fun steal(attacker: FightingCharacter): BaseGoods? {
        val target = mTarget
        if (target is Monster) {
            return target.stealGoods(attacker)
        }
        return null
    }
}
