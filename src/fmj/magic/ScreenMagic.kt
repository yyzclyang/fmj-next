package fmj.magic

import fmj.Global
import fmj.graphics.TextRender
import fmj.views.BaseScreen


import graphics.Bitmap
import graphics.Canvas
import graphics.Paint
import graphics.Paint.Style
import graphics.Point
import graphics.Rect
import java.Stack
import java.gbkBytes

class ScreenMagic(private val mMagicChain: ResMagicChain?, private val mOnItemSelectedListener: OnItemSelectedListener?) : BaseScreen() {

    private var mFirstItemIndex = 0 // 界面上显示的第一个魔法的序号

    private var mCurItemIndex = 0 // 当前光标所在位置魔法的序号

    private val mBmpCursor = Bitmap.createBitmap(12, 11)
    private val mBmpMarker = Bitmap.createBitmap(5, 8)
    private val mBmpMarker2 = Bitmap.createBitmap(5, 8)

    private val mRectTop = Rect(10, 4, 147, 39)
    private val mRectBtm = Rect(10, 41, 147, 76)
    private val mRectDsp = Rect(11, 42, 146, 75)
    private var mToDraw = 0 // 当前要画的魔法描述中的字节
    private var mNextToDraw = 0 // 下一个要画的魔法描述中的字节
    private val mStackLastToDraw = Stack.create<Int>() // 保存上次魔法描述所画位置
    private val mTextPos = Point(10, 77)
    private val mFramePaint = Paint()

    interface OnItemSelectedListener {
        fun onItemSelected(magic: BaseMagic)
    }

    init {
        if (mMagicChain == null || mOnItemSelectedListener == null) {
            throw IllegalArgumentException("ScreenMagic construtor params can't be null.")
        }
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
        canvas.drawRect(mRectTop, mFramePaint)
        canvas.drawRect(mRectBtm, mFramePaint)
        TextRender.drawText(canvas, mMagicChain!!.getMagic(mFirstItemIndex).magicName, mRectTop.left + 1, mRectTop.top + 1)
        if (mFirstItemIndex + 1 < mMagicChain.learnNum) {
            TextRender.drawText(canvas, mMagicChain.getMagic(mFirstItemIndex + 1).magicName, mRectTop.left + 1, mRectTop.top + 1 + 16)
        }
        mNextToDraw = TextRender.drawText(canvas, mMagicChain.getMagic(mCurItemIndex).magicDescription!!, mToDraw, mRectDsp)
        TextRender.drawText(canvas, "耗真气:" + mMagicChain.getMagic(mCurItemIndex).costMp, mTextPos.x, mTextPos.y)
        canvas.drawBitmap(mBmpCursor, 100, if (mFirstItemIndex == mCurItemIndex) 10 else 26)
        canvas.drawBitmap(if (mFirstItemIndex == 0) mBmpMarker else mBmpMarker2, 135, 6)
        canvas.drawBitmap(mBmpMarker, 135, 6 + 8)
        canvas.drawBitmap(mBmpMarker, 135, 6 + 16)
        canvas.drawBitmap(if (mFirstItemIndex + 2 < mMagicChain.learnNum) mBmpMarker2 else mBmpMarker, 135, 6 + 24)
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_UP && mCurItemIndex > 0) {
            --mCurItemIndex
            if (mCurItemIndex < mFirstItemIndex) {
                --mFirstItemIndex
            }
            mNextToDraw = 0
            mToDraw = mNextToDraw
            mStackLastToDraw.clear()
        } else if (key == Global.KEY_DOWN && mCurItemIndex + 1 < mMagicChain!!.learnNum) {
            ++mCurItemIndex
            if (mCurItemIndex >= mFirstItemIndex + ITEM_NUM) {
                ++mFirstItemIndex
            }
            mNextToDraw = 0
            mToDraw = mNextToDraw
            mStackLastToDraw.clear()
        } else if (key == Global.KEY_PAGEDOWN) {
            val len = mMagicChain!!.getMagic(mCurItemIndex).magicDescription!!.gbkBytes().size
            if (mNextToDraw < len) {
                mStackLastToDraw.push(mToDraw) // 保存旧位置
                mToDraw = mNextToDraw // 更新位置
            }
        } else if (key == Global.KEY_PAGEUP && mToDraw != 0) {
            mStackLastToDraw.pop()?.let {
                mToDraw = it
            }
        }
    }

    override fun onKeyUp(key: Int) {
        if (key == Global.KEY_ENTER) { // 回调接口
            mOnItemSelectedListener!!.onItemSelected(mMagicChain!!.getMagic(mCurItemIndex))
        } else if (key == Global.KEY_CANCEL) {
            delegate?.popScreen()
        }
    }

    companion object {

        private val ITEM_NUM = 2 // 界面上显示的条目数
    }

}
