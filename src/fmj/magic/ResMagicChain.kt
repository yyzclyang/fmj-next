package fmj.magic

import fmj.lib.DatLib
import fmj.lib.ResBase

/**
 * 魔法链资源
 * @author Chen
 */
class ResMagicChain : ResBase() {

    /**
     * 得到魔法总数
     * @return
     */
    var magicSum: Int = 0
        private set // 魔法数量

    private var mMagics: Array<BaseMagic>? = null

    /**
     * 返回已经学会的魔法数量
     * @return
     */
    var learnNum = 0 // 学会的魔法数量

    override fun setData(buf: ByteArray, offset: Int) {
        type = buf[offset].toInt() and 0xff
        index = buf[offset + 1].toInt() and 0xff
        magicSum = buf[offset + 2].toInt() and 0xff

        var index = offset + 3
        mMagics = Array(magicSum) {
            DatLib.getRes(DatLib.ResType.MRS,
                    buf[index++].toInt(), buf[index++].toInt()) as BaseMagic
        }
    }

    /**
     * 学会魔法数量加一
     */
    fun learnNextMagic() {
        ++learnNum
    }

    fun getMagic(index: Int): BaseMagic { // TODO fix null
        return mMagics!![index]
    }
}
