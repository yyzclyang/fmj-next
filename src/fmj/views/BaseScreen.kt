package fmj.views

import fmj.ScreenViewType
import fmj.scene.ScreenMainGame

import graphics.Canvas

interface GameNode {
    fun popScreen()
    fun pushScreen(scr: BaseScreen)
    fun changeScreen(scr: ScreenViewType)
    fun getCurScreen(): BaseScreen
    fun showMessage(msg:String, delay:Long)

    // TODO: rename
    val mainScreen: ScreenMainGame

    fun showMessage(msg:String) {
        showMessage(msg, 1000)
    }
}

interface Control: GameNode {
    val parent: GameNode

    override val mainScreen
        get() = parent.mainScreen

    override fun popScreen() {
        parent.popScreen()
    }

    override fun pushScreen(scr: BaseScreen) {
        parent.pushScreen(scr)
    }

    override fun changeScreen(scr: ScreenViewType) {
        parent.changeScreen(scr)
    }

    override fun getCurScreen(): BaseScreen {
        return parent.getCurScreen()
    }

    override fun showMessage(msg:String, delay:Long) {
        parent.showMessage(msg, delay)
    }
}

interface BaseScreen: Control {
    val isPopup: Boolean
        get() = false

    fun update(delta: Long)

    fun draw(canvas: Canvas)

    fun onKeyDown(key: Int)

    fun onKeyUp(key: Int)
    fun willAppear() {}
}
