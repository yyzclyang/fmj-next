package fmj.scene

import fmj.characters.NPC
import fmj.characters.Player
import fmj.characters.SceneObj
import fmj.combat.Combat
import fmj.script.ScriptProcess
import fmj.views.Game
import java.ObjectInput
import java.ObjectOutput
import java.readArray
import java.writeArray

object SaveLoadGame {
    const val magicNum = 0x67736176
    const val version = 1

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
    var scriptProcess: ScriptProcess? = null

    fun write(game: Game, out: ObjectOutput) {
        out.writeString(SceneName)
        val actorNum = game.playerList.size
        out.writeInt(actorNum)
        for (i in 0 until actorNum) {
            out.writeInt(game.playerList[i].index)
        }
        out.writeInt(magicNum)
        out.writeInt(version)
        out.writeInt(MapType)
        out.writeInt(MapIndex)
        out.writeInt(MapScreenX)
        out.writeInt(MapScreenY)
        out.writeInt(ScriptType)
        out.writeInt(ScriptIndex)
        game.mainScene.scriptProcess.encode(out)

        out.writeInt(game.playerList.size)
        for (i in 0 until game.playerList.size) {
            game.playerList[i].encode(out)
        }
        out.writeInt(Player.sMoney)
        Player.sGoodsList.write(out)
        writeArray(out, NpcObjs) {
            io, obj ->

            if (obj.isEmpty) {
                io.writeByte(0)
            } else {
                if(obj is SceneObj) {
                    io.writeByte(2)
                } else {
                    io.writeByte(1)
                }
                obj.encode(io)
            }
        }
        Combat.write(out)
    }

    fun read(game: Game, coder: ObjectInput) {
        SceneName = coder.readString()
        var actorNum = coder.readInt()
        while (actorNum-- > 0) coder.readInt()

        val m = coder.readInt()
        val version = if (m == magicNum) {
            0
        } else {
            coder.readInt()
        }
        MapType = if (version == 0) {
            m
        } else {
            coder.readInt()
        }
        MapIndex = coder.readInt()
        MapScreenX = coder.readInt()
        MapScreenY = coder.readInt()
        ScriptType = coder.readInt()
        ScriptIndex = coder.readInt()
        scriptProcess = game.vm.loadScript(SaveLoadGame.ScriptType, SaveLoadGame.ScriptIndex)
        scriptProcess?.decode(coder)

        val size = coder.readInt()
        game.playerList.clear()
        for (i in 0 until size) {
            val p = Player()
            p.decode(coder)
            game.playerList.add(p)
        }
        Player.sMoney = coder.readInt()
        Player.sGoodsList.read(coder)

        NpcObjs = readArray(coder) {
            val type = it.readByte()
            val npc =
                    when (type.toInt()) {
                        0, 1 -> NPC()
                        2 -> SceneObj()
                        else -> throw Error("Bad obj type")
                    }
            if (type.toInt() != 0) {
                npc.decode(it)
            }
            npc
        }

        Combat.read(game, coder)
    }
}
