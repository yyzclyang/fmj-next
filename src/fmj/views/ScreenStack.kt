package fmj.views

import fmj.graphics.Util
import graphics.Canvas
import java.Stack

class ScreenStack(override val parent: GameNode): GameNode {
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

    fun changeScreen(scr: BaseScreen) {
        mScreenStack.clear()
        mScreenStack.push(scr)
        scr.willAppear()
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
                get() = this@ScreenStack

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

