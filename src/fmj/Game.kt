package fmj

import fmj.characters.Player
import fmj.combat.Combat
import fmj.scene.ScreenMainGame
import fmj.script.ScriptVM
import fmj.views.*

import graphics.Canvas
import graphics.Bitmap
import java.*

class MainGame: Game {
    val version  = "003"
    private  val canvas = Canvas(Bitmap(Global.SCREEN_WIDTH, Global.SCREEN_HEIGHT))
    private  val screenStack = ScreenStack(this)

    override val vm = ScriptVM(this)
    override val parent get() = screenStack
    override val game = this
    override var mainScene: ScreenMainGame
    override val playerList = arrayListOf<Player>()
    override val bag get() = Player.sGoodsList
    override val combat get() = Combat.Companion

    constructor() {
        mainScene = ScreenMainGame(this, vm)
    }

    fun start() {
        listenUIEvents()
        val scr = ScreenAnimation(this, 247)
        screenStack.pushScreen(scr)
    }

    fun draw() {
        screenStack.draw(canvas)
    }

    fun update(delta: Long) {
        screenStack.update(delta)
    }

    private fun keyDown(key: Int) {
        screenStack.keyDown(key)
    }

    private fun keyUp(key: Int) {
        screenStack.keyUp(key)
    }

    override fun changeScreen(screenType: ScreenViewType) {
        val scr: BaseScreen =
                when (screenType) {
                    ScreenViewType.SCREEN_DEV_LOGO -> ScreenAnimation(this, 247)
                    ScreenViewType.SCREEN_GAME_LOGO -> ScreenAnimation(this, 248)
                    ScreenViewType.SCREEN_MENU -> ScreenMenu(this)
                    ScreenViewType.SCREEN_MAIN_GAME -> {
                        mainScene = ScreenMainGame(this, vm)
                        mainScene
                    }
                    ScreenViewType.SCREEN_GAME_FAIL -> ScreenAnimation(this, 249)
                    ScreenViewType.SCREEN_SAVE_GAME -> ScreenSaveLoadGame(this, ScreenSaveLoadGame.Operate.SAVE)
                    ScreenViewType.SCREEN_LOAD_GAME -> ScreenSaveLoadGame(this, ScreenSaveLoadGame.Operate.LOAD)
                }
        screenStack.changeScreen(scr)
    }

    private fun listenUIEvents() {
        val delta = Global.delta.toLong()
        sysAddKeyDownListener {
            keyDown(it)
        }
        sysAddKeyUpListener {
            keyUp(it)
        }
        sysSetInterval(Global.delta) {
            update(delta)
            draw()
            sysDrawScreen(canvas.buffer, canvas.width, canvas.height)
        }
    }
}
val game = MainGame()
fun main(args: Array<String>) {
    game.start()
}
