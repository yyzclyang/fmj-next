package fmj.magic

import fmj.characters.FightingCharacter

/**
 * 01攻击型
 * @author Chen
 */
class MagicAttack : BaseMagic() {

    private var mHp: Int = 0//-8000~+8000，为正数时表示敌人损失生命的基数，为负数时表示从敌人身上吸取生命的基数
    private var mMp: Int = 0//-8000~+8000，为正数时表示敌人损失真气的基数，为负数时表示从敌人身上吸取真气的基数
    private var mDf: Int = 0//0~100，表示敌人的防御力减弱的百分比
    private var mAt: Int = 0//0~100，表示敌人的攻击力减弱的百分比
    private var mBuff: Int = 0//高四位 持续回合，低四位毒、乱、封、眠
    private var mDebuff: Int = 0//速 0~100，表示敌人的身法减慢的百分比

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mHp = Companion.get2BytesSInt(buf, offset + 0x12)
        mMp = Companion.get2BytesSInt(buf, offset + 0x14)
        mDf = buf[offset + 0x16].toInt() and 0xff
        mAt = buf[offset + 0x17].toInt() and 0xff
        mBuff = buf[offset + 0x18].toInt() and 0xff
        mDebuff = buf[offset + 0x19].toInt() and 0xff
    }

    override fun use(src: FightingCharacter, dst: FightingCharacter) { // TODO
        src.mp = src.mp - costMp
        dst.hp = dst.hp - mHp
    }

    fun use(src: FightingCharacter, dst: List<FightingCharacter>) {
        src.mp = src.mp - costMp
        for (fc in dst) {
            fc.hp = fc.hp - mHp
        }
    }

}
