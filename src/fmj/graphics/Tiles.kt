package fmj.graphics

import fmj.lib.DatLib
import fmj.lib.ResImage

import graphics.Canvas

class Tiles(index: Int) {

    private val mTileRes = DatLib.GetRes(DatLib.ResType.TIL, 1, index) as ResImage

    /**
     *
     * @param canvas
     * @param x
     * @param y
     * @param i
     * 图块的序号
     */
    fun draw(canvas: Canvas, x: Int, y: Int, i: Int) {
        mTileRes.draw(canvas, i + 1, x, y)
    }

    companion object {
        /**
         * 地图块的宽
         */
        val WIDTH = 16
        /**
         * 地图块的高
         */
        val HEIGHT = 16
    }
}
