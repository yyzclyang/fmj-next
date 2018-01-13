package fmj.views

import fmj.ScreenViewType

import graphics.Canvas
import graphics.Bitmap

interface ScreenDelegate {
    fun popScreen()
    fun pushScreen(scr: BaseScreen)
    fun changeScreen(scr: ScreenViewType)
    fun getCurScreen(): BaseScreen
    fun showMessage(msg:String, delay:Long)
    fun getFrameBitmap(w: Int, h: Int): Bitmap
    fun keyDown(key: Int)
    fun keyUp(key: Int)
}

abstract class BaseScreen {
    lateinit var delegate: ScreenDelegate
    val msgDelegate
        get() = delegate

    open val isPopup: Boolean
        get() = false

    abstract fun update(delta: Long)

    abstract fun draw(canvas: Canvas)

    abstract fun onKeyDown(key: Int)

    abstract fun onKeyUp(key: Int)
    open fun willAppear() {}
}
