package fmj.goods

import fmj.lib.DatLib
import fmj.lib.ResSrs

/**
 * 08暗器
 * @author Chen
 */
class GoodsHiddenWeapon : BaseGoods() {

    /**
     *
     * @return 当该值为正时表示敌人损失多少生命，
     * 为负时表示从敌人身上吸取多少生命到投掷者身上
     */
    var affectHp: Int = 0
        private set // 当该值为正时表示敌人损失多少生命，为负时表示从敌人身上吸取多少生命到投掷者身上
    /**
     *
     * @return 当该值为正时表示敌人损失多少真气，
     * 为负时表示从敌人身上吸取多少真气到投掷者身上
     */
    var affectMp: Int = 0
        private set // 当该值为正时表示敌人损失多少真气，为负时表示从敌人身上吸取多少真气到投掷者身上
    var ani: ResSrs? = null
        private set
    private var mBitMask: Int = 0 // 000 全体否 毒乱封眠

    private fun get2ByteSint(buf: ByteArray, start: Int): Int {
        val i = buf[start].toInt() and 0xFF or (buf[start + 1].toInt() shl 8 and 0x7F00)
        return if (buf[start + 1].toInt() and 0x80 != 0) {
            -i
        } else i
    }

    override fun setOtherData(buf: ByteArray, offset: Int) {
        affectHp = get2ByteSint(buf, offset + 0x16)
        affectMp = get2ByteSint(buf, offset + 0x18)
        ani = DatLib.getRes(DatLib.ResType.SRS, buf[offset + 0x1b].toInt() and 0xff,
                buf[offset + 0x1a].toInt() and 0xff) as ResSrs?
        mBitMask = buf[offset + 0x1c].toInt() and 0xff
    }

    override fun effectAll(): Boolean {
        return mBitMask and 0x10 != 0
    }
}
