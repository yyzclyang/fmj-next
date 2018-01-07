package fmj.combat.actions

object CalcDamage {

    fun calcBaseDamage(attack: Int, defense: Int): Int {
        val damage: Int

        if (attack > defense) {
            damage = (attack * 2 - defense * 1.6 + 0.5).toInt()
        } else if (attack > defense * 0.6) {
            damage = (attack - defense * 0.6 + 0.5).toInt()
        } else {
            damage = 0
        }

        return damage
    }

    //	public static int calcMagicDamage(int )

}
