package fmj.script

import fmj.Global
import fmj.ScreenViewType
import fmj.characters.Character
import fmj.characters.Direction
import fmj.characters.Player
import fmj.combat.Combat
import fmj.gamemenu.ScreenCommonMenu
import fmj.gamemenu.ScreenGoodsList
import fmj.goods.BaseGoods
import fmj.graphics.TextRender
import fmj.graphics.Util
import fmj.lib.DatLib
import fmj.lib.ResGut
import fmj.lib.ResSrs
import fmj.scene.ScreenMainGame
import fmj.views.ScreenDelegate
import fmj.views.ScreenSaveLoadGame
import graphics.*

import java.*

typealias CommandMaker = (code: ByteArray, start: Int) -> Pair<Int, Command>

private fun makeInstruct(it: CommandMaker): CommandMaker {
    return it
}

inline fun makeCommand(crossinline run: () -> Operate?): Command {
    return object: Command() {
        override fun run(delegate: ScreenDelegate): Operate? {
            return run()
        }
    }
}

class ScriptProcess private constructor() {
    lateinit var delegate: ScreenDelegate

    private var mScript: ResGut? = null

    private val mCmds: Array<CommandMaker?>

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

            val operateList = ArrayList<Command>()

            while (pointer < code.size) {
                map.put(pointer, iOfOper)
                ++iOfOper
                println("pointer: $pointer")
                val cmdCode = code[pointer].toInt() and 0xFF
                println("cmdCode: $cmdCode")
                val cmdMaker = mCmds[cmdCode]
                if (cmdMaker != null) {
                    val (nextPos, operate) = cmdMaker(code, pointer + 1)
                    operateList.add(operate)
                    pointer = nextPos
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
/*





    // 伏魔记未用到



    /**
     * 序号 种类
     */







    // 伏魔记未用到

    // 伏魔记未用到

    // 伏魔记未用到




    // 0-6中用到
    // 伏魔记未用到

    // 伏魔记未用到
    // 0-6

    // 0-6

    // 伏魔记未用到
    // 伏魔记未用到





 */

    init {
        val cmd_music = makeInstruct { _, start ->
            println("cmd_music not implemented")
            Pair(start+4, OperateNop.nop)
        }

        val cmd_loadmap = makeInstruct { code, start ->
            val type = code[start].toInt() and 0xFF or (code[start + 1].toInt() shl 8 and 0xFF00)
            val index = code[start + 2].toInt() and 0xFF or (code[start + 3].toInt() shl 8 and 0xFF00)
            val x = code[start + 4].toInt() and 0xFF or (code[start + 5].toInt() shl 8 and 0xFF00)
            val y = code[start + 6].toInt() and 0xFF or (code[start + 7].toInt() shl 8 and 0xFF00)

            val cmd = makeCommand {
                cmdPrint("cmd_loadmap type=$type index=$index x=$x y=$y")

                delegate.mainScreen.loadMap(type, index, x, y)

                object: OperateDrawOnce() {
                    override fun drawOnce(canvas: Canvas) {
                        delegate.mainScreen.drawScene(canvas)
                    }

                }
            }
            Pair(start + 8, cmd)
        }

        val cmd_createactor = makeInstruct { code, start ->
            val actor = get2ByteInt(code, start)
            val x = get2ByteInt(code, start + 2)
            val y = get2ByteInt(code, start + 4)

            val cmd = makeCommand {
                cmdPrint("cmd_createactor $actor at ($x, $y)")

                delegate.mainScreen.createActor(actor, x, y)

                object: OperateDrawOnce() {
                    override fun drawOnce(canvas: Canvas) {
                        delegate.mainScreen.drawScene(canvas)
                    }
                }
            }
            Pair(start + 6, cmd)
        }

        val cmd_deletenpc = makeInstruct { code, start ->
            val npc = get2ByteInt(code, start)
            val cmd = makeCommand {
                cmdPrint("cmd_deletenpc $npc")
                delegate.mainScreen.deleteNpc(npc)
                null
            }
            Pair(start + 2, cmd)
        }

        val cmd_move = makeInstruct { code, start ->
            val npcId = get2ByteInt(code, start)
            val dstX = get2ByteInt(code, start + 2)
            val dstY = get2ByteInt(code, start + 4)

            val cmd = makeCommand {
                val npc = delegate.mainScreen.getNPC(npcId)
                cmdPrint("cmd_move ${npc.name} to ($dstX, $dstY)")

                object : Operate() {
                    private var time: Long = 400

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

                    override fun onKeyUp(key: Int) {}

                    override fun onKeyDown(key: Int) {}

                    override fun draw(canvas: Canvas) {
                        delegate.mainScreen.drawScene(canvas)
                    }
                }
            }
            Pair(start + 6, cmd)
        }

        val cmd_callback = makeInstruct { _, start ->
            val cmd = makeCommand {
                cmdPrint("cmd_callback")
                delegate.mainScreen.exitScript()
                null
            }
            Pair(start, cmd)
        }

        val cmd_goto = makeInstruct { code, start ->
            val address = get2ByteInt(code, start)

            val cmd = makeCommand {
                cmdPrint("cmd_goto from $start to $address")
                // TODO: 无需通过mainscreen
                delegate.mainScreen.gotoAddress(address)
                null
            }
            Pair(start + 2, cmd)
        }

        val cmd_if = makeInstruct { code, start ->
            val va = get2ByteInt(code, start)
            val address = get2ByteInt(code, start + 2)

            val cmd = makeCommand {
                val value = ScriptResources.globalEvents[va]
                cmdPrint("cmd_if $va(=$value) goto $address")
                if (value) {
                    delegate.mainScreen.gotoAddress(address)
                }
                null
            }
            Pair(start + 4, cmd)
        }

        val cmd_set = makeInstruct { code, start ->
            val id = get2ByteInt(code, start)
            val value = get2ByteInt(code, start + 2)

            val cmd = makeCommand {
                cmdPrint("cmd_set $id = $value")
                ScriptResources.variables[id] = value
                null
            }
            Pair(start + 4, cmd)
        }

        val cmd_say = makeInstruct { code, start ->
            val picNum = get2ByteInt(code, start)
            val text = getStringBytes(code, start + 2)
            val next = start + 2 + text.size
            val headImg = DatLib.getPic(1, picNum, allowNull = true)

            var iOfText = 0
            var iOfNext = 0
            var isAnyKeyDown = false
            val rWithPic = RectF(9f, 50f, 151f, 96 - 0.5f) // 有图边框
            val rWithTextT = Rect(44, 58, 145, 75) // 上
            val rWithTextB = Rect(14, 76, 145, 93) // 下
            val rWithoutPic = RectF(9f, 55f, 151f, 96 - 0.5f) // 无图边框
            val rWithoutTextT = Rect(14, 58, 145, 75) // 上
            val rWithoutTextB = Rect(14, 76, 145, 93) // 下
            val paint = Paint()
            paint.color = Global.COLOR_BLACK
            paint.style = Paint.Style.FILL_AND_STROKE

            val cmd = makeCommand {
                cmdPrint("cmd_say ${text.gbkString()}")
                iOfText = 0
                iOfNext = 0
                object: Operate() {
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
            Pair(next, cmd)
        }

        val cmd_startchapter = makeInstruct { code, start ->
            val type = code[start].toInt() and 0xFF or (code[start + 1].toInt() shl 8 and 0xFF)
            val index = code[start + 2].toInt() and 0xFF or (code[start + 3].toInt() shl 8 and 0xFF)

            val cmd = makeCommand {
                cmdPrint("cmd_startchapter $type $index")
                delegate.mainScreen.startChapter(type, index)
                null
            }
            Pair(start + 4, cmd)
        }

        val cmd_screens = makeInstruct { code, start ->
            val x = get2ByteInt(code, start)
            val y = get2ByteInt(code, start + 2)

            val cmd = makeCommand {
                cmdPrint("cmd_screens ($x,$y)")
                delegate.mainScreen.setMapScreenPos(x, y)
                null
            }
            Pair(start + 4, cmd)
        }

        val cmd_gameover = makeInstruct { _, start ->
            val cmd = makeCommand {
                cmdPrint("cmd_gameover")
                delegate.changeScreen(ScreenViewType.SCREEN_MENU)
                null
            }
            Pair(start, cmd)
        }

        val cmd_ifcmp = makeInstruct { code, start ->
            val id = get2ByteInt(code, start)
            val other = get2ByteInt(code, start + 2)
            val addr = get2ByteInt(code, start + 4)

            val cmd = makeCommand {
                val value = ScriptResources.variables[id]
                cmdPrint("cmd_ifcmp $id(=$value) vs $other goto $addr")
                if (value == other) {
                    delegate.mainScreen.gotoAddress(addr)
                }
                null
            }
            Pair(start + 6, cmd)
        }

        val cmd_add = makeInstruct { code, start ->
            val va = get2ByteInt(code, start)
            val value = get2ByteInt(code, start + 2)

            val cmd = makeCommand {
                cmdPrint("cmd_add")
                ScriptResources.variables[va] += value
                null
            }

            Pair(start+4, cmd)
        }

        val cmd_sub = makeInstruct { code, start ->
            val va = get2ByteInt(code, start)
            val value = get2ByteInt(code, start + 2)

            Pair(start+4, makeCommand {
                cmdPrint("cmd_sub")
                ScriptResources.variables[va] -= value
                null
            })
        }

        val cmd_setcontrolid = makeInstruct { code, start ->
            // start + 2
            throw NotImplementedError("cmd_setcontrolid")
        }

        val cmd_setevent = makeInstruct { code, start ->
            val event = get2ByteInt(code, start)

            Pair(start + 2, makeCommand {
                cmdPrint("cmd_setevent $event")
                ScriptResources.setEvent(event)
                null
            })
        }

        val cmd_clrevent = makeInstruct { code, start ->
            val event = get2ByteInt(code, start)

            Pair(start + 2, makeCommand {
                cmdPrint("cmd_clrevent $event")
                ScriptResources.clearEvent(event)
                null
            })
        }

        val cmd_buy = makeInstruct { code, start ->
            val bytes = getStringBytes(code, start)

            Pair(start + bytes.size, makeCommand {
                cmdPrint("cmd_buy")
                OperateBuy(bytes, delegate)
            })
        }

        val cmd_facetoface = makeInstruct { code, start ->
            val id0 = get2ByteInt(code, start)
            val id1 = get2ByteInt(code, start + 2)

            fun getCharacter(id: Int): Character {
                return if (id == 0) {
                    mScreenMainGame!!.player!!
                } else mScreenMainGame!!.getNPC(id)
            }
            Pair(start+4, makeCommand {
                cmdPrint("cmd_facetoface")
                val c1 = getCharacter(id0)
                val c2 = getCharacter(id1)
                val p1 = c1.posInMap
                val p2 = c2.posInMap
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

                object : OperateDrawOnce() {
                    override fun drawOnce(canvas: Canvas) {
                        mScreenMainGame!!.drawScene(canvas)
                    }
                }
            })
        }
        val cmd_movie = makeInstruct { code, start ->
            val type = get2ByteInt(code, start)
            val index = get2ByteInt(code, start + 2)
            val x = get2ByteInt(code, start + 4)
            val y = get2ByteInt(code, start + 6)
            val ctl = get2ByteInt(code, start + 8)

            Pair(start+10, makeCommand {
                cmdPrint("cmd_movie")
                val movie = DatLib.getRes(DatLib.ResType.SRS, type, index) as ResSrs? ?: return@makeCommand null
                movie.setIteratorNum(5)
                movie.startAni()
                object : Operate() {
                    internal var downKey = 0
                    internal var isAnyKeyPressed = false

                    override fun update(delta: Long): Boolean {
                        return if ((ctl == 1 || ctl == 3) && isAnyKeyPressed) {
                            false
                        } else movie.update(delta)
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
            })
        }
        val cmd_choice = makeInstruct { code, start ->
            var choice1: ByteArray = getStringBytes(code, start)
            var choice2: ByteArray = getStringBytes(code, start + choice1.size)
            val addrOffset = choice1.size + choice2.size
            val address = get2ByteInt(code, start + addrOffset)
            val w: Int
            val tmp: ByteArray?
            val bg: Bitmap
            val bgx: Int
            val bgy: Int

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

            Pair(0, makeCommand {
                cmdPrint("cmd_choice")
                object : Operate() {
                    private var curChoice = 0
                    private var hasSelect = false

                    private var mLastDownKey = -1

                    override fun update(delta: Long): Boolean {
                        if (hasSelect) {
                            if (curChoice == 1) {
                                mScreenMainGame!!.gotoAddress(address)
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
            })
        }

        val cmd_createbox = makeInstruct { code, start ->
            val id = get2ByteInt(code, start)
            val boxId = get2ByteInt(code, start + 2)
            val x = get2ByteInt(code, start + 4)
            val y = get2ByteInt(code, start + 6)
            Pair(start+8, makeCommand {
                val box = mScreenMainGame!!.createBox(id, boxId, x, y)
                cmdPrint("cmd_createbox ${box.name} at ($x,$y)")
                null
            })
        }
        val cmd_deletebox = makeInstruct { code, start ->
            val boxid = get2ByteInt(code, start)
            Pair(start+2, makeCommand {
                cmdPrint("cmd_deletebox")
                mScreenMainGame!!.deleteBox(boxid)
                null
            })
        }

        val cmd_gaingoods = makeInstruct { code, start ->
            val goods = DatLib.getRes(DatLib.ResType.GRS,
                    get2ByteInt(code, start), get2ByteInt(code, start + 2)) as BaseGoods

            val msg = "获得:" + goods.name

            Pair(start+4, makeCommand {
                cmdPrint("cmd_gaingoods ${goods.name}")
                goods.goodsNum = 1
                Player.sGoodsList.addGoods(goods.type, goods.index)
                object : Operate() {
                    internal var time: Long = 0
                    internal var isAnyKeyPressed = false
                    internal var downKey = 0

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
            })
        }

        val cmd_initfight = makeInstruct { code, start ->
            val scrb = get2ByteInt(code, start + 16)
            val scrl = get2ByteInt(code, start + 18)
            val scrr = get2ByteInt(code, start + 20)
            val arr = IntArray(8)
            for (i in 0..7) {
                arr[i] = get2ByteInt(code, start + i * 2)
            }
            Pair(start+22, makeCommand {
                cmdPrint("cmd_initfight")
                Combat.InitFight(arr, scrb,
                        scrl, scrr)
                Combat.SetDelegate(delegate)
                null
            })
        }

        val cmd_fightenable = makeInstruct { code, start ->
            Pair(start, makeCommand {
                cmdPrint("cmd_fightenable")
                Combat.Companion.FightEnable()
                null
            })
        }

        val cmd_fightdisenable = makeInstruct { code, start ->
            Pair(start, makeCommand {
                cmdPrint("cmd_fightdisable")
                Combat.Companion.FightDisable()
                null
            })
        }

        val cmd_createnpc = makeInstruct { code, start ->
            val id = get2ByteInt(code, start)
            val resId = get2ByteInt(code, start + 2)
            val x = get2ByteInt(code, start + 4)
            val y = get2ByteInt(code, start + 6)
            Pair(start+8, makeCommand {
                val npc = mScreenMainGame!!.createNpc(id, resId, x, y)
                cmdPrint("cmd_createnpc ${npc.name} at ${npc.posInMap}")
                null
            })
        }

        val cmd_enterfight = makeInstruct { code, start ->
            Pair(start+30, makeCommand {
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
                null
            })
        }

        val cmd_deleteactor = makeInstruct { code, start ->
            val id = get2ByteInt(code, start)
            Pair(start+2, makeCommand {
                cmdPrint("cmd_deleteactor")
                mScreenMainGame!!.deleteActor(id)
                null
            })
        }

        val cmd_gainmoney = makeInstruct { code, start ->
            val value = get4BytesInt(code, start)
            Pair(start+4, makeCommand {
                cmdPrint("cmd_gainmoney")
                Player.sMoney += value
                null
            })
        }

        val cmd_usemoney = makeInstruct { code, start ->
            val value = get4BytesInt(code, start)
            Pair(start+4, makeCommand {
                cmdPrint("cmd_usemoney")
                Player.sMoney -= value
                null
            })
        }

        val cmd_setmoney = makeInstruct { code, start ->
            val money = get4BytesInt(code, start)
            Pair(start+4, makeCommand {
                Player.sMoney = money
                cmdPrint("cmd_setmoney ${money}")
                null
            })
        }

        val cmd_learnmagic = makeInstruct { code, start ->
            Pair(start + 6, makeCommand {
                cmdPrint("cmd_learmagic")

                object : Operate() {

                    internal var isAnyKeyDown: Boolean = false
                    internal var timeCnt: Long = 0

                    override fun update(delta: Long): Boolean {
                        timeCnt += delta
                        return timeCnt < 1000 && !isAnyKeyDown
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
            })
        }

        val cmd_sale = makeInstruct { code, start ->
            Pair(start, makeCommand {
                ScriptProcess.cmdPrint("cmd_sale")

                val op = OperateSale()
                val list = mutableListOf<BaseGoods>()
                list.addAll(Player.sGoodsList.goodsList)
                list.addAll(Player.sGoodsList.equipList)
                delegate.pushScreen(ScreenGoodsList(list, op, ScreenGoodsList.Mode.Sale))
                op
            })
        }

        val cmd_npcmovemod = makeInstruct { code, start ->
            val id = get2ByteInt(code, start)
            val state = get2ByteInt(code, start + 2)

            Pair(start+4, makeCommand {
                cmdPrint("cmd_npcmovemod")
                mScreenMainGame!!.getNPC(id) .state = Character.State.fromInt(state)
                null
            })
        }
        val cmd_message = makeInstruct { code, start ->
            val msg = getStringBytes(code, start)
            Pair(start+msg.size, makeCommand {
                cmdPrint("cmd_message ${msg.gbkString()}")

                object : Operate() {
                    internal var downKey: Int = 0
                    internal var isAnyKeyDown: Boolean = false

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
            })
        }

        val cmd_deletegoods = makeInstruct { code, start ->
            val type = get2ByteInt(code, start)
            val index = get2ByteInt(code, start + 2)
            val address = get2ByteInt(code, start + 2)

            Pair(start+6, makeCommand {
                cmdPrint("cmd_deletegoods")

                val r = Player.sGoodsList.deleteGoods(type, index)
                if (!r) {
                    mScreenMainGame!!.gotoAddress(address)
                }
                null
            })
        }

        val cmd_resumeactorhp = makeInstruct { code, start ->
            val id = get2ByteInt(code, start)
            val value = get2ByteInt(code, start + 2)

            Pair(start+4, makeCommand {
                cmdPrint("cmd_resumeactorhp")
                val p = mScreenMainGame!!.getPlayer(id)
                if (p != null) {
                    p.hp = p.maxHP * value / 100
                }
                null
            })
        }

        val cmd_actorlayerup = makeInstruct { code, start ->
            Pair(start + 4, makeCommand {
                cmdPrint("cmd_actorlayerup TODO")

                object : Operate() { // TODO

                    internal var exit = false

                    override fun update(delta: Long): Boolean {
                        return !exit
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

            })
        }

        val cmd_boxopen = makeInstruct { code, start ->
            val id = get2ByteInt(code, start)

            Pair(start + 2, makeCommand {
                cmdPrint("cmd_boxopen")
                val box = mScreenMainGame!!.getNPC(id)
                box.step = 1
                null
            })
        }

        val cmd_delallnpc = makeInstruct { code, start ->
            Pair(start, makeCommand {
                cmdPrint("cmd_delallnpc")
                mScreenMainGame!!.deleteAllNpc()
                null
            })
        }

        val cmd_npcstep = makeInstruct { code, start ->
            val id = get2ByteInt(code, start) // 0为主角
            val faceto = get2ByteInt(code, start + 2)
            val step = get2ByteInt(code, start + 4)
            val d = when (faceto) {
            // 与资源文件里的不一样
                0 -> Direction.North
                1 -> Direction.East
                2 -> Direction.South
                3 -> Direction.West
                else -> Direction.South
            }

            Pair(start + 6, makeCommand {
                cmdPrint("cmd_npcstep $id $d step=$step")
                val interval: Long
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

                object : Operate() {
                    internal var time: Long = 0

                    override fun update(delta: Long): Boolean {
                        time += delta
                        return time < interval
                    }

                    override fun onKeyUp(key: Int) {}

                    override fun onKeyDown(key: Int) {}

                    override fun draw(canvas: Canvas) {
                        mScreenMainGame!!.drawScene(canvas)
                    }
                }

            })
        }
        val cmd_setscenename = makeInstruct { code, start ->
            val bytes = getStringBytes(code, start)
            val name = bytes.gbkString()
            Pair(start+bytes.size, makeCommand {
                cmdPrint("cmd_setscenname $name")
                mScreenMainGame!!.sceneName = name
                null
            })
        }

        val cmd_showscenename = makeInstruct { code, start ->
            Pair(start, makeCommand {
                cmdPrint("cmd_showscenename")
                val text = mScreenMainGame!!.sceneName
                var time: Long = 0
                var isAnyKeyDown = false

                object : Operate() {
                    override fun update(delta: Long): Boolean {
                        time += delta
                        if (time > 100 && isAnyKeyDown) {
                            isAnyKeyDown = false
                            return false
                        }
                        return time < 1000
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
            })
        }
        val cmd_showscreen = makeInstruct { code, start ->
            Pair(start, makeCommand {
                cmdPrint("cmd_showscreen")
                object : OperateDrawOnce() {
                    override fun drawOnce(canvas: Canvas) {
                        mScreenMainGame!!.drawScene(canvas)
                    }
                }
            })
        }

        val cmd_usegoods = makeInstruct { code, start ->
            val type = get2ByteInt(code, start)
            val index = get2ByteInt(code, start + 2)
            val address = get2ByteInt(code, start + 4)

            Pair(start + 6, makeCommand {
                cmdPrint("cmd_usegoods")
                val b = Player.sGoodsList.deleteGoods(type, index)
                if (!b) {
                    mScreenMainGame!!.gotoAddress(address)
                }
                null
            })
        }

        val cmd_attribtest = makeInstruct { code, start ->
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)
            val addr1 = get2ByteInt(code, start+6)
            val addr2 = get2ByteInt(code, start+8)
            Pair(start+10, makeCommand {
                cmdPrint("cmd_attribtest $actor $type $value")
                val player = mScreenMainGame?.getPlayer(actor) ?: return@makeCommand null
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
                null
            })
        }
        val cmd_attribset = makeInstruct { code, start ->
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)

            Pair(start + 6, makeCommand {
                cmdPrint("cmd_attribset $actor $type $value")
                val player = mScreenMainGame?.getPlayer(actor) ?: return@makeCommand null
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
                null
            })
        }

        val cmd_attribadd = makeInstruct { code, start ->
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)

            Pair(start + 6, makeCommand {
                cmdPrint("cmd_attribadd $actor $type $value")
                val player = mScreenMainGame?.getPlayer(actor) ?: return@makeCommand null

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
                null
            })
        }

        val cmd_showgut = makeInstruct { code, start ->
            val bytes = getStringBytes(code, start+4)
            val text = bytes.gbkString()
            val top = code[start].toInt() and 0xFF or (code[start + 1].toInt() shl 8 and 0xFF00)
            val btm = code[start + 2].toInt() and 0xFF or (code[start + 3].toInt() shl 8 and 0xFF00)
            val imgTop = DatLib.getPic(5, top, true)
            val imgBottom = DatLib.getPic(5, btm, true)

            Pair(start+bytes.size+4, makeCommand {
                cmdPrint("cmd_showgut topimg = $top, btmimg = $btm")
                var goon = true
                var interval: Long = 50
                var timeCnt: Long = 0
                var step = 1
                var curY = if (imgBottom != null) 96 - imgBottom.height else 96
                val rect = Rect(0, imgTop?.height ?: 0, 160, curY)

                object : Operate() {
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
            })
        }

        val cmd_usegoodsnum = makeInstruct { code, start ->
            Pair(start+8, makeCommand {
                cmdPrint("cmd_usegoodsnum")
                val b = Player.sGoodsList.useGoodsNum(get2ByteInt(code, start),
                        get2ByteInt(code, start + 2), get2ByteInt(code, start + 4))
                if (!b) {
                    mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 6))
                }
                null
            })
        }

        val cmd_randrade = makeInstruct { code, start ->
            Pair(start + 4, makeCommand {
                cmdPrint("cmd_randrade")
                if ((random() * 1000).toInt() <= get2ByteInt(code, start)) {
                    mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 2))
                }
                null
            })
        }

        val cmd_menu = makeInstruct { code, start ->
            val i = start + 2
            val bytes = code.getCString(i)
            val stringItems = bytes.gbkString().split(' ')
            Pair(start + bytes.size + 3, makeCommand {
                cmdPrint("cmd_menu")

                object : OperateAdapter() {
                    var finished = false
                    val rvAddr = get2ByteInt(code, start)

                    val items by lazy {
                        println(stringItems)
                        stringItems.toTypedArray()
                    }

                    val menu = ScreenCommonMenu(items) {
                        ScriptResources.variables[rvAddr] = it
                        finished = true
                    }

                    init {
                        delagete.pushScreen(menu)
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
            })
        }

        val cmd_testmoney = makeInstruct { code, start ->
            val money = get4BytesInt(code, start)
            val address = get2ByteInt(code, start + 4)
            Pair(start + 6, makeCommand {
                cmdPrint("cmd_testmoney")
                if (Player.sMoney < money) {
                    mScreenMainGame!!.gotoAddress(address)
                }
                null
            })
        }

        val cmd_callchapter = makeInstruct { code, start ->
            Pair(start + 4, makeCommand {
                throw NotImplementedError("cmd_callchapter")
            })
        }

        val cmd_discmp = makeInstruct { code, start ->
            Pair(start + 8, makeCommand {
                cmdPrint("cmd_discmp")
                val `var` = ScriptResources.variables[get2ByteInt(code, start)]
                val num = get2ByteInt(code, start + 2)
                if (`var` < num) {
                    mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 4))
                } else if (`var` > num) {
                    mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 6))
                }
                null
            })
        }

        val cmd_return = makeInstruct { code, start ->
//            return start
            throw NotImplementedError("cmd_return")
        }

        val cmd_timemsg = makeInstruct { code, start ->
//            override fun getNextPos(code: ByteArray, start: Int): Int {
//                var i = 2
//                while (code[start + i].toInt() != 0) ++i
//                return start + i + 1
//            }
            throw NotImplementedError("cmd_return")
        }

        val cmd_disablesave = makeInstruct { code, start ->
            Pair(start, makeCommand {
                cmdPrint("cmd_disablesave")
                Global.disableSave = true
                null
            })
        }

        val cmd_enablesave = makeInstruct { code, start ->
            Pair(start, makeCommand {
                cmdPrint("cmd_enablesave")
                Global.disableSave = false
                null
            })
        }

        val cmd_gamesave = makeInstruct { code, start ->
            Pair(start, makeCommand {
                var end = false

                cmdPrint("cmd_gamesave")
                val view = ScreenSaveLoadGame(ScreenSaveLoadGame.Operate.SAVE)
                view.callback = {
                    end = true
                }

                delegate.pushScreen(view)

                object : OperateAdapter() {
                    override fun update(delta: Long): Boolean {
                        return !end
                    }
                }
            })
        }

        val cmd_seteventtimer = makeInstruct { code, start ->
            Pair(start + 4, makeCommand {
                throw NotImplementedError("cmd_seteventtimer")
            })
        }

        val cmd_enableshowpos = makeInstruct { code, start ->
            Pair(start, makeCommand {
                // TODO
                null
            })
        }

        val cmd_disableshowpos = makeInstruct { code, start ->
            Pair(start, makeCommand {
                // TODO
                null
            })
        }

        val cmd_setto = makeInstruct { code, start ->
            Pair(start + 4, makeCommand {
                cmdPrint("cmd_setto")
                ScriptResources.variables[get2ByteInt(code, start + 2)] = ScriptResources.variables[get2ByteInt(code, start)]
                null
            })
        }

        val cmd_testgoodsnum = makeInstruct { code, start ->
            Pair(start + 10, makeCommand {
                cmdPrint("cmd_testgoodsnum")
                val goodsnum = Player.sGoodsList.getGoodsNum(get2ByteInt(code, start),
                        get2ByteInt(code, start + 2))
                val num = get2ByteInt(code, start + 4)
                if (goodsnum == num) {
                    mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 6))
                } else if (goodsnum > num) {
                    mScreenMainGame!!.gotoAddress(get2ByteInt(code, start + 8))
                }
                null
            })
        }

        val cmd_setfightmiss = makeInstruct { code, start ->
            val enable = get2ByteInt(code, start)
            Pair(start + 2, makeCommand {
                // TODO
                null
            })
        }

        val cmd_setarmstoss = makeInstruct { code, start ->
            Pair(start + 2, makeCommand {
                // TODO
                null
            })
        }

        mCmds = arrayOf(
                cmd_music,

                cmd_loadmap,
                cmd_createactor,
                cmd_deletenpc,
                null,
                null,//5

                cmd_move,
                null,
                null,
                cmd_callback,
                cmd_goto,//10

                cmd_if,
                cmd_set,
                cmd_say,
                cmd_startchapter,
                null,//15

                cmd_screens,
                null,
                null,
                null,
                cmd_gameover,//20

                cmd_ifcmp,
                cmd_add,
                cmd_sub,
                cmd_setcontrolid,
                null,//25

                cmd_setevent,
                cmd_setevent,
                cmd_clrevent,
                cmd_buy,
                cmd_facetoface,//30

                cmd_movie,
                cmd_choice,
                cmd_createbox,
                cmd_deletebox,
                cmd_gaingoods, //35

                cmd_initfight,
                cmd_fightenable,
                cmd_fightdisenable,
                cmd_createnpc,
                cmd_enterfight, //40
                cmd_deleteactor,
                cmd_gainmoney,
                cmd_usemoney,
                cmd_setmoney,
                cmd_learnmagic, // 45
                cmd_sale,
                cmd_npcmovemod,
                cmd_message,
                cmd_deletegoods,
                cmd_resumeactorhp,// 50
                cmd_actorlayerup,
                cmd_boxopen,
                cmd_delallnpc,
                cmd_npcstep,
                cmd_setscenename,// 55
                cmd_showscenename,
                cmd_showscreen,
                cmd_usegoods,
                cmd_attribtest,
                cmd_attribset,//60
                cmd_attribadd,
                cmd_showgut,
                cmd_usegoodsnum,
                cmd_randrade,
                cmd_menu,//65
                cmd_testmoney,
                cmd_callchapter,
                cmd_discmp,
                cmd_return,
                cmd_timemsg,//70
                cmd_disablesave,
                cmd_enablesave,
                cmd_gamesave,
                cmd_seteventtimer,
                cmd_enableshowpos,//75
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
