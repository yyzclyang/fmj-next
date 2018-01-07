package fmj.combat.anim

import fmj.characters.FightingCharacter
import fmj.graphics.Util
import fmj.lib.DatLib
import fmj.lib.ResSrs

import graphics.Bitmap
import graphics.Canvas

class RaiseAnimation(private val x: Int, private val y: Int, hitpoint: Int, buff: Int) {

    private var dy = 0
    private var dt = 0

    private val raiseNum: Bitmap = Util.getSmallSignedNumBitmap(hitpoint)

    private val srsList: MutableList<ResSrs>

    private var bShowNum: Boolean = false

    private var cnt: Long = 0

    init {
        this.bShowNum = hitpoint != 0
        srsList = mutableListOf()
        if (buff and FightingCharacter.BUFF_MASK_DU == FightingCharacter.BUFF_MASK_DU) {
            srsList.add(DatLib.GetRes(DatLib.ResType.SRS, 1, 243) as ResSrs)
            srsList.last().startAni()
        }
        if (buff and FightingCharacter.BUFF_MASK_LUAN == FightingCharacter.BUFF_MASK_LUAN) {
            srsList.add(DatLib.GetRes(DatLib.ResType.SRS, 1, 244) as ResSrs)
            srsList.last().startAni()
        }
        if (buff and FightingCharacter.BUFF_MASK_FENG == FightingCharacter.BUFF_MASK_FENG) {
            srsList.add(DatLib.GetRes(DatLib.ResType.SRS, 1, 245) as ResSrs)
            srsList.last().startAni()
        }
        if (buff and FightingCharacter.BUFF_MASK_MIAN == FightingCharacter.BUFF_MASK_MIAN) {
            srsList.add(DatLib.GetRes(DatLib.ResType.SRS, 1, 246) as ResSrs)
            srsList.last().startAni()
        }
        if (buff and FightingCharacter.BUFF_MASK_GONG == FightingCharacter.BUFF_MASK_GONG) {
            srsList.add(DatLib.GetRes(DatLib.ResType.SRS, 1, 240) as ResSrs)
            srsList.last().startAni()
        }
        if (buff and FightingCharacter.BUFF_MASK_FANG == FightingCharacter.BUFF_MASK_FANG) {
            srsList.add(DatLib.GetRes(DatLib.ResType.SRS, 1, 241) as ResSrs)
            srsList.last().startAni()
        }
        if (buff and FightingCharacter.BUFF_MASK_SU == FightingCharacter.BUFF_MASK_SU) {
            srsList.add(DatLib.GetRes(DatLib.ResType.SRS, 1, 242) as ResSrs)
            srsList.last().startAni()
        }
    }

    fun update(delta: Long): Boolean {
        if (bShowNum) {
            cnt += delta
            if (cnt > 50) {
                cnt = 0
                ++dt
                dy -= dt
                if (dt > 4) {
                    bShowNum = false
                }
            }
        } else {
            if (srsList.isEmpty()) {
                return false
            } else {
                if (!srsList.first().update(delta)) {
                    srsList.removeAt(0)
                    return !srsList.isEmpty()
                }
            }
        }
        return true
    }

    fun draw(canvas: Canvas) {
        if (bShowNum) {
            canvas.drawBitmap(raiseNum, x, y + dy, null)
        } else {
            if (srsList.size > 0) {
                srsList.first().drawAbsolutely(canvas, x, y)
            }
        }
    }

}
