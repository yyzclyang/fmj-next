package fmj.lib

import fmj.Global
import fmj.graphics.TextRender
import fmj.graphics.Tiles

import graphics.Canvas
import graphics.Color
import java.System
import java.gbkString

class ResMap : ResBase() {

    /**
     * 该地图所用的til图块资源的索引号
     */
    private var mTilIndex: Int = 0

    /**
     * 地图名称
     */
    var mapName: String? = null
        private set

    /**
     * 地图宽
     */
    var mapWidth: Int = 0
        private set

    /**
     * 地图高
     */
    var mapHeight: Int = 0
        private set

    /**
     * 地图数据 两个字节表示一个地图快（从左到右，从上到下）
     * （低字节：最高位1表示可行走，0不可行走。高字节：事件号）
     */
    private var mData: ByteArray? = null

    /**
     * 地图使用的地图块
     */
    private var mTiles: Tiles? = null

    override fun setData(buf: ByteArray, offset: Int) {
        type = buf[offset].toInt() and 0xFF
        index = buf[offset + 1].toInt() and 0xFF
        mTilIndex = buf[offset + 2].toInt()

        var i = 0
        while (buf[offset + 3 + i].toInt() != 0)
            ++i
        mapName = buf.gbkString(offset + 3, i)

        mapWidth = buf[offset + 0x10].toInt()
        mapHeight = buf[offset + 0x11].toInt()

        val len = mapWidth * mapHeight * 2
        mData = ByteArray(len)
        System.arraycopy(buf, offset + 0x12, mData!!, 0, len)
    }

    /**
     * 判断地图(x,y)是否可行走
     * @param x
     * @param y
     * @return
     */
    fun canWalk(x: Int, y: Int): Boolean {
        if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
            return false
        }

        val i = y * mapWidth + x
        return mData!![i * 2].toInt() and 0x80 != 0
    }

    fun canPlayerWalk(x: Int, y: Int): Boolean {
        return (canWalk(x, y) && x >= 4 && x < mapWidth - 4
                && y >= 3 && y < mapHeight - 2)
    }

    fun getEventNum(x: Int, y: Int): Int {
        if (x < 0 || x >= mapWidth || y < 0 || y >= mapHeight) {
            return -1
        }

        val i = y * mapWidth + x
        return mData!![i * 2 + 1].toInt() and 0xFF
    }

    /**
     *
     * @param x
     * 图块的x坐标
     * @param y
     * 图块的y坐标
     * @return map中(x, y)位置的图块在til中的序号
     */
    private fun getTileIndex(x: Int, y: Int): Int {
        val i = y * mapWidth + x
        return mData!![i * 2].toInt() and 0x7F
    }

    /**
     * 水平方向 left --- left+WIDTH <br></br>
     * 竖直方向 top --- top + HEIGHT
     *
     * @param canvas
     * @param left
     * 地图的最左边
     * @param top
     * 地图的最上边
     */
    fun drawMap(canvas: Canvas, left: Int, top: Int) {
        if (mTiles == null) {
            mTiles = Tiles(mTilIndex)
        }

        val minY = minOf(HEIGHT, mapHeight - top)
        val minX = minOf(WIDTH, mapWidth - left)
        for (y in 0 until minY) {
            for (x in 0 until minX) {
                mTiles!!.draw(canvas, x * Tiles.WIDTH + Global.MAP_LEFT_OFFSET,
                        y * Tiles.HEIGHT, getTileIndex(left + x, top + y))
            }
        }
    }

    fun drawWholeMap(canvas: Canvas, x: Int, y: Int) {
        if (mTiles == null) {
            mTiles = Tiles(mTilIndex)
        }

        for (ty in 0 until mapHeight) {
            for (tx in 0 until mapWidth) {
                val sx = tx * Tiles.WIDTH + x
                val sy = ty * Tiles.HEIGHT + y
                mTiles!!.draw(canvas, sx, sy, getTileIndex(tx, ty))
                val event = getEventNum(tx, ty)
                if (event != 0) {
                    // TODO: refactor
                    Global.bgColor = Color.RED
                    TextRender.drawText(canvas, event.toString(), sx, sy)
                    Global.bgColor = Global.COLOR_WHITE
                }
            }
        }
    }

    companion object {
        /**
         * 横向渲染的地图块总数
         */
        val WIDTH = 160 / 16 - 1

        /**
         * 纵向渲染的地图块总数
         */
        val HEIGHT = 96 / 16
    }
}
