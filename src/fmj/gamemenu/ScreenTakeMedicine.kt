package fmj.gamemenu

import fmj.Global
import fmj.goods.BaseGoods
import fmj.goods.GoodsMedicine
import fmj.goods.IEatMedicine
import fmj.graphics.TextRender
import fmj.scene.ScreenMainGame
import fmj.views.BaseScreen

import graphics.Canvas

class ScreenTakeMedicine(private val mMedicine: BaseGoods) : BaseScreen() {

    private var mStatePageIndex = 0 // 人物属性页，共两页

    private var mActorIndex = 0

    init {}

    override fun update(delta: Long) {}

    override fun draw(canvas: Canvas) {
        canvas.drawColor(Global.COLOR_WHITE)
        ScreenMainGame.sPlayerList[mActorIndex].drawState(canvas, mStatePageIndex)
        ScreenMainGame.sPlayerList[mActorIndex].drawHead(canvas, 5, 60)
        if (mMedicine.goodsNum > 0) {
            mMedicine.draw(canvas, 5, 10)
            TextRender.drawText(canvas, "" + mMedicine.goodsNum, 13, 35)
        }
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_PAGEDOWN) {
            mStatePageIndex = 1
        } else if (key == Global.KEY_PAGEUP) {
            mStatePageIndex = 0
        } else if (key == Global.KEY_LEFT && mActorIndex > 0) {
            --mActorIndex
        } else if (key == Global.KEY_RIGHT && mActorIndex < ScreenMainGame.sPlayerList.size - 1) {
            ++mActorIndex
        }
    }

    override fun onKeyUp(key: Int) {
        if (key == Global.KEY_CANCEL) {
            delegate.popScreen()
        } else if (key == Global.KEY_ENTER) {
            if (mMedicine.goodsNum > 0) {
                if (mMedicine.type == 9 && (mMedicine as GoodsMedicine).effectAll()) { // 普通药物，判断是否全体
                    for (i in ScreenMainGame.sPlayerList.indices.reversed()) {
                        (mMedicine as IEatMedicine).eat(ScreenMainGame.sPlayerList[i])
                    }
                } else { // 仙药、灵药 不具有全体效果
                    (mMedicine as IEatMedicine).eat(ScreenMainGame.sPlayerList[mActorIndex])
                }
            } else {
                delegate.popScreen()
            }
        }
    }

}
