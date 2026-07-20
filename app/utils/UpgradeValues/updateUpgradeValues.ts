import { createClient } from "@/utils/supabase/client";
import updateFinalScore from "../TeamScore/updateTeamScore";

const updateMetrics = async (
    teamName: string,
    adoption: number,
    security: number,
    decentralization: number,
    treasury: number,
    stability: number
) => {
    const supabase = createClient();

    const { data, error } = await supabase
        .from("teams")
        .update({
            adoption,
            security,
            decentralization,
            treasury,
            stability,
        })
        .eq("name", teamName)
        .select()
        .single();

    if (error) throw error;
    await updateFinalScore(teamName)
};

export default updateMetrics;