// "use server will be removed afterwards"
"use server"
import { createClient } from '@/utils/supabase/client'
import getTeamScore from './getTeamScore'

const updateFinalScore = async (teamName: string) => {
    const supabase = createClient()

    const scores = await getTeamScore(teamName)
    
    const {adoption, security, treasury, stability} = scores
    const final_Score = (0.30 * adoption)+(0.30 * security)+(0.20 * treasury)+(0.20 * stability)
    
    const { data , error } = await supabase 
        .from("teams")
        .update({final_score: final_Score})
        .eq("name", teamName);
    if (error) throw error
    
}

export default updateFinalScore
