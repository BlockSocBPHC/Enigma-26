import { createClient } from "@/utils/supabase/client"

const getProbValues = async (diff: number) => {
    console.log("diff : ", diff)
    const supabase = createClient()
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
