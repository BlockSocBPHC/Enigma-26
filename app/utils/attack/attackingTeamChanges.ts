
import getTeamScore from "../TeamScore/getTeamScore"
import getAttackDetails from "./ValuesGetter/getAttackDetails"
import updateTeamScore from "../TeamScore/updateTeamScore"
import { AttackType } from "@/app/lib/types"
const attackingTeamChanges = async (attackingTeamname: string, attack_type: AttackType) => {
        let {adoption, security, decentralization, treasury, stability} = await getTeamScore(attackingTeamname)
        const {cost} = await getAttackDetails(attack_type)
        treasury-=cost
        await updateTeamScore(attackingTeamname, adoption, security, decentralization, treasury, stability)
}

export default attackingTeamChanges
