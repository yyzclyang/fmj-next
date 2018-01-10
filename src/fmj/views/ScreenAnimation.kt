package fmj.views

import fmj.Global
import fmj.ScreenViewType
import fmj.lib.DatLib
import fmj.lib.ResSrs
import graphics.Canvas

class ScreenAnimation(private val index: Int) : BaseScreen() {
    private val mResSrs: ResSrs
    override val isPopup: Boolean
        get() = true

    init {
        if (index != 247 && index != 248 && index != 249) {
            throw IllegalArgumentException("只能是247,248,249")
        }
        mResSrs = DatLib.getRes(DatLib.ResType.SRS, 1, index) as ResSrs
        mResSrs.setIteratorNum(4)
        mResSrs.startAni()
    }

    override fun update(delta: Long) {
        if (!mResSrs.update(delta)) {
            if (index == 247) { // 转到游戏动画
                delegate.changeScreen(ScreenViewType.SCREEN_GAME_LOGO)
            } else if (index == 248) { // 转到游戏菜单
                delegate.changeScreen(ScreenViewType.SCREEN_MENU)
            } else if (index == 249) { //
                delegate.changeScreen(ScreenViewType.SCREEN_MENU)
            }
        }
    }

    override fun draw(canvas: Canvas) {
        canvas.drawColor(Global.COLOR_WHITE)
        mResSrs.draw(canvas, 0, 0)
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_CANCEL && (index == 247 || index == 248)) {
            delegate.changeScreen(ScreenViewType.SCREEN_MENU)
        }
    }

    override fun onKeyUp(key: Int) {}

}
