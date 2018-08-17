package fmj.combat.ui

import fmj.Global
import fmj.characters.FightingCharacter
import fmj.characters.FightingCharacter.Companion.BUFF_MASK_LUAN
import fmj.characters.Monster
import fmj.characters.Player
import fmj.combat.actions.*
import fmj.combat.anim.FrameAnimation
import fmj.gamemenu.ScreenChgEquipment
import fmj.gamemenu.ScreenGoodsList
import fmj.gamemenu.ScreenGoodsList.Mode
import fmj.goods.BaseGoods
import fmj.goods.GoodsEquipment
import fmj.goods.Throwable
import fmj.graphics.TextRender
import fmj.graphics.Util
import fmj.lib.DatLib
import fmj.lib.ResImage
import fmj.magic.BaseMagic
import fmj.magic.MagicAttack
import fmj.magic.MagicSpecial
import fmj.magic.ScreenMagic
import fmj.scene.SaveLoadGame
import fmj.views.BaseScreen
import fmj.views.GameNode
import fmj.views.ScreenStack

import graphics.Canvas
import graphics.Point
import graphics.Rect

import java.System
import java.gbkBytes

class CombatUI(override val parent: GameNode,
               private val mCallBack: CallBack?,
               private var mCurPlayerIndex: Int): BaseScreen {

    private val mScreenStack = ScreenStack(game)

    private var mPlayerList: List<Player> = listOf()
    private var mMonsterList: List<Monster> = listOf()

    /** 标记发出的action的玩家角色 */
    private val mPlayerIndicator: FrameAnimation

    /** 标记action作用的玩家角色 */
    private val mTargetIndicator: FrameAnimation

    /** 标记action作用的敌人角色 */
    private val mMonsterIndicator: FrameAnimation

    private val mHeadsImg = arrayOf(
            DatLib.getRes(DatLib.ResType.PIC, 1, 1) as ResImage,
            DatLib.getRes(DatLib.ResType.PIC, 1, 2) as ResImage,
            DatLib.getRes(DatLib.ResType.PIC, 1, 3) as ResImage,
            DatLib.getRes(DatLib.ResType.PIC, 1, 4) as ResImage,
            DatLib.getRes(DatLib.ResType.PIC, 1, 5) as ResImage,
            DatLib.getRes(DatLib.ResType.PIC, 1, 6) as ResImage,
            DatLib.getRes(DatLib.ResType.PIC, 1, 7) as ResImage,
            DatLib.getRes(DatLib.ResType.PIC, 1, 8) as ResImage)

    private val selectedPlayer: Player
        get() = mPlayerList[mCurPlayerIndex]

    interface CallBack {
        /**
         * 当一个Action被选择后，会调用此方法
         * @param action 选择的Action
         */
        fun onActionSelected(action: Action)

        /**
         * 选择围攻时，调用改方法
         */
        fun onAutoAttack()

        /**
         * 选择逃跑时，调用该方法。对于已经做出决策的角色，其决策不变；之后的角色动作皆为逃跑
         */
        fun onFlee()

        /**
         * 取消选择当前角色的Action，应该返回选择上一个角色的Action
         */
        fun onCancel()
    }

    init {
        mScreenStack.pushScreen(MainMenu(this))

        var tmpImg = DatLib.getRes(DatLib.ResType.PIC, 2, 4) as ResImage
        mPlayerIndicator = FrameAnimation(tmpImg, 1, 2)
        mTargetIndicator = FrameAnimation(tmpImg, 3, 4)
        tmpImg = DatLib.getRes(DatLib.ResType.PIC, 2, 3) as ResImage
        mMonsterIndicator = FrameAnimation(tmpImg)
    }

    override fun update(delta: Long) {
        mScreenStack.update(delta)
    }

    override fun draw(canvas: Canvas) {
        mScreenStack.draw(canvas)
    }

    override fun onKeyDown(key: Int) {
        mScreenStack.keyDown(key)
    }

    override fun onKeyUp(key: Int) {
        mScreenStack.keyUp(key)
    }

    fun reset() {
        mScreenStack.clear()
        mScreenStack.pushScreen(MainMenu(this))
    }

    fun setPlayerList(list: List<Player>) {
        mPlayerList = list
    }

    fun setMonsterList(list: List<Monster>) {
        mMonsterList = list
    }

    /**  */
    fun setCurrentPlayerIndex(i: Int) {
        mCurPlayerIndex = i
    }

    /** helper for the callback interface */
    private fun onActionSelected(action: Action) {
        mCallBack?.onActionSelected(action)
    }

    /** helper for the callback interface */
    private fun onCancel() {
        mCallBack?.onCancel()
    }

    fun getGBKBytes(s: String): ByteArray {
        return s.gbkBytes()
    }


    /** 显示主菜单、角色信息 */
    private inner class MainMenu(override val parent: GameNode) : BaseScreen {

        /** 1↑、2←、3↓、4→ */
        private val mMenuIcon = DatLib.getRes(DatLib.ResType.PIC, 2, 1) as ResImage

        /** 显示角色HP MP的背景图 */
        private val mPlayerInfoBg = DatLib.getRes(DatLib.ResType.PIC, 2, 2) as ResImage

        private var mCurIconIndex = 1

        override fun update(delta: Long) {
            when {
                selectedPlayer.isConfusing -> onActionSelected(ActionNop(selectedPlayer))
                selectedPlayer.isSleeping -> onActionSelected(ActionNop(selectedPlayer))
                else -> mPlayerIndicator.update(delta)
            }
        }

        override fun draw(canvas: Canvas) {
            mMenuIcon.draw(canvas, mCurIconIndex, 7, 96 - mMenuIcon.height)
            mPlayerInfoBg.draw(canvas, 1, 49, 66)
            val p = selectedPlayer
            mHeadsImg[p.index - 1].draw(canvas, 1, 50, 63) // 角色头像
            Util.drawSmallNum(canvas, p.hp, 79, 72) // hp
            Util.drawSmallNum(canvas, p.maxHP, 104, 72) // maxhp
            Util.drawSmallNum(canvas, p.mp, 79, 83) // mp
            Util.drawSmallNum(canvas, p.maxMP, 104, 83) // maxmp
            mPlayerIndicator.draw(canvas, sPlayerIndicatorPos[mCurPlayerIndex].x, sPlayerIndicatorPos[mCurPlayerIndex].y)
        }

        override fun onKeyDown(key: Int) {
            when (key) {
                Global.KEY_LEFT -> {
                    if (selectedPlayer.isSealed) {
                        return // 被封，不能用魔法
                    }
                    mCurIconIndex = 2
                }

                Global.KEY_DOWN -> mCurIconIndex = 3

                Global.KEY_RIGHT -> {
                    val aliveCount = mPlayerList.filter {
                        it.isAlive && !it.isSleeping
                    }.size

                    if (aliveCount <= 1) { // 只有一人不能合击
                        return
                    }
                    mCurIconIndex = 4
                }

                Global.KEY_UP -> mCurIconIndex = 1
            }
        }

        override fun onKeyUp(key: Int) {
            if (key == Global.KEY_ENTER) {
                when (mCurIconIndex) {
                    1//物理攻击
                    -> {
                        // 攻击全体敌人
                        if (selectedPlayer.hasAtbuff(FightingCharacter.BUFF_MASK_ALL)) {
                            onActionSelected(ActionPhysicalAttackAll(selectedPlayer, mMonsterList))
                            return
                        }

                        // 攻击单个敌人
                        pushScreen(MenuCharacterSelect(this, mMonsterIndicator, sMonsterIndicatorPos,
                                mMonsterList, object : OnCharacterSelectedListener {

                            override fun onCharacterSelected(fc: FightingCharacter) {
                                onActionSelected(ActionPhysicalAttackOne(selectedPlayer, fc))
                            }
                        }, true))
                    }

                    2//魔法技能
                    -> run {
                        val magics = selectedPlayer.getAllMagics()
                        if (magics.isEmpty()) {
                            return@run
                        }
                        pushScreen(ScreenMagic(this, magics,
                                object : ScreenMagic.OnItemSelectedListener {

                                    override fun onItemSelected(magic: BaseMagic) {
                                        popScreen() // 弹出魔法选择界面
                                        if (magic is MagicAttack || magic is MagicSpecial) { // 选一个敌人
                                            if (magic.isForAll) {
                                                onActionSelected(ActionMagicAttackAll(selectedPlayer,
                                                        mMonsterList, magic as MagicAttack))
                                            } else { // 选一个敌人
                                                pushScreen(MenuCharacterSelect(this@MainMenu, mMonsterIndicator, sMonsterIndicatorPos,
                                                        mMonsterList, object : OnCharacterSelectedListener {

                                                    override fun onCharacterSelected(fc: FightingCharacter) {
                                                        onActionSelected(ActionMagicAttackOne(selectedPlayer, fc, magic))
                                                    }
                                                }, true))
                                            }
                                        } else { // 选队友或自己
                                            if (magic.isForAll) {
                                                onActionSelected(ActionMagicHelpAll(selectedPlayer,
                                                        mPlayerList, magic))
                                            } else { // 选一个Player
                                                pushScreen(MenuCharacterSelect(this@MainMenu, mTargetIndicator, sPlayerIndicatorPos,
                                                        mPlayerList, object : OnCharacterSelectedListener {

                                                    override fun onCharacterSelected(fc: FightingCharacter) {
                                                        onActionSelected(ActionMagicHelpOne(selectedPlayer,
                                                                fc, magic))
                                                    }
                                                }, false))
                                            }
                                        }
                                    }
                                }))
                    }

                    3//杂项
                    -> pushScreen(MenuMisc(this))

                    4//合击
                    -> pushScreen(MenuCharacterSelect(this, mMonsterIndicator, sMonsterIndicatorPos,
                            mMonsterList, object : OnCharacterSelectedListener {

                        override fun onCharacterSelected(fc: FightingCharacter) {
                            val lst = arrayListOf<Player>()
                            val first = selectedPlayer
                            lst.add(first)
                            lst.addAll(mPlayerList.filter { it.isAlive && it != first })
                            onActionSelected(ActionCoopMagic(lst, fc))
                        }
                    }, true))
                }
            } else if (key == Global.KEY_CANCEL) {
                this@CombatUI.onCancel()
            }
        }

    }

    /**
     * @see MenuCharacterSelect
     */
    private interface OnCharacterSelectedListener {
        /**
         *
         * @param fc 被选择的角色
         */
        fun onCharacterSelected(fc: FightingCharacter)
    }

    /** 角色标识，用于标记当前选择的角色 */
    private inner class MenuCharacterSelect
    (override val parent: GameNode,
     private val mIndicator: FrameAnimation,
     private val mIndicatorPos: Array<Point>,
     private val mList: List<FightingCharacter>,
     private val mOnCharacterSelectedListener: OnCharacterSelectedListener?,
     private val mIgnoreDead: Boolean) : BaseScreen {

        private var mCurSel: Int = 0

        init {
            for (i in 0 until mList.size) {
                if (mList[i].isAlive) {
                    mCurSel = i
                    break
                }
            }
        }

        override fun update(delta: Long) {
            mIndicator.update(delta)
        }

        override fun draw(canvas: Canvas) {
            mIndicator.draw(canvas, mIndicatorPos[mCurSel].x, mIndicatorPos[mCurSel].y)
            if (mIndicator == this@CombatUI.mTargetIndicator) { // 当前选择角色
                val p = this@CombatUI.mPlayerList[mCurSel]
                mHeadsImg[p.index - 1].draw(canvas, 1, 50, 63) // 角色头像
                Util.drawSmallNum(canvas, p.hp, 79, 72) // hp
                Util.drawSmallNum(canvas, p.maxHP, 104, 72) // maxhp
                Util.drawSmallNum(canvas, p.mp, 79, 83) // mp
                Util.drawSmallNum(canvas, p.maxMP, 104, 83) // maxmp
            }
        }

        private fun selectNextTarget() {
            do {
                ++mCurSel
                mCurSel %= mList.size
            } while (mIgnoreDead && !mList[mCurSel].isAlive)
        }

        private fun selectPreTarget() {
            do {
                --mCurSel
                mCurSel = (mCurSel + mList.size) % mList.size
            } while (mIgnoreDead && !mList[mCurSel].isAlive)
        }

        override fun onKeyDown(key: Int) {
            if (key == Global.KEY_RIGHT) {
                selectNextTarget()
            } else if (key == Global.KEY_LEFT) {
                selectPreTarget()
            }
        }

        override fun onKeyUp(key: Int) {
            if (key == Global.KEY_CANCEL) {
                popScreen()
            } else if (key == Global.KEY_ENTER) {
                popScreen()
                mOnCharacterSelectedListener?.onCharacterSelected(mList[mCurSel])
            }
        }

    }

    /** 围攻、道具、防御、逃跑、状态 */
    private inner class MenuMisc(override val parent: GameNode) : BaseScreen {

        private val mBg = Util.getFrameBitmap(2 * 16 + 6, 5 * 16 + 6)

        private val mText = getGBKBytes("围攻道具防御逃跑状态")

        private val mItemText = arrayOf(getGBKBytes("围攻"), getGBKBytes("道具"), getGBKBytes("防御"), getGBKBytes("逃跑"), getGBKBytes("状态"))

        private val mTextRect = Rect(9 + 3, 4 + 3, 9 + 4 + 16 * 2, 4 + 3 + 16 * 5)

        private var mCurSelIndex = 0

        override fun update(delta: Long) {}

        override fun draw(canvas: Canvas) {
            canvas.drawBitmap(mBg, 9, 4)
            TextRender.drawText(canvas, mText, 0, mTextRect)
            TextRender.drawSelText(canvas, mItemText[mCurSelIndex], mTextRect.left, mTextRect.top + mCurSelIndex * 16)
        }

        override fun onKeyDown(key: Int) {
            if (key == Global.KEY_UP) {
                --mCurSelIndex
                mCurSelIndex = (mItemText.size + mCurSelIndex) % mItemText.size
            } else if (key == Global.KEY_DOWN) {
                ++mCurSelIndex
                mCurSelIndex %= mItemText.size
            }
        }

        override fun onKeyUp(key: Int) {
            if (key == Global.KEY_ENTER) {
                when (mCurSelIndex) {
                    0//围攻
                    -> mCallBack?.onAutoAttack()
                    1//道具
                    -> pushScreen(MenuGoods(this))
                    2//防御
                    -> {
                        val p = selectedPlayer
                        p.fightingSprite!!.currentFrame = 9
                        this@CombatUI.onActionSelected(ActionDefend(p))
                    }
                    3//逃跑
                    -> mCallBack?.onFlee()
                    4//状态
                    -> {
                        popScreen()
                        pushScreen(MenuState(this))
                    }
                }
            } else if (key == Global.KEY_CANCEL) {
                popScreen()
            }
        }

        /** 战斗中，显示玩家异常状态 */
        private inner class MenuState(override val parent: GameNode) : BaseScreen {

            private val mBg = DatLib.getRes(DatLib.ResType.PIC, 2, 11) as ResImage

            /**1↑2↓3×4√5回 */
            private val mMarker = DatLib.getRes(DatLib.ResType.PIC, 2, 12) as ResImage

            private var mCurPlayer: Int = 0

            init {
                mCurPlayer = this@CombatUI.mCurPlayerIndex
            }

            override fun update(delta: Long) {}

            override fun draw(canvas: Canvas) {
                val x = (160 - mBg.width) / 2
                val y = (96 - mBg.height) / 2
                mBg.draw(canvas, 1, x, y)
                val p = mPlayerList[this.mCurPlayer]
                p.drawHead(canvas, x + 7, y + 4)
                Util.drawSmallNum(canvas, p.hp, x + 50, y + 9) // 命
                Util.drawSmallNum(canvas, p.attack, x + 50, y + 21) // 攻
                Util.drawSmallNum(canvas, p.luck, x + 87, y + 9) // 运
                Util.drawSmallNum(canvas, p.speed, x + 87, y + 21) // 身

                fun drawMarker(mask: Int, ox: Int, isBool: Boolean) {
                    val buff = p.debuff.getBuffs(mask).first()
                    val ind = when {
                        !isBool && buff.value > 0 -> 1
                        !isBool && buff.value < 0 -> 2
                        isBool && buff.value == 0 -> 3
                        isBool && buff.value != 0 -> 4
                        !isBool && buff.value == 0 -> 5
                        else -> 1
                    }
                    mMarker.draw(canvas, ind, x + ox, y + 48) // marker
                    Util.drawSmallNum(canvas, buff.round, x + ox + 1, y + 57) // round
                }
                drawMarker(FightingCharacter.BUFF_MASK_GONG, 9, false)
                drawMarker(FightingCharacter.BUFF_MASK_FANG, 25, false)
                drawMarker(FightingCharacter.BUFF_MASK_SU, 41, false)
                drawMarker(FightingCharacter.BUFF_MASK_DU, 57, true)
                drawMarker(FightingCharacter.BUFF_MASK_LUAN, 73, true)
                drawMarker(FightingCharacter.BUFF_MASK_FENG, 88, true)
                drawMarker(FightingCharacter.BUFF_MASK_MIAN, 104, true)
            }

            override fun onKeyDown(key: Int) {
                when (key) {
                    Global.KEY_RIGHT, Global.KEY_DOWN, Global.KEY_PAGEDOWN, Global.KEY_ENTER -> {
                        ++this.mCurPlayer
                        this.mCurPlayer %= this@CombatUI.mPlayerList.size
                    }

                    Global.KEY_LEFT, Global.KEY_UP, Global.KEY_PAGEUP -> {
                        --this.mCurPlayer
                        this.mCurPlayer = (this.mCurPlayer + mPlayerList.size) % mPlayerList.size
                    }
                }
            }

            override fun onKeyUp(key: Int) {
                if (key == Global.KEY_CANCEL) {
                    popScreen()
                    pushScreen(MenuMisc(this))
                }
            }

        }
    }

    /** 道具子菜单，装备、投掷、使用 */
    private inner class MenuGoods(override val parent: GameNode) : BaseScreen {

        private val mBg = Util.getFrameBitmap(16 * 2 + 6, 16 * 3 + 6)

        private val mText = getGBKBytes("装备投掷使用")

        private val mItemText = arrayOf(getGBKBytes("装备"), getGBKBytes("投掷"), getGBKBytes("使用"))

        private val mTextRect = Rect(29 + 3, 14 + 3, 29 + 3 + mBg.width, 14 + 3 + mBg.height)

        private var mSelIndex = 0

        /** 当前物品链表中，可用物品 */
        private val useableGoodsList: List<BaseGoods>
            get() {
                val rlt = mutableListOf<BaseGoods>()
                for (g in Player.sGoodsList.goodsList) {
                    when (g.type) {
                        9, 10, 11, 12 -> rlt.add(g)
                    }
                }
                return rlt
            }

        /** 当前物品链表中，可用于投掷敌人的物品 */
        private val throwableGoodsList: List<BaseGoods>
            get() {
                val hide = Player.sGoodsList.goodsList
                        .filter { it.type == 8 }
                val arms = if (SaveLoadGame.allowTossArm) {
                    Player.sGoodsList.equipList
                            .filter { it.type == 7 }
                } else {
                    arrayListOf()
                }
                return hide + arms
            }

        override fun update(delta: Long) {}

        override fun draw(canvas: Canvas) {
            canvas.drawBitmap(mBg, 29, 14)
            TextRender.drawText(canvas, mText, 0, mTextRect)
            TextRender.drawSelText(canvas, mItemText[mSelIndex], mTextRect.left, mTextRect.top + 16 * mSelIndex)
        }

        override fun onKeyDown(key: Int) {
            if (key == Global.KEY_DOWN) {
                ++mSelIndex
                mSelIndex %= mItemText.size
            } else if (key == Global.KEY_UP) {
                --mSelIndex
                mSelIndex = (mSelIndex + mItemText.size) % mItemText.size
            }
        }

        override fun onKeyUp(key: Int) {
            if (key == Global.KEY_ENTER) {
                popScreen()
                when (mSelIndex) {
                    0// 装备
                    -> pushScreen(ScreenGoodsList(this, Player.sGoodsList.equipList,
                            object : ScreenGoodsList.OnItemSelectedListener {
                                override fun onItemSelected(goods: BaseGoods) {
                                    equipSelected(goods)
                                }
                            }, Mode.Use))

                    1// 投掷
                    -> pushScreen(ScreenGoodsList(this, throwableGoodsList,
                            object : ScreenGoodsList.OnItemSelectedListener {
                                override fun onItemSelected(goods: BaseGoods) {
                                    popScreen() // pop goods list
                                    popScreen() // pop misc menu
                                    if (goods.effectAll()) {
                                        game.bag.deleteGoods(goods)
                                        // 投掷伤害全体敌人
                                        onActionSelected(ActionThrowItemAll(selectedPlayer, mMonsterList, goods as Throwable))
                                    } else { // 选一个敌人
                                        pushScreen(MenuCharacterSelect(this@CombatUI, mMonsterIndicator, sMonsterIndicatorPos, mMonsterList,
                                                object : OnCharacterSelectedListener {

                                                    override fun onCharacterSelected(fc: FightingCharacter) {
                                                        game.bag.deleteGoods(goods)
                                                        // add throw action
                                                        onActionSelected(ActionThrowItemOne(selectedPlayer,
                                                                fc, goods as Throwable))
                                                    }
                                                }, true))
                                    }
                                }
                            }, Mode.Use))

                    2// 使用
                    -> pushScreen(ScreenGoodsList(this, useableGoodsList,
                            object : ScreenGoodsList.OnItemSelectedListener {

                                override fun onItemSelected(goods: BaseGoods) {
                                    popScreen() // pop goods list
                                    popScreen() // pop misc menu
                                    if (goods.effectAll()) {
                                        game.bag.deleteGoods(goods)
                                        onActionSelected(ActionUseItemAll(selectedPlayer, mMonsterList, goods))
                                    } else { // 选一个角色治疗
                                        pushScreen(MenuCharacterSelect(this@MenuGoods, mTargetIndicator, sPlayerIndicatorPos, mPlayerList,
                                                object : OnCharacterSelectedListener {

                                                    override fun onCharacterSelected(fc: FightingCharacter) {
                                                        game.bag.deleteGoods(goods)
                                                        onActionSelected(ActionUseItemOne(selectedPlayer,
                                                                fc, goods))
                                                    }
                                                }, false))
                                    }
                                }
                            }, Mode.Use))
                }
            } else if (key == Global.KEY_CANCEL) {
                popScreen()
            }
        }

        private fun equipSelected(goods: BaseGoods) {
            val list = ArrayList<Player>()
            mPlayerList.filterTo(list) {
                goods.canPlayerUse(it.index)
            }
            if (list.size == 0) { // 没人能装备
                showMessage("不能装备!", 1000)
            } else if (list.size == 1) { // 一个人能装备
                if (list[0].hasEquipt(goods.type, goods.index)) {
                    showMessage("已装备!", 1000)
                } else {
                    pushScreen(ScreenChgEquipment(this, list[0], goods as GoodsEquipment))
                }
            } else { // 多人可装备
                pushScreen(object : BaseScreen {
                    override val parent = this@MenuGoods
                    internal var bg = Util.getFrameBitmap(16 * 5 + 6, 6 + 16 * list.size)
                    internal var curSel = 0
                    internal var itemsText = Array(list.size) { ByteArray(11) }

                    init {
                        for (i in itemsText.indices) {
                            for (j in 0..9) {
                                itemsText[i][j] = ' '.toByte()
                            }
                            val tmp = list[i].name.gbkBytes()
                            System.arraycopy(tmp, 0, itemsText[i], 0, tmp.size)
                        }
                    }

                    override fun update(delta: Long) {}

                    override fun onKeyUp(key: Int) {
                        if (key == Global.KEY_ENTER) {
                            if (list[curSel].hasEquipt(goods.type, goods.index)) {
                                showMessage("已装备!", 1000)
                            } else {
                                popScreen()
                                pushScreen(ScreenChgEquipment(this, list[curSel], goods as GoodsEquipment))
                            }
                        } else if (key == Global.KEY_CANCEL) {
                            popScreen()
                        }
                    }

                    override fun onKeyDown(key: Int) {
                        if (key == Global.KEY_DOWN) {
                            ++curSel
                            curSel %= itemsText.size
                        } else if (key == Global.KEY_UP) {
                            --curSel
                            curSel = (curSel + itemsText.size) % itemsText.size
                        }
                    }

                    override fun draw(canvas: Canvas) {
                        canvas.drawBitmap(bg, 50, 14)
                        for (i in itemsText.indices) {
                            if (i != curSel) {
                                TextRender.drawText(canvas, itemsText[i], 50 + 3, 14 + 3 + 16 * i)
                            } else {
                                TextRender.drawSelText(canvas, itemsText[i], 50 + 3, 14 + 3 + 16 * i)
                            }
                        }
                    }

                })
            }
        } // end of equipSelected
    }

    override fun popScreen() {
        mScreenStack.popScreen()
    }

    override fun pushScreen(scr: BaseScreen) {
        mScreenStack.pushScreen(scr)
    }

    override fun getCurScreen(): BaseScreen {
        return mScreenStack.getCurScreen()
    }

    override fun showMessage(msg:String, delay:Long) {
        mScreenStack.showMessage(msg, delay)
    }

    companion object {
        private val sPlayerIndicatorPos = arrayOf(Point(69, 45), Point(101, 41), Point(133, 33))
        private val sMonsterIndicatorPos = arrayOf(Point(16, 14), Point(48, 3), Point(86, 0))
    }
}
