import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ScoreboardView from "./scoreboard-view";
import type { Leaderboard, TeamDetails } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/server";

export default async function ScoreboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/");

  // Resolve team
  const { data: leaderTeam } = await supabase
    .from("team_info")
    .select("teamname, teammembers")
    .ilike("teamleaderemail", user.email)
    .maybeSingle();

  let resolvedTeamName = leaderTeam?.teamname;
  let resolvedMembers: string[] = Array.isArray(leaderTeam?.teammembers) ? leaderTeam.teammembers : [];

  if (!resolvedTeamName) {
    const { data: allTeams } = await supabase
      .from("team_info")
      .select("teamname, teammembers");

    const matched = allTeams?.find((t) =>
      Array.isArray(t.teammembers) &&
      t.teammembers.some((m: string) => m.toLowerCase() === user.email?.toLowerCase())
    );

    if (matched) {
      resolvedTeamName = matched.teamname;
      resolvedMembers = Array.isArray(matched.teammembers) ? matched.teammembers : [];
    }
  }

  const team: TeamDetails = {
    teamName: resolvedTeamName || "Observer",
    teamMembers: resolvedMembers,
  };

  // Determine current round from teams.round_completed
  let currentRound = 1;
  if (resolvedTeamName) {
    try {
      const { data: teamRow } = await supabase
        .from("teams")
        .select("round_completed")
        .eq("name", resolvedTeamName)
        .maybeSingle();
      if (teamRow && teamRow.round_completed !== undefined && teamRow.round_completed !== null) {
        currentRound = Number(teamRow.round_completed) + 1;
      } else {
        const cookieVal = cookieStore.get(`enigma_round_${resolvedTeamName}`)?.value;
        if (cookieVal) {
          const parsed = parseInt(cookieVal, 10);
          if (!isNaN(parsed) && parsed >= 1) currentRound = parsed;
        }
      }
    } catch {
      const cookieVal = cookieStore.get(`enigma_round_${resolvedTeamName}`)?.value;
      if (cookieVal) {
        const parsed = parseInt(cookieVal, 10);
        if (!isNaN(parsed) && parsed >= 1) currentRound = parsed;
      }
    }
  }

  // Load all teams
  const { data: teamsData, error } = await supabase
    .from("teams")
    .select("name, adoption, security, treasury, decentralization, stability")
    .neq("name", "__competition__");

  if (error || !teamsData) {
    throw new Error("Unable to load scoreboard data.");
  }

  const leaderboard: Leaderboard[] = teamsData.map((row) => ({
    name: String(row.name),
    adoption: Number(row.adoption ?? 0),
    security: Number(row.security ?? 0),
    treasury: Number(row.treasury ?? 0),
    decentralization: Number(row.decentralization ?? 0),
    stability: Number(row.stability ?? 0),
  }));

  return (
    <ScoreboardView
      team={team}
      userEmail={user.email}
      leaderboard={leaderboard}
      currentRound={currentRound}
    />
  );
}
