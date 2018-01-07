package graphics

import fmj.Global

class Color {
    var rgb: Int = 0
        internal set
    constructor(r: Int, g: Int, b: Int) : this(r, g, b, 255)

    constructor(r: Int, g: Int, b: Int, a: Int) {
        rgb = a and 0xFF shl 24 or
                (r and 0xFF shl 16) or
                (g and 0xFF shl 8) or
                (b and 0xFF shl 0)
    }

    constructor(rgb: Int) {
        this.rgb = -0x1000000 or rgb
    }

    companion object {
        val WHITE = Color(0xff, 0xff, 0xff)
        val BLACK = Color(0, 0, 0)
    }
}

class Paint {
    var style = Style.FILL
    var color = Color.WHITE
    var strokeWidth = 1

    enum class Style {
        FILL, STROKE, FILL_AND_STROKE
    }
}

class Bitmap(val width:Int, val height:Int) {
    var color: Color = Color.WHITE
    fun drawImage(bmp: Bitmap, x: Int, y: Int) {
        // TODO
    }
    fun fillRect(x: Int, y: Int, w: Int, h: Int) {
        // TODO
    }

    fun drawLine(x: Int, y: Int, stopX: Int, stopY: Int) {
        // TODO
    }
    fun drawRect(x: Int, y: Int, w: Int, h: Int) {
        // TODO
    }

    fun setPixels(pixels: Array<Color>, offset: Int, stride: Int, x: Int, y: Int, width: Int, height: Int) {
        // TODO
    }

    fun copy(): Bitmap {
        TODO()
    }

    companion object {
        fun createBitmap(w: Int, h: Int): Bitmap = Bitmap(w, h)
        fun createBitmap(pixels: Array<Color>, w: Int, h: Int): Bitmap {
            val bmp = Bitmap(w, h)
            // TODO
            return bmp
        }
    }
}

data class Rect(val left: Int, val top: Int, val right: Int, val bottom: Int) {
    fun width(): Int = right - left + 1
    fun height(): Int = bottom - top + 1
}

data class RectF(val left: Float, val top: Float, val right: Float, val bottom: Float)

data class Point(var x: Int = 0, var y: Int = 0) {

    fun set(x: Int, y: Int) {
        this.x = x
        this.y = y
    }

    fun offset(dx: Int, dy: Int) {
        x += dx
        y += dy
    }
}

class Canvas(b: Bitmap) {

    var background: Bitmap = b

    constructor(): this(Bitmap.createBitmap(Global.SCREEN_WIDTH, Global.SCREEN_HEIGHT))

    fun drawBitmap(bitmap: Bitmap, left: Int, top: Int, paint: Paint?) {
        drawBitmap(bitmap, left.toFloat(), top.toFloat(), paint)
    }

    fun drawBitmap(bitmap: Bitmap, left: Float, top: Float, paint: Paint?) {
        val g = background
        if (paint != null) {
            g.color = Color.BLACK
        } else {
            g.color = Color.WHITE
        }
        g.drawImage(bitmap, left.toInt(), top.toInt())
    }

    fun drawColor(color: Int) {
        val g = background
        g.color = Color(color)
        g.fillRect(0, 0, background.width, background.height)
    }

    fun drawColor(color: Color) {
        drawColor(color.rgb)
    }

    fun drawLine(startX: Int, startY: Int, stopX: Int, stopY: Int, paint: Paint) {
        drawLine(startX.toFloat(), startY.toFloat(), stopX.toFloat(), stopY.toFloat(), paint)
    }

    fun drawLine(startX: Float, startY: Float, stopX: Float, stopY: Float, paint: Paint) {
        val g = background
        g.color = Color.BLACK
        g.drawLine(startX.toInt(), startY.toInt(), stopX.toInt(), stopY.toInt())
    }

    private fun drawR(x: Int, y: Int, i: Int, j: Int, sBlackPaint: Paint, color: Color) {
        val g = background
        g.color = color

        if (sBlackPaint.style == Paint.Style.FILL) {
            g.fillRect(x, y, i, j)
        } else if (sBlackPaint.style == Paint.Style.STROKE) {
            g.drawRect(x, y, i, j)
        } else {
            g.fillRect(x, y, i, j)
        }
    }

    fun drawRect(x: Int, y: Int, i: Int, j: Int, sBlackPaint: Paint) {
        drawR(x, y, i - x, j - y, sBlackPaint, Color.BLACK)
    }

    fun drawRect(mRectTop: Rect, mFramePaint: Paint) {
        drawR(mRectTop.left, mRectTop.top, mRectTop.right - mRectTop.left, mRectTop.bottom - mRectTop.top, mFramePaint, Color.BLACK)
    }

    fun drawRect(rWithPic: RectF, paint: Paint) {
        val color = Color.BLACK
        drawR(rWithPic.left.toInt(), rWithPic.top.toInt(), (rWithPic.right - rWithPic.left).toInt(), (rWithPic.bottom - rWithPic.top).toInt(), paint, color)
    }

    fun drawLines(pts: FloatArray, sBlackPaint: Paint) {
        val g = background
        g.color = Color.BLACK

        val size = pts.size / 4
        for (i in 0 until size) {
            g.drawLine(pts[i * 4].toInt(), pts[i * 4 + 1].toInt(), pts[i * 4 + 2].toInt(), pts[i * 4 + 3].toInt())
        }
    }

    fun setBitmap(bmp: Bitmap) {
        background = bmp
    }
}

