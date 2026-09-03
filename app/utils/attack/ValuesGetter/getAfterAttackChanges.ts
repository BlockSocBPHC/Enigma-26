
import { AttackCategory } from "@/app/lib/types"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

const getAfterAttackChanges = async (attack_category: AttackCategory) => {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase 
        .from("after_attack")
        .select("security_change, adoption_change, decentralization_change, treasury_change, stability_change")
        .eq("attack_type", attack_category)
        .single()
    if (error) throw error;
    return data
}

export default getAfterAttackChanges
