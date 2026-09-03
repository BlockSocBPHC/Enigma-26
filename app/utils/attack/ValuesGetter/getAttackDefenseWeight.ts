
import { AttackCategory } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers";

const getAttackDefenseWeight = async (attackType: AttackCategory) => {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from("attack_defense_formula")
        .select("security_weight, adoption_weight, decentralization_weight, treasury_weight")
        .eq("attack_type", attackType)
        .single()
    if (error) throw error;
    return data

}

export default getAttackDefenseWeight
