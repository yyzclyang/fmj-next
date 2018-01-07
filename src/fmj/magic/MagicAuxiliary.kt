package fmj.magic

/**
 * 04辅助型
 * @author Chen
 */
class MagicAuxiliary : BaseMagic() {

    private var mHp: Int = 0//0~100，表示被施展者恢复生命的百分比（起死回生）

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mHp = Companion.get2BytesInt(buf, offset + 0x12)
    }
}
