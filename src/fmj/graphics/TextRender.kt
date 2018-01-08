package fmj.graphics

import fmj.Global

import graphics.Bitmap
import graphics.Canvas
import graphics.Color
import graphics.Rect
import java.File
import java.gbkBytes

object TextRender {
    private var mHZKBuf: ByteArray = File.contentsOf("./assets/HZK16")
    private var mASCBuf: ByteArray = File.contentsOf("./assets/ASC16")

    private var mPixels = Array(16 * 16) { Color.WHITE }
    private var mBmpHzk = Bitmap.createBitmap(16, 16)
    private var mBmpAsc = Bitmap.createBitmap(8, 16)


    fun drawText(canvas: Canvas, text: String, x: Int, y: Int) {
        drawText(canvas, text.gbkBytes(), x, y)
    }

    fun drawSelText(canvas: Canvas, text: String, x: Int, y: Int) {
        // TODO: refactor me, don't touch the global!
        var tmpColor = Global.COLOR_BLACK
        Global.COLOR_BLACK = Global.COLOR_WHITE
        Global.COLOR_WHITE = tmpColor
        drawText(canvas, text, x, y)
        tmpColor = Global.COLOR_BLACK
        Global.COLOR_BLACK = Global.COLOR_WHITE
        Global.COLOR_WHITE = tmpColor
    }

    fun drawSelText(canvas: Canvas, text: ByteArray, x: Int, y: Int) {
        var tmpColor = Global.COLOR_BLACK
        Global.COLOR_BLACK = Global.COLOR_WHITE
        Global.COLOR_WHITE = tmpColor
        drawText(canvas, text, x, y)
        tmpColor = Global.COLOR_BLACK
        Global.COLOR_BLACK = Global.COLOR_WHITE
        Global.COLOR_WHITE = tmpColor
    }

    fun drawText(canvas: Canvas, text: ByteArray, x: Int, y: Int) {
        var x = x
        var i = 0
        while (i < text.size && text[i].toInt() != 0) {
            val t = text[i].toInt() and 0xFF
            if (t >= 0xa1) {
                ++i
                val offset = (94 * (t - 0xa1) + (text[i].toInt() and 0xFF) - 0xa1) * 32
                canvas.drawBitmap(getHzk(offset), x, y)
                x += 16
            } else if (t < 128) {
                val offset = t * 16
                canvas.drawBitmap(getAsc(offset), x, y)
                x += 8
            } else {
                x += 8
            }
            i++
        }
    }

    /**
     *
     * @param canvas
     * @param text
     * @param r
     * @param y
     * @return 0,文字都在r.top上方
     * 1,文字在r中
     * 2,文字都在r.bottom下方
     * -1,出错
     */
    fun drawText(canvas: Canvas, text: String, r: Rect, y: Int): Int {
        var tmpY = y
        val buf = text.gbkBytes()

        var i = 0
        // 比r.top高的不画
        while (tmpY <= r.top - 16 && i < buf.size) {
            var tmpX = 0
            while (tmpX < 160 && i < buf.size) {
                val t = buf[i].toInt() and 0xFF
                if (t >= 0xa1) {
                    i += 2
                    tmpX += 16
                } else {
                    ++i
                    tmpX += 8
                }
            }
            tmpY += 16
        }

        if (i >= buf.size) {
            return 0
        }

        // 比r.bottom低的不画
        while (tmpY < r.bottom && i < buf.size) {
            var tmpX = 0
            while (tmpX < 160 && i < buf.size) {
                val t = buf[i].toInt() and 0xFF
                if (t >= 0xa1) {
                    ++i
                    val offset = (94 * (t - 0xa1) + (buf[i].toInt() and 0xFF) - 0xa1) * 32
                    canvas.drawBitmap(getHzk(offset), tmpX, tmpY)
                    tmpX += 16
                } else if (t < 128) {
                    val offset = t * 16
                    canvas.drawBitmap(getAsc(offset), tmpX, tmpY)
                    tmpX += 8
                } else {
                    tmpX += 8
                }
                ++i
            }
            tmpY += 16
        }

        return if (i == 0 && buf.size > 0) {
            2
        } else 1

    }

    /**
     * call drawText(Canvas, byte[], int, Rect)
     */
    fun drawText(canvas: Canvas, text: String, start: Int, r: Rect): Int {
        return drawText(canvas, text.gbkBytes(), start, r)
    }

    /**
     *
     * @param canvas
     * @param buf
     * @param start buf中第一个要画的字节
     * @param r
     * @return 下一个要画的字节
     */
    fun drawText(canvas: Canvas, buf: ByteArray, start: Int, r: Rect): Int {
        var i = start
        var y = r.top
        // 比r.bottom低的不画
        while (y <= r.bottom - 16 && i < buf.size) {
            var x = r.left
            while (x <= r.right - 16 && i < buf.size) {
                val t = buf[i].toInt() and 0xFF
                if (t >= 0xa1) {
                    ++i
                    val offset = (94 * (t - 0xa1) + (buf[i].toInt() and 0xFF) - 0xa1) * 32
                    canvas.drawBitmap(getHzk(offset), x, y)
                    x += 16
                } else if (t < 128) {
                    val offset = t * 16
                    canvas.drawBitmap(getAsc(offset), x, y)
                    x += 8
                } else {
                    x += 8
                }
                ++i
            }
            y += 16
        }

        return i
    }

    private fun getHzk(offset: Int): Bitmap {
        for (i in 0..31) {
            val t = mHZKBuf[offset + i].toInt()
            val k = i shl 3
            mPixels[k] = if (t and 0x80 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 1] = if (t and 0x40 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 2] = if (t and 0x20 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 3] = if (t and 0x10 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 4] = if (t and 0x08 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 5] = if (t and 0x04 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 6] = if (t and 0x02 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 7] = if (t and 0x01 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
        }
        mBmpHzk.setPixels(mPixels, 0, 0, 0, 16, 16)
        return mBmpHzk
    }

    private fun getAsc(offset: Int): Bitmap {
        for (i in 0..15) {
            val t = mASCBuf[offset + i].toInt()
            val k = i shl 3
            mPixels[k] = if (t and 0x80 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 1] = if (t and 0x40 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 2] = if (t and 0x20 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 3] = if (t and 0x10 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 4] = if (t and 0x08 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 5] = if (t and 0x04 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 6] = if (t and 0x02 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
            mPixels[k or 7] = if (t and 0x01 != 0) Global.COLOR_BLACK else Global.COLOR_WHITE
        }
        mBmpAsc.setPixels(mPixels, 0, 0, 0, 8, 16)
        return mBmpAsc
    }
}
