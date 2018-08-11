package fmj.magic

import fmj.characters.BuffMan
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
    private var mSu: Int = 0//速 0~100，表示敌人的身法减慢的百分比

    private val buff: BuffMan
        get() {
            val atbuff = BuffMan.fromInt(mBuff)
            atbuff.buffs[FightingCharacter.maskToIndex(FightingCharacter.BUFF_MASK_FANG)].value = mDf
            atbuff.buffs[FightingCharacter.maskToIndex(FightingCharacter.BUFF_MASK_GONG)].value = mAt
            atbuff.buffs[FightingCharacter.maskToIndex(FightingCharacter.BUFF_MASK_SU)].value = mSu
            return atbuff
        }

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mHp = get2BytesSInt(buf, offset + 0x12)
        mMp = get2BytesSInt(buf, offset + 0x14)
        mDf = buf[offset + 0x16].toInt() and 0xff
        mAt = buf[offset + 0x17].toInt() and 0xff
        mBuff = buf[offset + 0x18].toInt() and 0xff
        mSu = buf[offset + 0x19].toInt() and 0xff
    }

    override fun use(src: FightingCharacter, dst: FightingCharacter) {
        src.mp = src.mp - costMp
        dst.hp = dst.hp - mHp
        dst.beAttackedWithBuff(buff)
    }

    fun use(src: FightingCharacter, dst: List<FightingCharacter>) {
        src.mp = src.mp - costMp
        val buff = this.buff
        for (fc in dst) {
            fc.hp = fc.hp - mHp
            fc.beAttackedWithBuff(buff)
        }
    }
}
