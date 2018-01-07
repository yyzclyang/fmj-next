package fmj

import fmj.views.ScreenStack

import graphics.Canvas
import graphics.Bitmap

class GameView {
    internal var canvas: Canvas

    init {
        addL()//键盘监听
        canvas = Canvas(Bitmap(Global.SCREEN_WIDTH, Global.SCREEN_HEIGHT))
    }

    fun draw() {
        ScreenStack.instance.draw(canvas)
    }

    fun update() {
    }

    fun keyDown(key: Int) {
        ScreenStack.instance.keyDown(key)
    }

    fun keyUp(key: Int) {
        ScreenStack.instance.keyUp(key)
    }

    fun addL() {
    }

    fun start() {
        addL()
    }
}

fun main(args: Array<String>) {
    GameView().start()
}
