"use server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers";

const isRegistered = async (email: string) => {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from("team_info")
        .select("teamname, teammembers")
        .ilike("teamleaderemail", email)
        .maybeSingle()

    if (error) console.error("Supabase error:", error.code, error.message, error.hint)
    if (!data) return null;

    return {
        teamName: data.teamname,
        teamMembers: Array.isArray(data.teammembers) ? data.teammembers : [],
    };
}

export default isRegistered