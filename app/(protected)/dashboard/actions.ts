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

  return { supabase, teamName, cookieStore, competition };
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
  const { data, error } = await supabase
    .from("teams")
    .select("name, adoption, security, decentralization, treasury, stability")
    .eq("name", teamName)
    .single();
  if (error || !data) throw new Error("Could not load score for team: " + teamName);
  return toScore(data as TeamRow);
}

async function writeScore(supabase: Awaited<ReturnType<typeof createClient>>, teamName: string, score: TeamScore) {
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
    .eq("name", teamName);
  if (error) throw new Error("Could not save the updated score: " + error.message);
}

async function currentRound(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teamName: string,
  cookieStore: Awaited<ReturnType<typeof cookies>>
) {
  try {
    const { data, error } = await supabase
      .from("teams")
      .select("round_completed")
      .eq("name", teamName)
      .maybeSingle();
    if (!error && data && data.round_completed !== undefined && data.round_completed !== null) {
      return Number(data.round_completed) + 1;
    }
  } catch {}

  const cookieVal = cookieStore.get(`enigma_round_${teamName}`)?.value;
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
  const nextRound = expectedRound + 1;

  try {
    await supabase
      .from("teams")
      .update({ round_completed: expectedRound })
      .eq("name", teamName);
  } catch {}

  cookieStore.set(`enigma_round_${teamName}`, String(nextRound), {
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
    if (typeof o.targetName !== "string" || !o.targetName) {
      throw new Error("Each strike must have a valid target selected.");
    }
    if (o.targetName === teamName) {
      throw new Error("A team cannot attack itself.");
    }
    if (targetsSeen.has(o.targetName)) {
      throw new Error(`Target '${o.targetName}' cannot be targeted multiple times in the same wave.`);
    }
    targetsSeen.add(o.targetName);

    if (!attackCategories.includes(o.category as AttackCategory)) {
      throw new Error(`Invalid attack category for target ${o.targetName}.`);
    }
    if (!attackTypes.includes(o.level as AttackType)) {
      throw new Error(`Invalid attack level for target ${o.targetName}.`);
    }

    validatedOrders.push({
      targetName: o.targetName,
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

  const selected = action as RebuildType | "Treasury Investment";
  const before = await readScore(supabase, teamName);
  const rule = REBUILD_RULES[selected];
  if (before.treasury < rule.cost) {
    throw new Error(`Your treasury cannot fund this rebuild action (cost: ${rule.cost}, available: ${before.treasury}).`);
  }
  const score = applyDelta(before, combineDeltas([{ treasury: -rule.cost }, rule.effect]));
  await writeScore(supabase, teamName, score);
  const message = `Protocol ${selected} executed: ${rule.description}.`;
  const nextRound = await finishRound(supabase, teamName, 3, message, cookieStore);
  revalidatePath("/dashboard");
  return { round: nextRound, score, message };
}

async function readGlobalEvent(supabase: Awaited<ReturnType<typeof createClient>>) {
  try {
    const { data } = await supabase.from("game_settings").select("event_name").eq("id", 1).maybeSingle();
    if (data?.event_name && data.event_name in GLOBAL_EVENTS) {
      return data.event_name as GlobalEventType;
    }
  } catch {}

  const eventNames = Object.keys(GLOBAL_EVENTS) as GlobalEventType[];
  const selected = eventNames[Math.floor(Math.random() * eventNames.length)];

  try {
    await supabase
      .from("game_settings")
      .upsert({ id: 1, event_name: selected }, { onConflict: "id", ignoreDuplicates: true });
  } catch {}

  return selected;
}

export async function applyMarketEvent(): Promise<GameResult> {
  const { supabase, teamName, cookieStore } = await currentGameContext();
  const round = await currentRound(supabase, teamName, cookieStore);
  assertRound(round, 5);

  const event = await readGlobalEvent(supabase);
  const before = await readScore(supabase, teamName);
  const score = applyDelta(before, GLOBAL_EVENTS[event].effect);
  await writeScore(supabase, teamName, score);
  const message = `Macro Event '${event}': ${GLOBAL_EVENTS[event].description}`;
  const nextRound = await finishRound(supabase, teamName, 5, message, cookieStore);
  revalidatePath("/dashboard");
  return { round: nextRound, score, message, event };
}

export async function resetGame(): Promise<GameResult> {
  throw new Error("Campaign restart is disabled. Each team is permitted only one playthrough.");
}
