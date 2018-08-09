package fmj.combat.anim

import graphics.Canvas

interface Animation {
    fun update(delta: Long): Boolean
    fun draw(canvas: Canvas)
}