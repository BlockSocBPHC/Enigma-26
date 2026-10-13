
import getTeamScore from "../TeamScore/getTeamScore"
import getAttackDetails from "./ValuesGetter/getAttackDetails"
import updateTeamScore from "../TeamScore/updateTeamScore"
import { AttackType } from "@/app/lib/types"
const attackingTeamChanges = async (attackingTeamname: string, attack_type: AttackType) => {
        const {adoption, security, decentralization, treasury, stability} = await getTeamScore(attackingTeamname)
        const {cost} = await getAttackDetails(attack_type)
        await updateTeamScore(
            attackingTeamname,
            adoption,
            security,
            decentralization,
            treasury - cost,
            stability,
        )
}

export default attackingTeamChanges
