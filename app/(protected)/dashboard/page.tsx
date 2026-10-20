import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import DashboardGame from "@/app/(protected)/dashboard/dashboard-game";
import { fetchCompetitionState } from "@/app/lib/competition-state-server";
import type { Leaderboard, TeamDetails, TeamScore } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) redirect("/");

  // Try finding team by leader email (case-insensitive)
  const { data: leaderTeam } = await supabase
    .from("team_info")
    .select("teamname, teammembers")
    .ilike("teamleaderemail", user.email)
    .maybeSingle();

  let resolvedTeamName = leaderTeam?.teamname;
  let resolvedMembers: string[] = Array.isArray(leaderTeam?.teammembers) ? leaderTeam.teammembers : [];

  // If not leader, check if user is listed in any team members
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

  // If still not found, render an unregistered screen rather than infinite redirect
  if (!resolvedTeamName) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#030604] px-4 text-[#f3fff0]">
        <div className="w-full max-w-md rounded-3xl border border-red-500/30 bg-[rgba(18,6,7,0.85)] p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-2xl text-red-400">
            ⚠
          </div>
          <h1 className="mt-5 text-2xl font-black">Not Registered</h1>
          <p className="mt-3 text-sm leading-relaxed text-[#c9a6a8]">
            Signed in as <b className="text-white">{user.email}</b>. This email is not registered as a team leader or member for ENIGMA.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <form action="/auth/signout" method="post">
              {/* Fallback to simple link redirect */}
            </form>
            <Link
              href="/"
              className="inline-block rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/20"
            >
              ← Return Home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Load team score and round completion state
  const { data: scoreData } = await supabase
    .from("teams")
    .select("adoption, security, treasury, decentralization, stability, round_completed")
    .eq("name", resolvedTeamName)
    .maybeSingle();

  const score: TeamScore = scoreData ? {
    adoption: Number(scoreData.adoption ?? 100),
    security: Number(scoreData.security ?? 100),
    treasury: Number(scoreData.treasury ?? 100),
    decentralization: Number(scoreData.decentralization ?? 100),
    stability: Number(scoreData.stability ?? 100),
  } : {
    adoption: 100,
    security: 100,
    treasury: 100,
    decentralization: 100,
    stability: 100,
  };

  // Load leaderboard (excluding system records)
  const { data: leaderboardData } = await supabase
    .from("teams")
    .select("name, adoption, security, treasury, decentralization, stability")
    .neq("name", "__competition__");

  const leaderboard: Leaderboard[] = Array.isArray(leaderboardData)
    ? leaderboardData.map((row) => ({
        name: String(row.name),
        adoption: Number(row.adoption ?? 0),
        security: Number(row.security ?? 0),
        treasury: Number(row.treasury ?? 0),
        decentralization: Number(row.decentralization ?? 0),
        stability: Number(row.stability ?? 0),
      }))
    : [];

  // Load centralized competition state
  const initialCompetition = await fetchCompetitionState();

  // Determine current round from teams.round_completed (with cookie fallback)
  let initialRound = 1;
  if (scoreData && scoreData.round_completed !== undefined && scoreData.round_completed !== null) {
    initialRound = Number(scoreData.round_completed) + 1;
  } else {
    const cookieVal = cookieStore.get(`enigma_round_${resolvedTeamName}`)?.value;
    if (cookieVal) {
      const parsed = parseInt(cookieVal, 10);
      if (!isNaN(parsed) && parsed >= 1) initialRound = parsed;
    }
  }

  const team: TeamDetails = {
    teamName: resolvedTeamName,
    teamMembers: resolvedMembers,
  };

  return (
    <DashboardGame
      team={team}
      userEmail={user.email}
      initialScore={score}
      initialLeaderboard={leaderboard}
      initialRound={initialRound}
      initialCompetition={initialCompetition}
    />
  );
}
