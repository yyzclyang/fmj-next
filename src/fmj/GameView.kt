package fmj

import fmj.script.ScriptProcess
import fmj.views.ScreenStack

import graphics.Canvas
import graphics.Bitmap

class GameView {
    private val screen = ScreenStack()
    internal val canvas = Canvas(Bitmap(Global.SCREEN_WIDTH, Global.SCREEN_HEIGHT))

    fun draw() {
        screen.draw(canvas)
    }

    fun update() {
    }

    fun keyDown(key: Int) {
        screen.keyDown(key)
    }

    fun keyUp(key: Int) {
        screen.keyUp(key)
    }

    fun addL() {
    }

    fun start() {
        ScriptProcess.instance.delegate = screen
        addL()
    }
}

fun main(args: Array<String>) {
    GameView().start()
}
