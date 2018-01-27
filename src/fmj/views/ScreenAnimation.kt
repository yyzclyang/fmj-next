package fmj.views

import fmj.Global
import fmj.ScreenViewType
import fmj.lib.DatLib
import fmj.lib.ResSrs
import graphics.Canvas

class ScreenAnimation(override val parent: GameNode, private val index: Int) : BaseScreen {
    private val mResSrs: ResSrs

    init {
        if (index != 247 && index != 248 && index != 249) {
            throw IllegalArgumentException("只能是247,248,249")
        }
        mResSrs = DatLib.getRes(DatLib.ResType.SRS, 1, index) as ResSrs
        mResSrs.setIteratorNum(4)
        mResSrs.start()
    }

    override fun update(delta: Long) {
        if (!mResSrs.update(delta)) {
            when (index) {
                247 -> // 转到游戏动画
                    game.changeScreen(ScreenViewType.SCREEN_GAME_LOGO)
                248 -> // 转到游戏菜单
                    game.changeScreen(ScreenViewType.SCREEN_MENU)
                249 -> //
                    game.changeScreen(ScreenViewType.SCREEN_MENU)
            }
        }
    }

    override fun draw(canvas: Canvas) {
        canvas.drawColor(Global.COLOR_WHITE)
        mResSrs.draw(canvas, 0, 0)
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_CANCEL && (index == 247 || index == 248)) {
            game.changeScreen(ScreenViewType.SCREEN_MENU)
        }
    }

    override fun onKeyUp(key: Int) {}

}
