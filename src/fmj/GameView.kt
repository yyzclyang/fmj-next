package fmj

import fmj.script.ScriptProcess
import fmj.views.ScreenStack

import graphics.Canvas
import graphics.Bitmap
import java.sysAddKeyDownListener
import java.sysAddKeyUpListener
import java.sysSetInterval

class GameView {
    private val screen = ScreenStack()
    internal val canvas = Canvas(Bitmap(Global.SCREEN_WIDTH, Global.SCREEN_HEIGHT))
    private val delta = 1000

    fun start() {
        ScriptProcess.instance.delegate = screen
        listenUIEvents()
    }

    fun draw() {
        screen.draw(canvas)
    }

    fun update(delta: Long) {
        screen.update(delta)
    }

    private fun keyDown(key: Int) {
        println("keyDown: $key")
        screen.keyDown(key)
    }

    private fun keyUp(key: Int) {
        println("keyUp: $key")
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
        }
    }
}

fun main(args: Array<String>) {
    GameView().start()
}
