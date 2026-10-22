"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  applyDelta,
  ATTACK_LEVELS,
  ATTACK_RULES,
  combineDeltas,
  defenseScore,
  GLOBAL_EVENTS,
  isLaunchChoice,
  LAUNCH_RULES,
  REBUILD_RULES,
  successProbability,
} from "@/app/lib/game-rules";
import type { AttackCategory, AttackType, GlobalEventType, RebuildType, TeamScore } from "@/app/lib/types";
import calculateFinalTeamScore from "@/app/utils/TeamScore/calculateFinalTeamScore";
import { createClient } from "@/utils/supabase/server";
import { CompetitionState } from "@/app/lib/competition-state";
import { fetchCompetitionState } from "@/app/lib/competition-state-server";

type GameResult = {
  round: number;
  score: TeamScore;
  message: string;
  target?: { name: string; score: TeamScore };
  targets?: Array<{ name: string; score: TeamScore; success: boolean }>;
  success?: boolean;
  event?: GlobalEventType;
};

type TeamRow = TeamScore & { name: string };

const attackCategories = Object.keys(ATTACK_RULES) as AttackCategory[];
const attackTypes = Object.keys(ATTACK_LEVELS) as AttackType[];
const rebuildTypes = Object.keys(REBUILD_RULES) as (RebuildType | "Treasury Investment")[];

async function currentGameContext() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("Please sign in again to continue.");

  const { data: membership } = await supabase
    .from("team_info")
    .select("teamname")
    .ilike("teamleaderemail", user.email)
    .maybeSingle();

  let teamName = membership?.teamname;

  if (!teamName) {
    const { data: allTeams } = await supabase
      .from("team_info")
      .select("teamname, teammembers");
    const matched = allTeams?.find((t) =>
      Array.isArray(t.teammembers) &&
      t.teammembers.some((m: string) => m.toLowerCase() === user.email?.toLowerCase())
    );
    if (matched) teamName = matched.teamname;
  }

  if (!teamName) throw new Error("No team is registered for this account (" + user.email + ").");

  const competition = await fetchCompetitionState();
  if (competition.status === "not_started") {
    throw new Error("Competition has not started yet. Waiting for administrator to launch Round 1.");
  }
  if (competition.status === "ended") {
    throw new Error("Competition is over! No further moves can be submitted.");
  }

  return { supabase, teamName: teamName.trim(), cookieStore, competition };
}

export async function getLiveCompetitionState(): Promise<CompetitionState> {
  return await fetchCompetitionState();
}

function toScore(row: TeamRow): TeamScore {
  return {
    adoption: Number(row.adoption ?? 0),
    security: Number(row.security ?? 0),
    decentralization: Number(row.decentralization ?? 0),
    treasury: Number(row.treasury ?? 0),
    stability: Number(row.stability ?? 0),
  };
}

async function readScore(supabase: Awaited<ReturnType<typeof createClient>>, teamName: string) {
  const cleanName = teamName.trim();
  let { data, error } = await supabase
    .from("teams")
    .select("name, adoption, security, decentralization, treasury, stability")
    .eq("name", cleanName)
    .maybeSingle();

  if (!data) {
    const { data: fuzzy } = await supabase
      .from("teams")
      .select("name, adoption, security, decentralization, treasury, stability")
      .ilike("name", `${cleanName}%`)
      .limit(1);
    if (fuzzy && fuzzy.length > 0) {
      data = fuzzy[0];
      error = null;
    }
  }

  if (error || !data) throw new Error("Could not load score for team: " + teamName);
  return toScore(data as TeamRow);
}

async function writeScore(supabase: Awaited<ReturnType<typeof createClient>>, teamName: string, score: TeamScore) {
  const cleanName = teamName.trim();
  const final_score = await calculateFinalTeamScore(
    score.adoption,
    score.security,
    score.decentralization,
    score.treasury,
    score.stability
  );
  const { error } = await supabase
    .from("teams")
    .update({ ...score, final_score })
    .ilike("name", `${cleanName}%`);
  if (error) throw new Error("Could not save the updated score: " + error.message);
}

async function currentRound(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamName: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const cleanName = teamName.trim();
  try {
    const { data: initialData, error } = await supabase
      .from("teams")
      .select("round_completed")
      .eq("name", cleanName)
      .maybeSingle();

    let data = initialData;
    if (!data) {
      const { data: fuzzy } = await supabase
        .from("teams")
        .select("round_completed")
        .ilike("name", `${cleanName}%`)
        .limit(1);
      if (fuzzy && fuzzy.length > 0) data = fuzzy[0];
    }

    if (!error && data && data.round_completed !== undefined && data.round_completed !== null) {
      return Number(data.round_completed) + 1;
    }
  } catch {}

  const cookieVal = cookieStore.get(`enigma_round_${cleanName}`)?.value;
  if (cookieVal) {
    const num = parseInt(cookieVal, 10);
    if (!isNaN(num) && num >= 1) return num;
  }
  return 1;
}

async function finishRound(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamName: string,
  expectedRound: number,
  message: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  const cleanName = teamName.trim();
  const nextRound = expectedRound + 1;

  try {
    await supabase
      .from("teams")
      .update({ round_completed: expectedRound })
      .ilike("name", `${cleanName}%`);
  } catch {}

  cookieStore.set(`enigma_round_${cleanName}`, String(nextRound), {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return nextRound;
}

function assertRound(round: number, expected: number | number[]) {
  const expectedRounds = Array.isArray(expected) ? expected : [expected];
  if (!expectedRounds.includes(round)) {
    throw new Error(`This decision belongs to round ${expectedRounds.join("/")}, but your team is on round ${round}.`);
  }
}

export async function submitLaunch(choice: unknown): Promise<GameResult> {
  if (!isLaunchChoice(choice)) throw new Error("Choose one option for fees, security, and validator rewards.");
  const { supabase, teamName, cookieStore } = await currentGameContext();
  const round = await currentRound(supabase, teamName, cookieStore);
  assertRound(round, 1);

  const before = await readScore(supabase, teamName);
  const change = combineDeltas(Object.entries(choice).map(([category, value]) => {
    return LAUNCH_RULES[category as keyof typeof LAUNCH_RULES][value as "Low" | "Medium" | "High"];
  }));
  const score = applyDelta(before, change);
  await writeScore(supabase, teamName, score);
  const message = "Launch strategy committed. Competitors can now see your network’s profile.";
  const nextRound = await finishRound(supabase, teamName, 1, message, cookieStore);
  revalidatePath("/dashboard");
  return { round: nextRound, score, message };
}

export type AttackOrderInput = {
  targetName: string;
  category: AttackCategory;
  level: AttackType;
};

export async function submitMultiAttack(orders: unknown): Promise<GameResult> {
  if (!Array.isArray(orders) || orders.length === 0) {
    throw new Error("Select at least one attack target.");
  }

  const { supabase, teamName, cookieStore } = await currentGameContext();
  const round = await currentRound(supabase, teamName, cookieStore);
  assertRound(round, [2, 4]);

  if (round === 2 && orders.length > 1) {
    throw new Error("Round 2 only allows attacking a single team. Multi-target attacks are unlocked in Round 4.");
  }

  // Validate each order
  const targetsSeen = new Set<string>();
  const validatedOrders: AttackOrderInput[] = [];

  for (const item of orders) {
    const o = item as Partial<AttackOrderInput>;
    const cleanTarget = (o.targetName || "").trim();
    if (!cleanTarget) {
      throw new Error("Each strike must have a valid target selected.");
    }
    if (cleanTarget.toLowerCase() === teamName.toLowerCase()) {
      throw new Error("A team cannot attack itself.");
    }
    if (targetsSeen.has(cleanTarget.toLowerCase())) {
      throw new Error(`Target '${cleanTarget}' cannot be targeted multiple times in the same wave.`);
    }
    targetsSeen.add(cleanTarget.toLowerCase());

    if (!attackCategories.includes(o.category as AttackCategory)) {
      throw new Error(`Invalid attack category for target ${cleanTarget}.`);
    }
    if (!attackTypes.includes(o.level as AttackType)) {
      throw new Error(`Invalid attack level for target ${cleanTarget}.`);
    }

    validatedOrders.push({
      targetName: cleanTarget,
      category: o.category as AttackCategory,
      level: o.level as AttackType,
    });
  }

  const attacker = await readScore(supabase, teamName);
  const totalCost = validatedOrders.reduce((sum, o) => sum + ATTACK_LEVELS[o.level].cost, 0);

  if (attacker.treasury < totalCost) {
    throw new Error(`Your treasury cannot fund all strikes (total cost: ${totalCost}, available: ${attacker.treasury}).`);
  }

  const targetResults: Array<{ name: string; score: TeamScore; success: boolean }> = [];
  const logMessages: string[] = [];

  for (const o of validatedOrders) {
    const target = await readScore(supabase, o.targetName);
    const { strength } = ATTACK_LEVELS[o.level];
    const def = defenseScore(target, o.category);
    const chance = successProbability(strength - def);
    const success = Math.random() * 100 < chance;
    const targetAfter = success ? applyDelta(target, ATTACK_RULES[o.category].effect) : target;

    if (success) {
      await writeScore(supabase, o.targetName, targetAfter);
    }

    // Record attack alert for the victim team
    try {
      await supabase.from("teams").upsert(
        {
          name: `__alert__${o.targetName.trim()}`,
          round_completed: round,
          adoption: success ? 1 : 0,
          treasury: Math.floor(Date.now() / 1000),
          stability: Math.floor(Date.now() / 1000),
          created_at: new Date().toISOString(),
        },
        { onConflict: "name" }
      );
    } catch {}

    targetResults.push({
      name: o.targetName,
      score: targetAfter,
      success,
    });

    logMessages.push(
      success
        ? `💥 ${ATTACK_RULES[o.category].label} succeeded against ${o.targetName}! (${chance}% odds)`
        : `🛡️ ${ATTACK_RULES[o.category].label} was deflected by ${o.targetName} (${chance}% odds)`
    );
  }

  const attackerAfter = applyDelta(attacker, { treasury: -totalCost });
  await writeScore(supabase, teamName, attackerAfter);

  const combinedMessage = logMessages.join(" | ") + ` (Total Treasury Cost: -${totalCost})`;
  const nextRound = await finishRound(supabase, teamName, round, combinedMessage, cookieStore);

  revalidatePath("/dashboard");
  return {
    round: nextRound,
    score: attackerAfter,
    target: targetResults[0] ? { name: targetResults[0].name, score: targetResults[0].score } : undefined,
    targets: targetResults,
    success: targetResults.some((t) => t.success),
    message: combinedMessage,
  };
}

export async function submitAttack(targetName: unknown, category: unknown, level: unknown): Promise<GameResult> {
  return submitMultiAttack([{
    targetName: targetName as string,
    category: category as AttackCategory,
    level: level as AttackType,
  }]);
}

export async function submitRebuild(action: unknown): Promise<GameResult> {
  if (!rebuildTypes.includes(action as RebuildType | "Treasury Investment")) throw new Error("Select a valid rebuild action.");
  const { supabase, teamName, cookieStore } = await currentGameContext();
  const round = await currentRound(supabase, teamName, cookieStore);
  assertRound(round, 3);

  const rule = REBUILD_RULES[action as RebuildType | "Treasury Investment"];
  const current = await readScore(supabase, teamName);
  if (current.treasury < rule.cost) {
    throw new Error(`Your treasury cannot fund this rebuild action (cost: ${rule.cost}, available: ${current.treasury}).`);
  }

  const score = applyDelta(current, { ...rule.effect, treasury: -rule.cost });
  await writeScore(supabase, teamName, score);
  const message = `Rebuild action completed: ${rule.description} (-${rule.cost} Treasury).`;
  const nextRound = await finishRound(supabase, teamName, 3, message, cookieStore);
  revalidatePath("/dashboard");
  return { round: nextRound, score, message };
}

export async function applyMarketEvent(): Promise<GameResult> {
  const { supabase, teamName, cookieStore } = await currentGameContext();
  const round = await currentRound(supabase, teamName, cookieStore);
  assertRound(round, 5);

  const current = await readScore(supabase, teamName);
  const eventKeys = Object.keys(GLOBAL_EVENTS) as GlobalEventType[];
  const eventKey = eventKeys[Math.floor(Math.random() * eventKeys.length)];
  const event = GLOBAL_EVENTS[eventKey];
  const score = applyDelta(current, event.effect);
  await writeScore(supabase, teamName, score);
  const message = `Market event '${eventKey}' occurred: ${event.description}`;
  const nextRound = await finishRound(supabase, teamName, 5, message, cookieStore);
  revalidatePath("/dashboard");
  return { round: nextRound, score, message, event: eventKey };
}

export type InterceptedDossier = {
  targetName: string;
  telemetry: {
    adoption: number;
    security: number;
    decentralization: number;
    treasury: number;
    stability: number;
  };
  roundIntercepted: number;
};

export async function getTeamIntelDossiers(): Promise<InterceptedDossier[]> {
  try {
    const { supabase, teamName } = await currentGameContext();
    const intelPrefix = `__intel__${teamName}__`;
    const { data: rows } = await supabase
      .from("teams")
      .select("name, adoption, security, decentralization, treasury, stability, round_completed");

    return (rows || [])
      .filter((r) => r.name.startsWith(intelPrefix))
      .map((r) => ({
        targetName: r.name.replace(intelPrefix, "").trim(),
        telemetry: {
          adoption: Number(r.adoption ?? 0),
          security: Number(r.security ?? 0),
          decentralization: Number(r.decentralization ?? 0),
          treasury: Number(r.treasury ?? 0),
          stability: Number(r.stability ?? 0),
        },
        roundIntercepted: Number(r.round_completed ?? 1),
      }));
  } catch {
    return [];
  }
}

export async function probeRandomTeamStability(): Promise<{
  success: boolean;
  targetName: string;
  telemetry: {
    adoption: number;
    security: number;
    decentralization: number;
    treasury: number;
    stability: number;
  };
  stability: number;
  newTreasury: number;
  score: TeamScore;
  message: string;
  dossiers: InterceptedDossier[];
}> {
  const { supabase, teamName, cookieStore } = await currentGameContext();
  const attacker = await readScore(supabase, teamName);

  if (attacker.treasury < 2) {
    throw new Error(`Insufficient Treasury: Probing rival telemetry costs 2 Treasury (available: ${attacker.treasury}).`);
  }

  const { data: allTeams, error } = await supabase
    .from("teams")
    .select("name, adoption, security, decentralization, treasury, stability")
    .neq("name", "__competition__");

  if (error || !allTeams || allTeams.length === 0) {
    throw new Error("Unable to locate other networks on the chain.");
  }

  const rivals = allTeams.filter(
    (t) => !t.name.startsWith("__") && t.name.trim().toLowerCase() !== teamName.trim().toLowerCase()
  );
  if (rivals.length === 0) {
    throw new Error("No other rival networks detected to probe.");
  }

  // Find existing permanent intel for this team so we prioritize unprobed rivals
  const intelPrefix = `__intel__${teamName}__`;
  const existingIntelRows = (allTeams || []).filter((r) => r.name.startsWith(intelPrefix));
  const probedTargetNames = new Set(
    existingIntelRows.map((r) => r.name.replace(intelPrefix, "").trim().toLowerCase())
  );
  const unprobedRivals = rivals.filter(
    (r) => !probedTargetNames.has(r.name.trim().toLowerCase())
  );

  // Pick an unprobed rival if any remain, otherwise pick randomly to update latest telemetry
  const candidatePool = unprobedRivals.length > 0 ? unprobedRivals : rivals;
  const randomTarget = candidatePool[Math.floor(Math.random() * candidatePool.length)];
  const targetCleanName = randomTarget.name.trim();

  const telemetry = {
    adoption: Number(randomTarget.adoption ?? 0),
    security: Number(randomTarget.security ?? 0),
    decentralization: Number(randomTarget.decentralization ?? 0),
    treasury: Number(randomTarget.treasury ?? 0),
    stability: Number(randomTarget.stability ?? 0),
  };

  // Deduct 2 Treasury permanently
  const attackerAfter = applyDelta(attacker, { treasury: -2 });
  await writeScore(supabase, teamName, attackerAfter);

  // Determine current round to archive with the dossier
  const currentRoundNum = await currentRound(supabase, teamName, cookieStore);

  // Persist intercepted dossier permanently into teams table
  const intelRecordName = `${intelPrefix}${targetCleanName}`;
  await supabase
    .from("teams")
    .upsert(
      {
        name: intelRecordName,
        adoption: telemetry.adoption,
        security: telemetry.security,
        decentralization: telemetry.decentralization,
        treasury: telemetry.treasury,
        stability: telemetry.stability,
        round_completed: currentRoundNum,
      },
      { onConflict: "name" }
    );

  // Fetch updated list of all permanent dossiers for this team
  const { data: updatedRows } = await supabase
    .from("teams")
    .select("name, adoption, security, decentralization, treasury, stability, round_completed");

  const dossiers: InterceptedDossier[] = (updatedRows || [])
    .filter((r) => r.name.startsWith(intelPrefix))
    .map((r) => ({
      targetName: r.name.replace(intelPrefix, "").trim(),
      telemetry: {
        adoption: Number(r.adoption ?? 0),
        security: Number(r.security ?? 0),
        decentralization: Number(r.decentralization ?? 0),
        treasury: Number(r.treasury ?? 0),
        stability: Number(r.stability ?? 0),
      },
      roundIntercepted: Number(r.round_completed ?? currentRoundNum),
    }));

  const message = `📡 Intercepted telemetry from '${targetCleanName}'! Archived permanently to tactical dossier (-2 Treasury).`;
  revalidatePath("/dashboard");

  return {
    success: true,
    targetName: targetCleanName,
    telemetry,
    stability: telemetry.stability,
    newTreasury: attackerAfter.treasury,
    score: attackerAfter,
    message,
    dossiers,
  };
}

export async function getLatestAttackAlert(): Promise<{
  hasAlert: boolean;
  round?: number;
  success?: boolean;
  timestamp?: number;
}> {
  try {
    const { supabase, teamName } = await currentGameContext();
    const { data: alertRow } = await supabase
      .from("teams")
      .select("round_completed, adoption, stability, created_at")
      .eq("name", `__alert__${teamName.trim()}`)
      .maybeSingle();

    if (alertRow && alertRow.stability) {
      return {
        hasAlert: true,
        round: Number(alertRow.round_completed ?? 2),
        success: alertRow.adoption === 1,
        timestamp: Number(alertRow.stability),
      };
    }
  } catch {}

  return { hasAlert: false };
}
