import { RebuildType } from "@/app/lib/types"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

const getRebuildDetails = async (rebuild_type: RebuildType) => {
    const cookieStore =await cookies()
    const supabase = createClient(cookieStore)
    const {data, error} = await supabase
        .from("rebuild_actions")
        .select("treasury_cost, security_change, decentralization_change, treasury_change, adoption_change, stability_change")
        .eq("action_name", rebuild_type)
        .single()
    if (error) throw error;
    return data
}

export default getRebuildDetails
