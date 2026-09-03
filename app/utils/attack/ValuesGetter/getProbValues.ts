
import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"

const getProbValues = async (diff: number) => {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const { data, error } = await supabase
        .from("success_probability")
        .select("probability")
        .lte("min_difference", diff)
        .gte("max_difference", diff)
        .single()
    if (error) throw error;
    return data.probability
}

export default getProbValues
