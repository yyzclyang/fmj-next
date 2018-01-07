package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Monster
import fmj.combat.anim.RaiseAnimation
import graphics.Canvas

abstract class ActionSingleTarget(attacker: FightingCharacter,
                                  protected var mTarget: FightingCharacter) : Action() {

    protected var mRaiseAni: RaiseAnimation? = null

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
        return mRaiseAni != null && mRaiseAni!!.update(delta)
    }

    override fun drawRaiseAnimation(canvas: Canvas) {
        if (mRaiseAni != null) {
            mRaiseAni!!.draw(canvas)
        }
    }

    override fun targetIsMonster(): Boolean {
        return mTarget is Monster
    }

    fun setTarget(fc: FightingCharacter) {
        mTarget = fc
    }
}
