package graphics

import fmj.Global
import java.System
import kotlin.math.abs
import kotlin.math.min

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
    var color = Color.BLACK
    var strokeWidth = 1

    enum class Style {
        FILL, STROKE, FILL_AND_STROKE
    }
}

class Bitmap(val width:Int, val height:Int, private val buffer: Array<Color>) {
    constructor(width: Int, height: Int):
            this(width, height, Array(width * height) { Color.WHITE })

    var color: Color = Color.WHITE

    fun drawImage(src: Bitmap, x: Int, y: Int) {
        setPixels(src.buffer, 0, x, y, width, height)
    }

    private fun setPixel(col: Int, row: Int, color: Color) {
        buffer[width * row + col] = color
    }

    fun fillRect(x: Int, y: Int, w: Int, h: Int) {
        for (col in x until x + w)
            for (row in y until y + h) {
                setPixel(col, row, color)
            }
    }

    fun drawLine(x1: Int, y1: Int, x2: Int, y2: Int) {
        var dx = x2 - x1
        var dy = y2 - y1
        val ux = if (dx > 0) 1 else - 1
        val uy = if (dy > 0) 1 else - 1
        var x = x1
        var y = y1
        var eps = 0

        dx = abs(dx)
        dy = abs(dy)
        if (dx > dy) {
            x = x1
            while (true) {
                setPixel(x, y, color)
                if (x == x2)
                    break
                eps += dy
                if (eps shl 1 >= dx) {
                    y += uy
                    eps -= dx
                }
                x += ux
            }
        } else {
            y = y1
            while (true) {
                setPixel(x, y, color)
                if (y == y2)
                    break
                eps += dx
                if (eps shl 1 >= dy) {
                    x += ux
                    eps -= dy
                }
                y += uy
            }
        }
    }

    fun drawRect(x: Int, y: Int, w: Int, h: Int) {
        drawLine(x, y, x + w, y)
        drawLine(x + w, y, x + w, y + h)
        drawLine(x, y + h, x + w, y + h)
        drawLine(x, y, x, y + h)
    }

    fun setPixels(pixels: Array<Color>, offset: Int, x: Int, y: Int, w: Int, h: Int) {
        if (width == w && x == 0) {
            val start = width * y
            val dLen = width * height - start
            val sLen = w * h
            val len = min(sLen, dLen)
            System.arraycopy(pixels, offset, buffer, start, len)
        } else {
            val xWidth = min(width - x, w)
            val xHeight = min(height - y, h)
            for (col in 0 until xWidth)
                for (row in 0 until xHeight) {
                    val dOff = width * (y + row) + x + col
                    val sOff = w * row + col
                    buffer[dOff] = pixels[offset+sOff]
                }
        }
    }

    fun copy(): Bitmap {
        return Bitmap(width, height, buffer.copyOf())
    }

    companion object {
        fun createBitmap(w: Int, h: Int): Bitmap = Bitmap(w, h)
        fun createBitmap(pixels: Array<Color>, w: Int, h: Int): Bitmap {
            return Bitmap(w, h, pixels)
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

    private var bg: Bitmap = b

    constructor(): this(Bitmap.createBitmap(Global.SCREEN_WIDTH, Global.SCREEN_HEIGHT))

    fun drawBitmap(bitmap: Bitmap, left: Int, top: Int) {
        drawBitmap(bitmap, left.toFloat(), top.toFloat())
    }

    fun drawBitmap(bitmap: Bitmap, left: Float, top: Float) {
        bg.drawImage(bitmap, left.toInt(), top.toInt())
    }

    fun drawColor(color: Int) {
        bg.color = Color(color)
        bg.fillRect(0, 0, this.bg.width, this.bg.height)
    }

    fun drawColor(color: Color) {
        drawColor(color.rgb)
    }

    fun drawLine(startX: Int, startY: Int, stopX: Int, stopY: Int, paint: Paint) {
        drawLine(startX.toFloat(), startY.toFloat(), stopX.toFloat(), stopY.toFloat(), paint)
    }

    fun drawLine(startX: Float, startY: Float, stopX: Float, stopY: Float, paint: Paint) {
        bg.color = paint.color
        bg.drawLine(startX.toInt(), startY.toInt(), stopX.toInt(), stopY.toInt())
    }

    private fun drawR(x: Int, y: Int, i: Int, j: Int, paint: Paint, color: Color) {
        bg.color = color

        when(paint.style) {
            Paint.Style.FILL
                -> bg.fillRect(x, y, i, j)
            Paint.Style.STROKE
                -> bg.drawRect(x, y, i, j)
            else
                -> bg.fillRect(x, y, i, j)
        }
    }

    fun drawRect(x: Int, y: Int, i: Int, j: Int, paint: Paint) {
        drawR(x, y, i - x, j - y, paint, paint.color)
    }

    fun drawRect(rect: Rect, paint: Paint) {
        drawR(rect.left, rect.top,
                rect.right - rect.left,
                rect.bottom - rect.top,
                paint, paint.color)
    }

    fun drawRect(rect: RectF, paint: Paint) {
        drawR(rect.left.toInt(),
                rect.top.toInt(),
                (rect.right - rect.left).toInt(),
                (rect.bottom - rect.top).toInt(),
                paint, paint.color)
    }

    fun drawLines(dots: FloatArray, paint: Paint) {
        bg.color = paint.color

        val size = dots.size / 4
        for (i in 0 until size) {
            bg.drawLine(
                    dots[i * 4].toInt(),
                    dots[i * 4 + 1].toInt(),
                    dots[i * 4 + 2].toInt(),
                    dots[i * 4 + 3].toInt())
        }
    }

    fun setBitmap(bmp: Bitmap) {
        bg = bmp
    }
}

