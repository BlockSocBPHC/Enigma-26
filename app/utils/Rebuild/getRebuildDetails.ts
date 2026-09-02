import { RebuildType } from "@/app/lib/types"
import { createClient } from "@/utils/supabase/client"

const getRebuildDetails = async (rebuild_type: RebuildType) => {
    const supabase = createClient()
    const {data, error} = await supabase
        .from("rebuild_actions")
        .select("treasury_cost, security_change, decentralization_change, treasury_change, adoption_change, stability_change")
        .eq("action_name", rebuild_type)
        .single()
    if (error) throw error;
    return data
}

export default getRebuildDetails
