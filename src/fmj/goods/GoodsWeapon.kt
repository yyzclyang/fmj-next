package fmj.goods

import fmj.characters.Player


/**
 * 07武器类
 * @author Chen
 */
class GoodsWeapon : GoodsEquipment() {

    override fun putOn(p: Player) {
        super.putOn(p)
        p.setAtbuff(mBitEffect, sumRound)
    }

    override fun takeOff(p: Player) {
        super.takeOff(p)
        p.resetAtbuff()
    }

    fun attackAll(): Boolean {
        return mBitEffect and 0x10 != 0
    }
}
