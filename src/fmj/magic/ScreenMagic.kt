package fmj.magic

import fmj.Global
import fmj.graphics.TextRender
import fmj.views.BaseScreen
import fmj.views.GameNode


import graphics.Bitmap
import graphics.Canvas
import graphics.Paint
import graphics.Paint.Style
import graphics.Point
import graphics.Rect
import kotlin.math.round

class ScreenMagic(override val parent: GameNode,
                  magics: Collection<BaseMagic>,
                  private val mOnItemSelectedListener: OnItemSelectedListener) : BaseScreen {

    class PageText(val text: String, val rect: Rect) {
        private val totalHeight = TextRender.textHeightForWitdh(text, rect.width())
        private var top = 0

        fun draw(canvas: Canvas) {
            TextRender.drawText(canvas, text, rect, top+rect.top)
        }

        fun alignTop(t: Int): Int {
            val rd = round(t.toDouble() / 16) * 16
            return rd.toInt()
        }

        fun pageup() {
            val newTop = alignTop(top + rect.height())
            if (newTop <= 0) {
                top = newTop
            }
        }

        fun pagedown() {
            val newTop = alignTop(top - rect.height())
            if (totalHeight + newTop >= 16) {
                top = newTop
            }
        }
    }

    private val magics = magics.toTypedArray()

    private var mFirstItemIndex = 0 // 界面上显示的第一个魔法的序号

    private var mCurItemIndex = 0 // 当前光标所在位置魔法的序号

    private val mBmpCursor = Bitmap.createBitmap(12, 11)
    private val mBmpMarker = Bitmap.createBitmap(5, 8)
    private val mBmpMarker2 = Bitmap.createBitmap(5, 8)

    private val mRectTop = Rect(10, 4, 147, 39)
    private val mRectBtm = Rect(10, 41, 147, 76)
    private val mRectDsp = Rect(11, 42, 146, 75)
    private val mTextPos = Point(10, 77)
    private val mFramePaint = Paint()
    private var description = PageText(this.magics[mCurItemIndex].magicDescription, mRectDsp)

    interface OnItemSelectedListener {
        fun onItemSelected(magic: BaseMagic)
    }

    init {
        mFramePaint.color = Global.COLOR_BLACK
        mFramePaint.style = Style.STROKE
        mFramePaint.strokeWidth = 1

        createBmp()
    }

    private fun createBmp() {
        val canvas = Canvas()
        val p = Paint()
        p.color = Global.COLOR_BLACK
        p.strokeWidth = 1
        p.style = Style.STROKE

        canvas.setBitmap(mBmpCursor)
        canvas.drawColor(Global.COLOR_WHITE)
        canvas.drawLine(8, 0, 11, 0, p)
        canvas.drawLine(11, 1, 11, 4, p)
        canvas.drawRect(6, 1, 7, 4, p)
        canvas.drawRect(7, 4, 10, 5, p)
        canvas.drawLine(7, 4, 0, 11, p)
        canvas.drawLine(8, 5, 2, 11, p)

        canvas.setBitmap(mBmpMarker)
        canvas.drawColor(Global.COLOR_WHITE)
        val pts = floatArrayOf(2f, 0f, 4f, 2f, 4f, 2f, 4f, 6f, 4f, 6f, 2f, 8f, 2f, 7f, 0f, 5f, 0f, 5f, 0f, 2f, 0f, 3f, 3f, 0f, 2f, 3f, 2f, 5f)
        canvas.drawLines(pts, p)

        canvas.setBitmap(mBmpMarker2)
        canvas.drawColor(Global.COLOR_WHITE)
        canvas.drawLines(pts, p)
        val pts2 = floatArrayOf(1f, 1f, 1f, 6f, 2f, 0f, 2f, 8f, 3f, 2f, 3f, 6f)
        canvas.drawLines(pts2, p)
    }

    override fun update(delta: Long) {}

    override fun draw(canvas: Canvas) {
        canvas.drawColor(Global.COLOR_WHITE)
        val hlMagic = magics[mFirstItemIndex]
        TextRender.drawText(canvas, hlMagic.magicName, mRectTop.left + 1, mRectTop.top + 1)
        if (mFirstItemIndex + 1 < magics.size) {
            TextRender.drawText(canvas, magics[mFirstItemIndex + 1].magicName, mRectTop.left + 1, mRectTop.top + 1 + 16)
        }
        description.draw(canvas)
        TextRender.drawText(canvas, "耗真气:" + hlMagic.costMp, mTextPos.x, mTextPos.y)
        canvas.drawBitmap(mBmpCursor, 100, if (mFirstItemIndex == mCurItemIndex) 10 else 26)
        canvas.drawBitmap(if (mFirstItemIndex == 0) mBmpMarker else mBmpMarker2, 135, 6)
        canvas.drawBitmap(mBmpMarker, 135, 6 + 8)
        canvas.drawBitmap(mBmpMarker, 135, 6 + 16)
        canvas.drawBitmap(if (mFirstItemIndex + 2 < magics.size) mBmpMarker2 else mBmpMarker, 135, 6 + 24)
        canvas.drawRect(mRectTop, mFramePaint)
        canvas.drawRect(mRectBtm, mFramePaint)
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_UP && mCurItemIndex > 0) {
            --mCurItemIndex
            if (mCurItemIndex < mFirstItemIndex) {
                --mFirstItemIndex
            }
            description = PageText(magics[mCurItemIndex].magicDescription, mRectDsp)
        } else if (key == Global.KEY_DOWN && mCurItemIndex + 1 < magics.size) {
            ++mCurItemIndex
            if (mCurItemIndex >= mFirstItemIndex + ITEM_NUM) {
                ++mFirstItemIndex
            }
            description = PageText(magics[mCurItemIndex].magicDescription, mRectDsp)
        } else if (key == Global.KEY_PAGEDOWN) {
            description.pagedown()
        } else if (key == Global.KEY_PAGEUP) {
            description.pageup()
        }
    }

    override fun onKeyUp(key: Int) {
        if (key == Global.KEY_ENTER) { // 回调接口
            mOnItemSelectedListener.onItemSelected(magics[mCurItemIndex])
        } else if (key == Global.KEY_CANCEL) {
            popScreen()
        }
    }

    companion object {

        private val ITEM_NUM = 2 // 界面上显示的条目数
    }

}
