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
    private var magicSum: Int = 0

    private var mMagics: List<BaseMagic> = listOf()

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
        mMagics = List(magicSum) {
            DatLib.getRes(DatLib.ResType.MRS,
                    buf[index++].toInt(), buf[index++].toInt()) as BaseMagic
        }
    }

    fun getMagic(index: Int): BaseMagic {
        return mMagics[index]
    }

    fun getAllLearntMagics(): Collection<BaseMagic> {
        return mMagics.slice(0 until learnNum)
    }
}
