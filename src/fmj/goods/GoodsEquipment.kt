package fmj.goods

import fmj.characters.FightingCharacter
import fmj.characters.Player
import fmj.script.ScriptResources

/**
 * 01冠类，02衣类，03鞋类，04护甲类，05护腕类
 */
open class GoodsEquipment : BaseGoods() {

    protected var mMpMax: Int = 0 // 加真气上限
    protected var mHpMax: Int = 0 // 加生命上限
    protected var mdf: Int = 0 // 防御
    protected var mat: Int = 0 // 攻击
    protected var mlingli: Int = 0 // 灵力
    protected var mSpeed: Int = 0 // 身法
    protected var mBitEffect: Int = 0 // 0、0、0、0（07武器类此处为全体效果）、毒、乱、封、眠（影响免疫效果，07武器类为攻击效果）
    protected var mLuck: Int = 0 // 吉运

    override fun setOtherData(buf: ByteArray, offset: Int) {
        mMpMax = get1ByteSInt(buf, offset + 0x16)
        mHpMax = get1ByteSInt(buf, offset + 0x17)
        mdf = get1ByteSInt(buf, offset + 0x18)
        mat = buf[offset + 0x19].toInt() and 0xff
        mlingli = get1ByteSInt(buf, offset + 0x1a)
        mSpeed = get1ByteSInt(buf, offset + 0x1b)
        mBitEffect = buf[offset + 0x1c].toInt() and 0xff
        mLuck = get1ByteSInt(buf, offset + 0x1d)
    }

    open fun putOn(p: Player) {
        if (canPlayerUse(p.index)) {
            p.maxMP = p.maxMP + mMpMax
            p.maxHP = p.maxHP + mHpMax
            p.defend = p.defend + mdf
            p.attack = p.attack + mat
            p.lingli = p.lingli + mlingli
            p.speed = p.speed + mSpeed
            if (this !is GoodsWeapon) {
                p.addBuff(mBitEffect) // 添加免疫效果
            }
            p.luck = p.luck + mLuck
            if (eventId != 0) {
                // 设置装备触发的事件
                ScriptResources.setEvent(eventId)
            }
        }
    }

    open fun takeOff(p: Player) {
        p.maxMP = p.maxMP - mMpMax
        p.maxHP = p.maxHP - mHpMax
        p.defend = p.defend - mdf
        p.attack = p.attack - mat
        p.lingli = p.lingli - mlingli
        p.speed = p.speed - mSpeed
        if (this !is GoodsWeapon) {
            p.delBuff(mBitEffect) // 删掉免疫效果
        }
        p.luck = p.luck - mLuck
        if (eventId != 0) {
            // 取消该事件
            ScriptResources.clearEvent(eventId)
        }
    }

    open fun affect(fighter: FightingCharacter) { }
}
