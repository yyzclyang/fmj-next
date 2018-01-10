package fmj

import fmj.graphics.TextRender
import fmj.script.ScriptProcess
import fmj.views.ScreenAnimation
import fmj.views.ScreenStack

import graphics.Canvas
import graphics.Bitmap
import graphics.Color
import java.*

class GameView {
    private val screen = ScreenStack()
    internal val canvas = Canvas(Bitmap(Global.SCREEN_WIDTH, Global.SCREEN_HEIGHT))
    private val delta = 40

    fun start() {
        ScriptProcess.instance.delegate = screen
        listenUIEvents()
        val scr = ScreenAnimation(247)
        screen.pushScreen(scr)
    }

    fun draw() {
        screen.draw(canvas)
    }

    fun update(delta: Long) {
        screen.update(delta)
    }

    private fun keyDown(key: Int) {
        screen.keyDown(key)
    }

    private fun keyUp(key: Int) {
        screen.keyUp(key)
    }

    private fun listenUIEvents() {
        val delta = this.delta.toLong()
        sysAddKeyDownListener {
            keyDown(it)
        }
        sysAddKeyUpListener {
            keyUp(it)
        }
        sysSetInterval(this.delta) {
            update(delta)
            draw()
            sysDrawScreen(canvas.buffer, canvas.width, canvas.height)
        }
    }
}

fun main(args: Array<String>) {
    GameView().start()
}
