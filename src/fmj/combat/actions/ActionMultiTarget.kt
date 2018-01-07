package fmj.combat.actions

import fmj.characters.FightingCharacter
import fmj.characters.Monster
import fmj.combat.anim.RaiseAnimation

import graphics.Canvas

open class ActionMultiTarget(attacker: FightingCharacter,
                             targets: List<FightingCharacter>) : Action() {

    protected var mTargets: MutableList<FightingCharacter>? = null

    protected var mRaiseAnis: MutableList<RaiseAnimation>? = null

    override val isTargetAlive: Boolean
        get() {
            for (fc in mTargets!!) {
                if (fc.isAlive) {
                    return true
                }
            }
            return false
        }

    override val isSingleTarget: Boolean
        get() = false

    init {
        mAttacker = attacker
        mTargets = mutableListOf()
        mTargets!!.addAll(targets)
        mRaiseAnis = mutableListOf()
    }

    override fun postExecute() {
        if (mTargets != null) {
            for (fc in mTargets!!) {
                fc.isVisiable = fc.isAlive
            }
        }
    }

    override fun updateRaiseAnimation(delta: Long): Boolean {
        if (mRaiseAnis != null) { // 全体
            if (mRaiseAnis!!.size == 0) {
                return false
            } else {
                for (i in mRaiseAnis!!.indices) {
                    if (!mRaiseAnis!![i].update(delta)) {
                        mRaiseAnis!!.removeAt(i)
                        if (mRaiseAnis!!.isEmpty()) return false
                    }
                }
                return true
            }
        }

        return false
    }

    override fun drawRaiseAnimation(canvas: Canvas) {
        if (mRaiseAnis != null) {
            for (ani in mRaiseAnis!!) {
                ani.draw(canvas)
            }
        }
    }

    override fun draw(canvas: Canvas) {
        // TODO Auto-generated method stub

    }

    override fun targetIsMonster(): Boolean {
        return mTargets!![0] is Monster
    }

}
