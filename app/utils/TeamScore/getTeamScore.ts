"use server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers";

const getTeamScore = async (teamName: string) => {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from("teams")
        .select("adoption, security, treasury, decentralization, stability, final_score")
        .eq("name", teamName)
        .single();
    if (error) throw error;
    
    return data
}

export default getTeamScore
