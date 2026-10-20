import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  CompetitionState,
  parseCompetitionRow,
  ROUND_DURATIONS,
} from "./competition-state";

export async function fetchCompetitionState(): Promise<CompetitionState> {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: row } = await supabase
    .from("teams")
    .select("adoption, round_completed, treasury, created_at, stability")
    .eq("name", "__competition__")
    .maybeSingle();

  if (!row) {
    // Initialize __competition__ row if it doesn't exist
    const nowIso = new Date().toISOString();
    await supabase.from("teams").insert([
      {
        name: "__competition__",
        adoption: 0,
        round_completed: 1,
        treasury: ROUND_DURATIONS[1],
        created_at: nowIso,
        security: 0,
        decentralization: 0,
        stability: 0,
      },
    ]);
    return parseCompetitionRow(null);
  }

  return parseCompetitionRow(row);
}
