package fmj.combat.actions

import fmj.characters.FightingCharacter
import java.random
import kotlin.math.max

object CalcDamage {

    fun calcBaseDamage(attack: Int, defense: Int): Int {
        return max(attack - defense, 0)
//        return when {
//            attack > defense -> (attack * 2 - defense * 1.6 + 0.5).toInt()
//            attack > defense * 0.6 -> (attack - defense * 0.6 + 0.5).toInt()
//            else -> 0
//        }
    }

    fun randomMiss(at: FightingCharacter, df: FightingCharacter): Boolean {
        val diff = at.computedSpeed - df.computedSpeed
        /*
        y = a*x + b
        (100, 0)
        (0, 0.3)
        100*a + b = 0
        b = 0.3
        a = -0.003
        * */
        val prob = -diff*0.003 + 0.3
        return random() < prob
    }
}
