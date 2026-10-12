"use server"
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers";

const isRegistered = async (email: string) => {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore)
    console.log("print ho rha hai??")
    const { data, error } = await supabase
        .from("team_info")
        .select("teamname, teammembers")
        .eq("teamleaderemail", email)
        .single()

    if (error) console.error("Supabase error:", error.code, error.message, error.hint)
    if (!data) return null;
    console.log("ihar aa bji rha hai??")
    console.log(data)

    return {
        teamName: data.teamname,
        teamMembers: data.teammembers,
    };
}

export default isRegistered