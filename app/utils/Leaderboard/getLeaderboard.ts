import { createClient } from "@/utils/supabase/client"

const getLeaderboard = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
        .from("teams")
        .select("adoption, security, treasury,decentralization, stability, name")
    if (error) throw error;
    return data
}

export default getLeaderboard
