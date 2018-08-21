package fmj.magic

import fmj.characters.BuffMan
import fmj.characters.FightingCharacter
import fmj.combat.actions.CalcDamage
import fmj.scene.SaveLoadGame
import kotlin.math.abs
import kotlin.math.max

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

    private fun calcHurt(src: FightingCharacter, dst: FightingCharacter, hp: Int): Int
    {
        return if (hp > 0) {
            val add  = (src.lingli - dst.lingli).toDouble() / 100
            max(hp + (hp * add).toInt(), 0)
        } else {
            val rate = when {
                dst.level <= 8 -> 1
                dst.level <= 16 -> 2
                else -> 3
            }
            hp * rate
        }
    }

    override fun use(src: FightingCharacter, dst: FightingCharacter) {
        if (SaveLoadGame.allowMiss) {
            if (CalcDamage.randomMiss(src, dst)) {
                dst.missed = true
                return
            }
        }
        src.mp = src.mp - costMp
        val hpHurt = calcHurt(src, dst, mHp)
        dst.hp -= abs(hpHurt)
        if (hpHurt < 0) {
            src.hp -= hpHurt
        }
        val mpHurt = calcHurt(src, dst, mMp)
        dst.mp -= abs(mpHurt)
        if (mpHurt < 0) {
            src.mp -= mpHurt
        }
        dst.beAttackedWithBuff(buff)
    }

    fun use(src: FightingCharacter, dst: List<FightingCharacter>) {
        src.mp = src.mp - costMp
        val buff = this.buff
        for (fc in dst) {
            if (SaveLoadGame.allowMiss) {
                if (CalcDamage.randomMiss(src, fc)) {
                    fc.missed = true
                    continue
                }
            }
            fc.hp -= calcHurt(src, fc, mHp)
            fc.beAttackedWithBuff(buff)
        }
    }
}
