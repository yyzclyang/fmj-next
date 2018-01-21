package fmj.script

import fmj.views.ScreenDelegate
import graphics.Canvas

abstract class Command {
    /**
     * 处理一条指令
     *
     * @return `Operate`继续执行
     *
     *
     * `null`指令执行完毕
     */
    abstract fun run(delegate: ScreenDelegate): Operate?
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

// TODO: rename
class OperateNop: Command() {
    override fun run(delegate: ScreenDelegate): Operate? {
        return null
    }

    companion object {
        val nop = OperateNop()
    }
}

