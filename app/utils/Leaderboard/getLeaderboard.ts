"use server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

const getLeaderboard = async () => {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    const { data, error } = await supabase
        .from("teams")
        .select("adoption, security, treasury,decentralization, stability, name")
        .neq("name", "__competition__");
    if (error) throw error;
    return data
}

export default getLeaderboard
