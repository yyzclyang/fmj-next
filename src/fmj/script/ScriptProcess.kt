package fmj.script

import fmj.Global
import fmj.ScreenViewType
import fmj.characters.Character
import fmj.characters.Direction
import fmj.characters.NPC
import fmj.characters.Player
import fmj.combat.Combat
import fmj.gamemenu.ScreenCommonMenu
import fmj.goods.BaseGoods
import fmj.graphics.TextRender
import fmj.graphics.Util
import fmj.lib.DatLib
import fmj.lib.ResBase
import fmj.lib.ResGut
import fmj.lib.ResImage
import fmj.lib.ResSrs
import fmj.scene.ScreenMainGame
import fmj.views.ScreenDelegate
import fmj.views.ScreenSaveLoadGame

import graphics.Bitmap
import graphics.Canvas
import graphics.Paint
import graphics.Rect
import graphics.RectF
import java.*


class ScriptProcess private constructor() {
    lateinit var delegate: ScreenDelegate

    private var mScript: ResGut? = null

    private val mCmds: Array<Command?>

    private var mScreenMainGame: ScreenMainGame? = null

    // offsetAddr----index of operate
    // 未使用的事件，存在于前40个中
    val scriptExecutor: ScriptExecutor?
        get() {
            if (mScript == null) return null

            val code = mScript!!.scriptData!!
            var pointer = 0

            val map = HashMap<Int, Int>(128)
            var iOfOper = 0

            val operateList = ArrayList<Operate>()

            while (pointer < code.size) {
                map.put(pointer, iOfOper)
                ++iOfOper
                val cmdCode = code[pointer].toInt() and 0xFF
                val cmd = mCmds[cmdCode]
                if (cmd != null) {
                    val operate = cmd.getOperate(code, pointer + 1)
                    operate.delagete = delegate
                    operateList.add(operate)
                    pointer = cmd.getNextPos(code, pointer + 1)
                } else {
                    throw Error("ECMD: $cmdCode")
                }
            }

            val events = mScript!!.sceneEvent!!
            val eventIndex = IntArray(events.size)
            for (i in events.indices) {
                if (events[i] == 0) {
                    eventIndex[i] = -1
                } else {
                    eventIndex[i] = map[events[i] - events.size * 2 - 3]!!
                }
            }

            return ScriptExecutor(operateList, eventIndex, map, events.size * 2 + 3)
        }

    private val cmd_music = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            println("cmd_music not implemented")
            return OperateNop.nop
        }
    }

    private val cmd_loadmap = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 8
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateDrawOnce() {
                internal val type = code[start].toInt() and 0xFF or (code[start + 1].toInt() shl 8 and 0xFF00)
                internal val index = code[start + 2].toInt() and 0xFF or (code[start + 3].toInt() shl 8 and 0xFF00)
                internal val x = code[start + 4].toInt() and 0xFF or (code[start + 5].toInt() shl 8 and 0xFF00)
                internal var y = code[start + 6].toInt() and 0xFF or (code[start + 7].toInt() shl 8 and 0xFF00)

                override fun process(): Boolean {
                    cmdPrint("cmd_loadmap type=$type index=$index x=$x y=$y")
                    mScreenMainGame!!.loadMap(type, index, x, y)
                    return true
                }

                override fun drawOnce(canvas: Canvas) {
                    mScreenMainGame!!.drawScene(canvas)
                }
            }
        }
    }

    private val cmd_createactor = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateDrawOnce() {

                override fun process(): Boolean {
                    val actor = get2ByteInt(code, start)
                    val x = get2ByteInt(code, start + 2)
                    val y = get2ByteInt(code, start + 4)
                    cmdPrint("cmd_createactor $actor at ($x, $y)")
                    mScreenMainGame!!.createActor(actor, x, y)
                    return true
                }

                override fun drawOnce(canvas: Canvas) {
                    mScreenMainGame!!.drawScene(canvas)
                }
            }
        }
    }

    private val cmd_deletenpc = object : Command {
        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }
        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    val npc = get2ByteInt(code, start)
                    cmdPrint("cmd_deletenpc $npc")
                    mScreenMainGame!!.deleteNpc(npc)
                    return false
                }
            }
        }
    }

    private val cmd_move = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal var time: Long = 400
                internal lateinit var npc: NPC
                internal val dstX = get2ByteInt(code, start + 2)
                internal val dstY = get2ByteInt(code, start + 4)

                override fun update(delta: Long): Boolean {
                    time += delta
                    if (time > 100) {
                        val p = npc.posInMap
                        when {
                            dstX < p.x -> npc.walk(Direction.West)
                            dstX > p.x -> npc.walk(Direction.East)
                            dstY < p.y -> npc.walk(Direction.North)
                            dstY > p.y -> npc.walk(Direction.South)
                            else -> return false
                        }
                        time = 0
                    }
                    return true
                }

                override fun process(): Boolean {
                    npc = mScreenMainGame!!.getNPC(get2ByteInt(code, start))
                    cmdPrint("cmd_move ${npc.name} to ($dstX, $dstY)")
                    return true
                }

                override fun onKeyUp(key: Int) {}

                override fun onKeyDown(key: Int) {}

                override fun draw(canvas: Canvas) {
                    mScreenMainGame!!.drawScene(canvas)
                }
            }
        }
    }

    private val cmd_callback = object : Command {
        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_callback")
                    mScreenMainGame!!.exitScript()
                    return false
                }
            }
        }
    }

    private val cmd_goto = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    val toAddr = get2ByteInt(code, start)
                    mScreenMainGame!!.gotoAddress(toAddr)
                    cmdPrint("cmd_goto from $start to $toAddr")
                    return false
                }
            }
        }
    }

    private val cmd_if = object : Command {
        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    val va = get2ByteInt(code, start)
                    val addr = get2ByteInt(code, start + 2)
                    val value = ScriptResources.globalEvents[va]
                    cmdPrint("cmd_if $va(=$value) goto $addr")
                    if (value) {
                        mScreenMainGame!!.gotoAddress(addr)
                    }
                    return false
                }
            }
        }
    }

    private val cmd_set = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    val id = get2ByteInt(code, start)
                    val value = get2ByteInt(code, start + 2)

                    cmdPrint("cmd_set $id = $value")
                    ScriptResources.variables[id] = value
                    return false
                }
            }
        }
    }

    private val cmd_say = object : Command {
        override fun getNextPos(code: ByteArray, start: Int): Int {
            var i = 2
            while (code[start + i].toInt() != 0) ++i
            return start + i + 1
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal val picNum = get2ByteInt(code, start)
                internal val headImg: ResImage?
                internal val text = getStringBytes(code, start + 2)
                internal var iOfText = 0
                internal var iOfNext = 0
                internal var isAnyKeyDown = false
                internal val rWithPic = RectF(9f, 50f, 151f, 96 - 0.5f) // 有图边框
                internal val rWithTextT = Rect(44, 58, 145, 75) // 上
                internal val rWithTextB = Rect(14, 76, 145, 93) // 下
                internal val rWithoutPic = RectF(9f, 55f, 151f, 96 - 0.5f) // 无图边框
                internal val rWithoutTextT = Rect(14, 58, 145, 75) // 上
                internal val rWithoutTextB = Rect(14, 76, 145, 93) // 下
                internal val paint = Paint()

                init {
                    headImg = if (picNum != 0) {
                        DatLib.getRes(DatLib.ResType.PIC, 1, picNum) as ResImage
                    } else {
                        null
                    }
                    paint.color = Global.COLOR_BLACK
                    paint.style = Paint.Style.FILL_AND_STROKE
                }

                override fun update(delta: Long): Boolean {
                    if (isAnyKeyDown) {
                        if (iOfNext >= text.size - 1) { // 最后一位是0
                            return false
                        } else {
                            iOfText = iOfNext
                            isAnyKeyDown = false
                        }
                    }
                    return true
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_say ${text.gbkString()}")
                    iOfText = 0
                    iOfNext = 0
                    return true
                }

                override fun onKeyUp(key: Int) {}

                override fun onKeyDown(key: Int) {
                    isAnyKeyDown = true
                }

                override fun draw(canvas: Canvas) {
                    if (!Combat.Companion.IsActive()) {
                        mScreenMainGame!!.drawScene(canvas)
                    }
                    if (headImg == null) { // 没头像
                        // 画矩形
                        paint.color = Global.COLOR_WHITE
                        paint.style = Paint.Style.FILL
                        canvas.drawRect(rWithoutPic, paint)
                        // 画边框
                        paint.color = Global.COLOR_BLACK
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = 1
                        canvas.drawRect(rWithoutPic, paint)
                        iOfNext = TextRender.drawText(canvas, text, iOfText, rWithoutTextT)
                        iOfNext = TextRender.drawText(canvas, text, iOfNext, rWithoutTextB)
                    } else { // 有头像
                        // 画矩形
                        paint.color = Global.COLOR_WHITE
                        paint.style = Paint.Style.FILL
                        canvas.drawRect(rWithPic, paint)
                        // 画边框
                        paint.color = Global.COLOR_BLACK
                        paint.style = Paint.Style.STROKE
                        paint.strokeWidth = 1
                        canvas.drawRect(rWithPic, paint)
                        canvas.drawLine(38, 50, 44, 56, paint)
                        canvas.drawLine(43.5f, 56f, 151f, 56f, paint)
                        headImg.draw(canvas, 1, 13, 46)
                        iOfNext = TextRender.drawText(canvas, text, iOfText, rWithTextT)
                        iOfNext = TextRender.drawText(canvas, text, iOfNext, rWithTextB)
                    }
                }
            }
        }
    }

    private val cmd_startchapter = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                internal var type: Int = 0
                internal var index: Int = 0

                init {
                    type = code[start].toInt() and 0xFF or (code[start + 1].toInt() shl 8 and 0xFF)
                    index = code[start + 2].toInt() and 0xFF or (code[start + 3].toInt() shl 8 and 0xFF)
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_startchapter $type $index")
                    mScreenMainGame!!.startChapter(type, index)
                    return false
                }
            }
        }
    }

    private val cmd_screens = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    val x = get2ByteInt(code, start)
                    val y = get2ByteInt(code, start + 2)
                    cmdPrint("cmd_screens ($x,$y)")
                    mScreenMainGame!!.setMapScreenPos(x, y)
                    return false
                }
            }
        }
    }

    private val cmd_gameover = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_gameover")
                    delegate.changeScreen(ScreenViewType.SCREEN_MENU)
                    return false
                }
            }
        }
    }

    private val cmd_ifcmp = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    val id = get2ByteInt(code, start)
                    val other = get2ByteInt(code, start + 2)
                    val value = ScriptResources.variables[id]
                    val addr = get2ByteInt(code, start + 4)
                    cmdPrint("cmd_ifcmp $id(=$value) vs $other goto $addr")
                    if (value == other) {
                        mScreenMainGame!!.gotoAddress(addr)
                    }
                    return false
                }
            }
        }
    }

    private val cmd_add = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_add")
                    ScriptResources.variables[get2ByteInt(code, start)] += get2ByteInt(code, start + 2)
                    return false
                }
            }
        }
    }

    private val cmd_sub = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_sub")
                    ScriptResources.variables[get2ByteInt(code, start)] -= get2ByteInt(code, start + 2)
                    return false
                }
            }
        }
    }

    // 伏魔记未用到
    private val cmd_setcontrolid = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            // TODO
            throw NotImplementedError("cmd_setcontrolid")
        }
    }

    private val cmd_setevent = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    val event = get2ByteInt(code, start)
                    cmdPrint("cmd_setevent $event")
                    ScriptResources.setEvent(event)
                    return false
                }
            }
        }
    }

    private val cmd_clrevent = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    val event = get2ByteInt(code, start)
                    cmdPrint("cmd_clrevent $event")
                    ScriptResources.clearEvent(event)
                    return false
                }
            }
        }
    }

    /**
     * 序号 种类
     */
    private val cmd_buy = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            var i = 0
            while (code[start + i].toInt() != 0) ++i
            return start + i + 1
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return OperateBuy(code, start)
        }
    }

    private val cmd_facetoface = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateDrawOnce() {

                private fun getCharacter(id: Int): Character? {
                    return if (id == 0) {
                        mScreenMainGame!!.player
                    } else mScreenMainGame!!.getNPC(id)
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_facetoface")
                    val c1 = getCharacter(get2ByteInt(code, start))
                    val c2 = getCharacter(get2ByteInt(code, start + 2))
                    val p1 = c1!!.posInMap
                    val p2 = c2!!.posInMap
                    if (p1.x > p2.x) {
                        c2.direction = Direction.East
                    } else if (p1.x < p2.x) {
                        c2.direction = Direction.West
                    } else {
                        if (p1.y > p2.y) {
                            c2.direction = Direction.South
                        } else if (p1.y < p2.y) {
                            c2.direction = Direction.North
                        }
                    }
                    return true
                }

                override fun drawOnce(canvas: Canvas) {
                    mScreenMainGame!!.drawScene(canvas)
                }
            }
        }
    }

    private val cmd_movie = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 10
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal var type: Int = 0
                internal var index: Int = 0
                internal var x: Int = 0
                internal var y: Int = 0
                internal var ctl: Int = 0
                internal var downKey = 0
                internal var isAnyKeyPressed = false
                internal lateinit var movie: ResSrs

                init {
                    type = get2ByteInt(code, start)
                    index = get2ByteInt(code, start + 2)
                    x = get2ByteInt(code, start + 4)
                    y = get2ByteInt(code, start + 6)
                    ctl = get2ByteInt(code, start + 8)
                }

                override fun update(delta: Long): Boolean {
                    return if ((ctl == 1 || ctl == 3) && isAnyKeyPressed) {
                        false
                    } else movie.update(delta)
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_movie")
                    movie = DatLib.getRes(DatLib.ResType.SRS, type, index) as ResSrs
                    movie.setIteratorNum(5)
                    movie.startAni()
                    return true
                }

                override fun onKeyUp(key: Int) {
                    if (key == downKey) {
                        isAnyKeyPressed = true
                    }
                }

                override fun onKeyDown(key: Int) {
                    downKey = key
                }

                override fun draw(canvas: Canvas) {
                    if (ctl == 2 || ctl == 3) {
                        mScreenMainGame!!.drawScene(canvas)
                    }
                    movie.draw(canvas, x, y)
                }
            }
        }
    }

    private val cmd_choice = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            var i = 0
            while (code[start + i].toInt() != 0) ++i
            ++i
            while (code[start + i].toInt() != 0) ++i
            return start + i + 3
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal var choice1: ByteArray = getStringBytes(code, start)
                internal var choice2: ByteArray = getStringBytes(code, start + choice1.size)
                internal var bg: Bitmap
                internal var bgx: Int = 0
                internal var bgy: Int = 0
                internal var curChoice: Int = 0
                internal var addrOffset = choice1.size + choice2.size
                internal var hasSelect: Boolean = false

                private var mLastDownKey = -1

                init {
                    val w: Int
                    val tmp: ByteArray?
                    if (choice1.size > choice2.size) {
                        w = choice1.size * 8 - 8 + 6
                        tmp = ByteArray(choice1.size)
                        System.arraycopy(choice2, 0, tmp, 0, choice2.size)
                        for (i in choice2.size - 1 until tmp.size) {
                            tmp[i] = ' '.toByte()
                        }
                        tmp[tmp.size - 1] = 0
                        choice2 = tmp
                    } else {
                        w = choice2.size * 8 - 8 + 6
                        tmp = ByteArray(choice2.size)
                        System.arraycopy(choice1, 0, tmp, 0, choice1.size)
                        for (i in choice1.size - 1 until tmp.size) {
                            tmp[i] = ' '.toByte()
                        }
                        tmp[tmp.size - 1] = 0
                        choice1 = tmp
                    }
                    bg = Util.getFrameBitmap(w, 16 * 2 + 6)
                    bgx = (160 - bg.width) / 2
                    bgy = (96 - bg.height) / 2
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_choice")
                    curChoice = 0
                    hasSelect = false
                    return true
                }

                override fun update(delta: Long): Boolean {
                    if (hasSelect) {
                        if (curChoice == 1) {
                            mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + addrOffset))
                        }
                        return false
                    }
                    return true
                }

                override fun onKeyUp(key: Int) {
                    if (key == Global.KEY_ENTER && mLastDownKey == key) {
                        hasSelect = true
                    }
                }

                override fun onKeyDown(key: Int) {
                    when (key) {
                        Global.KEY_DOWN,
                        Global.KEY_UP,
                        Global.KEY_LEFT,
                        Global.KEY_RIGHT -> curChoice = 1 - curChoice
                    }
                    mLastDownKey = key
                }

                override fun draw(canvas: Canvas) {
                    mScreenMainGame!!.drawScene(canvas)
                    canvas.drawBitmap(bg, bgx, bgy)
                    if (curChoice == 0) {
                        TextRender.drawSelText(canvas, choice1, bgx + 3, bgy + 3)
                        TextRender.drawText(canvas, choice2, bgx + 3, bgy + 3 + 16)
                    } else {
                        TextRender.drawText(canvas, choice1, bgx + 3, bgy + 3)
                        TextRender.drawSelText(canvas, choice2, bgx + 3, bgy + 3 + 16)
                    }
                }
            }
        }
    }

    private val cmd_createbox = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 8
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    val id = get2ByteInt(code, start)
                    val boxId = get2ByteInt(code, start + 2)
                    val x = get2ByteInt(code, start + 4)
                    val y = get2ByteInt(code, start + 6)
                    val box = mScreenMainGame!!.createBox(id, boxId, x, y)
                    cmdPrint("cmd_createbox ${box.name} at ($x,$y)")
                    return false
                }
            }
        }
    }

    private val cmd_deletebox = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_deletebox")
                    mScreenMainGame!!.deleteBox(get2ByteInt(code, start))
                    return false
                }
            }
        }
    }

    private val cmd_gaingoods = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal var goods = DatLib.getRes(DatLib.ResType.GRS,
                        get2ByteInt(code, start), get2ByteInt(code, start + 2)) as BaseGoods
                internal var msg = "获得:" + goods.name
                internal var time: Long = 0
                internal var isAnyKeyPressed: Boolean = false
                internal var downKey: Int = 0

                override fun process(): Boolean {
                    cmdPrint("cmd_gaingoods ${goods.name}")
                    goods.goodsNum = 1
                    Player.sGoodsList.addGoods(goods.type, goods.index)
                    time = 0
                    isAnyKeyPressed = false
                    downKey = -1
                    return true
                }

                override fun update(delta: Long): Boolean {
                    time += delta
                    return !(time > 1000 || isAnyKeyPressed)

                }

                override fun onKeyUp(key: Int) {
                    if (key == downKey) {
                        isAnyKeyPressed = true
                    }
                }

                override fun onKeyDown(key: Int) {
                    downKey = key
                }

                override fun draw(canvas: Canvas) {
                    Util.showMessage(canvas, msg)
                }
            }
        }
    }

    private val cmd_initfight = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 22
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_initfight")
                    val arr = IntArray(8)
                    for (i in 0..7) {
                        arr[i] = get2ByteInt(code, start + i * 2)
                    }
                    Combat.InitFight(arr, get2ByteInt(code, start + 16),
                            get2ByteInt(code, start + 18), get2ByteInt(code, start + 20))
                    Combat.SetDelegate(delegate)
                    return false
                }
            }
        }
    }

    private val cmd_fightenable = object : Command {
        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_fightenable")
                    Combat.Companion.FightEnable()
                    return false
                }
            }
        }
    }

    private val cmd_fightdisenable = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_fightdisable")
                    Combat.Companion.FightDisable()
                    return false
                }
            }
        }
    }

    private val cmd_createnpc = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 8
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    val npc = mScreenMainGame!!.createNpc(get2ByteInt(code, start),
                            get2ByteInt(code, start + 2),
                            get2ByteInt(code, start + 4),
                            get2ByteInt(code, start + 6))
                    cmdPrint("cmd_createnpc ${npc.name} at ${npc.posInMap}")
                    return false
                }
            }
        }
    }

    private val cmd_enterfight = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 30
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_enterfight")
                    //					mScreenMainGame.gotoAddress(get2ByteInt(code, start + 28)); // win the fight
                    val monstersType = intArrayOf(get2ByteInt(code, start + 2), get2ByteInt(code, start + 4), get2ByteInt(code, start + 6))
                    val scr = intArrayOf(get2ByteInt(code, start + 8), get2ByteInt(code, start + 10), get2ByteInt(code, start + 12))
                    val evtRnds = intArrayOf(get2ByteInt(code, start + 14), get2ByteInt(code, start + 16), get2ByteInt(code, start + 18))
                    val evts = intArrayOf(get2ByteInt(code, start + 20), get2ByteInt(code, start + 22), get2ByteInt(code, start + 24))
                    val lossto = get2ByteInt(code, start + 26)
                    val winto = get2ByteInt(code, start + 28)
                    Combat.EnterFight(get2ByteInt(code, start), monstersType, scr, evtRnds, evts, lossto, winto)
                    Combat.SetDelegate(delegate)
                    mScreenMainGame!!.exitScript()
                    return false
                }
            }
        }
    }

    private val cmd_deleteactor = object : Command {
        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_deleteactor")
                    mScreenMainGame!!.deleteActor(get2ByteInt(code, start))
                    return false
                }
            }
        }
    }

    private val cmd_gainmoney = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_gainmoney")
                    Player.sMoney += get4BytesInt(code, start)
                    return false
                }
            }
        }
    }

    private val cmd_usemoney = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_usemoney")
                    Player.sMoney -= get4BytesInt(code, start)
                    return false
                }
            }
        }
    }

    private val cmd_setmoney = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    Player.sMoney = get4BytesInt(code, start)
                    cmdPrint("cmd_setmoney ${Player.sMoney}")
                    return false
                }
            }
        }
    }

    private val cmd_learnmagic = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {

                internal var isAnyKeyDown: Boolean = false
                internal var timeCnt: Long = 0

                override fun update(delta: Long): Boolean {
                    timeCnt += delta
                    return timeCnt < 1000 && !isAnyKeyDown
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_learmagic")
                    isAnyKeyDown = false
                    timeCnt = 0
                    return true
                }

                override fun onKeyUp(key: Int) {}

                override fun onKeyDown(key: Int) {}

                override fun draw(canvas: Canvas) { // TODO fix the test
                    TextRender.drawText(canvas, "学会了魔法:", 0, 0)
                    TextRender.drawText(canvas, "actorId:" + get2ByteInt(code, start)
                            + "t" + get2ByteInt(code, start + 2)
                            + "i" + get2ByteInt(code, start + 4), 0, 16)
                }
            }
        }
    }

    private val cmd_sale = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return OperateSale()
        }
    }

    private val cmd_npcmovemod = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_npcmovemod")
                    mScreenMainGame!!.getNPC(get2ByteInt(code, start))
                            .state =
                            Character.State.fromInt(get2ByteInt(code, start + 2))
                    return false
                }
            }
        }
    }

    private val cmd_message = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            var i = 0
            while (code[start + i].toInt() != 0) ++i
            return start + i + 1
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal var msg = getStringBytes(code, start)
                internal var downKey: Int = 0
                internal var isAnyKeyDown: Boolean = false

                override fun process(): Boolean {
                    cmdPrint("cmd_message ${msg.gbkString()}")
                    downKey = -1
                    isAnyKeyDown = false
                    return true
                }

                override fun update(delta: Long): Boolean {
                    return !isAnyKeyDown
                }

                override fun onKeyUp(key: Int) {
                    if (downKey == key) {
                        isAnyKeyDown = true
                    }
                }

                override fun onKeyDown(key: Int) {
                    downKey = key
                }

                override fun draw(canvas: Canvas) {
                    Util.showMessage(canvas, msg)
                }
            }
        }
    }

    private val cmd_deletegoods = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_deletegoods")
                    val r = Player.sGoodsList.deleteGoods(get2ByteInt(code, start),
                            get2ByteInt(code, start + 2))
                    if (!r) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 2))
                    }
                    return false
                }
            }
        }
    }

    private val cmd_resumeactorhp = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_resumeactorhp")
                    val p = mScreenMainGame!!.getPlayer(get2ByteInt(code, start))
                    if (p != null) {
                        p.hp = p.maxHP * get2ByteInt(code, start + 2) / 100
                    }
                    return false
                }
            }
        }
    }

    private val cmd_actorlayerup = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() { // TODO

                internal var exit = false

                override fun update(delta: Long): Boolean {
                    return !exit
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_actorlayerup TODO")
                    return true
                }

                override fun onKeyUp(key: Int) {
                    if (key == Global.KEY_CANCEL) {
                        exit = true
                    }
                }

                override fun onKeyDown(key: Int) {}

                override fun draw(canvas: Canvas) {
                    TextRender.drawText(canvas, "cmd_actorlayerup", 10, 20)
                    TextRender.drawText(canvas, "press cancel to continue", 0, 40)
                }
            }
        }
    }

    private val cmd_boxopen = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_boxopen")
                    val box = mScreenMainGame!!.getNPC(get2ByteInt(code, start))
                    box.step = 1
                    return false
                }
            }
        }
    }

    private val cmd_delallnpc = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_delallnpc")
                    mScreenMainGame!!.deleteAllNpc()
                    return false
                }
            }
        }
    }

    private val cmd_npcstep = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal var time: Long = 0
                internal var interval: Long = 0
                internal var id = get2ByteInt(code, start) // 0为主角
                internal var faceto = get2ByteInt(code, start + 2)
                internal var step = get2ByteInt(code, start + 4)

                override fun update(delta: Long): Boolean {
                    time += delta
                    return time < interval
                }

                override fun process(): Boolean {
                    time = 0
                    val d = when (faceto) {
                    // 与资源文件里的不一样
                        0 -> Direction.North
                        1 -> Direction.East
                        2 -> Direction.South
                        3 -> Direction.West
                        else -> Direction.South
                    }
                    cmdPrint("cmd_npcstep $id $d step=$step")
                    if (id == 0) {
                        val p = mScreenMainGame!!.player!!
                        p.direction = d
                        p.step = step
                        interval = 300
                    } else {
                        val npc = mScreenMainGame!!.getNPC(id)
                        npc.direction = d
                        npc.step = step
                        interval = if (mScreenMainGame!!.isNpcVisible(npc)) {
                            300
                        } else {
                            0
                        }
                    }
                    return true
                }

                override fun onKeyUp(key: Int) {}

                override fun onKeyDown(key: Int) {}

                override fun draw(canvas: Canvas) {
                    mScreenMainGame!!.drawScene(canvas)
                }
            }
        }
    }

    private val cmd_setscenename = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            var i = 0
            while (code[start + i].toInt() != 0) ++i
            return start + i + 1
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    val name = ResBase.getString(code, start)
                    cmdPrint("cmd_setscenname $name")
                    mScreenMainGame!!.sceneName = name
                    return false
                }
            }
        }
    }

    private val cmd_showscenename = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal var time: Long = 0
                internal var text: String = ""
                internal var isAnyKeyDown = false

                override fun update(delta: Long): Boolean {
                    time += delta
                    if (time > 100 && isAnyKeyDown) {
                        isAnyKeyDown = false
                        return false
                    }
                    return time < 1000
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_showscenename")
                    text = mScreenMainGame!!.sceneName
                    return true
                }

                override fun onKeyUp(key: Int) {}

                override fun onKeyDown(key: Int) {
                    isAnyKeyDown = true
                }

                override fun draw(canvas: Canvas) {
                    mScreenMainGame!!.drawScene(canvas)
                    Util.showInformation(canvas, text)
                }
            }
        }
    }

    private val cmd_showscreen = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateDrawOnce() {

                override fun process(): Boolean {
                    cmdPrint("cmd_showscreen")
                    return true
                }

                override fun drawOnce(canvas: Canvas) {
                    mScreenMainGame!!.drawScene(canvas)
                }
            }
        }
    }

    private val cmd_usegoods = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_usegoods")
                    val b = Player.sGoodsList.deleteGoods(get2ByteInt(code, start),
                            get2ByteInt(code, start + 2))
                    if (!b) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 4))
                    }
                    return false
                }
            }
        }
    }

    // 伏魔记未用到
    private val cmd_attribtest = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 10
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)
            val addr1 = get2ByteInt(code, start+6)
            val addr2 = get2ByteInt(code, start+8)

            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_attribtest $actor $type $value")
                    val player = mScreenMainGame?.getPlayer(actor) ?: return false
                    // 0-级别，1-攻击力，2-防御力，3-身法，4-生命，5-真气当前值，6-当前经验值
                    // 7-灵力，8-幸运，9-攻击的异常回合数，10-对特殊状态的免疫，11-普通攻击可能产生异常状态
                    // 12-合体法术，13-每回合变化生命，14-每回合变化真气，15-头戴，16-身穿
                    // 17-肩披，18-护腕，19-手持，20-脚蹬，21-佩戴1，22-佩戴2，23-生命上限，24-真气上限
                    val currentValue = when (type) {
                            0 -> player.level
                            1 -> player.attack
                            2 -> player.defend
                            3 -> player.speed
                            4 -> player.hp
                            5 -> player.mp
                            6 -> player.currentExp
                            7 -> player.lingli
                            8 -> player.luck
                            // * 0装饰 1装饰 2护腕 3脚蹬 4手持 5身穿 6肩披 7头戴
                            15 -> player.equipmentsArray[7]?.index ?: 0
                            16 -> player.equipmentsArray[5]?.index ?: 0
                            17 -> player.equipmentsArray[6]?.index ?: 0
                            18 -> player.equipmentsArray[2]?.index ?: 0
                            19 -> player.equipmentsArray[4]?.index ?: 0
                            20 -> player.equipmentsArray[3]?.index ?: 0
                            21 -> player.equipmentsArray[0]?.index ?: 0
                            22 -> player.equipmentsArray[1]?.index ?: 0
                            23 -> player.maxHP
                            24 -> player.maxMP
                            else -> throw NotImplementedError("ATTRIBTEST $type")
                        }
                    when {
                        currentValue < value -> mScreenMainGame!!.gotoAddress(addr1)
                        currentValue > value -> mScreenMainGame!!.gotoAddress(addr2)
                    }
                    return false
                }
            }
        }
    }

    // 伏魔记未用到
    private val cmd_attribset = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)

            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_attribset $actor $type $value")
                    val player = mScreenMainGame?.getPlayer(actor) ?: return false
                    // 0-级别，1-攻击力，2-防御力，3-身法，4-生命，5-真气当前值，6-当前经验值
                    // 7-灵力，8-幸运，9-攻击的异常回合数，10-对特殊状态的免疫，11-普通攻击可能产生异常状态
                    // 12-合体法术，13-每回合变化生命，14-每回合变化真气，15-生命上限，16-真气上限
                    when (type) {
                        0 -> player.setLevel(value)
                        1 -> player.attack = value
                        2 -> player.defend = value
                        3 -> player.speed = value
                        4 -> player.hp = value
                        5 -> player.mp = value
                        6 -> player.currentExp = value
                        7 -> player.lingli = value
                        8 -> player.luck = value
                        15 -> player.maxHP = value
                        16 -> player.maxMP = value
                        else -> throw NotImplementedError("ATTRIBSET $type")
                    }
                    return false
                }
            }
        }
    }

    // 伏魔记未用到
    private val cmd_attribadd = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)

            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_attribadd $actor $type $value")
                    val player = mScreenMainGame?.getPlayer(actor) ?: return false

                    // 0-级别，1-攻击力，2-防御力，3-身法，4-生命，5-真气当前值，6-当前经验值
                    // 7-灵力，8-幸运，9-攻击的异常回合数，10-生命上限，11-真气上限
                    when (type) {
                        0 -> player.setLevel(player.level + value)
                        1 -> player.attack += value
                        2 -> player.defend += value
                        3 -> player.speed += value
                        4 -> player.hp += value
                        5 -> player.mp += value
                        6 -> player.currentExp += value
                        7 -> player.lingli += value
                        8 -> player.luck += value
                        10 -> player.maxHP += value
                        11 -> player.maxMP += value
                        else -> throw NotImplementedError("ATTRIBADD $type")
                    }
                    return false
                }
            }
        }
    }

    private val cmd_showgut = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            var i = 4
            while (code[start + i].toInt() != 0) ++i
            return start + i + 1
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : Operate() {
                internal val imgTop: ResImage?
                internal val imgBottom: ResImage?
                internal var text: ByteArray
                internal var goon = true
                internal var interval: Long = 50
                internal var timeCnt: Long = 0
                internal var step = 1
                internal var curY: Int = 0
                internal var rect: Rect
                private val top = code[start].toInt() and 0xFF or (code[start + 1].toInt() shl 8 and 0xFF00)
                private val btm = code[start + 2].toInt() and 0xFF or (code[start + 3].toInt() shl 8 and 0xFF00)

                init {
                    imgTop = if (top > 0)
                        DatLib.getRes(DatLib.ResType.PIC, 5, top) as ResImage
                    else null
                    imgBottom = if (btm > 0)
                        DatLib.getRes(DatLib.ResType.PIC, 5, btm) as ResImage
                    else null
                    text = ResBase.Companion.getString(code, start + 4).gbkBytes()
                    curY = if (imgBottom != null) 96 - imgBottom.height else 96
                    rect = Rect(0,
                            imgTop?.height ?: 0,
                            160, curY)
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_showgut topimg = $top, btmimg = $btm")
                    goon = true
                    interval = 50
                    timeCnt = 0
                    step = 1
                    curY = if (imgBottom != null) 96 - imgBottom.height else 96
                    return true
                }

                override fun update(delta: Long): Boolean {
                    if (!goon) return false
                    timeCnt += delta
                    if (timeCnt >= interval) {
                        timeCnt = 0
                        curY -= step
                    }
                    return true
                }

                override fun onKeyUp(key: Int) {
                    if (key == Global.KEY_CANCEL) {
                        goon = false
                    }
                    step = 1
                    interval = 50
                }

                override fun onKeyDown(key: Int) {
                    step = 3
                    interval = 20
                }

                override fun draw(canvas: Canvas) {
                    canvas.drawColor(Global.COLOR_WHITE)
                    val e = TextRender.drawText(canvas, text, rect, curY)
                    if (e != 1 && e != 2) {
                        goon = false
                    }
                    imgTop?.draw(canvas, 1, 0, 0)
                    imgBottom?.draw(canvas, 1, 0, 96 - imgBottom.height)
                }
            }
        }
    }

    private val cmd_usegoodsnum = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 8
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_usegoodsnum")
                    val b = Player.sGoodsList.useGoodsNum(get2ByteInt(code, start),
                            get2ByteInt(code, start + 2), get2ByteInt(code, start + 4))
                    if (!b) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 6))
                    }
                    return false
                }
            }
        }
    }

    private val cmd_randrade = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_randrade")
                    if ((random() * 1000).toInt() <= get2ByteInt(code, start)) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 2))
                    }
                    return false
                }
            }
        }
    }

    // 0-6中用到
    private val cmd_menu = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            var i = 2
            while (code[start + i].toInt() != 0) ++i
            return start + i + 1
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                var finished = false
                val rvAddr = get2ByteInt(code, start)

                val items by lazy {
                    val stringItems = code.getCString(start+2).gbkString().split(' ')
                    println(stringItems)
                    stringItems.toTypedArray()
                }

                val menu = ScreenCommonMenu(items) {
                    ScriptResources.variables[rvAddr] = it
                    finished = true
                }

                override fun process(): Boolean {
                    cmdPrint("cmd_menu")
                    menu.reset()
                    finished = false
                    delagete.pushScreen(menu)
                    return true
                }

                override fun draw(canvas: Canvas) {
                    menu.draw(canvas)
                }

                override fun onKeyDown(key: Int) {
                    menu.onKeyDown(key)
                }

                override fun onKeyUp(key: Int) {
                    menu.onKeyUp(key)
                }

                override fun update(delta: Long): Boolean {
                    if (finished) return false
                    menu.update(delta)
                    return true
                }
            }
        }
    }

    private val cmd_testmoney = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 6
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_testmoney")
                    if (Player.sMoney < get4BytesInt(code, start)) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 4))
                    }
                    return false
                }
            }
        }
    }

    // 伏魔记未用到
    private val cmd_callchapter = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            throw NotImplementedError("cmd_callchapter")
        }
    }

    private val cmd_discmp = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 8
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_discmp")
                    val `var` = ScriptResources.variables[get2ByteInt(code, start)]
                    val num = get2ByteInt(code, start + 2)
                    if (`var` < num) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 4))
                    } else if (`var` > num) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 6))
                    }
                    return false
                }
            }
        }
    }

    private val cmd_return = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            throw NotImplementedError("cmd_return")
        }
    }

    // 伏魔记未用到
    private val cmd_timemsg = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            var i = 2
            while (code[start + i].toInt() != 0) ++i
            return start + i + 1
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            throw NotImplementedError("cmd_timemsg")
        }
    }

    // 0-6
    private val cmd_disablesave = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_disablesave")
                    Global.disableSave = true
                    return false
                }
            }
        }
    }

    // 0-6
    private val cmd_enablesave = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                override fun process(): Boolean {
                    cmdPrint("cmd_enablesave")
                    Global.disableSave = false
                    return false
                }
            }
        }
    }

    // 伏魔记未用到
    private val cmd_gamesave = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {
                private var end = false
                override fun process(): Boolean {
                    cmdPrint("cmd_gamesave")
                    val view = ScreenSaveLoadGame(ScreenSaveLoadGame.Operate.SAVE)
                    view.callback = {
                        end = true
                    }
                    delagete.pushScreen(view)
                    end = false
                    return true
                }

                override fun update(delta: Long): Boolean {
                    return !end
                }
            }
        }
    }

    // 伏魔记未用到
    private val cmd_seteventtimer = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            throw NotImplementedError("cmd_seteventtimer")
        }
    }

    private val cmd_enableshowpos = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return OperateNop.nop
//            throw NotImplementedError("cmd_enableshowpos")
        }
    }

    private val cmd_disableshowpos = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return OperateNop.nop
//            throw NotImplementedError("cmd_disableshowpos")
        }
    }

    private val cmd_setto = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 4
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_setto")
                    ScriptResources.variables[get2ByteInt(code, start + 2)] = ScriptResources.variables[get2ByteInt(code, start)]
                    return false
                }
            }
        }
    }

    private val cmd_testgoodsnum = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 10
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
            return object : OperateAdapter() {

                override fun process(): Boolean {
                    cmdPrint("cmd_testgoodsnum")
                    val goodsnum = Player.sGoodsList.getGoodsNum(get2ByteInt(code, start),
                            get2ByteInt(code, start + 2))
                    val num = get2ByteInt(code, start + 4)
                    if (goodsnum == num) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 6))
                    } else if (goodsnum > num) {
                        mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 8))
                    }
                    return false
                }
            }
        }
    }

    private val cmd_setarmstoss = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
//            val enable = get2ByteInt(code, start)
//            throw NotImplementedError("cmd_setarmstoss")
            return OperateNop.nop
        }
    }

    private val cmd_setfightmiss = object : Command {

        override fun getNextPos(code: ByteArray, start: Int): Int {
            return start + 2
        }

        override fun getOperate(code: ByteArray, start: Int): Operate {
//            val enable = get2ByteInt(code, start)
//            throw NotImplementedError("cmd_setfightmiss")
            return OperateNop.nop
        }
    }

    init {
        mCmds = arrayOf(
                cmd_music,
                cmd_loadmap,
                cmd_createactor,
                cmd_deletenpc,
                null,
                null,
                cmd_move,
                null,
                null,
                cmd_callback,
                cmd_goto,
                cmd_if,
                cmd_set,
                cmd_say,
                cmd_startchapter,
                null,
                cmd_screens,
                null,
                null,
                null,
                cmd_gameover,
                cmd_ifcmp,
                cmd_add,
                cmd_sub,
                cmd_setcontrolid,
                null,
                cmd_setevent,
                cmd_clrevent,
                cmd_buy,
                cmd_facetoface,
                cmd_movie,
                cmd_choice,
                cmd_createbox,
                cmd_deletebox,
                cmd_gaingoods,
                cmd_initfight,
                cmd_fightenable,
                cmd_fightdisenable,
                cmd_createnpc,
                cmd_enterfight,
                cmd_deleteactor,
                cmd_gainmoney,
                cmd_usemoney,
                cmd_setmoney,
                cmd_learnmagic,
                cmd_sale,
                cmd_npcmovemod,
                cmd_message,
                cmd_deletegoods,
                cmd_resumeactorhp,
                cmd_actorlayerup,
                cmd_boxopen,
                cmd_delallnpc,
                cmd_npcstep,
                cmd_setscenename,
                cmd_showscenename,
                cmd_showscreen,
                cmd_usegoods,
                cmd_attribtest,
                cmd_attribset,
                cmd_attribadd,
                cmd_showgut,
                cmd_usegoodsnum,
                cmd_randrade,
                cmd_menu,
                cmd_testmoney,
                cmd_callchapter,
                cmd_discmp,
                cmd_return,
                cmd_timemsg,
                cmd_disablesave,
                cmd_enablesave,
                cmd_gamesave,
                cmd_seteventtimer,
                cmd_enableshowpos,
                cmd_disableshowpos,
                cmd_setto,
                cmd_testgoodsnum,
                cmd_setfightmiss,// TODO: 和 cmd_setarmstoss 那个在前面?
                cmd_setarmstoss)
    }

    fun setScreenMainGame(screenMainGame: ScreenMainGame) {
        mScreenMainGame = screenMainGame
    }

//    fun loadScript(resGut: ResGut) {
//        mScript = resGut
//    }

    fun loadScript(type: Int, index: Int): Boolean {
        mScript = DatLib.getRes(DatLib.ResType.GUT, type, index) as ResGut
        return mScript != null
    }

    private interface Command {

        /**
         * 得到下一条指令的位置
         *
         * @param code
         * 指令缓冲区
         * @param start
         * 要执行的指令的数据开始位置
         * @return 小于0结束，大于0为下一条指令的位置
         */
        fun getNextPos(code: ByteArray, start: Int): Int

        fun getOperate(code: ByteArray, start: Int): Operate
    }

    companion object {
        val instance: ScriptProcess by lazy {
            ScriptProcess()
        }

        fun get2ByteInt(data: ByteArray, start: Int): Int {
            return data[start].toInt() and 0xFF or (data[start + 1].toInt() shl 8 and 0xFF00)
        }

        fun get4BytesInt(data: ByteArray, start: Int): Int {
            return (data[start].toInt() and 0xFF or (data[start + 1].toInt() shl 8 and 0xFF00)
                    or (data[start + 2].toInt() shl 16 and 0xFF0000) or (data[start + 3].toInt() shl 24))
        }

        fun getStringBytes(data: ByteArray, start: Int): ByteArray {
            var i = 0
            while (data[start + i].toInt() != 0)
                ++i

            val rlt = ByteArray(++i)
            System.arraycopy(data, start, rlt, 0, i)

            return rlt
        }
        var cmdDebug: Boolean = true
        fun cmdPrint(msg: String) {
            if (cmdDebug)
                println(msg)
        }
    }
}
