package fmj.script

import graphics.Canvas
import java.Coder
import java.ObjectInput
import java.ObjectOutput

class ScriptProcess
/**
 *
 * @param commands 一个脚本文件对应的操作表
 * @param eventIndex eventIndex[i]等于触发事件i+1时，要执行的Operate在list中的序号
 * @param map 地址偏移-序号
 */
(private val commands: ArrayList<Command>,
 /**
  * eventIndex[i]等于触发事件i+1时，要执行的Operate在list中的序号，
  * -1表示不存在
  */
 private val eventIndex: IntArray,
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

    var running = false
        private set

    var prev: ScriptProcess? = null

    var timer: Int = 0
    var timerCounter: Int = 0
    var timerEventId: Int = 0

    fun start() {
        running = true
        goonExecute = true
    }

    fun stop() {
        running = false
        goonExecute = false
    }

    /**
     * 触发地图事件,场景切换，NPC对话，开宝箱等
     * @param eventId 是否成功触发
     */
    fun triggerEvent(eventId: Int): Boolean {
        if (eventId > eventIndex.size) {
            stop()
            return false
        }

        val index = eventIndex[eventId - 1]
        if (index != -1) {
            mCurExeOperateIndex = index
            curOp = null
            start()
            return true
        }
        stop()
        return false
    }

    fun gotoAddress(address: Int) {
        mCurExeOperateIndex = mMapAddrOffsetIndex[address - mHeaderCnt]!!
        if (curOp != null) { // 不在Operate.process()中调用的gotoAddress
            curOp = null
            --mCurExeOperateIndex
        } else { // 在Operate.process()中调用的gotoAddress
            // loong TODO: why?
            goonExecute = false // mark 下次调用process再执行
        }
        running = true
    }

    fun process() {
        if (curOp == null) {
            while (mCurExeOperateIndex < commands.size && goonExecute) {
                val cmd = commands[mCurExeOperateIndex]
                curOp = cmd.run(this)
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

    fun timerStep(delta: Long) {
        if (timer > 0 && timerEventId > 0) {
            timerCounter -= delta.toInt()
            if (timerCounter <= 0) {
                timerCounter += timer
                triggerEvent(timerEventId)
            }
        }
    }

    fun setTimer(timer: Int, eventId: Int) {
        this.timer = timer * 500
        timerCounter = this.timer
        timerEventId = eventId
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

    fun encode(coder: ObjectOutput) {
        coder.writeInt(timer)
        coder.writeInt(timerCounter)
        coder.writeInt(timerEventId)
    }

    fun decode(coder: ObjectInput) {
        timer = coder.readInt()
        timerCounter = coder.readInt()
        timerEventId = coder.readInt()
    }

    var goonExecute = true
}
