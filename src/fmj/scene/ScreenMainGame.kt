package fmj.scene

import fmj.Global
import fmj.characters.Direction
import fmj.characters.NPC
import fmj.characters.Player
import fmj.characters.SceneObj
import fmj.combat.Combat
import fmj.gamemenu.ScreenGameMainMenu
import fmj.graphics.Util
import fmj.lib.DatLib
import fmj.lib.ResMap
import fmj.script.ScriptProcess
import fmj.script.ScriptVM
import fmj.script.ScriptResources
import fmj.views.BaseScreen
import fmj.views.GameNode

import graphics.Canvas
import graphics.Point

class ScreenMainGame(
        override val parent: GameNode,
        private val vm: ScriptVM): BaseScreen {

    var player: Player? = null
    var currentMap: ResMap? = null
        private set

    private val mMapScreenPos = Point() // 屏幕左上角对应地图的位置

    var scriptProcess: ScriptProcess

    var sceneName = ""
        set(name) {
            field = name
            SaveLoadGame.SceneName = name
        }

    /**
     * 按y值从大到小排序，确保正确的遮挡关系
     * @return
     */
    private// 选择排序
    val sortedNpcObjs: Array<NPC>
        get() {
            return mNPCObj.filterNot { it.isEmpty }
                    .sortedByDescending { it.posInMap.y }
                    .toTypedArray()
//            var arr = arrayOfNulls<NPC>(40)
//            var i = 0
//            for (j in 1..40) {
//                if (mNPCObj[j] != null) {
//                    arr[i++] = mNPCObj[j]
//                }
//            }
//
//            val arr2 = arrayOfNulls<NPC>(i)
//            System.arraycopy(arr, 0, arr2, 0, i)
//            arr = arr2
//            for (j in 0 until i) {
//                var max = j
//                for (k in j + 1 until i) {
//                    if (arr[k].posInMap.y > arr[max].posInMap.y) {
//                        max = k
//                    }
//                }
//                val tmp = arr[j]
//                arr[j] = arr[max]
//                arr[max] = tmp
//            }
//            return arr
        }
    val playerList: MutableList<Player>
        get() = game.playerList

    /**
     * id--NPC或场景对象 (1-40)
     */
    private var mNPCObj = Array(41) { NPC.empty }

    private val mCanWalk = object : NPC.ICanWalk {

        override fun canWalk(x: Int, y: Int): Boolean {
            return currentMap!!.canWalk(x, y) &&
                    getNpcFromPosInMap(x, y).isEmpty &&
                    player!!.posInMap != Point(x, y)
        }
    }

    init {
        if (SaveLoadGame.startNewGame) { // 开始新游戏
            Combat.FightDisable()
            ScriptResources.initGlobalVar()
            ScriptResources.initGlobalEvents()
            SaveLoadGame.NpcObjs = mNPCObj
            SaveLoadGame.loadPlayers()
            playerList.clear()
            Player.sGoodsList.clear()
            Player.sMoney = 0
            scriptProcess = doStartChapter(1, 1)
            scriptProcess.start()
        } else { // 再续前缘
            loadMap(SaveLoadGame.MapType, SaveLoadGame.MapIndex,
                    SaveLoadGame.MapScreenX, SaveLoadGame.MapScreenY)
            mNPCObj = SaveLoadGame.NpcObjs

            mNPCObj.filterNot { it.isEmpty }
                    .forEach { it.setICanWalk(mCanWalk) }
            if (playerList.size > 0) {
                player = playerList[0]
            } else {
                throw Error("存档读取出错")
            }
            scriptProcess = SaveLoadGame.scriptProcess!!
            scriptProcess.goonExecute = true
        }
    }

    fun callChapter(type: Int, index: Int) {
        val process = vm.loadScript(type, index)
        process.prev = scriptProcess
        scriptProcess = process
        process.start()
    }

    fun exitScript() {
        scriptProcess.stop()
    }

    private fun doStartChapter(type: Int, index: Int): ScriptProcess {
        val process = vm.loadScript(type, index)
        for (i in 1..40) {
            mNPCObj[i] = NPC.empty
        }
        ScriptResources.initLocalVar()
        SaveLoadGame.ScriptType = type
        SaveLoadGame.ScriptIndex = index
        return process
    }

    fun startChapter(type: Int, index: Int) {
        scriptProcess.stop()
        scriptProcess = doStartChapter(type, index)
        scriptProcess.start()
    }

    override fun update(delta: Long) {
        if (scriptProcess.running) {
            scriptProcess.process()
            scriptProcess.update(delta)
            scriptProcess.timerStep(delta)
        } else if (Combat.IsActive()) { // TODO fix this test
            Combat.Update(delta)
        } else {
            mNPCObj.filterNot { it.isEmpty }
                   .forEach { it.update(delta) }
            scriptProcess.timerStep(delta)
        }
    }

    override fun draw(canvas: Canvas) {
        if (scriptProcess.running) {
            if (Combat.IsActive()) {
                Combat.Draw(canvas)
            }
            scriptProcess.draw(canvas)
        } else if (Combat.IsActive()) {
            Combat.Draw(canvas)
            return
        } else {
            drawScene(canvas)
        }
    }

    fun drawScene(canvas: Canvas) {
        if (currentMap != null) {
            currentMap!!.drawMap(canvas, mMapScreenPos.x, mMapScreenPos.y)
        }

        var playY = 10000
        var hasPlayerBeenDrawn = false
        if (player != null) {
            playY = player!!.posInMap.y
        }

        val npcs = sortedNpcObjs
        for (i in npcs.indices.reversed()) {
            if (!hasPlayerBeenDrawn && playY < npcs[i].posInMap.y) {
                player!!.drawWalkingSprite(canvas, mMapScreenPos)
                hasPlayerBeenDrawn = true
            }
            npcs[i].drawWalkingSprite(canvas, mMapScreenPos)
        }
        if (player != null && !hasPlayerBeenDrawn) {
            player!!.drawWalkingSprite(canvas, mMapScreenPos)
        }
        Util.drawSideFrame(canvas)
    }

    override fun onKeyDown(key: Int) {
        if (scriptProcess.running) {
            scriptProcess.keyDown(key)
        } else if (Combat.IsActive()) {
            Combat.KeyDown(key)
            return
        } else if (player != null) {
            when (key) {
                Global.KEY_LEFT -> walkLeft()
                Global.KEY_RIGHT -> walkRight()
                Global.KEY_UP -> walkUp()
                Global.KEY_DOWN -> walkDown()
                Global.KEY_ENTER -> triggerSceneObjEvent()
            }
        }
    }

    override fun onKeyUp(key: Int) {
        if (scriptProcess.running) {
            scriptProcess.keyUp(key)
        } else if (Combat.IsActive()) {
            Combat.KeyUp(key)
            return
        } else if (key == Global.KEY_CANCEL) {
            pushScreen(ScreenGameMainMenu(this))
        }
    }

    fun gotoAddress(address: Int) {
        scriptProcess.gotoAddress(address)
    }

    fun triggerEvent(eventId: Int) {
        scriptProcess.triggerEvent(eventId)
    }

    /**
     * 按enter键后，检测并触发场景对象里的事件，如NPC对话，开宝箱等
     */
    private fun triggerSceneObjEvent() {
        val p = player
        var x = p!!.posInMap.x
        var y = p.posInMap.y
        when (p.direction) {
            Direction.East -> ++x
            Direction.North -> --y
            Direction.South -> ++y
            Direction.West -> --x
        }

        // NPC事件
        val npcId = getNpcIdFromPosInMap(x, y)
        if (npcId != 0) {
            scriptProcess.triggerEvent(npcId)
            return
        } else if (triggerMapEvent(x, y)) {// 地图切换
        }
    }

    /**
     * 场景切换
     * 如果地图(x,y)有地图事件，就触发该事件
     * @param x
     * @param y
     */
    private fun triggerMapEvent(x: Int, y: Int): Boolean {
        if (currentMap != null) {
            val id = currentMap!!.getEventNum(x, y)
            if (id != 0) {
                scriptProcess.triggerEvent(id + 40)
                return true
            }
        }
        // 未触发地图事件，随机战斗
        Combat.StartNewRandomCombat()
        return false
    }

    /**
     * 地图的(x,y)处，是否可行走，是否有NPC
     * @param x
     * @param y
     * @return
     */
    private fun canPlayerWalk(x: Int, y: Int): Boolean {
        return if (currentMap == null) false else currentMap!!.canPlayerWalk(x, y) && getNpcFromPosInMap(x, y).isEmpty
    }

    private fun walkLeft() {
        val (x, y) = player!!.posInMap
        triggerMapEvent(x - 1, y)
        if (canPlayerWalk(x - 1, y)) {
            player!!.walk(Direction.West)
            --mMapScreenPos.x
            SaveLoadGame.MapScreenX = mMapScreenPos.x
        } else {
            player!!.walkStay(Direction.West)
        }
    }

    private fun walkUp() {
        val (x, y) = player!!.posInMap
        triggerMapEvent(x, y - 1)
        if (canPlayerWalk(x, y - 1)) {
            player!!.walk(Direction.North)
            --mMapScreenPos.y
            SaveLoadGame.MapScreenY = mMapScreenPos.y
        } else {
            player!!.walkStay(Direction.North)
        }
    }

    private fun walkRight() {
        val (x, y) = player!!.posInMap
        triggerMapEvent(x + 1, y)
        if (canPlayerWalk(x + 1, y)) {
            ++mMapScreenPos.x
            SaveLoadGame.MapScreenX = mMapScreenPos.x
            player!!.walk(Direction.East)
        } else {
            player!!.walkStay(Direction.East)
        }
    }

    private fun walkDown() {
        val (x, y) = player!!.posInMap
        triggerMapEvent(x, y + 1)
        if (canPlayerWalk(x, y + 1)) {
            ++mMapScreenPos.y
            SaveLoadGame.MapScreenY = mMapScreenPos.y
            player!!.walk(Direction.South)
        } else {
            player!!.walkStay(Direction.South)
        }
    }

    /**
     * 载入号码n,类型m的地图，初始位置（x，y）
     */
    fun loadMap(type: Int, index: Int, x: Int, y: Int) {
        var tmpP: Point? = null
        if (player != null && currentMap != null) {
            tmpP = player!!.getPosOnScreen(mMapScreenPos)
        }

        currentMap = DatLib.getRes(DatLib.ResType.MAP, type, index) as ResMap
        mMapScreenPos.set(x, y)
        if (tmpP != null) {
            player!!.setPosOnScreen(tmpP.x, tmpP.y, mMapScreenPos)
        }

        SaveLoadGame.MapType = type
        SaveLoadGame.MapIndex = index
        SaveLoadGame.MapScreenX = x
        SaveLoadGame.MapScreenY = y
    }

    fun setMapScreenPos(x: Int, y: Int) {
        mMapScreenPos.set(x, y)
    }

    /**
     * 创建主角号码actor，位置为（x，y）
     * @param actorId
     * @param x
     * @param y
     */
    fun createActor(actorId: Int, x: Int, y: Int) {
        val p = SaveLoadGame.getPlayerByIndex(actorId)!!
        playerList.add(p)
        p.setPosOnScreen(x, y, mMapScreenPos)
        player = playerList[0]
    }

    fun deleteActor(actorId: Int) {
        for (i in 0 until playerList.size) {
            if (playerList[i].index == actorId) {
                playerList.removeAt(i)
                break
            }
        }

        player = if (playerList.isEmpty()) {
            null
        } else {
            playerList[0]
        }
    }

    fun getPlayer(actorId: Int): Player? {
        return SaveLoadGame.playerDb.firstOrNull { it.index == actorId }
    }

    /**
     * 创建配角号码npc，位置为（x，y），id为操作号
     * @param id
     * @param npc
     * @param x
     * @param y
     */
    fun createNpc(id: Int, npc: Int, x: Int, y: Int): NPC {
        val npcobj = DatLib.getRes(DatLib.ResType.ARS, 2, npc) as NPC
        npcobj.setPosInMap(x, y)
        npcobj.setICanWalk(mCanWalk)
        mNPCObj[id] = npcobj
        return npcobj
    }

    fun deleteNpc(id: Int) {
        mNPCObj[id] = NPC.empty
    }

    fun deleteAllNpc() {
        for (i in 0..40) {
            mNPCObj[i] = NPC.empty
        }
    }

    fun getNPC(id: Int): NPC {
        return mNPCObj[id]
    }

    fun setControlPlayer(id: Int) {
        val player = playerList.find { it.index == id }
        player?.let {
            playerList.remove(it)
            playerList.add(0, it)
        }
    }

    fun isNpcVisible(npc: NPC): Boolean {
        val (x, y) = npc.getPosOnScreen(mMapScreenPos)
        return x >= 0 && x < ResMap.WIDTH &&
                y >= 0 && y <= ResMap.HEIGHT
    }

//    fun isNpcVisible(id: Int): Boolean {
//        return isNpcVisible(getNPC(id))
//    }

    /**
     * 得到地图的(x,y)处的NPC，没有就返回null
     * @param x
     * @param y
     * @return
     */
    fun getNpcFromPosInMap(x: Int, y: Int): NPC {
        return mNPCObj[getNpcIdFromPosInMap(x, y)]
    }

    private fun getNpcIdFromPosInMap(x: Int, y: Int): Int {
        val id = mNPCObj.indexOfFirst { !it.isEmpty && it.posInMap == Point(x, y) }
        return if (id == -1) 0 else id
    }

    /**
     * 建一个宝箱，宝箱号码boxindex(角色图片，type为4)，
     * 位置为（x，y），id为操作号（与NPC共用)
     */
    fun createBox(id: Int, boxIndex: Int, x: Int, y: Int): SceneObj {
        val box = DatLib.getRes(DatLib.ResType.ARS, 4, boxIndex) as SceneObj
        box.setPosInMap(x, y)
        mNPCObj[id] = box
        return box
    }

    fun deleteBox(id: Int) {
        mNPCObj[id] = NPC.empty
    }
}
