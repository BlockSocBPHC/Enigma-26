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

type GameResult = {
  round: number;
  score: TeamScore;
  message: string;
  target?: { name: string; score: TeamScore };
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

  return { supabase, teamName, cookieStore };
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
      .from("game_rounds")
      .select("current_round")
      .eq("team_name", teamName)
      .maybeSingle();
    if (!error && data?.current_round) {
      return Number(data.current_round);
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
      .from("game_rounds")
      .upsert({
        team_name: teamName,
        current_round: nextRound,
        last_result: { message, at: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      });
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

export async function submitAttack(targetName: unknown, category: unknown, level: unknown): Promise<GameResult> {
  if (typeof targetName !== "string" || !attackCategories.includes(category as AttackCategory) || !attackTypes.includes(level as AttackType)) {
    throw new Error("Select a valid target, attack, and attack level.");
  }

  const { supabase, teamName, cookieStore } = await currentGameContext();
  if (targetName === teamName) throw new Error("A team cannot attack itself.");
  const round = await currentRound(supabase, teamName, cookieStore);
  assertRound(round, [2, 4]);

  const attack = category as AttackCategory;
  const attackLevel = level as AttackType;
  const attacker = await readScore(supabase, teamName);
  const target = await readScore(supabase, targetName);
  const { cost, strength } = ATTACK_LEVELS[attackLevel];
  if (attacker.treasury < cost) {
    throw new Error(`Your treasury cannot fund this attack (cost: ${cost}, available: ${attacker.treasury}).`);
  }

  const def = defenseScore(target, attack);
  const chance = successProbability(strength - def);
  const success = Math.random() * 100 < chance;
  const attackerAfter = applyDelta(attacker, { treasury: -cost });
  const targetAfter = success ? applyDelta(target, ATTACK_RULES[attack].effect) : target;

  await writeScore(supabase, teamName, attackerAfter);
  if (success) await writeScore(supabase, targetName, targetAfter);

  const message = success
    ? `💥 ${ATTACK_RULES[attack].label} succeeded against ${targetName}! (${chance}% probability)`
    : `🛡️ ${ATTACK_RULES[attack].label} was deflected by ${targetName}’s defenses (${chance}% probability). Treasury cost paid.`;
  const nextRound = await finishRound(supabase, teamName, round, message, cookieStore);
  revalidatePath("/dashboard");
  return { round: nextRound, score: attackerAfter, target: { name: targetName, score: targetAfter }, success, message };
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
  const { supabase, teamName, cookieStore } = await currentGameContext();
  try {
    await supabase
      .from("game_rounds")
      .upsert({
        team_name: teamName,
        current_round: 1,
        last_result: null,
        updated_at: new Date().toISOString(),
      });
  } catch {}

  cookieStore.set(`enigma_round_${teamName}`, "1", { path: "/" });
  const score = await readScore(supabase, teamName);
  revalidatePath("/dashboard");
  return { round: 1, score, message: "Campaign reset to Round 1." };
}
