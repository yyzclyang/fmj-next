package fmj.characters

import fmj.Global
import fmj.lib.DatLib
import fmj.lib.ResImage

import graphics.Canvas

class WalkingSprite(type: Int, id: Int) {
    private val mResImage: ResImage
    private var mOffset = 1 // 面向
    private var mI = 0 // 脚步

    val id: Int
        get() = mResImage.index

    var step: Int
        get() = mI
        set(step) {
            mI = step % 4
        }

    init {
        mResImage = DatLib.instance!!.getRes(DatLib.ResType.ACP,
                type, id) as ResImage
    }

    fun setDirection(d: Direction) {
        mOffset = when (d) {
            Direction.North -> 1
            Direction.East -> 4
            Direction.South -> 7
            Direction.West -> 10
        }
    }

    fun walk(d: Direction) {
        setDirection(d)
        walk()
    }

    fun walk() {
        ++mI
        mI %= 4
    }

    fun draw(canvas: Canvas, x: Int, y: Int) {
        var y = y
        y = y + 16 - mResImage.height
        if (x + mResImage.width > 0 && x < 160 - 16 &&
                y + mResImage.height > 0 && y < 96) {
            mResImage.draw(canvas, mOffset + OFFSET[mI], x + Global.MAP_LEFT_OFFSET, y)
        }
    }

    companion object {
        private val OFFSET = intArrayOf(0, 1, 2, 1)
    }
}
