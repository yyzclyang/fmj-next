package fmj.views

import fmj.Global
import fmj.ScreenViewType
import fmj.graphics.Util
import fmj.scene.ScreenMainGame
import graphics.Bitmap
import graphics.Canvas
import graphics.Paint
import java.Stack

class ScreenStack: ScreenDelegate {
    private val mScreenStack = Stack.create<BaseScreen>()

    fun clear() {
        mScreenStack.clear()
    }

    override fun keyDown(key: Int) {
        mScreenStack.peek()!!.onKeyDown(key)
    }

    override fun keyUp(key: Int) {
        mScreenStack.peek()!!.onKeyUp(key)
    }

    override fun changeScreen(scr: ScreenViewType) {
        val tmp: BaseScreen =
                when (scr) {
                    ScreenViewType.SCREEN_DEV_LOGO -> ScreenAnimation(247)
                    ScreenViewType.SCREEN_GAME_LOGO -> ScreenAnimation(248)
                    ScreenViewType.SCREEN_MENU -> ScreenMenu()
                    ScreenViewType.SCREEN_MAIN_GAME -> ScreenMainGame()
                    ScreenViewType.SCREEN_GAME_FAIL -> ScreenAnimation(249)
                    ScreenViewType.SCREEN_SAVE_GAME -> ScreenSaveLoadGame(ScreenSaveLoadGame.Operate.SAVE)
                    ScreenViewType.SCREEN_LOAD_GAME -> ScreenSaveLoadGame(ScreenSaveLoadGame.Operate.LOAD)
                }
        mScreenStack.clear()
        mScreenStack.push(tmp)
        tmp.willAppear()
        tmp.delegate = this
    }

    override fun pushScreen(scr: BaseScreen) {
        mScreenStack.push(scr)
        scr.willAppear()
        scr.delegate = this
    }

    override fun popScreen() {
        mScreenStack.pop()
        mScreenStack.peek()?.willAppear()
    }

    override fun getCurScreen(): BaseScreen = mScreenStack.peek()!!

    override fun showMessage(msg:String, delay:Long) {
        pushScreen(object:BaseScreen() {
            internal var cnt:Long = 0

            override val isPopup:Boolean
                get() {
                    return true
                }

            override fun update(delta:Long) {
                cnt += delta
                if (cnt > delay)
                {
                    delegate.popScreen()
                }
            }
            override fun draw(canvas:Canvas) {
                Util.showMessage(canvas, msg)
            }
            override fun onKeyUp(key:Int) {}
            override fun onKeyDown(key:Int) {
                delegate.popScreen()
            }
        })
    }

    fun draw(canvas: Canvas) {
        // TODO: optimize: redraw dirty layers only
        for (scr in mScreenStack) {
            scr.draw(canvas)
        }
    }
    fun update(delta: Long) {
        mScreenStack.peek()?.update(delta)
    }
}

