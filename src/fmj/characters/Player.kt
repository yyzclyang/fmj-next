package fmj.characters

import fmj.goods.GoodsEquipment
import fmj.goods.GoodsManage
import fmj.graphics.TextRender
import fmj.graphics.Util
import fmj.lib.DatLib
import fmj.lib.ResImage
import fmj.magic.ResMagicChain

import graphics.Canvas

import java.Coder
import java.ObjectInput
import java.ObjectOutput
import kotlin.math.min


class Player : FightingCharacter(), Coder {

    private var mImgHead: ResImage? = null

    lateinit var levelupChain: ResLevelupChain
        private set

    var currentExp: Int = 0 // 当前经验值

    /**
     * 0装饰 1装饰 2护腕 3脚蹬 4手持 5身穿 6肩披 7头戴
     */
    val equipmentsArray = arrayOfNulls<GoodsEquipment>(8)

    fun drawHead(canvas: Canvas, x: Int, y: Int) {
        if (mImgHead != null) {
            mImgHead!!.draw(canvas, 1, x, y)
        }
    }

    fun setFrameByState() {
        if (isAlive) {
            if (hasDebuff(FightingCharacter.Companion.BUFF_MASK_MIAN) || hp < maxHP / 10) {
                fightingSprite!!.currentFrame = 11
            } else {
                fightingSprite!!.currentFrame = 1
            }
        } else {
            fightingSprite!!.currentFrame = 12
        }
    }

    override fun setData(buf: ByteArray, offset: Int) {
        type = buf[offset].toInt() and 0xFF
        index = buf[offset + 1].toInt() and 0xFF
        if (index > 0)
            mImgHead = DatLib.getRes(DatLib.ResType.PIC, 1, index) as ResImage?
        setWalkingSprite(WalkingSprite(type, buf[offset + 0x16].toInt() and 0xFF))
        fightingSprite = FightingSprite(DatLib.ResType.PIC, index)
        direction = Direction.fromInt(buf[offset + 2].toInt() and 0xFF)
        step = buf[offset + 3].toInt() and 0xff
        setPosInMap(buf[offset + 5].toInt() and 0xFF, buf[offset + 6].toInt() and 0xFF)
        magicChain = DatLib.getRes(DatLib.ResType.MLR, 1, buf[offset + 0x17].toInt() and 0xff) as ResMagicChain
        magicChain.learnNum = buf[offset + 9].toInt() and 0xff
        name = getString(buf, offset + 0x0a)
        level = buf[offset + 0x20].toInt() and 0xff
        maxHP = get2BytesInt(buf, offset + 0x26)
        hp = get2BytesInt(buf, offset + 0x28)
        maxMP = get2BytesInt(buf, offset + 0x2a)
        mp = get2BytesInt(buf, offset + 0x2c)
        attack = get2BytesInt(buf, offset + 0x2e)
        defend = get2BytesInt(buf, offset + 0x30)
        speed = buf[offset + 0x36].toInt() and 0xff
        lingli = buf[offset + 0x37].toInt() and 0xff
        luck = buf[offset + 0x38].toInt() and 0xff
        currentExp = get2BytesInt(buf, offset + 0x32)
        levelupChain = DatLib.getRes(DatLib.ResType.MLR, 2, index) as ResLevelupChain

        var tmp = buf[offset + 0x1e].toInt() and 0xff

        if (tmp != 0) {
            equipmentsArray[0] = DatLib.getRes(DatLib.ResType.GRS, 6, tmp) as GoodsEquipment?
        }

        tmp = buf[offset + 0x1f].toInt() and 0xff
        if (tmp != 0) {
            equipmentsArray[1] = DatLib.getRes(DatLib.ResType.GRS, 6, tmp) as GoodsEquipment?
        }

        tmp = buf[offset + 0x1b].toInt() and 0xff
        if (tmp != 0) {
            equipmentsArray[2] = DatLib.getRes(DatLib.ResType.GRS, 5, tmp) as GoodsEquipment?
        }

        tmp = buf[offset + 0x1d].toInt() and 0xff
        if (tmp != 0) {
            equipmentsArray[3] = DatLib.getRes(DatLib.ResType.GRS, 3, tmp) as GoodsEquipment?
        }

        tmp = buf[offset + 0x1c].toInt() and 0xff
        if (tmp != 0) {
            equipmentsArray[4] = DatLib.getRes(DatLib.ResType.GRS, 7, tmp) as GoodsEquipment?
        }

        tmp = buf[offset + 0x19].toInt() and 0xff
        if (tmp != 0) {
            equipmentsArray[5] = DatLib.getRes(DatLib.ResType.GRS, 2, tmp) as GoodsEquipment?
        }

        tmp = buf[offset + 0x1a].toInt() and 0xff
        if (tmp != 0) {
            equipmentsArray[6] = DatLib.getRes(DatLib.ResType.GRS, 4, tmp) as GoodsEquipment?
        }

        tmp = buf[offset + 0x18].toInt() and 0xff
        if (tmp != 0) {
            equipmentsArray[7] = DatLib.getRes(DatLib.ResType.GRS, 1, tmp) as GoodsEquipment?
        }

    }

    fun getCurrentEquipment(type: Int): GoodsEquipment? {
        for (i in 0..7) {
            if (sEquipTypes[i] == type) {
                return equipmentsArray[i]
            }
        }
        return null
    }

    /**
     * 是否已经装备该装备，对装饰检测空位
     * @param type
     * @param id
     * @return
     */
    fun hasEquipt(type: Int, id: Int): Boolean {
        if (type == 6) {
            // 两个位置都装备同一件装备才返回真
            return arrayOf(equipmentsArray[0], equipmentsArray[1]).all {
                return it?.let {
                    it.type == type && it.index == id
                } ?: false
            }
        }

        for (i in 2..7) {
            equipmentsArray[i]?.let {
                if (it.type == type && it.index == id) {
                    return true
                }
            }
        }
        return false
    }

    /**
     * 穿上goods装备
     * @param goods
     */
    fun putOn(goods: GoodsEquipment) {
        for (i in 0..7) {
            if (goods.type == sEquipTypes[i]) {
                if (equipmentsArray[i] == null) { // 适用2个装饰
                    goods.putOn(this)
                    equipmentsArray[i] = goods
                    break
                }
            }
        }
    }

    /**
     * 脱下类型号为type的装备
     * @param type
     */
    fun takeOff(type: Int) {
        for (i in 0..7) {
            if (type == sEquipTypes[i]) {
                if (equipmentsArray[i] != null) {
                    equipmentsArray[i]?.takeOff(this)
                    equipmentsArray[i] = null
                    break
                }
            }
        }
    }

    /**
     * type型装备位置是否已经有装备
     * @param type 装备类型号 [GoodsEquipment.getType]
     * @return 是否有空
     */
    fun hasSpace(type: Int): Boolean {
        if (type == 6) { // 饰品
            return equipmentsArray[0] == null || equipmentsArray[1] == null
        } else {
            for (i in 0..7) {
                if (sEquipTypes[i] == type && equipmentsArray[i] == null) {
                    return true
                }
            }
        }
        return false
    }

    fun drawState(canvas: Canvas, page: Int) {
        canvas.drawLine(37, 10, 37, 87, Util.sBlackPaint)
        if (page == 0) {
            TextRender.drawText(canvas, "等级   $level", 41, 4)
            TextRender.drawText(canvas, "生命   $hp/$maxHP", 41, 23)
            TextRender.drawText(canvas, "真气   $mp/$maxMP", 41, 41)
            TextRender.drawText(canvas, "攻击力 $attack", 41, 59)
            TextRender.drawText(canvas, "防御力 $defend", 41, 77)
        } else if (page == 1) {
            TextRender.drawText(canvas, "经验值", 41, 4)
            val w = Util.drawSmallNum(canvas, currentExp, 97, 4)
            TextRender.drawText(canvas, "/", 97 + w + 2, 4)
            Util.drawSmallNum(canvas, levelupChain.getNextLevelExp(level), 97 + w + 9, 10)
            TextRender.drawText(canvas, "身法   $speed", 41, 23)
            TextRender.drawText(canvas, "灵力   $lingli", 41, 41)
            TextRender.drawText(canvas, "幸运   $luck", 41, 59)
            val sb = StringBuilder("免疫   ")
            val tmp = StringBuilder()
            if (hasBuff(FightingCharacter.Companion.BUFF_MASK_DU)) {
                tmp.append('毒')
            }
            if (hasBuff(FightingCharacter.Companion.BUFF_MASK_LUAN)) {
                tmp.append('乱')
            }
            if (hasBuff(FightingCharacter.Companion.BUFF_MASK_FENG)) {
                tmp.append('封')
            }
            if (hasBuff(FightingCharacter.Companion.BUFF_MASK_MIAN)) {
                tmp.append('眠')
            }
            if (tmp.isNotEmpty()) {
                sb.append(tmp)
            } else {
                sb.append('无')
            }
            TextRender.drawText(canvas, sb.toString(), 41, 77)
        }
    }

    override fun decode(coder: ObjectInput) {
        type = coder.readInt()
        index = coder.readInt()
        if (index > 0)
            mImgHead = DatLib.getRes(DatLib.ResType.PIC, 1, index) as ResImage?
        levelupChain = DatLib.getRes(DatLib.ResType.MLR, 2, index) as ResLevelupChain
        setWalkingSprite(WalkingSprite(type, coder.readInt()))
        fightingSprite = FightingSprite(DatLib.ResType.PIC, index)
        direction = Direction.fromInt(coder.readInt())
        step = coder.readInt()
        setPosInMap(coder.readInt(), coder.readInt())
        magicChain = DatLib.getRes(DatLib.ResType.MLR, 1, coder.readInt()) as ResMagicChain
        magicChain.learnNum = coder.readInt()
        name = coder.readString()
        level = coder.readInt()
        maxHP = coder.readInt()
        hp = coder.readInt()
        maxMP = coder.readInt()
        mp = coder.readInt()
        attack = coder.readInt()
        defend = coder.readInt()
        speed = coder.readInt()
        lingli = coder.readInt()
        luck = coder.readInt()
        currentExp = coder.readInt()
        for (i in 0..7) {
            val type = coder.readInt()
            val index = coder.readInt()
            if (type != 0 && index != 0) {
                equipmentsArray[i] = DatLib.getRes(DatLib.ResType.GRS, type, index) as GoodsEquipment?
            }
        }
    }

    override fun encode(out: ObjectOutput) {
        out.writeInt(type)
        out.writeInt(index)
        out.writeInt(walkingSpriteId)
        out.writeInt(direction.v)
        out.writeInt(step)
        out.writeInt(posInMap.x)
        out.writeInt(posInMap.y)
        out.writeInt(magicChain.index)
        out.writeInt(magicChain.learnNum)
        out.writeString(name)
        out.writeInt(level)
        out.writeInt(maxHP)
        out.writeInt(hp)
        out.writeInt(maxMP)
        out.writeInt(mp)
        out.writeInt(attack)
        out.writeInt(defend)
        out.writeInt(speed)
        out.writeInt(lingli)
        out.writeInt(luck)
        out.writeInt(currentExp)
        for (i in 0..7) {
            equipmentsArray[i]?.let {
                out.writeInt(it.type)
                out.writeInt(it.index)
            } ?: run {
                out.writeInt(0)
                out.writeInt(0)
            }
        }
    }

    fun setLevel(level: Int) {
        this.level = min(level, levelupChain.maxLevel)
    }

    companion object {
        /** 装备界面从左至右的装备类型号 */
        val sEquipTypes = intArrayOf(6, 6, 5, 3, 7, 2, 4, 1)

        var sGoodsList = GoodsManage()

        var sMoney = 0
    }

}
