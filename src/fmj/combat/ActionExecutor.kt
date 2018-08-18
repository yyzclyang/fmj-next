package fmj.combat

import fmj.combat.actions.*

import graphics.Canvas

import java.Queue

class ActionExecutor(
        /** 被执行的动作队列 */
        private val mActionQueue: Queue<Action>, private val mCombat: Combat) {

    /** 当前执行的动作 */
    private var mCurrentAction: Action? = null

    private var mIsNewAction = true

    private var postAction: PostAction? = null

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
        postAction?.let {
            if (it.update(delta)) {
                return true
            }
            postAction = null
            mCurrentAction = mActionQueue.pop() // 取下一个动作
            if (mCurrentAction == null) { // 所有动作执行完毕
                return false
            }
            mIsNewAction = true
            return true
        }

        if (mCurrentAction == null) {
            mCurrentAction = mActionQueue.pop()
            if (mCurrentAction == null) {
                return false
            }
            mIsNewAction = true
        }

        if (mIsNewAction) {
            prepareAction()
            return true
        }

        if (!mCurrentAction!!.update(delta)) { // 当前动作执行完毕
            mCurrentAction!!.postExecute()
            postAction()
        }

        return true
    }

    private fun postAction() {
        postAction = mCurrentAction!!.postAction()
        mCurrentAction!!.decay()
        mCurrentAction = null
        mIsNewAction = false
    }

    /**
     * 执行完毕返回`false`
     */
    private fun prepareAction() {
        // attacker dead, goto next action
        if (!mCurrentAction!!.isAttackerActionable) {
            mCurrentAction!!.cancel()
            postAction()
            return
        }

        // 乱
        if (mCurrentAction!!.isAttackerConfusing) {
            mCurrentAction!!.cancel()
            mCurrentAction = ActionSelfHurt(mCurrentAction!!.mAttacker!!)
        }

        // target dead, get an alive target
        if (!mCurrentAction!!.isTargetAlive) {
            if (!mCurrentAction!!.isSingleTarget) { // 敌人都死了
                mCurrentAction = null
            } else { // try to find an alive target
                val newTarget =
                        if (mCurrentAction!!.targetIsMonster()) {
                            mCombat.firstAliveMonster
                        } else {
                            mCombat.randomAlivePlayer
                        }
                if (newTarget == null) {
                    postAction()
                    return
                } else if (mCurrentAction !is ActionFlee) {
                    (mCurrentAction as ActionSingleTarget).setTarget(newTarget)
                }
            }
        }
        mCurrentAction?.preproccess()
        mIsNewAction = false
    }

    fun draw(canvas: Canvas) {
        postAction?.let {
            it.draw(canvas)
            return
        }
        mCurrentAction?.draw(canvas)
    }
}
