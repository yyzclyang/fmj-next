package fmj.combat

import fmj.combat.actions.Action
import fmj.combat.actions.ActionFlee
import fmj.combat.actions.ActionSingleTarget

import graphics.Canvas

import java.Queue

class ActionExecutor(
        /** 被执行的动作队列 */
        private val mActionQueue: Queue<Action>, private val mCombat: Combat) {

    /** 当前执行的动作 */
    private var mCurrentAction: Action? = null

    private var mIsNewAction = true

    fun reset() {
        mCurrentAction = null
        mIsNewAction = true
    }

    /**
     *
     * @param delta
     * @return 执行完毕返回`false`，否则返回`true`
     */
    fun update(delta: Long): Boolean {
        if (mCurrentAction == null) {
            mCurrentAction = mActionQueue.pop()
            if (mCurrentAction == null) {
                return false
            }
            mCurrentAction!!.preproccess()
            mIsNewAction = false
        }

        if (mIsNewAction) { // 跳过死亡角色
            if (!fixAction()) {
                return false
            }
            mCurrentAction!!.preproccess()
            mIsNewAction = false
        }

        if (!mCurrentAction!!.update(delta)) { // 当前动作执行完毕
            mCurrentAction!!.postExecute()
            mCurrentAction = mActionQueue.pop() // 取下一个动作
            if (mCurrentAction == null) { // 所有动作执行完毕
                return false
            }
            mIsNewAction = true
        }

        return true
    }

    /**
     * 执行完毕返回`false`
     */
    private fun fixAction(): Boolean {
        // attacker dead, goto next action
        while (!mCurrentAction!!.isAttackerAlive) {
            mCurrentAction = mActionQueue.pop()
            if (mCurrentAction == null) {
                return false
            }
        }

        // target dead, get an alive target
        if (!mCurrentAction!!.isTargetAlive) {
            if (mCurrentAction!!.isSingleTarget) { // 敌人都死了
                return false
            } else { // try to find an alive target
                val newTarget =
                        if (mCurrentAction!!.targetIsMonster()) {
                            mCombat.firstAliveMonster
                        } else {
                            mCombat.randomAlivePlayer
                        }

                if (newTarget == null) {
                    return false
                } else if (mCurrentAction !is ActionFlee) {
                    (mCurrentAction as ActionSingleTarget).setTarget(newTarget)
                }
            }
        }
        return true
    }

    fun draw(canvas: Canvas) {
        mCurrentAction?.draw(canvas)
    }
}
