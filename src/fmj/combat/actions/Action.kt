package fmj.combat.actions

import fmj.characters.FightingCharacter
import graphics.Canvas

abstract class Action {

    /** 动作的发起者 */
    protected var mAttacker: FightingCharacter? = null
    private var mTimeCnt: Long = 0
    protected var mCurrentFrame = 0

    /**
     *
     * @return 动作发起者的身法
     */
    open val priority: Int
        get() = mAttacker!!.speed

    open val isAttackerAlive: Boolean
        get() = mAttacker!!.isAlive

    abstract val isTargetAlive: Boolean

    abstract val isSingleTarget: Boolean

    /**
     * 动作产生的影响，播放动作动画之前执行一次。
     */
    open fun preproccess() {

    }

    /**
     * 隐藏死亡角色
     */
    abstract fun postExecute()

    protected abstract fun updateRaiseAnimation(delta: Long): Boolean

    protected abstract fun drawRaiseAnimation(canvas: Canvas)

    /**
     *
     * @param delta
     * @return 执行完毕返回`false`，否则返回`true`
     */
    open fun update(delta: Long): Boolean {
        mTimeCnt += delta
        if (mTimeCnt >= DELTA) {
            ++mCurrentFrame
            mTimeCnt = 0
        }
        return true
    }

    open fun draw(canvas: Canvas) {}

    abstract fun targetIsMonster(): Boolean

    companion object {

        private val DELTA = 1000 / 20
    }

}
