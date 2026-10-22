import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ScoreboardView from "./scoreboard-view";
import type { Leaderboard, TeamDetails } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/server";
import { checkAdminAuth } from "@/app/(protected)/admin/actions";
import calculateFinalTeamScore from "@/app/utils/TeamScore/calculateFinalTeamScore";

export const dynamic = "force-dynamic";

export default async function ScoreboardPage() {
  // Scoreboard is restricted to admin only - users cannot see scoreboard at all
  const isAdmin = await checkAdminAuth();
  if (!isAdmin) {
    redirect("/dashboard");
  }

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
    teamName: resolvedTeamName || "Admin Observer",
    teamMembers: resolvedMembers,
  };

  // Determine current round
  let currentRound = 1;
  try {
    const { data: compRow } = await supabase
      .from("teams")
      .select("round_completed")
      .eq("name", "__competition__")
      .maybeSingle();
    if (compRow?.round_completed) {
      currentRound = Number(compRow.round_completed);
    }
  } catch {}

  // Load all teams sorted by final_score descending
  const { data: teamsData, error } = await supabase
    .from("teams")
    .select("name, adoption, security, treasury, decentralization, stability, final_score")
    .neq("name", "__competition__")
    .order("final_score", { ascending: false });

  if (error || !teamsData) {
    throw new Error("Unable to load scoreboard data.");
  }

  const leaderboard: Leaderboard[] = teamsData
    .filter((row) => !String(row.name).startsWith("__"))
    .map((row) => {
      const adoption = Number(row.adoption ?? 0);
      const security = Number(row.security ?? 0);
      const decentralization = Number(row.decentralization ?? 0);
      const treasury = Number(row.treasury ?? 0);
      const stability = Number(row.stability ?? 0);
      const computedFinal = calculateFinalTeamScore(
        adoption,
        security,
        decentralization,
        treasury,
        stability
      );
      const finalScore = Number(row.final_score ?? computedFinal);

      return {
        name: String(row.name).trim(),
        adoption,
        security,
        treasury,
        decentralization,
        stability,
        final_score: finalScore,
      };
    })
    .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0));

  return (
    <ScoreboardView
      team={team}
      userEmail={user.email}
      leaderboard={leaderboard}
      currentRound={currentRound}
    />
  );
}
