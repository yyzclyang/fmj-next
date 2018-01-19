package fmj.goods

import fmj.characters.Player
import fmj.lib.DatLib
import fmj.lib.ResSrs

/**
 * 09药物类
 * 普通药物，任何人都可以用
 * @author Chen
 */
class GoodsMedicine : BaseGoods(), IEatMedicine {

    private var mHp: Int = 0
    private var mMp: Int = 0
    var ani: ResSrs? = null
        private set
    private var mBitMask: Int = 0 // 治疗 毒、乱、封、眠

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mHp = get2BytesInt(buf, offset + 0x16)
        mMp = get2BytesInt(buf, offset + 0x18)
        val index = buf[offset + 0x1a].toInt() and 0xff
        if (index > 0) {
            ani = DatLib.getRes(DatLib.ResType.SRS, 2/*(int)buf[offset + 0x1b] & 0xff*/,
                    index) as ResSrs?
        }
        mBitMask = buf[offset + 0x1c].toInt() and 0xff
    }

    override fun eat(player: Player) {
        player.hp = player.hp + mHp
        if (player.hp > player.maxHP) {
            player.hp = player.maxHP
        }
        player.mp = player.mp + mMp
        if (player.mp > player.maxMP) {
            player.mp = player.maxMP
        }
        player.delDebuff(mBitMask)
        Player.sGoodsList.deleteGoods(type, index)
    }

    /**
     * 是具有全体治疗效果
     * @return
     */
    override fun effectAll(): Boolean {
        return mBitMask and 0x10 != 0
    }
}
