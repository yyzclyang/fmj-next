package fmj.script

import fmj.Global
import fmj.characters.Player
import fmj.gamemenu.ScreenGoodsList
import fmj.gamemenu.ScreenGoodsList.Mode
import fmj.goods.BaseGoods
import fmj.goods.GoodsDrama
import fmj.graphics.TextRender
import fmj.graphics.Util
import fmj.views.BaseScreen
import fmj.views.Control
import fmj.views.GameNode

import graphics.Canvas

class OperateSale(override val parent: GameNode): Control, Operate, ScreenGoodsList.OnItemSelectedListener {
    private val saleScreen = SaleGoodsScreen(this)

    override fun update(delta: Long): Boolean {
        return false
    }

    override fun draw(canvas: Canvas) {}

    override fun onKeyDown(key: Int) {}

    override fun onKeyUp(key: Int) {}

    override fun onItemSelected(goods: BaseGoods) {
        if (goods is GoodsDrama) {
            showMessage("任务物品!", 1000)
        } else {
            saleScreen.init(goods)
            pushScreen(saleScreen)
        }
    }

    private inner class SaleGoodsScreen(override val parent: GameNode) : BaseScreen {
        private var goods: BaseGoods? = null
        private var saleCnt: Int = 0
        private var money: Int = 0

        private val bmpBg by lazy {
            Util.getFrameBitmap(136, 55)
        }

        override val isPopup: Boolean
            get() = true

        fun init(goods: BaseGoods) {
            this.goods = goods
            saleCnt = 0
            money = Player.sMoney
        }

        override fun update(delta: Long) {}

        override fun draw(canvas: Canvas) {
            canvas.drawBitmap(bmpBg, 12, 21)
            TextRender.drawText(canvas, "金钱：" + money, 15, 24)
            TextRender.drawText(canvas, goods!!.name, 15, 40)
            TextRender.drawText(canvas, ": " + (goods!!.goodsNum - saleCnt), 93, 40)
            TextRender.drawText(canvas, "卖出个数　：" + saleCnt, 15, 56)
        }

        override fun onKeyUp(key: Int) {
            if (key == Global.KEY_ENTER) {
                Player.sMoney = money
                if (saleCnt > 0) {
                    Player.sGoodsList.useGoodsNum(goods!!.type, goods!!.index, saleCnt)
                }
                popScreen()
                // 重创物品选择界面，防止数量0还显示
                popScreen()
                val list = mutableListOf<BaseGoods>()
                list.addAll(Player.sGoodsList.goodsList)
                list.addAll(Player.sGoodsList.equipList)
                pushScreen(ScreenGoodsList(this, list, this@OperateSale, Mode.Sale))
            } else if (key == Global.KEY_CANCEL) {
                popScreen()
            }
        }

        override fun onKeyDown(key: Int) {
            if (key == Global.KEY_UP && saleCnt > 0) {
                --saleCnt
                money -= goods!!.sellPrice
            } else if (key == Global.KEY_DOWN && goods!!.goodsNum > saleCnt) {
                ++saleCnt
                money += goods!!.sellPrice
                if (money > 99999) {
                    money = 99999
                }
            }
        }
    }

}
