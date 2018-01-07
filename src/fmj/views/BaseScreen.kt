package fmj.views

import graphics.Canvas
import fmj.ScreenViewType

interface ScreenDelegate {
    fun popScreen()
    fun pushScreen(scr: BaseScreen)
    fun changeScreen(scr: ScreenViewType)
    fun getCurScreen(): BaseScreen
    fun showMessage(msg:String, delay:Long)
    fun keyDown(key: Int)
    fun keyUp(key: Int)
}

abstract class BaseScreen {
    var delegate: ScreenDelegate? = null

    open val isPopup: Boolean
        get() = false

    abstract fun update(delta: Long)

    abstract fun draw(canvas: Canvas)

    abstract fun onKeyDown(key: Int)

    abstract fun onKeyUp(key: Int)
}
