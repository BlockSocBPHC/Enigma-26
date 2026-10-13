
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

const getProbValues = async (diff: number) => {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const rounded = Math.round(diff)
    const { data, error } = await supabase
        .from("success_probability")
        .select("probability")
        .lte("min_difference", rounded)
        .gte("max_difference", rounded)
        .single()
    if (error || !data) {
        if (rounded <= -30) return 0.05;
        if (rounded >= 30) return 1.0;
        throw error;
    }
    return data.probability
}

export default getProbValues
