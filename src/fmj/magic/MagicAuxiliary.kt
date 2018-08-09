package fmj.magic

import fmj.characters.FightingCharacter
import kotlin.math.min

/**
 * 04辅助型
 * @author Chen
 */
class MagicAuxiliary : BaseMagic() {

    private var mHp: Int = 0//0~100，表示被施展者恢复生命的百分比（起死回生）

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mHp = get2BytesInt(buf, offset + 0x12)
    }

    override fun use(src: FightingCharacter, dst: FightingCharacter) {
        dst.hp = min(dst.maxHP, dst.hp + dst.maxMP * mHp / 100)
    }
}
