package fmj.combat.actions

import fmj.characters.FightingCharacter
import java.random

object CalcDamage {

    fun calcBaseDamage(attack: Int, defense: Int): Int {
        return when {
            attack > defense -> (attack * 2 - defense * 1.6 + 0.5).toInt()
            attack > defense * 0.6 -> (attack - defense * 0.6 + 0.5).toInt()
            else -> 0
        }
    }

    fun randomMiss(at: FightingCharacter, df: FightingCharacter): Boolean {
        val diff = at.computedSpeed - df.computedSpeed
        val prob = if (diff > 0) {
            // 1 = a*100 + b
            // 0.7 =  b
            // a = 0.003
            diff*0.003 + 0.7
        } else {
            // 0 = a*-100 + b
            // 0.7 =  b
            // a = b/100 = 0.007
            diff*0.007+0.7
        }
        return random() < prob
    }
}
