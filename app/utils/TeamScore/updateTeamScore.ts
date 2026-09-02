import { createClient } from "@/utils/supabase/client";
import calulateFinalTeamScore from "./calculateFinalTeamScore";

const updateTeamScore = async (
    teamName: string,
    adoption: number,
    security: number,
    decentralization: number,
    treasury: number,
    stability: number
) => {
    const final_score = await calulateFinalTeamScore(adoption, security, decentralization, treasury, stability);

    const supabase = createClient();
    const { data, error } = await supabase
        .from("teams")
        .update({
            adoption,
            security,
            decentralization,
            treasury,
            stability,
            final_score,
        })
        .eq("name", teamName)
        .select()
        .single();

    if (error) throw error;
    return data
};

export default updateTeamScore;