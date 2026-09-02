import { AttackCategory, AttackType } from "@/app/lib/types"
import { createClient } from "@/utils/supabase/client"

const getAttackDetails = async (attack_type: AttackType) => {
    const supabase = createClient()
    const {data, error} = await supabase 
        .from("attack_type")
        .select("strength, treasury_cost")
        .eq("type", attack_type)
        .single()
    if (error) throw error;
    return {strength: data.strength, cost: data.treasury_cost}
}

export default getAttackDetails
