package fmj.script

import fmj.Global
import fmj.characters.Player
import fmj.gamemenu.ScreenGoodsList
import fmj.gamemenu.ScreenGoodsList.Mode
import fmj.goods.BaseGoods
import fmj.graphics.TextRender
import fmj.lib.DatLib
import fmj.scene.ScreenMainGame
import fmj.views.BaseScreen
import fmj.views.ScreenStack

import graphics.Canvas

class OperateBuy(internal var data: ByteArray, internal var start: Int) : Operate(), ScreenGoodsList.OnItemSelectedListener {
    private val goodsList: MutableList<BaseGoods> = mutableListOf()

    private val mBuyScreen = BuyGoodsScreen()

    override fun process(): Boolean {
        goodsList.clear()
        var i = start
        while (data[i].toInt() != 0) {
            var g = Player.sGoodsList.getGoods(
                    data[i + 1].toInt() and 0xff,
                    data[i].toInt() and 0xff)

            if (g == null) {
                g = DatLib.GetRes(DatLib.ResType.GRS,
                        data[i + 1].toInt() and 0xff,
                        data[i].toInt() and 0xff) as BaseGoods
                g.goodsNum = 0
            }

            goodsList.add(g)
            i += 2
        }
        delagete.pushScreen(ScreenGoodsList(goodsList, this, Mode.Buy))
        return true
    }

    override fun update(delta: Long): Boolean {
        return false
    }

    override fun draw(canvas: Canvas) {
        ScreenMainGame.instance.drawScene(canvas)
    }

    override fun onKeyDown(key: Int) {}

    override fun onKeyUp(key: Int) {}

    override fun onItemSelected(goods: BaseGoods) {
        if (Player.sMoney < goods.buyPrice) {
            delagete.showMessage("金钱不足!", 1000)
        } else {
            mBuyScreen.init(goods)
            delagete.pushScreen(mBuyScreen)
        }
    }

    private class BuyGoodsScreen : BaseScreen() {
        private var goods: BaseGoods? = null
        private var buyCnt: Int = 0
        private var money: Int = 0
        private val bmpBg by lazy {
            delegate.getFrameBitmap(136, 55)
        }

        override val isPopup: Boolean
            get() = true

        fun init(goods: BaseGoods) {
            this.goods = goods
            buyCnt = 0
            money = Player.sMoney
        }

        override fun update(delta: Long) {}

        override fun draw(canvas: Canvas) {
            canvas.drawBitmap(bmpBg, 12, 21)
            TextRender.drawText(canvas, "金钱：" + money, 15, 24)
            TextRender.drawText(canvas, goods!!.name, 15, 40)
            TextRender.drawText(canvas, ": " + goods!!.goodsNum, 93, 40)
            TextRender.drawText(canvas, "买入个数　：" + buyCnt, 15, 56)
        }

        override fun onKeyUp(key: Int) {
            if (key == Global.KEY_ENTER) {
                Player.sMoney = money
                if (buyCnt == goods!!.goodsNum && buyCnt > 0) {
                    Player.sGoodsList.addGoods(goods!!.type, goods!!.index, buyCnt)
                }
                delegate.popScreen()
            } else if (key == Global.KEY_CANCEL) {
                goods!!.addGoodsNum(-buyCnt)
                delegate.popScreen()
            }
        }

        override fun onKeyDown(key: Int) {
            if (key == Global.KEY_UP && goods!!.goodsNum < 99) {
                if (money >= goods!!.buyPrice) {
                    ++buyCnt
                    goods!!.addGoodsNum(1)
                    money -= goods!!.buyPrice
                } else {
                    delegate.showMessage("金钱不足!", 1000)
                }
            } else if (key == Global.KEY_DOWN && buyCnt > 0) {
                --buyCnt
                goods!!.addGoodsNum(-1)
                money += goods!!.buyPrice
            }
        }
    }

}
