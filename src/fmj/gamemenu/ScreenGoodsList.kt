package fmj.gamemenu

import fmj.Global
import fmj.characters.Player
import fmj.goods.BaseGoods
import fmj.graphics.TextRender
import fmj.graphics.Util
import fmj.views.BaseScreen

import graphics.Bitmap
import graphics.Canvas
import graphics.Rect

import java.Stack
import java.gbkBytes

class ScreenGoodsList(private val mGoodsList: List<BaseGoods>, private val mOnItemSelectedListener: OnItemSelectedListener, private val mMode: Mode) : BaseScreen() {

    private var mDescription: ByteArray
    private var mToDraw = 0 // 当前要画的描述中的字节
    private var mNextToDraw = 0 // 下一个要画的描述中的字节
    private val mStackLastToDraw = Stack.create<Int>() // 保存上次描述所画位置

    private var mFirstItemIndex = 0 // 界面上显示的第一个物品的序号

    private var mCurItemIndex = 0 // 当前光标所在位置物品的序号

    private var mLastDownKey = -1

    enum class Mode {
        Sale,
        Buy,
        Use
    }

    interface OnItemSelectedListener {
        fun onItemSelected(goods: BaseGoods)
    }

    init {
        mDescription = if (mGoodsList.isNotEmpty()) {
            mGoodsList[0].description.gbkBytes()
        } else {
            "".gbkBytes()
        }

        if (sbmpBg == null) {
            val bmp = Bitmap.createBitmap(160, 96)
            sbmpBg = bmp
            val pts = floatArrayOf(40f, 21f, 40f, 95f, 40f, 95f, 0f, 95f, 0f, 95f, 0f, 5f, 0f, 5f, 5f, 0f, 5f, 0f, 39f, 0f, 39f, 0f, 58f, 19f, 38f, 0f, 57f, 19f, 57f, 19f, 140f, 19f, 41f, 20f, 140f, 20f, 41f, 21f, 159f, 21f, 54f, 0f, 140f, 0f, 40f, 95f, 159f, 95f, 40f, 57f, 160f, 57f, 40f, 58f, 140f, 58f, 40f, 59f, 159f, 59f, 41f, 20f, 41f, 95f, 42f, 20f, 42f, 95f, 159f, 21f, 159f, 57f, 159f, 59f, 159f, 96f)
            val c = Canvas(bmp)
            // FIXME: Canvas not use??
            c.drawColor(Global.COLOR_WHITE)
            c.drawLines(pts, Util.sBlackPaint)
            TextRender.drawText(c, "名:", 45, 23)
            TextRender.drawText(c, "价:", 45, 40)

            mRectGoodsDsp = Rect(44, 61, 156, 94)
        }
    }

    override fun update(delta: Long) {
        if (mGoodsList.size <= 0) {
            delegate.popScreen()
        }
    }

    override fun draw(canvas: Canvas) {
        canvas.drawBitmap(sbmpBg!!, 0, 0)
        if (mGoodsList.size <= 0) return

        while (mCurItemIndex >= mGoodsList.size) showPreItem()

        val g = mGoodsList.get(mCurItemIndex)
        TextRender.drawText(canvas, if (mMode == Mode.Buy) "金钱:" + Player.sMoney else "数量:" + g.goodsNum, 60, 2)
        TextRender.drawText(canvas, g.name, 69, 23)
        TextRender.drawText(canvas, "" + if (mMode == Mode.Buy) g.buyPrice else g.sellPrice, 69, 40)
        Util.drawTriangleCursor(canvas, 4, 8 + 23 * (mCurItemIndex - mFirstItemIndex))

        var i = mFirstItemIndex
        while (i < mFirstItemIndex + ITEM_NUM && i < mGoodsList.size) {
            mGoodsList.get(i).draw(canvas, 14, 2 + 23 * (i - mFirstItemIndex))
            i++
        }

        mNextToDraw = TextRender.drawText(canvas, mDescription, mToDraw, mRectGoodsDsp!!)
    }

    private fun showNextItem() {
        ++mCurItemIndex
        mDescription = mGoodsList[mCurItemIndex].description.gbkBytes()
        if (mCurItemIndex >= mFirstItemIndex + ITEM_NUM) {
            ++mFirstItemIndex
        }
        mNextToDraw = 0
        mToDraw = mNextToDraw
        mStackLastToDraw.clear()
    }

    private fun showPreItem() {
        --mCurItemIndex
        mDescription = mGoodsList[mCurItemIndex].description.gbkBytes()
        if (mCurItemIndex < mFirstItemIndex) {
            --mFirstItemIndex
        }
        mNextToDraw = 0
        mToDraw = mNextToDraw
        mStackLastToDraw.clear()
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_UP && mCurItemIndex > 0) {
            showPreItem()
        } else if (key == Global.KEY_DOWN && mCurItemIndex + 1 < mGoodsList.size) {
            showNextItem()
        } else if (key == Global.KEY_PAGEDOWN) {
            val len = mDescription.size
            if (mNextToDraw < len) {
                mStackLastToDraw.push(mToDraw)
                mToDraw = mNextToDraw
            }
        } else if (key == Global.KEY_PAGEUP && mToDraw != 0) {
            mStackLastToDraw.pop()?.let {
                mToDraw = it
            }
        }
        mLastDownKey = key
    }

    override fun onKeyUp(key: Int) {
        if (key == Global.KEY_ENTER && mLastDownKey == Global.KEY_ENTER) {
            mOnItemSelectedListener.onItemSelected(mGoodsList[mCurItemIndex])
        } else if (key == Global.KEY_CANCEL) {
            delegate.popScreen()
        }
    }

    companion object {

        private var sbmpBg: Bitmap? = null

        private var mRectGoodsDsp: Rect? = null

        private val ITEM_NUM = 4 // 界面上显示的条目数
    }
}
