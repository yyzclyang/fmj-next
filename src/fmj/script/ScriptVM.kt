package fmj.script

import fmj.Global
import fmj.ScreenViewType
import fmj.characters.Character
import fmj.characters.Direction
import fmj.characters.Player
import fmj.combat.Combat
import fmj.combat.ui.LearnMagicScreen
import fmj.combat.ui.LevelupScreen
import fmj.combat.ui.MsgScreen
import fmj.gamemenu.ScreenCommonMenu
import fmj.gamemenu.ScreenGoodsList
import fmj.goods.BaseGoods
import fmj.graphics.TextRender
import fmj.graphics.Util
import fmj.lib.DatLib
import fmj.lib.ResGut
import fmj.lib.ResSrs
import fmj.scene.SaveLoadGame
import fmj.views.Control
import fmj.views.GameNode
import fmj.views.ScreenSaveLoadGame
import graphics.*

import java.*

typealias Instruct = (code: ByteArray, start: Int) -> Command

inline fun makeCommand(len: Int, desc: String? = null, crossinline run: (p: ScriptProcess) -> Operate?): Command {
    return object: Command {
        override val description = desc
        override val len = len
        override fun run(p: ScriptProcess): Operate? {
            return run(p)
        }
    }
}

class ScriptVM(override val parent: GameNode): Control {
    private val instructions: Array<Instruct?>

    init {
        fun cmd_music(code: ByteArray, start: Int): Command {
            println("cmd_music not implemented")
            return makeCommand(4) { null }
        }

        fun cmd_loadmap(code: ByteArray, start: Int): Command {
            val type = code[start].toInt() and 0xFF or (code[start + 1].toInt() shl 8 and 0xFF00)
            val index = code[start + 2].toInt() and 0xFF or (code[start + 3].toInt() shl 8 and 0xFF00)
            val x = code[start + 4].toInt() and 0xFF or (code[start + 5].toInt() shl 8 and 0xFF00)
            val y = code[start + 6].toInt() and 0xFF or (code[start + 7].toInt() shl 8 and 0xFF00)

            return makeCommand(8) {
                cmdPrint("cmd_loadmap type=$type index=$index x=$x y=$y")

                game.mainScene.loadMap(type, index, x, y)

                object: OperateDrawOnce() {
                    override fun drawOnce(canvas: Canvas) {
                        game.mainScene.drawScene(canvas)
                    }

                }
            }
        }

        fun cmd_createactor(code: ByteArray, start: Int): Command {
            val actor = get2ByteInt(code, start)
            val x = get2ByteInt(code, start + 2)
            val y = get2ByteInt(code, start + 4)

            return makeCommand(6) {
                cmdPrint("cmd_createactor $actor at ($x, $y)")

                game.mainScene.createActor(actor, x, y)

                object: OperateDrawOnce() {
                    override fun drawOnce(canvas: Canvas) {
                        game.mainScene.drawScene(canvas)
                    }
                }
            }
        }

        fun cmd_deletenpc(code: ByteArray, start: Int): Command {
            val npc = get2ByteInt(code, start)
            return makeCommand(2) {
                cmdPrint("cmd_deletenpc $npc")
                game.mainScene.deleteNpc(npc)
                null
            }
        }

        fun cmd_move(code: ByteArray, start: Int): Command {
            val npcId = get2ByteInt(code, start)
            val dstX = get2ByteInt(code, start + 2)
            val dstY = get2ByteInt(code, start + 4)

            return makeCommand(6) {
                val npc = game.mainScene.getNPC(npcId)
                cmdPrint("cmd_move ${npc.name} to ($dstX, $dstY)")

                object : Operate {
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
                        game.mainScene.drawScene(canvas)
                    }
                }
            }
        }

        fun cmd_callback(code: ByteArray, start: Int): Command {
            return makeCommand(0, "callback") {
                cmdPrint("cmd_callback")
                game.mainScene.exitScript()
                null
            }
        }

        fun cmd_goto(code: ByteArray, start: Int): Command {
            val address = get2ByteInt(code, start)
            val desc = "goto $address"

            return makeCommand(2, desc) {
                cmdPrint("cmd_goto from $start to $address")
                game.gotoAddress(address)
                null
            }
        }

        fun cmd_if(code: ByteArray, start: Int): Command {
            val va = get2ByteInt(code, start)
            val address = get2ByteInt(code, start + 2)
            val desc = "if $va $address"
            return makeCommand(4, desc) {
                val value = ScriptResources.globalEvents[va]
                cmdPrint("cmd_if $va(=$value) goto $address")
                if (value) {
                    game.gotoAddress(address)
                }
                null
            }
        }

        fun cmd_set(code: ByteArray, start: Int): Command {
            val id = get2ByteInt(code, start)
            val value = get2ByteInt(code, start + 2)

            return makeCommand(4) {
                cmdPrint("cmd_set $id = $value")
                ScriptResources.variables[id] = value
                null
            }
        }

        fun cmd_say(code: ByteArray, start: Int): Command {
            val picNum = get2ByteInt(code, start)
            val text = getStringBytes(code, start + 2)
            val headImg = DatLib.getPic(1, picNum, allowNull = true)
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
            val desc = "say $picNum ${text.gbkString()}"

            return makeCommand(2 + text.size, desc) {
                cmdPrint("cmd_say ${text.gbkString()}")
                var iOfText = 0
                var iOfNext = 0
                object: Operate {
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
                            game.mainScene.drawScene(canvas)
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

        fun cmd_startchapter(code: ByteArray, start: Int): Command {
            val type = get2ByteInt(code, start)
            val index = get2ByteInt(code, start + 2)

            return makeCommand(4) {
                cmdPrint("cmd_startchapter $type $index")
                game.mainScene.startChapter(type, index)
                null
            }
        }

        fun cmd_screens(code: ByteArray, start: Int): Command {
            val x = get2ByteInt(code, start)
            val y = get2ByteInt(code, start + 2)

            return makeCommand(4) {
                cmdPrint("cmd_screens ($x,$y)")
                game.mainScene.setMapScreenPos(x, y)
                null
            }
        }

        fun cmd_gameover(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                cmdPrint("cmd_gameover")
                game.changeScreen(ScreenViewType.SCREEN_MENU)
                null
            }
        }

        fun cmd_ifcmp(code: ByteArray, start: Int): Command {
            val id = get2ByteInt(code, start)
            val other = get2ByteInt(code, start + 2)
            val addr = get2ByteInt(code, start + 4)

            return makeCommand(6) {
                val value = ScriptResources.variables[id]
                cmdPrint("cmd_ifcmp $id(=$value) vs $other goto $addr")
                if (value == other) {
                    game.gotoAddress(addr)
                }
                null
            }
        }

        fun cmd_add(code: ByteArray, start: Int): Command {
            val va = get2ByteInt(code, start)
            val value = get2ByteInt(code, start + 2)

            return makeCommand(4) {
                cmdPrint("cmd_add")
                ScriptResources.variables[va] += value
                null
            }
        }

        fun cmd_sub(code: ByteArray, start: Int): Command {
            val va = get2ByteInt(code, start)
            val value = get2ByteInt(code, start + 2)

            return makeCommand(4) {
                cmdPrint("cmd_sub")
                ScriptResources.variables[va] -= value
                null
            }
        }

        fun cmd_setcontrolid(code: ByteArray, start: Int): Command {
            return makeCommand(2) {
                val id = get2ByteInt(code, start)
                cmdPrint("cmd_setcontrolid $id")
                game.mainScene.setControlPlayer(id)
                null
            }
        }

        fun cmd_setevent(code: ByteArray, start: Int): Command {
            val event = get2ByteInt(code, start)

            return makeCommand(2) {
                cmdPrint("cmd_setevent $event")
                ScriptResources.setEvent(event)
                null
            }
        }

        fun cmd_clrevent(code: ByteArray, start: Int): Command {
            val event = get2ByteInt(code, start)

            return makeCommand(2) {
                cmdPrint("cmd_clrevent $event")
                ScriptResources.clearEvent(event)
                null
            }
        }

        fun cmd_buy(code: ByteArray, start: Int): Command {
            val bytes = getStringBytes(code, start)

            return makeCommand(bytes.size) {
                cmdPrint("cmd_buy")
                OperateBuy(this, bytes)
            }
        }

        fun cmd_facetoface(code: ByteArray, start: Int): Command {
            val id0 = get2ByteInt(code, start)
            val id1 = get2ByteInt(code, start + 2)

            fun getCharacter(id: Int): Character {
                return if (id == 0) {
                    game.mainScene.player!!
                } else game.mainScene.getNPC(id)
            }
            return makeCommand(4) {
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
                        game.mainScene.drawScene(canvas)
                    }
                }
            }
        }
        fun cmd_movie(code: ByteArray, start: Int): Command {
            val type = get2ByteInt(code, start)
            val index = get2ByteInt(code, start + 2)
            val x = get2ByteInt(code, start + 4)
            val y = get2ByteInt(code, start + 6)
            val ctl = get2ByteInt(code, start + 8)

            return makeCommand(10) {
                cmdPrint("cmd_movie")
                val movie = DatLib.getRes(DatLib.ResType.SRS, type, index) as ResSrs? ?: return@makeCommand null
                movie.setIteratorNum(5)
                movie.start()
                object : Operate {
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
                            game.mainScene.drawScene(canvas)
                        }
                        movie.draw(canvas, x, y)
                    }
                }
            }
        }
        fun cmd_choice(code: ByteArray, start: Int): Command {
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

            val desc = "choice ${choice1.gbkString()} ${choice2.gbkString()} $address"

            return makeCommand(addrOffset+2, desc) {
                cmdPrint("cmd_choice")
                object : Operate {
                    private var curChoice = 0
                    private var hasSelect = false

                    private var mLastDownKey = -1

                    override fun update(delta: Long): Boolean {
                        if (hasSelect) {
                            if (curChoice == 1) {
                                game.gotoAddress(address)
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
                        game.mainScene.drawScene(canvas)
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

        fun cmd_createbox(code: ByteArray, start: Int): Command {
            val id = get2ByteInt(code, start)
            val boxId = get2ByteInt(code, start + 2)
            val x = get2ByteInt(code, start + 4)
            val y = get2ByteInt(code, start + 6)
            return makeCommand(8) {
                val box = game.mainScene.createBox(id, boxId, x, y)
                cmdPrint("cmd_createbox ${box.name} at ($x,$y)")
                null
            }
        }
        fun cmd_deletebox(code: ByteArray, start: Int): Command {
            val boxid = get2ByteInt(code, start)
            return makeCommand(2) {
                cmdPrint("cmd_deletebox")
                game.mainScene.deleteBox(boxid)
                null
            }
        }

        fun cmd_gaingoods(code: ByteArray, start: Int): Command {
            val goods = DatLib.getRes(DatLib.ResType.GRS,
                    get2ByteInt(code, start), get2ByteInt(code, start + 2)) as BaseGoods

            val msg = "获得:" + goods.name

            return makeCommand(4) {
                cmdPrint("cmd_gaingoods ${goods.name}")
                goods.goodsNum = 1
                Player.sGoodsList.addGoods(goods.type, goods.index)
                object : Operate {
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
            }
        }

        fun cmd_initfight(code: ByteArray, start: Int): Command {
            val scrb = get2ByteInt(code, start + 16)
            val scrl = get2ByteInt(code, start + 18)
            val scrr = get2ByteInt(code, start + 20)
            val arr = IntArray(8)
            for (i in 0..7) {
                arr[i] = get2ByteInt(code, start + i * 2)
            }
            return makeCommand(22) {
                cmdPrint("cmd_initfight")
                Combat.InitFight(this, arr, scrb, scrl, scrr)
                null
            }
        }

        fun cmd_fightenable(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                cmdPrint("cmd_fightenable")
                Combat.Companion.FightEnable()
                null
            }
        }

        fun cmd_fightdisenable(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                cmdPrint("cmd_fightdisable")
                Combat.Companion.FightDisable()
                null
            }
        }

        fun cmd_createnpc(code: ByteArray, start: Int): Command {
            val id = get2ByteInt(code, start)
            val resId = get2ByteInt(code, start + 2)
            val x = get2ByteInt(code, start + 4)
            val y = get2ByteInt(code, start + 6)
            return makeCommand(8) {
                val npc = game.mainScene.createNpc(id, resId, x, y)
                cmdPrint("cmd_createnpc ${npc.name} at ${npc.posInMap}")
                null
            }
        }

        fun cmd_enterfight(code: ByteArray, start: Int): Command {
            return makeCommand(30) {
                cmdPrint("cmd_enterfight")
                //					mScreenMainGame.gotoAddress(get2ByteInt(code, start + 28)); // win the fight
                val monstersType = intArrayOf(get2ByteInt(code, start + 2), get2ByteInt(code, start + 4), get2ByteInt(code, start + 6))
                val scr = intArrayOf(get2ByteInt(code, start + 8), get2ByteInt(code, start + 10), get2ByteInt(code, start + 12))
                val evtRnds = intArrayOf(get2ByteInt(code, start + 14), get2ByteInt(code, start + 16), get2ByteInt(code, start + 18))
                val evts = intArrayOf(get2ByteInt(code, start + 20), get2ByteInt(code, start + 22), get2ByteInt(code, start + 24))
                val lossto = get2ByteInt(code, start + 26)
                val winto = get2ByteInt(code, start + 28)
                Combat.EnterFight(this, get2ByteInt(code, start), monstersType, scr, evtRnds, evts, lossto, winto)
                game.exitScript()
                null
            }
        }

        fun cmd_deleteactor(code: ByteArray, start: Int): Command {
            val id = get2ByteInt(code, start)
            return makeCommand(2) {
                cmdPrint("cmd_deleteactor")
                game.mainScene.deleteActor(id)
                null
            }
        }

        fun cmd_gainmoney(code: ByteArray, start: Int): Command {
            val value = get4BytesInt(code, start)
            return makeCommand(4) {
                cmdPrint("cmd_gainmoney")
                Player.sMoney += value
                null
            }
        }

        fun cmd_usemoney(code: ByteArray, start: Int): Command {
            val value = get4BytesInt(code, start)
            return makeCommand(4) {
                cmdPrint("cmd_usemoney")
                Player.sMoney -= value
                null
            }
        }

        fun cmd_setmoney(code: ByteArray, start: Int): Command {
            val money = get4BytesInt(code, start)
            return makeCommand(4) {
                Player.sMoney = money
                cmdPrint("cmd_setmoney ${money}")
                null
            }
        }

        fun cmd_learnmagic(code: ByteArray, start: Int): Command {
            val actorId = get2ByteInt(code, start)
            val type = get2ByteInt(code, start + 2)
            val index = get2ByteInt(code, start + 4)

            val desc = "learnmagic $actorId $type $index"

            return makeCommand(6, desc) {
                cmdPrint("cmd_learmagic")
                val magic = DatLib.getMrs(type, index)
                val player = game.mainScene.getPlayer(actorId)
                player?.learnMagic(magic)
                val playerName = player?.name ?: "E"
                val tip = LearnMagicScreen(this, playerName, magic.magicName)

                object : Operate {

                    var isAnyKeyDown: Boolean = false
                    var timeCnt: Long = 0

                    override fun update(delta: Long): Boolean {
                        timeCnt += delta
                        return timeCnt < 1000 && !isAnyKeyDown
                    }

                    override fun onKeyUp(key: Int) {}

                    override fun onKeyDown(key: Int) {}

                    override fun draw(canvas: Canvas) {
                        tip.draw(canvas)
                    }
                }
            }
        }

        fun cmd_sale(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                ScriptVM.cmdPrint("cmd_sale")

                val op = OperateSale(this)
                val list = mutableListOf<BaseGoods>()
                list.addAll(Player.sGoodsList.goodsList)
                list.addAll(Player.sGoodsList.equipList)
                pushScreen(ScreenGoodsList(this, list, op, ScreenGoodsList.Mode.Sale))
                op
            }
        }

        fun cmd_npcmovemod(code: ByteArray, start: Int): Command {
            val id = get2ByteInt(code, start)
            val state = get2ByteInt(code, start + 2)

            return makeCommand(4) {
                cmdPrint("cmd_npcmovemod")
                game.mainScene.getNPC(id) .state = Character.State.fromInt(state)
                null
            }
        }
        fun cmd_message(code: ByteArray, start: Int): Command {
            val msg = getStringBytes(code, start)
            val desc = "message ${msg.gbkString()}"
            return makeCommand(msg.size, desc) {
                cmdPrint("cmd_message ${msg.gbkString()}")

                object : Operate {
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
            }
        }

        fun cmd_deletegoods(code: ByteArray, start: Int): Command {
            val type = get2ByteInt(code, start)
            val index = get2ByteInt(code, start + 2)
            val address = get2ByteInt(code, start + 2)

            return makeCommand(6) {
                cmdPrint("cmd_deletegoods")

                val r = Player.sGoodsList.deleteGoods(type, index)
                if (!r) {
                    game.gotoAddress(address)
                }
                null
            }
        }

        fun cmd_resumeactorhp(code: ByteArray, start: Int): Command {
            val id = get2ByteInt(code, start)
            val value = get2ByteInt(code, start + 2)

            return makeCommand(4) {
                cmdPrint("cmd_resumeactorhp")
                val p = game.mainScene.getPlayer(id)
                if (p != null) {
                    p.hp = p.maxHP * value / 100
                }
                null
            }
        }

        fun cmd_actorlayerup(code: ByteArray, start: Int): Command {
            val actor = get2ByteInt(code, start)
            val toLevel = get2ByteInt(code, start+2)

            return makeCommand(4) {
                cmdPrint("cmd_actorlayerup")

                val player = game.mainScene.getPlayer(actor) ?: return@makeCommand null
                if (toLevel <= player.level) {
                    return@makeCommand null
                }
                player.levelUp(toLevel)
                val msgScreen = MsgScreen(this, player.name + "修行提升")
                val levelupScreen = LevelupScreen(this, player)

                object : Operate {
                    var exit = false
                    var keydown = false

                    override fun update(delta: Long): Boolean {
                        return !exit
                    }

                    override fun onKeyUp(key: Int) {
                        if (keydown) {
                            exit = true
                        }
                    }

                    override fun onKeyDown(key: Int) {
                        keydown = true
                    }

                    override fun draw(canvas: Canvas) {
                        msgScreen.draw(canvas)
                        levelupScreen.draw(canvas)
                    }
                }
            }
        }

        fun cmd_boxopen(code: ByteArray, start: Int): Command {
            val id = get2ByteInt(code, start)

            return makeCommand(2) {
                cmdPrint("cmd_boxopen")
                val box = game.mainScene.getNPC(id)
                box.step = 1
                null
            }
        }

        fun cmd_delallnpc(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                cmdPrint("cmd_delallnpc")
                game.mainScene.deleteAllNpc()
                null
            }
        }

        fun cmd_npcstep(code: ByteArray, start: Int): Command {
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

            return makeCommand(6) {
                cmdPrint("cmd_npcstep $id $d step=$step")
                val interval: Long
                if (id == 0) {
                    val p = game.mainScene.player!!
                    p.direction = d
                    p.step = step
                    interval = 300
                } else {
                    val npc = game.mainScene.getNPC(id)
                    npc.direction = d
                    npc.step = step
                    interval = if (game.mainScene.isNpcVisible(npc)) {
                        300
                    } else {
                        0
                    }
                }

                object : Operate {
                    internal var time: Long = 0

                    override fun update(delta: Long): Boolean {
                        time += delta
                        return time < interval
                    }

                    override fun onKeyUp(key: Int) {}

                    override fun onKeyDown(key: Int) {}

                    override fun draw(canvas: Canvas) {
                        game.mainScene.drawScene(canvas)
                    }
                }

            }
        }
        fun cmd_setscenename(code: ByteArray, start: Int): Command {
            val bytes = getStringBytes(code, start)
            val name = bytes.gbkString()
            val desc = "setscenename $name"
            return makeCommand(bytes.size, desc) {
                cmdPrint("cmd_setscenname $name")
                game.mainScene.sceneName = name
                null
            }
        }

        fun cmd_showscenename(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                cmdPrint("cmd_showscenename")
                val text = game.mainScene.sceneName
                var time: Long = 0
                var isAnyKeyDown = false

                object : Operate {
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
                        game.mainScene.drawScene(canvas)
                        Util.showInformation(canvas, text)
                    }
                }
            }
        }
        fun cmd_showscreen(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                cmdPrint("cmd_showscreen")
                object : OperateDrawOnce() {
                    override fun drawOnce(canvas: Canvas) {
                        game.mainScene.drawScene(canvas)
                    }
                }
            }
        }

        fun cmd_usegoods(code: ByteArray, start: Int): Command {
            val type = get2ByteInt(code, start)
            val index = get2ByteInt(code, start + 2)
            val address = get2ByteInt(code, start + 4)

            val desc = "usegoods $type $index $address"
            return makeCommand(6, desc) {
                cmdPrint("cmd_usegoods")
                val b = Player.sGoodsList.deleteGoods(type, index)
                if (!b) {
                    game.gotoAddress(address)
                }
                null
            }
        }

        fun cmd_attribtest(code: ByteArray, start: Int): Command {
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)
            val addr1 = get2ByteInt(code, start+6)
            val addr2 = get2ByteInt(code, start+8)

            val desc = "attribtest $actor $type $value $addr1 $addr2"
            return makeCommand(10, desc) {
                cmdPrint("cmd_attribtest $actor $type $value")
                val player = game.mainScene.getPlayer(actor) ?: return@makeCommand null
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
                    currentValue < value -> game.gotoAddress(addr1)
                    currentValue > value -> game.gotoAddress(addr2)
                }
                null
            }
        }
        fun cmd_attribset(code: ByteArray, start: Int): Command {
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)

            val desc = "attribset $actor $type $value"
            return makeCommand(6, desc) {
                cmdPrint("cmd_attribset $actor $type $value")
                val player = game.mainScene.getPlayer(actor) ?: return@makeCommand null
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
            }
        }

        fun cmd_attribadd(code: ByteArray, start: Int): Command {
            val actor = get2ByteInt(code, start)
            val type = get2ByteInt(code, start+2)
            val value = get2ByteInt(code, start+4)

            val desc = "attribadd $actor $type $value"
            return makeCommand(6, desc) {
                cmdPrint("cmd_attribadd $actor $type $value")
                val player = game.mainScene.getPlayer(actor) ?: return@makeCommand null

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
            }
        }

        fun cmd_showgut(code: ByteArray, start: Int): Command {
            val bytes = getStringBytes(code, start+4)
            val text = bytes.gbkString()
            val top = code[start].toInt() and 0xFF or (code[start + 1].toInt() shl 8 and 0xFF00)
            val btm = code[start + 2].toInt() and 0xFF or (code[start + 3].toInt() shl 8 and 0xFF00)
            val imgTop = DatLib.getPic(5, top, true)
            val imgBottom = DatLib.getPic(5, btm, true)
            val desc = "showgut .. $text"

            return makeCommand(bytes.size+4, desc) {
                cmdPrint("cmd_showgut topimg = $top, btmimg = $btm")
                var goon = true
                var interval: Long = 50
                var timeCnt: Long = 0
                var step = 1
                var curY = if (imgBottom != null) 96 - imgBottom.height else 96
                val rect = Rect(0, imgTop?.height ?: 0, 160, curY)

                object : Operate {
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

        fun cmd_usegoodsnum(code: ByteArray, start: Int): Command {
            return makeCommand(8) {
                cmdPrint("cmd_usegoodsnum")
                val b = Player.sGoodsList.useGoodsNum(get2ByteInt(code, start),
                        get2ByteInt(code, start + 2), get2ByteInt(code, start + 4))
                if (!b) {
                    game.gotoAddress(get2ByteInt(code, start + 6))
                }
                null
            }
        }

        fun cmd_randrade(code: ByteArray, start: Int): Command {
            return makeCommand(4) {
                cmdPrint("cmd_randrade")
                if ((random() * 1000).toInt() <= get2ByteInt(code, start)) {
                    game.gotoAddress(get2ByteInt(code, start + 2))
                }
                null
            }
        }

        fun cmd_menu(code: ByteArray, start: Int): Command {
            val i = start + 2
            val bytes = code.getCString(i)
            val stringItems = bytes.gbkString().split(' ')
            return makeCommand(bytes.size + 3) {
                cmdPrint("cmd_menu")
                var finished = false
                val rvAddr = get2ByteInt(code, start)

                val items by lazy {
                    println(stringItems)
                    stringItems.toTypedArray()
                }

                val menu = ScreenCommonMenu(this, items) {
                    ScriptResources.variables[rvAddr] = it
                    finished = true
                }
                pushScreen(menu)

                object : OperateAdapter() {
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

        fun cmd_testmoney(code: ByteArray, start: Int): Command {
            val money = get4BytesInt(code, start)
            val address = get2ByteInt(code, start + 4)
            return makeCommand(6) {
                cmdPrint("cmd_testmoney")
                if (Player.sMoney < money) {
                    game.gotoAddress(address)
                }
                null
            }
        }

        fun cmd_callchapter(code: ByteArray, start: Int): Command {
            val type = get2ByteInt(code, start)
            val index = get2ByteInt(code, start + 2)
            val desc = "callchapter $type $index"

            return makeCommand(4, desc) {
                cmdPrint("cmd_callchapter $type $index")
                game.mainScene.callChapter(type, index)
                null
            }
        }

        fun cmd_discmp(code: ByteArray, start: Int): Command {
            return makeCommand(8) {
                cmdPrint("cmd_discmp")
                val `var` = ScriptResources.variables[get2ByteInt(code, start)]
                val num = get2ByteInt(code, start + 2)
                if (`var` < num) {
                    game.gotoAddress(get2ByteInt(code, start + 4))
                } else if (`var` > num) {
                    game.gotoAddress(get2ByteInt(code, start + 6))
                }
                null
            }
        }

        fun cmd_return(code: ByteArray, start: Int): Command {
            return makeCommand(0, "return") {
                cmdPrint("cmd_return")
                it.stop()
                game.mainScene.scriptProcess.prev?.let {
                    game.mainScene.scriptProcess = it
                }
                null
            }
        }

        fun cmd_timemsg(code: ByteArray, start: Int): Command {
            val time = get2ByteInt(code, start)
            val text = getStringBytes(code, start + 2)
            val desc = "timemsg $time $text"
            return makeCommand(text.size + 2, desc) {
                cmdPrint("cmd_timemsg $time ${text.gbkString()}")

                object : Operate {
                    var downKey: Int = 0
                    var isAnyKeyDown: Boolean = false
                    var countDown = time * 10

                    override fun update(delta: Long): Boolean {
                        if (countDown != 0) {
                            countDown -= delta.toInt()
                            if (countDown <= 0) {
                                return false
                            }
                        }
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
                        Util.showMessage(canvas, text)
                    }
                }
            }
        }

        fun cmd_disablesave(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                cmdPrint("cmd_disablesave")
                Global.disableSave = true
                null
            }
        }

        fun cmd_enablesave(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                cmdPrint("cmd_enablesave")
                Global.disableSave = false
                null
            }
        }

        fun cmd_gamesave(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                var end = false
                // TODO: 判断副本

                cmdPrint("cmd_gamesave")
                val view = ScreenSaveLoadGame(this, ScreenSaveLoadGame.Operate.SAVE)
                view.callback = {
                    end = true
                }

                pushScreen(view)

                object : OperateAdapter() {
                    override fun update(delta: Long): Boolean {
                        return !end
                    }
                }
            }
        }

        fun cmd_seteventtimer(code: ByteArray, start: Int): Command {
            val event = get2ByteInt(code, start)
            val timer = get2ByteInt(code, start + 2)
            return makeCommand(4) {
                it.setTimer(timer, event)
                null
            }
        }

        fun cmd_enableshowpos(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                // TODO
                null
            }
        }

        fun cmd_disableshowpos(code: ByteArray, start: Int): Command {
            return makeCommand(0) {
                // TODO
                null
            }
        }

        fun cmd_setto(code: ByteArray, start: Int): Command {
            return makeCommand(4) {
                cmdPrint("cmd_setto")
                ScriptResources.variables[get2ByteInt(code, start + 2)] = ScriptResources.variables[get2ByteInt(code, start)]
                null
            }
        }

        fun cmd_testgoodsnum(code: ByteArray, start: Int): Command {
            return makeCommand(10) {
                cmdPrint("cmd_testgoodsnum")
                val goodsnum = Player.sGoodsList.getGoodsNum(get2ByteInt(code, start),
                        get2ByteInt(code, start + 2))
                val num = get2ByteInt(code, start + 4)
                if (goodsnum == num) {
                    game.gotoAddress(get2ByteInt(code, start + 6))
                } else if (goodsnum > num) {
                    game.gotoAddress(get2ByteInt(code, start + 8))
                }
                null
            }
        }

        fun cmd_setfightmiss(code: ByteArray, start: Int): Command {
            val enable = get2ByteInt(code, start)
            return makeCommand(2) {
                SaveLoadGame.allowMiss = enable == 1
                null
            }
        }

        fun cmd_setarmstoss(code: ByteArray, start: Int): Command {
            val enable = get2ByteInt(code, start)
            return makeCommand(2) {
                SaveLoadGame.allowTossArm = enable == 1
                null
            }
        }

        instructions = arrayOf(
                ::cmd_music,//0
                ::cmd_loadmap,
                ::cmd_createactor,
                ::cmd_deletenpc,
                null,
                null,//5
                ::cmd_move,
                null,
                null,
                ::cmd_callback,
                ::cmd_goto,//10
                ::cmd_if,
                ::cmd_set,
                ::cmd_say,
                ::cmd_startchapter,
                null,//15
                ::cmd_screens,
                null,
                null,
                null,
                ::cmd_gameover,//20
                ::cmd_ifcmp,
                ::cmd_add,
                ::cmd_sub,
                ::cmd_setcontrolid,
                null,//25
                ::cmd_setevent,
                ::cmd_clrevent,
                ::cmd_buy,
                ::cmd_facetoface,
                ::cmd_movie,//30
                ::cmd_choice,
                ::cmd_createbox,
                ::cmd_deletebox,
                ::cmd_gaingoods,
                ::cmd_initfight,//35
                ::cmd_fightenable,
                ::cmd_fightdisenable,
                ::cmd_createnpc,
                ::cmd_enterfight,
                ::cmd_deleteactor,//40
                ::cmd_gainmoney,
                ::cmd_usemoney,
                ::cmd_setmoney,
                ::cmd_learnmagic,
                ::cmd_sale,//45
                ::cmd_npcmovemod,
                ::cmd_message,
                ::cmd_deletegoods,
                ::cmd_resumeactorhp,
                ::cmd_actorlayerup,//50
                ::cmd_boxopen,
                ::cmd_delallnpc,
                ::cmd_npcstep,
                ::cmd_setscenename,
                ::cmd_showscenename,//55
                ::cmd_showscreen,
                ::cmd_usegoods,
                ::cmd_attribtest,
                ::cmd_attribset,
                ::cmd_attribadd,//60
                ::cmd_showgut,
                ::cmd_usegoodsnum,
                ::cmd_randrade,
                ::cmd_menu,
                ::cmd_testmoney,//65
                ::cmd_callchapter,
                ::cmd_discmp,
                ::cmd_return,
                ::cmd_timemsg,
                ::cmd_disablesave,//70
                ::cmd_enablesave,
                ::cmd_gamesave,
                ::cmd_seteventtimer,
                ::cmd_enableshowpos,
                ::cmd_disableshowpos,//75
                ::cmd_setto,
                ::cmd_testgoodsnum,
                ::cmd_setfightmiss,
                ::cmd_setarmstoss)
    }

    private fun loadGut(gut: ResGut, print: Boolean = false): ScriptProcess {
        val code = gut.scriptData
        var pointer = 0

        val map = HashMap<Int, Int>(128)
        var address = 0

        val commands = ArrayList<Command>()

        while (pointer < code.size) {
            map.put(pointer, address)
            ++address
            val cmdCode = code[pointer].toInt() and 0xFF
            val cmdMaker = instructions[cmdCode]
            if (cmdMaker != null) {
                val cmd = cmdMaker(code, pointer + 1)
                if (print) {
                    val desc = "cmd$cmdCode " + (cmd.description ?: "")
                    println("$address: $desc")
                }
                commands.add(cmd)
                pointer += cmd.len + 1
            } else {
                throw Error("ECMD: $cmdCode")
            }
        }

        val events = gut.sceneEvent
        val eventIndex = IntArray(events.size)
        for (i in events.indices) {
            if (events[i] == 0) {
                eventIndex[i] = -1
            } else {
                eventIndex[i] = map[events[i] - events.size * 2 - 3]!!
            }
        }
        return ScriptProcess("${gut.type}-${gut.index}", commands, eventIndex, map, events.size * 2 + 3)
    }

    fun loadScript(type: Int, index: Int): ScriptProcess {
        val gut = DatLib.getRes(DatLib.ResType.GUT, type, index) as ResGut
        return loadGut(gut)
    }

    fun compileScript(type: Int, index: Int): ScriptProcess {
        val gut = DatLib.getRes(DatLib.ResType.GUT, type, index) as ResGut
        println("Compiling GUT $type $index")
        return loadGut(gut, true)
    }

    companion object {

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
