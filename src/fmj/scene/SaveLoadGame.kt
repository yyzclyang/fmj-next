package fmj.scene

import fmj.characters.NPC
import fmj.characters.Player
import fmj.combat.Combat
import java.ObjectInput
import java.ObjectOutput

object SaveLoadGame {

    /**
     * 是否开始新游戏
     */
    var startNewGame = true

    /**
     * 当前地图编号
     */
    var MapType = 1
    var MapIndex = 1

    /**
     * 屏幕左上角在地图中的位置
     */
    var MapScreenX = 1
    var MapScreenY = 1

    /**
     * 当前脚本编号
     */
    var ScriptType = 1
    var ScriptIndex = 1

    /**
     * 场景名称
     */
    var SceneName = ""

    var NpcObjs: Array<NPC> = arrayOf()

    fun write(out: ObjectOutput) {
        out.writeString(SceneName)
        val actorNum = ScreenMainGame.sPlayerList.size
        out.writeInt(actorNum)
        for (i in 0 until actorNum) {
            out.writeInt(ScreenMainGame.sPlayerList[i].index)
        }
        out.writeInt(MapType)
        out.writeInt(MapIndex)
        out.writeInt(MapScreenX)
        out.writeInt(MapScreenY)
        out.writeInt(ScriptType)
        out.writeInt(ScriptIndex)

        out.writeInt(ScreenMainGame.sPlayerList.size)
        for (i in 0 until ScreenMainGame.sPlayerList.size) {
            ScreenMainGame.sPlayerList[i].writeExternal(out)
        }
        out.writeInt(Player.sMoney)
        Player.sGoodsList.write(out)

        out.writeArray(NpcObjs)

        Combat.write(out)
    }

    fun read(coder: ObjectInput) {
        SceneName = coder.readString()
        var actorNum = coder.readInt()
        while (actorNum-- > 0) coder.readInt()
        MapType = coder.readInt()
        MapIndex = coder.readInt()
        MapScreenX = coder.readInt()
        MapScreenY = coder.readInt()
        ScriptType = coder.readInt()
        ScriptIndex = coder.readInt()

        val size = coder.readInt()
        ScreenMainGame.sPlayerList.clear()
        for (i in 0 until size) {
            //TODO TODO TODO
//            val p = coder.readObject() as Player
//            ScreenMainGame.sPlayerList.add(p)
        }
        Player.sMoney = coder.readInt()
        Player.sGoodsList.read(coder)

        //TODO TODO TODO
        NpcObjs = coder.readArray()

        Combat.read(coder)
    }
}
