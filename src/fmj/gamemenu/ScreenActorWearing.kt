package fmj.gamemenu

import fmj.GameView
import fmj.Global
import fmj.characters.Player
import fmj.gamemenu.ScreenGoodsList.Mode
import fmj.goods.BaseGoods
import fmj.goods.GoodsEquipment
import fmj.graphics.TextRender
import fmj.graphics.Util
import fmj.scene.ScreenMainGame
import fmj.views.BaseScreen
import fmj.views.ScreenStack

import graphics.Bitmap
import graphics.Canvas
import graphics.Point
import graphics.Rect

import java.Stack
import java.encode

class ScreenActorWearing : BaseScreen() {

    private val mPos: Array<Point>
    private var mEquipments: Array<GoodsEquipment?>
    private val mItemName = arrayOf("装饰", "装饰", "护腕", "脚蹬", "手持", "身穿", "肩披", "头戴")
    private var mCurItem = 0

    private var mActorIndex = -1

    private var showingDesc = false
    private val bmpName = Util.getFrameBitmap(92 - 9 + 1, 29 - 10 + 1)//Bitmap.createBitmap(92 - 9 + 1, 29 - 10 + 1, Config.ARGB_8888);
    private val bmpDesc = Util.getFrameBitmap(151 - 9 + 1, 65 - 28 + 1)//Bitmap.createBitmap(151 - 9 + 1, 65 - 28 + 1, Config.ARGB_8888);
    private var mTextName = byteArrayOf()
    private var mTextDesc = byteArrayOf()
    private var mToDraw = 0 // 当前要画的描述中的字节
    private var mNextToDraw = 0 // 下一个要画的描述中的字节
    private val mStackLastToDraw = Stack.create<Int>() // 保存上次描述所画位置

    init {
        mEquipments = ScreenMainGame.sPlayerList[0].equipmentsArray
        mActorIndex = 0
        mPos = arrayOf(// w 25
                Point(4, 3),
                Point(4, 30),
                Point(21, 59),
                Point(51, 65),
                Point(80, 61),
                Point(109, 46),
                Point(107, 9),
                Point(79, 2))
    }

    private fun getGBKBytes(s: String): ByteArray {
        return s.encode("GBK")
    }

    override fun update(delta: Long) {}

    override fun draw(canvas: Canvas) {
        canvas.drawColor(Global.COLOR_WHITE)
        canvas.drawBitmap(Util.bmpChuandai, 160 - Util.bmpChuandai.width, 0, null)

        // 画装备
        for (i in 0..7) {
            mEquipments[i]?.draw(canvas, mPos[i].x + 1, mPos[i].y + 1)
        }
        canvas.drawRect(mPos[mCurItem].x, mPos[mCurItem].y,
                mPos[mCurItem].x + 25, mPos[mCurItem].y + 25, Util.sBlackPaint)
        TextRender.drawText(canvas, mItemName[mCurItem], 120, 80)

        // 画人物头像、姓名
        if (mActorIndex >= 0) {
            val p = ScreenMainGame.sPlayerList.get(mActorIndex)
            p.drawHead(canvas, 44, 12)
            TextRender.drawText(canvas, p.name, 30, 40)
        }

        if (showingDesc) {
            canvas.drawBitmap(bmpName, 9, 10, null)
            canvas.drawBitmap(bmpDesc, 9, 28, null)
            TextRender.drawText(canvas, mTextName, 9 + 3, 10 + 3)
            mNextToDraw = TextRender.drawText(canvas, mTextDesc, mToDraw, sRectDesc)
        }
    }

    private fun resetDesc() {
        if (showingDesc) {
            showingDesc = false
            mNextToDraw = 0
            mToDraw = mNextToDraw
            mStackLastToDraw.clear()
        }
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_DOWN && mCurItem < 8 - 1) {
            ++mCurItem
            resetDesc()
        } else if (key == Global.KEY_UP && mCurItem > 0) {
            --mCurItem
            resetDesc()
        } else if (key == Global.KEY_RIGHT && mActorIndex < ScreenMainGame.sPlayerList.size - 1) {
            ++mActorIndex
            mEquipments = ScreenMainGame.sPlayerList.get(mActorIndex).equipmentsArray
            resetDesc()
        } else if (key == Global.KEY_LEFT && mActorIndex > 0) {
            --mActorIndex
            mEquipments = ScreenMainGame.sPlayerList.get(mActorIndex).equipmentsArray
            resetDesc()
        } else if (showingDesc) {
            if (key == Global.KEY_PAGEDOWN) {
                if (mNextToDraw < mTextDesc.size) {
                    mStackLastToDraw.push(mToDraw)
                    mToDraw = mNextToDraw
                }
            } else if (key == Global.KEY_PAGEUP && mToDraw != 0) {
                mStackLastToDraw.pop()?.let {
                    mToDraw = it
                }
            }
        }
    }

    override fun onKeyUp(key: Int) {
        if (key == Global.KEY_CANCEL) {
            delegate?.popScreen()
        } else if (key == Global.KEY_ENTER) {
            if (!showingDesc && mEquipments[mCurItem] != null) {
                showingDesc = true
                mTextName = getGBKBytes(mEquipments[mCurItem]?.name ?: "")
                mTextDesc = getGBKBytes(mEquipments[mCurItem]?.description ?: "")
            } else { // put change equipment screen
                resetDesc()
                delegate?.pushScreen(ScreenGoodsList(getTheEquipList(Player.sEquipTypes[mCurItem]),
                        object : ScreenGoodsList.OnItemSelectedListener {
                            override fun onItemSelected(goods: BaseGoods) {
                                val actor = ScreenMainGame.sPlayerList[mActorIndex]
                                if (goods.canPlayerUse(actor.index)) {
                                    delegate?.popScreen()
                                    delegate?.pushScreen(ScreenChgEquipment(actor, goods as GoodsEquipment))
                                } else {
                                    ScreenStack.instance.showMessage("不能装备!", 1000)
                                }
                            }
                        }, Mode.Use))
            }
        }
    }

    private fun getTheEquipList(type: Int): List<BaseGoods> {
        return Player.sGoodsList.equipList
                .filter { it.type == type }
        /*
        val tmplist = mutableListOf<BaseGoods>()
        val iter = Player.sGoodsList.equipList.iterator()
        while (iter.hasNext()) {
            val g = iter.next()
            if (g.type == Player.sEquipTypes[mCurItem]) { // 找到所有与当前选择类型相同的装备
                tmplist.add(g)
            }
        }
        return tmplist
        */
    }

    companion object {
        private val sRectDesc = Rect(9 + 3, 28 + 3, 151, 65)
    }


}
