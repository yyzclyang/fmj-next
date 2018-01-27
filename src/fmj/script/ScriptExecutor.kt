package fmj.script

import fmj.views.ScreenDelegate
import graphics.Canvas

class ScriptExecutor
/**
 *
 * @param list 一个脚本文件对应的操作表
 * @param eventIndex eventIndex[i]等于触发事件i+1时，要执行的Operate在list中的序号
 * @param map 地址偏移-序号
 */
(private val commands: ArrayList<Command>,
 /**
  * mEventIndex[i]等于触发事件i+1时，要执行的Operate在list中的序号，
  * -1表示不存在
  */
 private val mEventIndex: IntArray,
 /**
  * address offset --- curOp's index of commands
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
    private var curOp: Operate? = null

    init {
        mCurExeOperateIndex = 0
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
            curOp = null
            return true
        }
        return false
    }

    fun gotoAddress(address: Int) {
        mCurExeOperateIndex = mMapAddrOffsetIndex[address - mHeaderCnt]!!
        if (curOp != null) { // 不在Operate.process()中调用的gotoAddress
            curOp = null
            --mCurExeOperateIndex
        } else { // 在Operate.process()中调用的gotoAddress
            goonExecute = false // mark 下次调用process再执行
        }
    }

    fun process(delegate: ScreenDelegate) {
        if (curOp == null) {
            while (mCurExeOperateIndex < commands.size && goonExecute) {
                val cmd = commands[mCurExeOperateIndex]
                curOp = cmd.run(delegate)
                if (curOp != null) { // 执行 update draw
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
        curOp?.update(delta)?.let {
            if (!it) { // 退出当前操作
                curOp = null
                ++mCurExeOperateIndex
            }
        }
    }

    fun draw(canvas: Canvas) {
        curOp?.draw(canvas)
    }

    fun keyDown(key: Int) {
        curOp?.onKeyDown(key)
    }

    fun keyUp(key: Int) {
        curOp?.onKeyUp(key)
    }

    companion object {
        var goonExecute = true
    }

}
