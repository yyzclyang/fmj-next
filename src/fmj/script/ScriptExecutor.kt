package fmj.script

import graphics.Canvas

class ScriptExecutor
/**
 *
 * @param list 一个脚本文件对应的操作表
 * @param eventIndex eventIndex[i]等于触发事件i+1时，要执行的Operate在list中的序号
 * @param map 地址偏移-序号
 */
(private val mOperateList: ArrayList<Operate>,
 /**
  * mEventIndex[i]等于触发事件i+1时，要执行的Operate在list中的序号，
  * -1表示不存在
  */
 private val mEventIndex: IntArray,
 /**
  * address offset --- operate's index of mOperateList
  */
 private val mMapAddrOffsetIndex: HashMap<Int, Int>,
 /**
  * code数据前的长度
  */
 private val mHeaderCnt: Int) {

    /**
     * 当前正在执行的操作在mOperateList中的位置
     */
    private var mCurExeOperateIndex: Int = 0

    /**
     * 当前是否正在执行 update() draw()
     */
    private var mIsExeUpdateDraw: Boolean = false

    init {
        mCurExeOperateIndex = 0
        mIsExeUpdateDraw = false
    }

    /**
     * 触发地图事件,场景切换，NPC对话，开宝箱等
     * @param eventId 是否成功触发
     */
    fun triggerEvent(eventId: Int): Boolean {
        if (eventId > mEventIndex.size) {
            return false
        }

        val index = mEventIndex[eventId - 1]
        if (index != -1) {
            mCurExeOperateIndex = index
            mIsExeUpdateDraw = false
            return true
        }
        return false
    }

    fun gotoAddress(address: Int) {
        mCurExeOperateIndex = mMapAddrOffsetIndex[address - mHeaderCnt]!!
        if (mIsExeUpdateDraw) { // 不在Operate.process()中调用的gotoAddress
            mIsExeUpdateDraw = false
            --mCurExeOperateIndex
        } else { // 在Operate.process()中调用的gotoAddress
            goonExecute = false // mark 下次调用process再执行
        }
    }

    fun process() {
        if (!mIsExeUpdateDraw) {
            while (mCurExeOperateIndex < mOperateList.size && goonExecute) {
                val oper = mOperateList[mCurExeOperateIndex]
                if (oper.process()) { // 执行 update draw
                    mIsExeUpdateDraw = true
                    return
                }
                if (!goonExecute) {
                    goonExecute = true
                    return
                }
                ++mCurExeOperateIndex
            }
            // 正常情况不回执行到这里，脚本最后一句是callback
        }
    }

    fun update(delta: Long) {
        if (mIsExeUpdateDraw) {
            if (!mOperateList[mCurExeOperateIndex].update(delta)) { // 退出当前操作
                mIsExeUpdateDraw = false
                ++mCurExeOperateIndex
            }
        }
    }

    fun draw(canvas: Canvas) {
        if (mIsExeUpdateDraw) {
            mOperateList[mCurExeOperateIndex].draw(canvas)
        } else {
            //			mOperateList.get(mLastIndex).draw(canvas);
        }
    }

    fun keyDown(key: Int) {
        if (mIsExeUpdateDraw) {
            mOperateList[mCurExeOperateIndex].onKeyDown(key)
        }
    }

    fun keyUp(key: Int) {
        if (mIsExeUpdateDraw) {
            mOperateList[mCurExeOperateIndex].onKeyUp(key)
        }
    }

    companion object {
        var goonExecute = true
    }

}
