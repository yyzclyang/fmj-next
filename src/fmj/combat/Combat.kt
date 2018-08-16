package fmj.combat

import fmj.Global
import fmj.ScreenViewType
import fmj.characters.FightingCharacter
import fmj.characters.Monster
import fmj.characters.Player
import fmj.combat.actions.*
import fmj.combat.ui.CombatSuccess
import fmj.combat.ui.CombatUI
import fmj.goods.BaseGoods
import fmj.goods.GoodsManage
import fmj.lib.DatLib
import fmj.lib.ResImage
import fmj.lib.ResSrs
import fmj.magic.MagicAttack
import fmj.magic.MagicRestore
import fmj.views.BaseScreen
import fmj.views.GameNode

import graphics.Bitmap
import graphics.Canvas
import graphics.Point
import java.*
import kotlin.math.sqrt

class Combat private constructor(override val parent: GameNode) : BaseScreen, CombatUI.CallBack {

    private var mScrb: Int = 0
    private var mScrl: Int = 0
    private var mScrR: Int = 0

    private var mCombatState = CombatState.SelectAction

    /** 是否自动攻击，围攻状态 */
    private var mIsAutoAttack = false

    /** 动作队列，一个回合中，双方的决策 */
    private val mActionQueue = ArrayQueue.create<Action>()

    /** 动作队列的执行者 */
    private val mActionExecutor = ActionExecutor(mActionQueue, this)

    /** 战斗的UI */
    private val mCombatUI = CombatUI(this, this, 0)

    /** 随机战斗中，可能出现的敌人类型 */
    private var mMonsterType: IntArray = intArrayOf()

    /** 参加战斗的怪物队列 */
    private var mMonsterList: MutableList<Monster> = mutableListOf()

    /** 参加战斗的玩家角色队列 */
    private var mPlayerList: List<Player> = listOf()

    /** 当前选择动作的角色在[.mPlayerList]中的序号 */
    private var mCurSelActionPlayerIndex = 0

    /** 当前回合 */
    private var mRoundCnt: Int = 0

    private var mHasEventExed: Boolean = false

    /** 最多回合数，0为无限 */
    private var mMaxRound: Int = 0

    /** 触发事件的回合，以及对应的事件号 */
    private var mEventRound: IntArray? = null
    private var mEventNum: IntArray? = null

    /** 战斗失败跳转地址，战斗成功跳转地址 */
    private var mLossAddr: Int = 0
    private var mWinAddr: Int = 0

    private val mFlyPeach = DatLib.getRes(DatLib.ResType.SRS, 1, 249) as ResSrs

    private var mIsWin = false

    /**战斗背景图 */
    internal var mBackground: Bitmap = Bitmap(0, 0)

    /** 战斗胜利能获得的金钱和经验 */
    private var mWinMoney: Int = 0
    private var mWinExp: Int = 0

    private var mCombatSuccess: CombatSuccess? = null

    private var mTimeCnt: Long = 0

    /** 是否有玩家角色存活 */
    private val isAnyPlayerAlive: Boolean
        get() {
            return mPlayerList.any { it.hp > 0 }
        }

    /** 怪物是否都挂了 */
    private val isAllMonsterDead: Boolean
        get() = firstAliveMonster == null

    /**
     * 获取下一个存活的主角序号
     * @return 没有就返回-1
     */
    private val nextAlivePlayerIndex: Int
        get() =
            (mCurSelActionPlayerIndex + 1 until mPlayerList.size)
                    .firstOrNull { mPlayerList[it].isAlive }
                    ?: -1

    private val preAlivePlayerIndex: Int
        get() =
            (mCurSelActionPlayerIndex - 1 downTo 0)
                    .firstOrNull { mPlayerList[it].isAlive }
                    ?: -1

    private val firstAlivePlayerIndex: Int
        get() =
            mPlayerList.indices.firstOrNull { mPlayerList[it].isAlive }
                    ?: -1
    /**
     *
     * @return 第一个活着的怪物，`null`怪物都挂了
     */
    val firstAliveMonster: Monster?
        get() = mMonsterList.firstOrNull { it.isAlive }

    /**
     * 随机获取一个或者的玩家角色
     * @return `null`全死了
     */
    val randomAlivePlayer: Player?
        get() {
            var cnt = 0
            for (p in mPlayerList) {
                if (p.isAlive) {
                    ++cnt
                }
            }

            if (cnt == 0) return null

            val arr = arrayOfNulls<Player>(cnt)
            var i = 0
            for (p in mPlayerList) {
                if (p.isAlive) {
                    arr[i++] = p
                }
            }

            return arr[sRandom.nextInt(cnt)]
        }

    private enum class CombatState {
        SelectAction, // 玩家操作阶段，制定攻击策略
        PerformAction, // 执行动作队列，播放攻击动画
        Win, // 赢得战斗
        Loss, // 战斗失败
        Exit
    }

    private fun createBackgroundBitmap(scrb: Int, scrl: Int, scrr: Int) {
        mBackground = Bitmap.createBitmap(160, 96)
        val canvas = Canvas(mBackground)
        var img: ResImage?
        img = DatLib.getRes(DatLib.ResType.PIC, 4, scrb) as ResImage
        img.draw(canvas, 1, 0, 0) // 背景
        img = DatLib.getRes(DatLib.ResType.PIC, 4, scrl) as ResImage
        img.draw(canvas, 1, 0, 96 - img.height) // 左下角
        img = DatLib.getRes(DatLib.ResType.PIC, 4, scrr) as ResImage
        img.draw(canvas, 1, 160 - img.width, 0) // 右上角

        mScrb = scrb
        mScrl = scrl
        mScrR = scrr
    }

    private fun prepareForNewCombat() {
        mActionQueue.clear()

        mIsAutoAttack = false
        mCombatState = CombatState.SelectAction

        mCurSelActionPlayerIndex = 0
        mPlayerList = game.playerList

        mCombatUI.reset()
        mCombatUI.setCurrentPlayerIndex(0)
        mCombatUI.setMonsterList(mMonsterList)
        mCombatUI.setPlayerList(mPlayerList)

        setOriginalPlayerPos()
        setOriginalMonsterPos()

        mRoundCnt = 0

        mHasEventExed = false

        // 检查玩家血量
        for (p in mPlayerList) {
            if (p.hp <= 0) { // 确保血量大于0
                p.hp = 1
            }
            p.setFrameByState()
        }

        // 怪物血量设置为其最大值
        for (m in mMonsterList) {
            m.hp = m.maxHP
        }

        // 计算战斗胜利能获得的金钱和经验
        mWinMoney = 0
        mWinExp = 0
        for (m in mMonsterList) {
            mWinMoney += m.money
            mWinExp += m.exp
        }

        if (!sIsRandomFight && mMonsterList.size == 1) { // 剧情战斗，只有一个怪时，怪的位置在中间
            val m = mMonsterList[0]
            val n = DatLib.getRes(DatLib.ResType.ARS, m.type, m.index) as Monster
            n.hp = -1
            n.isVisiable = false
            mMonsterList.add(0, n) // 加入一个看不见的怪
            setOriginalMonsterPos() // 重置位置
        }

        mFlyPeach.start()
        mFlyPeach.setIteratorNum(5)
    }

    private fun exitCurrentCombat() {
        if (!sIsRandomFight) {
            game.gotoAddress(if (mIsWin) mWinAddr else mLossAddr)
            game.mainScene.scriptProcess.goonExecute = true
            sIsRandomFight = true
            sInstance = sInstanceBk
            sInstanceBk = null
        } else {
            if (!mIsWin) { // 死了，游戏结束
                game.changeScreen(ScreenViewType.SCREEN_MENU)
            }
        }

        sIsFighting = false
        mActionQueue.clear()
        mActionExecutor.reset()
        mCombatUI.reset()
        mIsAutoAttack = false

        // 恢复一定的血量
        for (p in mPlayerList) {
            if (p.hp <= 0) {
                p.hp = 1
            }
            if (p.mp <= 0) {
                p.mp = 1
            }
            p.hp = (p.hp + (p.maxHP - p.hp) / 10)
            p.mp = (p.mp + p.maxMP / 5)
            if (p.mp > p.maxMP) {
                p.mp = p.maxMP
            }
        }
    }

    private fun setOriginalPlayerPos() {
        for (i in mPlayerList.indices) {
            mPlayerList[i].setCombatPos(sPlayerPos[i].x, sPlayerPos[i].y)
        }
    }

    private fun setOriginalMonsterPos() {
        for (i in mMonsterList.indices) {
            mMonsterList[i].setOriginalCombatPos(i)
        }
    }

    override fun update(delta: Long) {
        mTimeCnt += delta
        when (mCombatState) {
            Combat.CombatState.SelectAction -> {
                if (!mHasEventExed && !sIsRandomFight) {
                    mHasEventExed = true
                    for (i in mEventRound!!.indices) {
                        if (mRoundCnt == mEventRound!![i] && mEventNum!![i] != 0) {
                            game.triggerEvent(mEventNum!![i])
                        }
                    }
                }
                if (mIsAutoAttack) { // 自动生成动作队列
                    generateAutoActionQueue()
                    mCombatState = CombatState.PerformAction
                } else { // 玩家决策
                    mCombatUI.update(delta)
                }
            }

            Combat.CombatState.PerformAction -> if (!mActionExecutor.update(delta)) { // 动作执行完毕
                if (isAllMonsterDead) { // 怪物全挂
                    mTimeCnt = 0 // 计时器清零
                    mCombatState = CombatState.Win

                    Player.sMoney += mWinMoney // 获得金钱
                    val lvuplist = mutableListOf<Player>()
                    for (p in mPlayerList) { // 获得经验
                        if (p.isAlive) {
                            if (p.level >= p.levelupChain.maxLevel)
                            // 满级
                                break
                            val nextExp = p.levelupChain.getNextLevelExp(p.level)
                            val exp = mWinExp + p.currentExp
                            if (exp < nextExp) {
                                p.currentExp = exp
                            } else { // 升级
                                val cl = p.level // 当前等级
                                val c = p.levelupChain
                                p.currentExp = exp - nextExp
                                p.level = cl + 1
                                p.maxHP = p.maxHP + c.getMaxHP(cl + 1) - c.getMaxHP(cl)
                                p.hp = p.maxHP
                                p.maxMP = p.maxMP + c.getMaxMP(cl + 1) - c.getMaxMP(cl)
                                p.mp = p.maxMP
                                p.attack = p.attack + c.getAttack(cl + 1) - c.getAttack(cl)
                                p.defend = p.defend + c.getDefend(cl + 1) - c.getDefend(cl)
                                p.magicChain?.learnNum = c.getLearnMagicNum(cl + 1)
                                p.speed = p.speed + c.getSpeed(cl + 1) - c.getSpeed(cl)
                                p.lingli = p.lingli + c.getLingli(cl + 1) - c.getLingli(cl)
                                p.luck = p.luck + c.getLuck(cl + 1) - c.getLuck(cl)
                                lvuplist.add(p)
                            }
                        }
                    }

                    // 最大幸运值
                    var ppt = 10
                    for (p in mPlayerList) {
                        if (p.luck > ppt) {
                            ppt = p.luck
                        }
                    }
                    ppt -= 10
                    if (ppt > 100) {
                        ppt = 100
                    } else if (ppt < 0) {
                        ppt = 10
                    }

                    // 战利品链表
                    val gm = GoodsManage()
                    val gl = mutableListOf<BaseGoods>()
                    for (m in mMonsterList) {
                        val g = m.dropGoods
                        if (g != null && sRandom.nextInt(101) < ppt) { //  ppt%掉率
                            gm.addGoods(g.type, g.index, g.goodsNum)
                            Player.sGoodsList.addGoods(g.type, g.index, g.goodsNum) // 添加到物品链表
                        }
                    }
                    gl.addAll(gm.goodsList)
                    gl.addAll(gm.equipList)
                    mCombatSuccess = CombatSuccess(this, mWinExp, mWinMoney, gl, lvuplist) // 显示玩家的收获
                } else { // 还有怪物存活
                    if (isAnyPlayerAlive) { // 有玩家角色没挂，继续打怪
                        ++mRoundCnt
                        updateFighterState()
                        mCombatState = CombatState.SelectAction
                        mCurSelActionPlayerIndex = firstAlivePlayerIndex
                        mCombatUI.setCurrentPlayerIndex(mCurSelActionPlayerIndex)
                        for (p in mPlayerList) {
                            p.setFrameByState()
                        }
                    } else { // 玩家角色全挂，战斗失败
                        mTimeCnt = 0
                        mCombatState = CombatState.Loss
                    }
                }
            }

            Combat.CombatState.Win -> {
                mIsWin = true
                if (mCombatSuccess?.update(delta) ?: true) {
                    mCombatState = CombatState.Exit
                }
            }

            Combat.CombatState.Loss ->
                if (sIsRandomFight && mFlyPeach.update(delta)) {

                } else {
                    mIsWin = false
                    mCombatState = CombatState.Exit
                }

            Combat.CombatState.Exit -> exitCurrentCombat()
        }
    }

    override fun draw(canvas: Canvas) {
        canvas.drawBitmap(mBackground, 0, 0)

        // draw the monsters and players
        for (i in mMonsterList.indices) {
            val fc = mMonsterList[i]
            if (fc.isVisiable) {
                fc.fightingSprite!!.draw(canvas)
            }
        }

        for (i in mPlayerList.indices.reversed()) {
            val f = mPlayerList[i].fightingSprite!!
            f.draw(canvas)
        }

        if (mCombatState == CombatState.SelectAction && !mIsAutoAttack) {
            mCombatUI.draw(canvas)
        } else if (mCombatState == CombatState.PerformAction) {
            mActionExecutor.draw(canvas)
        } else if (mCombatState == CombatState.Win) {
            //			TextRender.drawText(canvas, "Win", 20, 40);
            mCombatSuccess?.draw(canvas)
        } else if (mCombatState == CombatState.Loss && sIsRandomFight) {
            //			TextRender.drawText(canvas, "Loss", 20, 40);
            mFlyPeach.draw(canvas, 0, 0)
        }
    }

    override fun onKeyDown(key: Int) {
        if (mCombatState == CombatState.SelectAction) {
            if (!mIsAutoAttack) {
                mCombatUI.onKeyDown(key)
            }
        } else if (mCombatState == CombatState.Win) {
            mCombatSuccess?.onKeyDown(key)
        }
    }

    override fun onKeyUp(key: Int) {
        if (mCombatState == CombatState.SelectAction) {
            if (!mIsAutoAttack) {
                mCombatUI.onKeyUp(key)
            }
        } else if (mCombatState == CombatState.Win) {
            mCombatSuccess?.onKeyUp(key)
        }

        if (mIsAutoAttack && key == Global.KEY_CANCEL) { // 退出“围攻”模式
            mIsAutoAttack = false
        }
    }

    private fun generateAutoActionQueue() {
        val monster = firstAliveMonster

        mActionQueue.clear()

        // 玩家的Action
        for (p in mPlayerList) {
            if (p.isAlive) {
                mActionQueue.add(if (p.hasAtbuff(FightingCharacter.BUFF_MASK_ALL))
                    ActionPhysicalAttackAll(p, mMonsterList)
                else
                    ActionPhysicalAttackOne(p, monster!!))
            }
        }

        // 怪物的Action
        generateMonstersActions()

        sortActionQueue()
    }

    private fun generateMonstersActions() {
        val liveMonsters = mMonsterList.filter { it.isAlive }
        for (m in liveMonsters) {
            val iq = m.mIQ.toDouble() / 100.0
            val p = randomAlivePlayer ?: return
            val magics = m.magicChain?.getAllLearntMagics()?.filter {
                it.costMp < m.mp
            }
            if (magics != null) {
                val dying = m.maxHP / m.hp > 3

                val restoreMagic = magics.firstOrNull { it is MagicRestore }
                val attackMagic = magics.firstOrNull {
                    it is MagicAttack
                } as? MagicAttack

                if (dying && restoreMagic != null && random() < sqrt(iq)) {
                    if (restoreMagic.isForAll) {
                        mActionQueue.add(ActionMagicHelpAll(m, mMonsterList,
                                restoreMagic))
                    } else {
                        mActionQueue.add(ActionMagicHelpOne(m, m, restoreMagic))
                    }
                    continue
                }
                if (attackMagic != null && random() < iq) {
                    if (attackMagic.isForAll) {
                        mActionQueue.add(ActionMagicAttackAll(m, mPlayerList,
                                attackMagic))
                    } else {
                        mActionQueue.add(
                                ActionMagicAttackOne(m, p ,
                                        attackMagic))
                    }
                    continue
                }

            }
            mActionQueue.add(if (m.hasAtbuff(FightingCharacter.BUFF_MASK_ALL))
                ActionPhysicalAttackAll(m, mPlayerList)
            else
                ActionPhysicalAttackOne(m, p))
        }
    }

    /** 按敏捷从大到小排列 */
    private fun sortActionQueue() {
        mActionQueue.sortByDescending { it.priority }
    }

    /** index 之后的主角是否都挂 */
    private fun isPlayerBehindDead(index: Int): Boolean {
        return (index + 1 until mPlayerList.size)
                .none { mPlayerList[it].isAlive }
    }

    /** 更新双方状态 */
    private fun updateFighterState() {
    }

    override fun onActionSelected(action: Action) {
        mActionQueue.add(action)

        mCombatUI.reset() // 重置战斗UI

        fun go() {
            generateMonstersActions()
            sortActionQueue()
            mCombatState = CombatState.PerformAction // 开始执行动作队列
        }

        if (action is ActionCoopMagic) { // 只保留合击
            mActionQueue.clear()
            mActionQueue.add(action)
            go()
        } else if (mCurSelActionPlayerIndex >= mPlayerList.size - 1 || isPlayerBehindDead(mCurSelActionPlayerIndex)) { // 全部玩家角色的动作选择完成
            go()
        } else { // 选择下一个玩家角色的动作
            val nextIndex = nextAlivePlayerIndex
            mCurSelActionPlayerIndex = nextIndex
            mCombatUI.setCurrentPlayerIndex(nextIndex)
        }
    }

    override fun onAutoAttack() {
        // clear all the actions that has been selected, enter into auto fight mode
        mCombatUI.reset()
        mActionQueue.clear()
        mIsAutoAttack = true
        mCombatState = CombatState.SelectAction
    }

    override fun onFlee() {
        mCombatUI.reset() // 重置战斗UI

        for (i in mCurSelActionPlayerIndex until mPlayerList.size) {
            if (mPlayerList[i].isAlive && sRandom.nextBoolean() && sIsRandomFight) { // 50% 逃走
                mActionQueue.add(ActionFlee(mPlayerList[i], true, object : Runnable {

                    override fun run() {
                        // 逃跑成功后执行
                        mIsWin = true
                        mCombatState = CombatState.Exit
                    }
                }))
                break
            } else { // 逃跑失败
                mActionQueue.add(ActionFlee(mPlayerList[i], false, null))
            }
        }
        generateMonstersActions()
        sortActionQueue()
        mCombatState = CombatState.PerformAction
    }

    override fun onCancel() {
        val i = preAlivePlayerIndex
        if (i >= 0) { // 不是第一个角色
            // 重选上一个角色的动作
            mActionQueue.removeAt(mActionQueue.size-1)
            mCurSelActionPlayerIndex = i
            mCombatUI.setCurrentPlayerIndex(mCurSelActionPlayerIndex)

            mCombatUI.reset()
        }
    }

    companion object {

        private var sIsEnable: Boolean = false
        private var globalDisableFighting: Boolean = false
        private var sIsFighting: Boolean = false

        private var sInstance: Combat? = null
        private var sInstanceBk: Combat? = null

        private var sIsRandomFight: Boolean = false

        fun IsActive(): Boolean {
            return sIsEnable && sInstance != null && sIsFighting
        }

        /**
         * 开启随即战斗
         */
        fun FightEnable() {
            sIsEnable = true
        }

        /**
         * 关闭随即战斗
         */
        fun FightDisable() {
            sIsEnable = false
            if (sInstance != null) {
                sInstance = null
            }
        }

        /**
         * 初始化并开启随即战斗
         * @param monstersType 0-7 可能出现的敌人种类
         * @param scrb 战斗背景
         * @param scrl 左下角图
         * @param scrr 右上角图
         */
        fun InitFight(parent: GameNode, monstersType: IntArray, scrb: Int, scrl: Int, scrr: Int) {
            sIsEnable = true
            sIsRandomFight = true
            sIsFighting = false

            val instance = Combat(parent)
            sInstance = instance
            sInstanceBk = null

            instance.mMonsterType = monstersType.filter { it != 0 }
                    .toIntArray()
            instance.mRoundCnt = 0
            instance.mMaxRound = 0 // 回合数无限制
            instance.createBackgroundBitmap(scrb, scrl, scrr)
        }

        fun write(out: ObjectOutput) {
            val instance = sInstance
            val fightEnabled = sIsEnable && instance != null
            out.writeBoolean(fightEnabled)
            if (sIsEnable && instance != null) {
                out.writeIntArray(instance.mMonsterType)
                out.writeInt(instance.mScrb)
                out.writeInt(instance.mScrl)
                out.writeInt(instance.mScrR)
            }
        }

        fun read(parent: GameNode, coder: ObjectInput) {
            sIsEnable = coder.readBoolean()
            if (sIsEnable) {
                val monsterType = coder.readIntArray()
                val scrb = coder.readInt()
                val scrl = coder.readInt()
                val scrr = coder.readInt()
                InitFight(parent, monsterType, scrb, scrl, scrr)
            }
        }

        /**
         * 剧情战斗
         * @param roundMax 最多回合数，0为无限
         * @param monstersType 0-3 敌人
         * @param scr 0战斗背景，1左下角图，2右上角图
         * @param evtRnds 0-3 战斗中，触发事件的回合
         * @param evts 0-3 对应的事件号
         * @param lossto 战斗失败跳转的地址
         * @param winto 战斗成功跳转的地址
         */
        fun EnterFight(parent: GameNode, roundMax: Int, monstersType: IntArray, scr: IntArray, evtRnds: IntArray, evts: IntArray, lossto: Int, winto: Int) {
            sIsRandomFight = false

            sInstanceBk = sInstance // 保存当前随机战斗的引用
            val instance = Combat(parent)
            sInstance = instance

            instance.mMonsterList = mutableListOf()
            monstersType.indices
                    .filter { monstersType[it] > 0 }
                    .map { DatLib.getRes(DatLib.ResType.ARS, 3, monstersType[it]) as Monster }
                    .forEach { instance.mMonsterList.add(it) }

            instance.mMaxRound = roundMax
            instance.mRoundCnt = 0

            prepareForNewCombat(instance)

            instance.createBackgroundBitmap(scr[0], scr[1], scr[2])

            instance.mEventRound = evtRnds
            instance.mEventNum = evts

            instance.mLossAddr = lossto
            instance.mWinAddr = winto
        }

        private fun prepareForNewCombat(combat: Combat) {
            sIsEnable = true
            sIsFighting = true
            combat.prepareForNewCombat()
        }

        private val COMBAT_PROBABILITY = 20
        private val sRandom = Random()

        /**
         * 进入一个随机战斗
         * @return `true`新战斗 `false`不开始战斗
         */
        fun StartNewRandomCombat(): Boolean {
            val instance = sInstance

            if (globalDisableFighting
                    || !sIsEnable
                    || instance == null
                    || instance.mMonsterType.isEmpty()
                    || sRandom.nextInt(COMBAT_PROBABILITY) != 0) {
                sIsFighting = false
                return false
            }

            // 随机添加怪物
            instance.mMonsterList.clear()
            val i = sRandom.nextInt(3)
            (0..i).forEach {
                val x = sRandom.nextInt(instance.mMonsterType.size)
                val m = DatLib.getRes(DatLib.ResType.ARS, 3, instance.mMonsterType[x]) as Monster
                instance.mMonsterList.add(m)
            }

            instance.mRoundCnt = 0
            instance.mMaxRound = 0 // 回合不限

            prepareForNewCombat(instance)

            return true
        }

        fun Update(delta: Long) {
            sInstance?.update(delta)
        }

        fun Draw(canvas: Canvas) {
            sInstance?.draw(canvas)
        }

        fun KeyDown(key: Int) {
            sInstance?.onKeyDown(key)
        }

        fun KeyUp(key: Int) {
            sInstance?.onKeyUp(key)
        }

        /** 玩家角色中心坐标 */
        val sPlayerPos = arrayOf(
                Point(64 + 12, 52 + 18),
                Point(96 + 12, 48 + 18),
                Point(128 + 12, 40 + 18))

        fun ForceWin() {
            sInstance?.mCombatState = CombatState.Win
        }
    }
}
