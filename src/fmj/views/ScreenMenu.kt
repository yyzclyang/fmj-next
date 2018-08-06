package fmj.views

import fmj.Global
import fmj.ScreenViewType
import fmj.lib.DatLib
import fmj.lib.ResSrs
import fmj.scene.SaveLoadGame
import graphics.Canvas
import java.sysExit

class ScreenMenu(override val parent: GameNode): BaseScreen {
    private val mImgMenu = DatLib.getPic(2, 14)!!
    private val mLeft: Int
    private val mTop: Int
    private val mSrsSelector = arrayOf(
            DatLib.getRes(DatLib.ResType.SRS, 1, 250) as ResSrs,
            DatLib.getRes(DatLib.ResType.SRS, 1, 251) as ResSrs)
    private var mCurSelect = 0

    private var isCancelKeyDown = false

    init {
        mSrsSelector[0].start()
        mSrsSelector[1].start()
        mLeft = (160 - mImgMenu.width) / 2
        mTop = (96 - mImgMenu.height) / 2
    }

    override fun update(delta: Long) {
        if (!mSrsSelector[mCurSelect].update(delta)) {
            mSrsSelector[mCurSelect].start()
        }
    }

    override fun draw(canvas: Canvas) {
        canvas.drawColor(Global.COLOR_WHITE)
        mImgMenu.draw(canvas, 1, mLeft, mTop)
        mSrsSelector[mCurSelect].draw(canvas, 0, 0)
    }

    override fun onKeyDown(key: Int) {
        when (key) {
            Global.KEY_UP, Global.KEY_DOWN -> mCurSelect = 1 - mCurSelect
            Global.KEY_CANCEL -> isCancelKeyDown = true
        }
    }

    override fun onKeyUp(key: Int) {
        if (key == Global.KEY_ENTER) {
            if (mCurSelect == 0) { // 新游戏
                SaveLoadGame.startNewGame = true
                game.changeScreen(ScreenViewType.SCREEN_MAIN_GAME)
            } else if (mCurSelect == 1) { // 读取进度
                pushScreen(
                        ScreenSaveLoadGame(this, ScreenSaveLoadGame.Operate.LOAD))
            }
        } else if (key == Global.KEY_CANCEL && isCancelKeyDown) {
t             sysExit()
        }
    }

}
