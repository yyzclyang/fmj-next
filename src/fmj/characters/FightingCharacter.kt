package fmj.characters

import fmj.magic.BaseMagic
import fmj.magic.ResMagicChain
import java.Coder
import java.ObjectInput
import java.ObjectOutput
import kotlin.coroutines.experimental.buildSequence
import kotlin.math.max
import kotlin.math.min

class Buff(var value: Int, var round: Int) {
    fun reset() {
        if (round > 0) {
            round = 0
            value -= 1
        }
    }
}

class BuffMan: Coder
{
    val buffs = Array(8) { Buff(0, 0) }

    override fun encode(out: ObjectOutput) {
        out.writeIntArray(buffs.map { it.value }.toIntArray())
        out.writeIntArray(buffs.map { it.round }.toIntArray())
    }

    override fun decode(coder: ObjectInput) {
        val values = coder.readIntArray()
        val rounds = coder.readIntArray()
        values.zip(rounds).forEachIndexed { index, pair ->
            buffs[index].value = pair.first
            buffs[index].round = pair.second
        }
    }

    fun getBuffs(mask: Int): Sequence<Buff> {
        return FightingCharacter.maskToIndexes(mask).map { buffs[it] }
    }

    fun hasBuff(mask: Int): Boolean {
        return getBuffs(mask).first().value > 0
    }

    fun addBuff(mask: Int, round: Int) {
        getBuffs(mask).forEach {
            if (round == 0) {
                it.value += 1
            } else {
                if (it.round == 0) {
                    it.value += 1
                }
                it.round = max(round, it.round)
            }
        }
    }

    fun delBuff(mask: Int) {
        getBuffs(mask).forEach {
            if (it.value > 0)
                it.value -= 1
        }
    }

    fun reset() {
        buffs.forEach { it.reset() }
    }
}

abstract class FightingCharacter : Character() {

    /**
     * 人物战斗图
     */
    var fightingSprite: FightingSprite? = null

    /**中心坐标 */
    val combatX: Int
        get() = fightingSprite!!.combatX

    /**中心坐标 */
    val combatY: Int
        get() = fightingSprite!!.combatY

    val combatLeft: Int
        get() = fightingSprite!!.combatX - fightingSprite!!.width / 2

    val combatTop: Int
        get() = fightingSprite!!.combatY - fightingSprite!!.height / 2

    /**
     * 魔法链
     */
    var magicChain: ResMagicChain? = null

    /**
     * 等级
     */
    var level: Int = 0

    var maxHP: Int = 0
        set(maxHP) {
            field = min(999, maxHP)
        }

    var maxMP: Int = 0
        set(maxMP) {
            field = min(999, maxMP)
        }

    var hp: Int = 0
        set(hp) {
            field = min(maxHP, hp)
        }

    val isAlive: Boolean
        get() = hp > 0

    var isVisiable = true

    var mp: Int = 0
        set(mp) {
            field = min(maxMP, mp)
        }

    var attack: Int = 0
        set(at) {
            field = min(999, at)
        } // 攻击

    var defend: Int = 0
        set(d) {
            field = min(999, d)
        } // 防御

    var speed: Int = 0
        set(s) {
            field = min(99, s)
        } // 身法

    var lingli: Int = 0
        set(l) {
            field = min(99, l)
        } // 灵力

    var luck: Int = 0
        set(l) {
            field = min(99, l)
        } // 幸运

    /** 免疫毒乱封眠，不同装备可能具有相同的免疫效果，叠加之 */
    private var buff = BuffMan()
    /** 身中毒乱封眠 */
    private var debuff = BuffMan()
    /** 普通攻击产生(全体)毒乱封眠，对于主角，只有武器具有该效果 */
    protected var atbuff = BuffMan()

    /** 设置中心坐标 */
    fun setCombatPos(x: Int, y: Int) {
        fightingSprite!!.setCombatPos(x, y)
    }

    /**
     * 是否免疫异常状态
     * @param mask 只能为下面几个值，或者他们的位或
     *
     *
     * `BUFF_MASK_DU`，
     * `BUFF_MASK_LUAN`，
     * `BUFF_MASK_FENG`，
     * `BUFF_MASK_MIAN`，
     * @return 是否免疫mask状态
     */
    fun hasBuff(mask: Int): Boolean {
        return buff.hasBuff(mask)
    }

    /**
     * 是否身中异常状态
     * @param mask 只能为下面几个值，或者他们的位或中的任意一个
     *
     *
     * `BUFF_MASK_DU`，
     * `BUFF_MASK_LUAN`，
     * `BUFF_MASK_FENG`，
     * `BUFF_MASK_MIAN`，
     * @return 是否身中mask状态
     */
    fun hasDebuff(mask: Int): Boolean {
        return debuff.hasBuff(mask)
    }

    /**
     * 攻击是否能够产生异常状态
     * @param mask 只能为下面几个值，或者他们的位或中的任意一个
     *
     *
     * `BUFF_MASK_DU`，
     * `BUFF_MASK_LUAN`，
     * `BUFF_MASK_FENG`，
     * `BUFF_MASK_MIAN`，
     * @return 物理攻击是否具有mask效果
     */
    fun hasAtbuff(mask: Int): Boolean {
        return atbuff.hasBuff(mask)
    }

    /**
     * 增加角色能够免疫的状态
     * @see {@link .hasBuff
     * @param mask
     * @param rounds
     */
    fun addBuff(mask: Int, rounds: Int = 0) {
        buff.addBuff(mask, rounds)
    }

    fun delBuff(mask: Int) {
        buff.delBuff(mask)
    }

    fun getBuffRound(mask: Int): Int {
        return buff.getBuffs(mask).first().round
    }

    /**
     * 增加角色身中的异常状态
     * @see {@link .hasDebuff
     * @param mask
     */
    fun addDebuff(mask: Int, rounds: Int) {
        debuff.addBuff(mask, rounds)
    }

    fun delDebuff(mask: Int) {
        debuff.delBuff(mask)
    }

    /**
     * 增加角色攻击能够产生的异常状态
     * @see {@link .hasAtbuff
     * @param mask
     */
    fun addAtbuff(mask: Int, rounds: Int) {
        atbuff.addBuff(mask, rounds)
    }

    fun delAtbuff(mask: Int) {
        atbuff.delBuff(mask)
    }

    open fun getAllMagics(): Collection<BaseMagic> {
        return magicChain?.getAllLearntMagics() ?: listOf()
    }

    companion object {

        val BUFF_MASK_ALL = 16
        val BUFF_MASK_DU = 8
        val BUFF_MASK_LUAN = 4
        val BUFF_MASK_FENG = 2
        val BUFF_MASK_MIAN = 1

        val BUFF_MASK_GONG = 32
        val BUFF_MASK_FANG = 64
        val BUFF_MASK_SU = 128

        fun isMaskSet(mask: Int, b: Int): Boolean
        {
            return mask and b != 0
        }

        fun maskToIndex(mask: Int): Int
        {
            return maskToIndexes(mask).first()
        }

        fun maskToIndexes(mask: Int): Sequence<Int>
        {
            return buildSequence {
                if (isMaskSet(mask, BUFF_MASK_MIAN)) yield(0)
                if (isMaskSet(mask, BUFF_MASK_FENG)) yield(1)
                if (isMaskSet(mask, BUFF_MASK_LUAN)) yield(2)
                if (isMaskSet(mask, BUFF_MASK_DU)) yield(3)
                if (isMaskSet(mask, BUFF_MASK_ALL)) yield(4)
                if (isMaskSet(mask, BUFF_MASK_GONG)) yield(5)
                if (isMaskSet(mask, BUFF_MASK_FANG)) yield(6)
                if (isMaskSet(mask, BUFF_MASK_SU)) yield(7)
            }
        }
    }

}
