package fmj

import fmj.script.ScriptProcess
import fmj.views.Control
import fmj.views.ScreenAnimation
import fmj.views.ScreenStack

import graphics.Canvas
import graphics.Bitmap
import java.*

class Game: Control {
    override val parent get() = screen
    internal val canvas = Canvas(Bitmap(Global.SCREEN_WIDTH, Global.SCREEN_HEIGHT))
    private val delta = 40
    private val scriptProcess = ScriptProcess(this)
    private val screen = ScreenStack(scriptProcess)

    fun start() {
        listenUIEvents()
        val scr = ScreenAnimation(this, 247)
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
    Game().start()
}
