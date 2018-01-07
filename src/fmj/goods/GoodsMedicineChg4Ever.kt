package fmj.goods

import fmj.characters.Player

/**
 * 11仙药类
 * 永久性改变人物属性
 * @author Chen
 */
class GoodsMedicineChg4Ever : BaseGoods(), IEatMedicine {

    private var mMpMax: Int = 0
    private var mHpMax: Int = 0
    private var mdf: Int = 0
    private var mat: Int = 0
    private var mling: Int = 0
    private var mSpeed: Int = 0
    private var mLuck: Int = 0

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mMpMax = get1ByteSInt(buf, offset + 0x16)
        mHpMax = get1ByteSInt(buf, offset + 0x17)
        mdf = get1ByteSInt(buf, offset + 0x18)
        mat = get1ByteSInt(buf, offset + 0x19)
        mling = get1ByteSInt(buf, offset + 0x1a)
        mSpeed = get1ByteSInt(buf, offset + 0x1b)
        mLuck = get1ByteSInt(buf, offset + 0x1d)
    }

    override fun eat(player: Player) {
        player.maxMP = player.maxMP + mMpMax
        player.maxHP = player.maxHP + mHpMax
        player.defend = player.defend + mdf
        player.attack = player.attack + mat
        player.lingli = player.lingli + mling
        player.speed = player.speed + mSpeed
        player.luck = player.luck + mLuck
        Player.sGoodsList.deleteGoods(type, index)
    }
}
