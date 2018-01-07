package fmj.magic

/**
 * 02增强型
 * @author Chen
 */
class MagicEnhance : BaseMagic() {

    private var mDf: Int = 0//0~100，被施展者的防御力增强的百分比
    private var mAt: Int = 0//0~100，被施展者的攻击力增强的百分比
    private var mRound: Int = 0//持续回合
    private var mBuff: Int = 0//速 0~100，被施展者的身法加快的百分比

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mDf = buf[offset + 0x16].toInt() and 0xff
        mAt = buf[offset + 0x17].toInt() and 0xff
        mRound = (buf[offset + 0x18].toInt() shr 4) and 0xf
        mBuff = buf[offset + 0x19].toInt() and 0xff
    }

}
