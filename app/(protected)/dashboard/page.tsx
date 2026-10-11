import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import getLeaderboard from "@/app/utils/Leaderboard/getLeaderboard";
import getTeamScore from "@/app/utils/TeamScore/getTeamScore";
import DashboardClient from "@/app/components/game/DashboardClient";
import { Leaderboard, TeamScore } from "@/app/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  // Fetch initial leaderboard
  let initialLeaderboard: Leaderboard[] = [];
  try {
    const data = await getLeaderboard();
    initialLeaderboard = (data as Leaderboard[]) || [];
  } catch (error) {
    console.error("Dashboard failed to fetch leaderboard:", error);
  }

  // Pick active team: either "Bitcoin" or first in list
  const defaultTeam =
    initialLeaderboard.find((t) => t.name.toLowerCase() === "bitcoin")?.name ||
    initialLeaderboard[0]?.name ||
    "Bitcoin";

  // Fetch initial team score
  let initialTeamScore: TeamScore | null = null;
  try {
    initialTeamScore = await getTeamScore(defaultTeam);
  } catch (error) {
    console.error("Dashboard failed to fetch initial team score:", error);
  }

  return (
    <DashboardClient
      userEmail={user.email}
      initialLeaderboard={initialLeaderboard}
      initialActiveTeam={defaultTeam}
      initialTeamScore={initialTeamScore}
    />
  );
}