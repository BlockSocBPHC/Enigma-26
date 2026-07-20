import { createClient } from "@/utils/supabase/client"


const getTeamScore = async (name: string) => {
    const supabase = createClient()

    const { data, error } = await supabase
        .from("teams")
        .select("adoption, security, treasury, decentralization, stability, final_score")
        .eq("name", name)
        .single();
    if (error) throw error;
    
    return data
}

export default getTeamScore
