package fmj.gamemenu

import fmj.Global
import fmj.graphics.TextRender
import fmj.views.BaseScreen
import graphics.Canvas
import java.gbkBytes


class ScreenCommonMenu(items: Array<String>, private val callback: (Int) -> Unit): BaseScreen() {
    // TODO: 滚动
    private var curSel = 0
    private val paddedItems: List<ByteArray>
    private val top: Int
    private val left: Int
    init {
        val byteItems = items.map { it.gbkBytes() }
        val lineCount = items.map { byteItems.size }.max() ?: 2
        val width = 16 * lineCount
        val height = 16 * items.size
        left = (Global.SCREEN_WIDTH - width) / 2
        top = (Global.SCREEN_HEIGHT - height) / 2

        paddedItems = byteItems.map {
            val s = it.toMutableList()
            while (s.size < lineCount) s.add(' '.toByte())
            s.toByteArray()
        }
    }

    override val isPopup: Boolean
        get() = true

    override fun update(delta: Long) {}

    override fun onKeyUp(key: Int) {
        if (key == Global.KEY_ENTER) {
            delegate.popScreen()
            callback(curSel+1)
        } else if (key == Global.KEY_CANCEL) {
            delegate.popScreen()
            callback(0)
        }
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_DOWN && curSel < paddedItems.size - 1) {
            ++curSel
        } else if (key == Global.KEY_UP && curSel > 0) {
            --curSel
        }
    }

    override fun draw(canvas: Canvas) {
        for (i in paddedItems.indices) {
            if (i != curSel) {
                TextRender.drawText(canvas, paddedItems[i], left, top + 16 * i)
            } else {
                TextRender.drawSelText(canvas, paddedItems[i], left, top + 16 * i)
            }
        }
    }

    fun reset() {
        curSel = 0
    }
}
