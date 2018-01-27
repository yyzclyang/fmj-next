package fmj.views

import fmj.ScreenViewType
import fmj.scene.ScreenMainGame
import fmj.script.ScriptProcess

import graphics.Canvas

interface GameNode {
    val parent: GameNode
    val game: Game
        get() = parent.game

    fun popScreen()
    fun pushScreen(scr: BaseScreen)
    fun getCurScreen(): BaseScreen
    fun showMessage(msg:String, delay:Long)
    fun showMessage(msg:String) {
        showMessage(msg, 1000)
    }
}

interface Control: GameNode {
    override fun popScreen() {
        parent.popScreen()
    }

    override fun pushScreen(scr: BaseScreen) {
        parent.pushScreen(scr)
    }

    override fun getCurScreen(): BaseScreen {
        return parent.getCurScreen()
    }

    override fun showMessage(msg:String, delay:Long) {
        parent.showMessage(msg, delay)
    }
}

interface Game: Control {
    fun changeScreen(screenType: ScreenViewType)
    // TODO: rename
    val mainScreen: ScreenMainGame
    val scriptProcess: ScriptProcess
    val playerList get() = mainScreen.playerList
    fun triggerEvent(eventId: Int) {
        mainScreen.triggerEvent(eventId)
    }
    fun gotoAddress(addr: Int) {
        mainScreen.gotoAddress(addr)
    }
    fun exitScript() {
        mainScreen.exitScript()
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
