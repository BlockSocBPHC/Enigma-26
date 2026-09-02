import { AttackCategory, AttackType } from "@/app/lib/types"
import getDefenseScore from "./ValuesGetter/getDefenseScore"
import getProbValues from "./ValuesGetter/getProbValues"
import getAttackStrength from "./ValuesGetter/getAttackDetails"


const isAttackSuccessful = async (attackedTeamname: string, attack_category: AttackCategory, attack_type: AttackType) => {
    const defenseScore = await getDefenseScore(attackedTeamname, attack_category)
    const {strength} = await getAttackStrength(attack_type)
    const prob = await getProbValues(strength-defenseScore)
    const num= Math.random()
    if (num<=prob) return true
    else return false
}

export default isAttackSuccessful
