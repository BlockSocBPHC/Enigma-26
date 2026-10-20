"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  CompetitionState,
  parseCompetitionRow,
  ROUND_DURATIONS,
} from "@/app/lib/competition-state";
import { fetchCompetitionState } from "@/app/lib/competition-state-server";

export type AdminTeamRow = {
  id: string;
  name: string;
  adoption: number;
  security: number;
  decentralization: number;
  treasury: number;
  stability: number;
  round_completed: number;
  final_score: number | null;
};

export async function adminLoginAction(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (username.toLowerCase() === "jayesh" && password === "Jayesh@123") {
    const cookieStore = await cookies();
    cookieStore.set("enigma_admin_token", "authenticated_jayesh", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
    });
    return { success: true };
  }

  return { success: false, error: "Invalid username or password" };
}

export async function adminLogoutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete("enigma_admin_token");
}

export async function checkAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  return cookieStore.get("enigma_admin_token")?.value === "authenticated_jayesh";
}

export async function getAdminCompetitionData(): Promise<{
  state: CompetitionState;
  teams: AdminTeamRow[];
}> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const state = await fetchCompetitionState();

  const { data: teamsData } = await supabase
    .from("teams")
    .select("id, name, adoption, security, decentralization, treasury, stability, round_completed, final_score")
    .neq("name", "__competition__")
    .order("name", { ascending: true });

  return {
    state,
    teams: (teamsData ?? []) as AdminTeamRow[],
  };
}

export async function startCompetitionAction(round = 1): Promise<CompetitionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const nowSec = Math.floor(nowMs / 1000);
  const duration = ROUND_DURATIONS[round] ?? 600;

  const { data: row, error } = await supabase
    .from("teams")
    .update({
      adoption: 1, // running
      round_completed: round,
      treasury: duration,
      created_at: nowIso,
      stability: nowSec,
    })
    .eq("name", "__competition__")
    .select("adoption, round_completed, treasury, created_at, stability")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/scoreboard");
  return parseCompetitionRow(row);
}

export async function advanceRoundAction(): Promise<CompetitionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const current = await fetchCompetitionState();
  const nextRound = current.currentRound + 1;

  if (nextRound > 5) {
    // End competition if beyond round 5
    return endCompetitionAction();
  }

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const nowSec = Math.floor(nowMs / 1000);
  const duration = ROUND_DURATIONS[nextRound] ?? 600;

  const { data: row, error } = await supabase
    .from("teams")
    .update({
      adoption: 1, // running
      round_completed: nextRound,
      treasury: duration,
      created_at: nowIso,
      stability: nowSec,
    })
    .eq("name", "__competition__")
    .select("adoption, round_completed, treasury, created_at, stability")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/scoreboard");
  return parseCompetitionRow(row);
}

export async function setRoundAction(round: number): Promise<CompetitionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const safeRound = Math.max(1, Math.min(5, round));
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const nowSec = Math.floor(nowMs / 1000);
  const duration = ROUND_DURATIONS[safeRound] ?? 600;

  const { data: row, error } = await supabase
    .from("teams")
    .update({
      adoption: 1, // running
      round_completed: safeRound,
      treasury: duration,
      created_at: nowIso,
      stability: nowSec,
    })
    .eq("name", "__competition__")
    .select("adoption, round_completed, treasury, created_at, stability")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/scoreboard");
  return parseCompetitionRow(row);
}

export async function restartTimerAction(): Promise<CompetitionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const current = await fetchCompetitionState();
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const nowSec = Math.floor(nowMs / 1000);
  const duration = ROUND_DURATIONS[current.currentRound] ?? 600;

  const { data: row, error } = await supabase
    .from("teams")
    .update({
      created_at: nowIso,
      stability: nowSec,
      treasury: duration,
    })
    .eq("name", "__competition__")
    .select("adoption, round_completed, treasury, created_at, stability")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return parseCompetitionRow(row);
}

export async function endCompetitionAction(): Promise<CompetitionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: row, error } = await supabase
    .from("teams")
    .update({
      adoption: 2, // ended
    })
    .eq("name", "__competition__")
    .select("adoption, round_completed, treasury, created_at, stability")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/scoreboard");
  return parseCompetitionRow(row);
}

export async function resetCompetitionAction(resetTeamsProgress = false): Promise<CompetitionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const nowSec = Math.floor(nowMs / 1000);

  const { data: row, error } = await supabase
    .from("teams")
    .update({
      adoption: 0, // not_started
      round_completed: 1,
      treasury: ROUND_DURATIONS[1],
      created_at: nowIso,
      stability: nowSec,
    })
    .eq("name", "__competition__")
    .select("adoption, round_completed, treasury, created_at, stability")
    .single();

  if (error) throw new Error(error.message);

  if (resetTeamsProgress) {
    await supabase
      .from("teams")
      .update({ round_completed: 0 })
      .neq("name", "__competition__");
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/scoreboard");
  return parseCompetitionRow(row);
}
