package fmj.goods

import fmj.characters.Player

/**
 * 10灵药类
 * 对生命的恢复0~100,表示恢复被使用者??%的生命，
 * 并解除死亡状态，但被使用者必须是死亡状态。
 * @author Chen
 */
class GoodsMedicineLife : BaseGoods(), IEatMedicine {

    private var mPercent: Int = 0 // 恢复百分比

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mPercent = buf[offset + 0x17].toInt() and 0xff
        if (mPercent > 100) {
            mPercent = 100
        }
    }

    override fun eat(player: Player) {
        player.mp = player.mp + player.maxMP * mPercent / 100
        if (player.mp > player.maxMP) {
            player.mp = player.maxMP
        }
        Player.sGoodsList.deleteGoods(type, index)
    }
}
