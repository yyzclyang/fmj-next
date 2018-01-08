package fmj.script

import fmj.views.ScreenDelegate
import graphics.Canvas

abstract class Operate {
    lateinit var delagete: ScreenDelegate

    /**
     *
     * @return 是否全屏
     */
    val isPopup: Boolean
        get() = false

    /**
     * 处理一条指令
     *
     * @return `true`继续执行 [.update] [.draw]
     *
     *
     * `false`指令执行完毕
     */
    abstract fun process(): Boolean

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

class OperateNop: Operate() {
    override fun process() = false

    override fun update(delta: Long) = true

    override fun draw(canvas: Canvas) {}

    override fun onKeyDown(key: Int) {}

    override fun onKeyUp(key: Int) {}

    companion object {
        val nop = OperateNop()
    }
}

