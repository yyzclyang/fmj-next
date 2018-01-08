package fmj.lib

import fmj.Global
import fmj.graphics.TextRender

import graphics.Bitmap
import graphics.Canvas
import graphics.Color
import java.System

class ResImage : ResBase() {
    /**
     * 切片宽
     */
    var width: Int = 0
        protected set

    /**
     * 切片高
     */
    var height: Int = 0
        protected set

    /**
     * 切片数量
     */
    /**
     *
     * @return 切片数量
     */
    var number: Int = 0
        protected set

    /**
     * 是否透明
     */
    protected var mTransparent: Boolean = false

    /**
     * 图像数据 不透明：一位一像素，0白，1黑。
     * 透明：两位一像素，高位（0不透明，1透明），低位（0白，1黑）。
     * 注意：有冗余数据。
     */
    protected var mData: ByteArray? = null

    /**
     * 图片数组
     */
    protected var mBitmaps: Array<Bitmap>? = null

    /**
     * 得到资源的大小
     * @return
     */
    val bytesCount: Int
        get() = mData!!.size + 6

    override fun setData(buf: ByteArray, offset: Int) {
        type = buf[offset].toInt() and 0xFF
        index = (buf[offset + 1].toInt() and 0xFF)
        width = buf[offset + 2].toInt() and 0xFF
        height = buf[offset + 3].toInt() and 0xFF
        number = buf[offset + 4].toInt() and 0xFF
        mTransparent = buf[offset + 5].toInt() == 2

        val len = (number * (width / 8 + if (width % 8 != 0) 1 else 0)
                * height * buf[offset + 5].toInt())
        mData = ByteArray(len)
        System.arraycopy(buf, offset + 6, mData!!, 0, len)

        createBitmaps()
    }

    /**
     * 根据[.mData]创建位图数组
     */
    private fun createBitmaps() {
        var iOfData = 0
        mBitmaps = Array(number) {
            val tmp = Array(width * height) { Color.WHITE }
            if (mTransparent) {
                var cnt = 0
                var iOfTmp = 0
                for (y in 0 until height) {
                    for (x in 0 until width) {
                        if (mData!![iOfData].toInt() shl cnt and 0x80 != 0) {
                            tmp[iOfTmp] = Global.COLOR_TRANSP
                        } else {
                            tmp[iOfTmp] = if (mData!![iOfData].toInt() shl cnt shl 1 and 0x80 != 0)
                                Global.COLOR_BLACK
                            else
                                Global.COLOR_WHITE
                        }
                        ++iOfTmp
                        cnt += 2
                        if (cnt >= 8) {
                            cnt = 0
                            ++iOfData
                        }
                    }

                    if (cnt in 1..7) {
                        cnt = 0
                        ++iOfData
                    }
                    if (iOfData % 2 != 0) ++iOfData
                }
                // RETURN:
                Bitmap.createBitmap(tmp, width, height)
            } else { // 不透明
                var cnt = 0
                var iOfTmp = 0
                for (y in 0 until height) {
                    for (x in 0 until width) {
                        tmp[iOfTmp++] = if (mData!![iOfData].toInt() shl cnt and 0x80 != 0)
                            Global.COLOR_BLACK
                        else
                            Global.COLOR_WHITE
                        if (++cnt >= 8) {
                            cnt = 0
                            ++iOfData
                        }
                    }
                    if (cnt != 0) { // 不足一字节的舍去
                        cnt = 0
                        ++iOfData
                    }
                } // end for (int y = ...
                // RETURN:
                Bitmap.createBitmap(tmp, width, height)
            } // end if
        }
    }

    /**
     *
     * @param canvas
     * 目标画布
     * @param num
     * 要画的切片编号,>0
     * @param left
     * 画到画布的最左端位置
     * @param top
     * 画到画布的最上端位置
     */
    fun draw(canvas: Canvas, num: Int, left: Int, top: Int) {
        if (num <= number) {
            canvas.drawBitmap(mBitmaps!![num - 1], left, top)
        } else {
            if (number > 0) { // 要改？
                canvas.drawBitmap(mBitmaps!![0], left, top)
            } else {
                TextRender.drawText(canvas, "烫", left, top)
            }
        }
    }

    fun getBitmap(index: Int): Bitmap? {
        return if (index >= number) {
            null
        } else mBitmaps!![index].copy()
    }
}
