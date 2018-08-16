package fmj.goods

import fmj.characters.BuffMan
import fmj.characters.Player
import fmj.lib.ResBase
import fmj.lib.ResSrs


/**
 * 07武器类
 * @author Chen
 */
class GoodsWeapon : GoodsEquipment(), Throwable {
    override val ani = ResSrs()
    override var affectMp: Int = 0
        private set
    override var affectHp: Int = 0
        private set
    override val buff = BuffMan()

    override fun setOtherData(buf: ByteArray, offset: Int) {
        super.setOtherData(buf, offset)
        affectHp = ResBase.get2BytesSInt(buf, offset + 0x16)
        affectMp = ResBase.get2BytesSInt(buf, offset + 0x18)
    }

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
