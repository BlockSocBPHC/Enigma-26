import { AttackCategory } from "@/app/lib/types"
import { createClient } from "@/utils/supabase/client"

const getAfterAttackChanges = async (attack_category: AttackCategory) => {
    const supabase = createClient()
    const { data, error } = await supabase 
        .from("after_attack")
        .select("security_change, adoption_change, decentralization_change, treasury_change, stability_change")
        .eq("attack_type", attack_category)
        .single()
    if (error) throw error;
    return data
}

export default getAfterAttackChanges
