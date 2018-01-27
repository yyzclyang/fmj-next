package fmj.script

import fmj.views.ScreenDelegate
import graphics.Canvas

interface Command {
    /**
     * 指令长度
     */
    val len: Int
    /**
     * 处理一条指令
     *
     * @return `Operate`继续执行
     *
     *
     * `null`指令执行完毕
     */
    fun run(delegate: ScreenDelegate): Operate?
}

abstract class Operate {
    // TODO: fix typo
    lateinit var delagete: ScreenDelegate

    /**
     *
     * @return 是否全屏
     */
    val isPopup: Boolean
        get() = false
    /**
     *
     * @param delta
     * @return `false`退出当前操作
     */
    abstract fun update(delta: Long): Boolean

    abstract fun draw(canvas: Canvas)

    abstract fun onKeyDown(key: Int)

    abstract fun onKeyUp(key: Int)
}

