package fmj.views

import fmj.ScreenViewType
import fmj.graphics.Util
import fmj.scene.ScreenMainGame
import fmj.script.ScriptProcess
import graphics.Canvas
import java.Stack

class ScreenStack(private val script: ScriptProcess): GameNode {
    override val mainScreen: ScreenMainGame
        get() = ScreenMainGame.instance

    private val mScreenStack = Stack.create<BaseScreen>()

    fun clear() {
        mScreenStack.clear()
    }

    fun keyDown(key: Int) {
        mScreenStack.peek()?.onKeyDown(key)
    }

    fun keyUp(key: Int) {
        mScreenStack.peek()?.onKeyUp(key)
    }

    override fun changeScreen(scr: ScreenViewType) {
        val tmp: BaseScreen =
                when (scr) {
                    ScreenViewType.SCREEN_DEV_LOGO -> ScreenAnimation(this, 247)
                    ScreenViewType.SCREEN_GAME_LOGO -> ScreenAnimation(this, 248)
                    ScreenViewType.SCREEN_MENU -> ScreenMenu(this)
                    ScreenViewType.SCREEN_MAIN_GAME -> ScreenMainGame(this, script)
                    ScreenViewType.SCREEN_GAME_FAIL -> ScreenAnimation(this, 249)
                    ScreenViewType.SCREEN_SAVE_GAME -> ScreenSaveLoadGame(this, ScreenSaveLoadGame.Operate.SAVE)
                    ScreenViewType.SCREEN_LOAD_GAME -> ScreenSaveLoadGame(this, ScreenSaveLoadGame.Operate.LOAD)
                }
        mScreenStack.clear()
        mScreenStack.push(tmp)
        tmp.willAppear()
    }

    override fun pushScreen(scr: BaseScreen) {
        mScreenStack.push(scr)
        scr.willAppear()
    }

    override fun popScreen() {
        mScreenStack.pop()
        mScreenStack.peek()?.willAppear()
    }

    override fun getCurScreen(): BaseScreen = mScreenStack.peek()!!

    override fun showMessage(msg:String, delay:Long) {
        pushScreen(object: BaseScreen {
            override val parent: GameNode
                get() = this

            internal var cnt:Long = 0

            override val isPopup:Boolean
                get() {
                    return true
                }

            override fun update(delta:Long) {
                cnt += delta
                if (cnt > delay)
                {
                    popScreen()
                }
            }
            override fun draw(canvas:Canvas) {
                Util.showMessage(canvas, msg)
            }
            override fun onKeyUp(key:Int) {}
            override fun onKeyDown(key:Int) {
                popScreen()
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

