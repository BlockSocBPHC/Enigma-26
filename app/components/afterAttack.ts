import { AttackCategory, AttackType } from "@/app/lib/types"
import isAttackSuccessful from "../utils/attack/isAttackSuccessful"
import getTeamScore from "../utils/TeamScore/getTeamScore"
import getAfterAttackChanges from "../utils/attack/ValuesGetter/getAfterAttackChanges"
import updateTeamScore from "../utils/TeamScore/updateTeamScore"
import attackingTeamChanges from "../utils/attack/attackingTeamChanges"

const afterAttack = async (attackingTeamname: string,attackedTeamname: string, attack_category: AttackCategory, attack_type: AttackType) => {
    const isSuccess = await isAttackSuccessful(attackedTeamname, attack_category, attack_type)
    if (isSuccess) {
        console.log("attack success")
        let { adoption, security, decentralization, treasury, stability } = await getTeamScore(attackedTeamname)
        const { security_change, adoption_change, decentralization_change, treasury_change, stability_change } = await getAfterAttackChanges(attack_category)
        
        adoption += adoption_change
        security += security_change
        decentralization += decentralization_change
        treasury += treasury_change
        stability += stability_change

        const data = await updateTeamScore(attackedTeamname, adoption, security, decentralization, treasury, stability);
        await attackingTeamChanges(attackingTeamname, attack_type)
        return data
    }
    else {
        console.log("attack failed")
       await attackingTeamChanges(attackingTeamname, attack_type)
    }


}

export default afterAttack
