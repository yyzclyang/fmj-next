package fmj

import graphics.Color


object Global {
    var COLOR_WHITE = Color(250, 245, 255, 255)
    var COLOR_BLACK = Color(0, 0, 0, 255)
    var COLOR_TRANSP = Color(0, 0, 0, 0)

    val Scale = 3//游戏放大缩小倍数
    val SCREEN_WIDTH = 160
    val SCREEN_HEIGHT = 96


    val MAP_LEFT_OFFSET = 8

    val KEY_UP = 1
    val KEY_DOWN = 2
    val KEY_LEFT = 3
    val KEY_RIGHT = 4
    val KEY_PAGEUP = 5
    val KEY_PAGEDOWN = 6
    val KEY_ENTER = 7
    val KEY_CANCEL = 8
}

enum class ScreenViewType {
    SCREEN_DEV_LOGO,
    SCREEN_GAME_LOGO,
    SCREEN_MENU,
    SCREEN_MAIN_GAME,
    SCREEN_GAME_FAIL,
    SCREEN_SAVE_GAME,
    SCREEN_LOAD_GAME
}
