package fmj.magic

import fmj.characters.FightingCharacter
import fmj.characters.health

/**
 * 03恢复型
 * @author Chen
 */
class MagicRestore : BaseMagic() {

    private var mHp: Int = 0 //  0~8000，表示被施展者恢复生命的数值。
    private var mBuff: Int = 0 // 低四位，毒、乱、封、眠 是否具有医疗相应异常状态的能力

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mHp = Companion.get2BytesInt(buf, offset + 0x12)
        mBuff = buf[offset + 0x18].toInt()
    }

    override fun use(src: FightingCharacter, dst: FightingCharacter) {
        if (src.mp < costMp) return

        src.mp = src.mp - costMp

        dst.hp = dst.hp + mHp
        if (dst.hp > dst.maxHP) {
            dst.hp = dst.maxHP
        }
        health(mBuff, dst.debuff)
    }
}
