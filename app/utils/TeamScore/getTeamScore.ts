import { createClient } from "@/utils/supabase/client"


const getTeamScore = async (teamName: string) => {
    const supabase = createClient()

    const { data, error } = await supabase
        .from("teams")
        .select("adoption, security, treasury, decentralization, stability, final_score")
        .eq("name", teamName)
        .single();
    if (error) throw error;
    
    return data
}

export default getTeamScore
