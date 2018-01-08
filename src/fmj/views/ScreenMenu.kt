package fmj.views

import fmj.Global
import fmj.ScreenViewType
import fmj.lib.DatLib
import fmj.lib.ResImage
import fmj.lib.ResSrs
import fmj.scene.SaveLoadGame
import graphics.Canvas

class ScreenMenu : BaseScreen() {
    private val mImgMenu: ResImage
    private val mLeft: Int
    private val mTop: Int
    private val mSrsSelector: Array<ResSrs> // TODO
    private var mCurSelect = 0

    private var isCancelKeyDown = false

    init {
        mImgMenu = DatLib.GetRes(DatLib.ResType.PIC, 2, 14) as ResImage
        mSrsSelector = arrayOf(
                DatLib.GetRes(DatLib.ResType.SRS, 1, 250) as ResSrs,
                DatLib.GetRes(DatLib.ResType.SRS, 1, 251) as ResSrs)
        mSrsSelector[0].startAni()
        mSrsSelector[1].startAni()
        mLeft = (160 - mImgMenu.width) / 2
        mTop = (96 - mImgMenu.height) / 2
    }

    override fun update(delta: Long) {
        if (!mSrsSelector[mCurSelect].update(delta)) {
            mSrsSelector[mCurSelect].startAni()
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
                delegate.changeScreen(ScreenViewType.SCREEN_MAIN_GAME)
            } else if (mCurSelect == 1) { // 读取进度
                delegate.pushScreen(
                        ScreenSaveLoadGame(ScreenSaveLoadGame.Operate.LOAD))
            }
        } else if (key == Global.KEY_CANCEL && isCancelKeyDown) {
            // TODO: 退出游戏
            println("退出游戏")
        }
    }

}
