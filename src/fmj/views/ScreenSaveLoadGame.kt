package fmj.views

import fmj.Global
import fmj.ScreenViewType
import fmj.graphics.TextRender
import fmj.lib.DatLib
import fmj.lib.ResImage
import fmj.scene.SaveLoadGame
import fmj.script.ScriptResources

import graphics.Canvas
import java.*

class ScreenSaveLoadGame(override val parent: GameNode, private val mOperate: Operate, private val popDepth: Int = 3) : BaseScreen {

    private val mTextPos = arrayOf(intArrayOf(68, 28), intArrayOf(68, 51), intArrayOf(68, 74))
    private var index = 0
    private val mEmpty = "空档案    "
    private val mText = arrayOf(mEmpty, mEmpty, mEmpty)
    private val mHeadImgs = ArrayList<ArrayList<ResImage>>()

    private val mFileNames = arrayOf("fmjsave0", "fmjsave1", "fmjsave2")

    private val mImgBg: ResImage    // 背景图片

    var callback: (() -> Unit)? = null

    enum class Operate {
        SAVE, // 保存进度
        LOAD    // 读取进度
    }

    init {
        mImgBg = DatLib.getRes(DatLib.ResType.PIC, 2,
                if (mOperate == Operate.LOAD) 16 else 15) as ResImage
        mHeadImgs.add(ArrayList())
        mHeadImgs.add(ArrayList())
        mHeadImgs.add(ArrayList())
        var file = File("sav/" + mFileNames[0])

        if (file.exists()) {
            mText[0] = format(getSceneNameAndHeads(file, mHeadImgs[0]))
        }
        file = File("sav/" + mFileNames[1])
        if (file.exists()) {
            mText[1] = format(getSceneNameAndHeads(file, mHeadImgs[1]))
        }
        file = File("sav/" + mFileNames[2])
        if (file.exists()) {
            mText[2] = format(getSceneNameAndHeads(file, mHeadImgs[2]))
        }
    }

    private fun format(s: String): String {
        var tmp = s
        while (tmp.gbkBytes().size < mEmpty.gbkBytes().size)
            tmp += " "
        return tmp
    }

    private fun getSceneNameAndHeads(f: File, heads: ArrayList<ResImage>): String {
        val file = objectInputOf(f)
        val name =  file.readString()
        val actorNum =  file.readInt()
        for (i in 0 until actorNum) {
            heads.add(DatLib.getRes(DatLib.ResType.PIC, 1,  file.readInt()) as ResImage)
        }
        file.close()
        return name
    }

    override fun update(delta: Long) {}

    override fun draw(canvas: Canvas) {
        mImgBg.draw(canvas, 1, 0, 0)
        for (i in mHeadImgs.indices) {
            for (j in 0 until mHeadImgs[i].size) {
                val img = mHeadImgs[i][j]
                img.draw(canvas, 7, 8 + 20 * j, mTextPos[i][1] - 6)
            }
        }
        TextRender.drawText(canvas, mText[0], mTextPos[0][0], mTextPos[0][1])
        TextRender.drawText(canvas, mText[1], mTextPos[1][0], mTextPos[1][1])
        TextRender.drawText(canvas, mText[2], mTextPos[2][0], mTextPos[2][1])
        TextRender.drawSelText(canvas, mText[index], mTextPos[index][0], mTextPos[index][1])
    }

    override fun onKeyDown(key: Int) {
        if (key == Global.KEY_UP) {
            if (--index < 0) {
                index = 2
            }
        } else if (key == Global.KEY_DOWN) {
            if (++index > 2) {
                index = 0
            }
        }
    }

    private fun exit() {
        (0 until popDepth).forEach {
            popScreen()
        }
        callback?.invoke()
    }

    override fun onKeyUp(key: Int) {
        if (key == Global.KEY_CANCEL) {
            popScreen()
            callback?.invoke()
        } else if (key == Global.KEY_ENTER) {
            val file = File("sav/" + mFileNames[index])
            if (mOperate == Operate.LOAD) { // 加载存档
                if (!file.exists()) {
                    return
                }
                if (!loadGame(file)) {
                    return
                }
                SaveLoadGame.startNewGame = false
                game.changeScreen(ScreenViewType.SCREEN_MAIN_GAME)
            } else { // 保存存档
                if (!file.exists()) {
                    file.createNewFile()
                    saveGame(file)
                    exit()
                } else { // 询问是否覆盖存档
                    pushScreen(ScreenMessageBox(this, "覆盖原进度?",
                            object : ScreenMessageBox.OnOKClickListener {
                                override fun onOKClick() {
                                    saveGame(file)
                                    exit()
                                }
                            }))
                }
            }
        }
    }

    private fun loadGame(file: File): Boolean {
        val ioIn = objectInputOf(file)
        if (!SaveLoadGame.read(game, ioIn))
            return false
        ScriptResources.read(ioIn)
        ioIn.close()
        return true
    }

    fun saveGame(file: File) {
        val o = objectOutputOf(file)
        SaveLoadGame.write(game, o)
        ScriptResources.write(o)
        o.close()
    }

}
