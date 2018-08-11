package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Monster
import fmj.combat.anim.RaiseAnimation

import graphics.Canvas

open class ActionMultiTarget(attacker: FightingCharacter,
                             targets: List<FightingCharacter>) : Action() {

    protected val mTargets: MutableList<FightingCharacter> = mutableListOf()

    protected val mRaiseAnis: MutableList<RaiseAnimation> = mutableListOf()

    override val isTargetAlive: Boolean
        get() {
            return mTargets.any { it.isAlive }
        }

    override val isSingleTarget: Boolean
        get() = false

    init {
        mAttacker = attacker
        mTargets.addAll(targets)
    }

    override fun postExecute() {
        for (fc in mTargets) {
            fc.isVisiable = fc.isAlive
        }
    }

    override fun updateRaiseAnimation(delta: Long): Boolean {
        mRaiseAnis.removeAll { !it.update(delta) }
        return !mRaiseAnis.isEmpty()
    }

    override fun drawRaiseAnimation(canvas: Canvas) {
        for (ani in mRaiseAnis) {
            ani.draw(canvas)
        }
    }

    override fun draw(canvas: Canvas) {
    }

    override fun targetIsMonster(): Boolean {
        return mTargets[0] is Monster
    }

}
