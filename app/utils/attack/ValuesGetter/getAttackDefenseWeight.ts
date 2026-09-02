import { AttackCategory } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/client"

const getAttackDefenseWeight = async (attackType: AttackCategory) => {
    const supabase = createClient()
    const { data, error } = await supabase
        .from("attack_defense_formula")
        .select("security_weight, adoption_weight, decentralization_weight, treasury_weight")
        .eq("attack_type", attackType)
        .single()
    if (error) throw error;
    return data

}

export default getAttackDefenseWeight
