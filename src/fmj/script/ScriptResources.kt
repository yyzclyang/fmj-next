package fmj.script

import java.ObjectInput
import java.ObjectOutput

object ScriptResources {

    /**
     * 全局事件标志1-2400
     */
    var globalEvents = BooleanArray(2401)

    /**
     * 全局变量0-199,局部变量200-239
     */
    var variables = IntArray(240)

    /**
     * 初始化局部变量
     */
    fun initLocalVar() {
        for (i in 200..239) {
            variables[i] = 0
        }
    }

    /**
     * 初始化全局变量
     */
    fun initGlobalVar() {
        for (i in 0..199) {
            variables[i] = 0
        }
    }

    /**
     * 初始化全局事件
     */
    fun initGlobalEvents() {
        for (i in 1..2400) {
            globalEvents[i] = false
        }
    }

    /**
     * 将全局事件num标志设置为true
     * @param num 1-2400
     */
    fun setEvent(num: Int) {
        globalEvents[num] = true
    }

    /**
     * 将全局事件num标志设置为false
     */
    fun clearEvent(num: Int) {
        globalEvents[num] = false
    }

    fun write(out: ObjectOutput) {
        // 写全局事件
        for (i in 1..2400) {
            out.writeBoolean(globalEvents[i])
        }

        // 写全局变量&局部变量
        for (i in 0..239) {
            out.writeInt(variables[i])
        }
    }

    fun read(coder: ObjectInput) {
        // 读全局事件
        for (i in 1..2400) {
            globalEvents[i] = coder.readBoolean()
        }

        // 读全局变量&局部变量
        for (i in 0..239) {
            variables[i] = coder.readInt()
        }
    }
}
