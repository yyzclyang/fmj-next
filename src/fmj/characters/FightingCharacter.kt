package fmj.characters

import fmj.magic.ResMagicChain

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
            var maxHP = maxHP
            if (maxHP > 999) {
                maxHP = 999
            }
            field = maxHP
        }

    var maxMP: Int = 0
        set(maxMP) {
            var maxMP = maxMP
            if (maxMP > 999) {
                maxMP = 999
            }
            field = maxMP
        }

    var hp: Int = 0
        set(hp) {
            var hp = hp
            if (hp > maxHP) {
                hp = maxHP
            }
            field = hp
        }

    val isAlive: Boolean
        get() = hp > 0

    var isVisiable = true

    var mp: Int = 0
        set(mp) {
            var mp = mp
            if (mp > maxMP) {
                mp = maxMP
            }
            field = mp
        }

    var attack: Int = 0
        set(at) {
            var at = at
            if (at > 999) {
                at = 999
            }
            field = at
        } // 攻击

    var defend: Int = 0
        set(d) {
            var d = d
            if (d > 999) {
                d = 999
            }
            field = d
        } // 防御

    var speed: Int = 0
        set(s) {
            var s = s
            if (s > 99) {
                s = 99
            }
            field = s
        } // 身法

    var lingli: Int = 0
        set(l) {
            var l = l
            if (l > 99) {
                l = 99
            }
            field = l
        } // 灵力

    var luck: Int = 0
        set(l) {
            var l = l
            if (l > 99) {
                l = 99
            }
            field = l
        } // 幸运

    /** 免疫毒乱封眠，不同装备可能具有相同的免疫效果，叠加之 */
    protected var mBuff = IntArray(4)
    protected var mBuffRound = IntArray(4)
    /** 身中毒乱封眠 */
    protected var mDebuff: Int = 0
    protected var mDebuffRound = IntArray(4)
    /** 普通攻击产生(全体)毒乱封眠，对于主角，只有武器具有该效果 */
    protected var mAtbuff: Int = 0
    protected var mAtbuffRound = IntArray(4)

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
        if (mask and BUFF_MASK_DU == BUFF_MASK_DU && mBuff[0] <= 0) {
            return false
        }
        if (mask and BUFF_MASK_LUAN == BUFF_MASK_LUAN && mBuff[1] <= 0) {
            return false
        }
        if (mask and BUFF_MASK_FENG == BUFF_MASK_FENG && mBuff[2] <= 0) {
            return false
        }
        if (mask and BUFF_MASK_MIAN == BUFF_MASK_MIAN && mBuff[3] <= 0) {
            return false
        }
        if (mask and BUFF_MASK_ALL == BUFF_MASK_ALL && mBuff[4] <= 0) {
            return false
        }
        return true
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
        return mDebuff and mask != 0
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
        return mAtbuff and mask == mask
    }

    /**
     * 增加角色能够免疫的状态
     * @see {@link .hasBuff
     * @param mask
     * @param rounds
     */
    fun addBuff(mask: Int, rounds: Int = Int.MAX_VALUE) {
        if (mask and BUFF_MASK_DU == BUFF_MASK_DU) {
            ++mBuff[0]
            mBuffRound[0] = rounds
        }
        if (mask and BUFF_MASK_LUAN == BUFF_MASK_LUAN) {
            ++mBuff[1]
            mBuffRound[1] = rounds
        }
        if (mask and BUFF_MASK_FENG == BUFF_MASK_FENG) {
            ++mBuff[2]
            mBuffRound[2] = rounds
        }
        if (mask and BUFF_MASK_MIAN == BUFF_MASK_MIAN) {
            ++mBuff[3]
            mBuffRound[3] = rounds
        }
    }

    fun delBuff(mask: Int) {
        if (mask and BUFF_MASK_DU == BUFF_MASK_DU) {
            if (--mBuff[0] < 0) {
                mBuff[0] = 0
            }
        }
        if (mask and BUFF_MASK_LUAN == BUFF_MASK_LUAN) {
            if (--mBuff[1] < 0) {
                mBuff[1] = 0
            }
        }
        if (mask and BUFF_MASK_FENG == BUFF_MASK_FENG) {
            if (--mBuff[2] < 0) {
                mBuff[2] = 0
            }
        }
        if (mask and BUFF_MASK_MIAN == BUFF_MASK_MIAN) {
            if (--mBuff[3] < 0) {
                mBuff[3] = 0
            }
        }
    }

    fun getBuffRound(mask: Int): Int {
        if (mask and BUFF_MASK_DU == BUFF_MASK_DU) {
            return mBuffRound[0]
        }
        if (mask and BUFF_MASK_LUAN == BUFF_MASK_LUAN) {
            return mBuffRound[1]
        }
        if (mask and BUFF_MASK_FENG == BUFF_MASK_FENG) {
            return mBuffRound[2]
        }
        return if (mask and BUFF_MASK_MIAN == BUFF_MASK_MIAN) {
            mBuffRound[3]
        } else 0
    }

    /**
     * 增加角色身中的异常状态
     * @see {@link .hasDebuff
     * @param mask
     */
    fun addDebuff(mask: Int, rounds: Int) {
        mDebuff = mDebuff or mask
        if (mask and BUFF_MASK_DU == BUFF_MASK_DU) {
            mDebuffRound[0] = rounds
        }
        if (mask and BUFF_MASK_LUAN == BUFF_MASK_LUAN) {
            mDebuffRound[1] = rounds
        }
        if (mask and BUFF_MASK_FENG == BUFF_MASK_FENG) {
            mDebuffRound[2] = rounds
        }
        if (mask and BUFF_MASK_MIAN == BUFF_MASK_MIAN) {
            mDebuffRound[3] = rounds
        }
    }

    fun delDebuff(mask: Int) {
        mDebuff = mDebuff and mask.inv()
    }

    /**
     * 增加角色攻击能够产生的异常状态
     * @see {@link .hasAtbuff
     * @param mask
     */
    fun addAtbuff(mask: Int, rounds: Int) {
        mAtbuff = mAtbuff or mask
        if (mask and BUFF_MASK_DU == BUFF_MASK_DU) {
            mAtbuffRound[0] = rounds
        }
        if (mask and BUFF_MASK_LUAN == BUFF_MASK_LUAN) {
            mAtbuffRound[1] = rounds
        }
        if (mask and BUFF_MASK_FENG == BUFF_MASK_FENG) {
            mAtbuffRound[2] = rounds
        }
        if (mask and BUFF_MASK_MIAN == BUFF_MASK_MIAN) {
            mAtbuffRound[3] = rounds
        }
    }

    fun delAtbuff(mask: Int) {
        mAtbuff = mAtbuff and mask.inv()
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
    }

}
/**
 * 增加角色能够免疫的状态
 * @see {@link .hasBuff
 * @param mask
 */
