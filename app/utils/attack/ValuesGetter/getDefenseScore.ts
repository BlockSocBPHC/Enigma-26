import { createClient } from "@/utils/supabase/client"
import getAttackDefenseWeight from "./getAttackDefenseWeight"
import { AttackCategory } from "@/app/lib/types"
import getTeamScore from "@/app/utils/TeamScore/"
const getDefenseScore = async (attackedTeamname: string, attackType: AttackCategory) => {
    const { adoption, security, decentralization, treasury } = await getteamscore(attackedTeamname)
    const { security_weight, adoption_weight, decentralization_weight, treasury_weight  } = await getAttackDefenseWeight(attackType)
    
    const defenseScore = adoption*adoption_weight + security*security_weight + decentralization*decentralization_weight + treasury*treasury_weight
        
    return defenseScore
}

export default getDefenseScore



