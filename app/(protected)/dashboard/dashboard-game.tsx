"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/navbar";
import { createClient } from "@/utils/supabase/client";
import {
  ATTACK_LEVELS,
  ATTACK_RULES,
  LAUNCH_RULES,
  REBUILD_RULES,
  ROUND_LABELS,
} from "@/app/lib/game-rules";
import type {
  AttackCategory,
  AttackType,
  Leaderboard,
  RebuildType,
  TeamDetails,
  TeamScore,
  upgradeOptions,
  upgradeTypes,
} from "@/app/lib/types";
import {
  applyMarketEvent,
  getLatestAttackAlert,
  getLiveCompetitionState,
  InterceptedDossier,
  probeRandomTeamStability,
  submitLaunch,
  submitMultiAttack,
  submitRebuild,
} from "./actions";
import { CompetitionState, formatSeconds } from "@/app/lib/competition-state";

type Notice = { tone: "success" | "error"; text: string } | null;
type GameResult = Awaited<ReturnType<typeof submitLaunch>>;

export type AttackAlertState = {
  hasAlert: boolean;
  round?: number;
  success?: boolean;
  timestamp?: number;
};

export type AttackOrder = {
  id: string;
  target: string;
  attack: AttackCategory;
  level: AttackType;
};

export type AttackSimItem = {
  target: string;
  attack: AttackCategory;
  level: AttackType;
  strength: number;
  cost: number;
};

export type AttackSimState = {
  attacks: AttackSimItem[];
  startedAt: number;
  duration: number;
};

function useCentralizedRoundTimer(
  competition: CompetitionState,
  onSyncState: (state: CompetitionState) => void
) {
  const [now, setNow] = useState(() => Date.now());

  // Tick down every second if running
  useEffect(() => {
    if (competition.status !== "running") return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [competition.status, competition.startedAt]);

  // Poll server every 4 seconds to sync with admin commands
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const fresh = await getLiveCompetitionState();
        onSyncState(fresh);
      } catch {}
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [onSyncState]);

  const elapsed = Math.floor((now - competition.startedAt) / 1000);
  const timeLeft = competition.status === "running"
    ? Math.max(0, competition.duration - elapsed)
    : competition.status === "not_started"
    ? competition.duration
    : 0;

  const formatted = formatSeconds(timeLeft);
  const isExpired = timeLeft <= 0 && competition.status === "running";
  const totalDuration = competition.duration || 600;

  return { timeLeft, formatted, isExpired, totalDuration };
}

const metrics: { key: keyof TeamScore; label: string }[] = [
  { key: "adoption", label: "Adoption" },
  { key: "security", label: "Security" },
  { key: "decentralization", label: "Decentralization" },
  { key: "treasury", label: "Treasury" },
  { key: "stability", label: "Stability" },
];
const launchCategories = Object.keys(LAUNCH_RULES) as upgradeOptions[];
const attackCategories = Object.keys(ATTACK_RULES) as AttackCategory[];
const attackTypes = Object.keys(ATTACK_LEVELS) as AttackType[];
const rebuildActions = Object.keys(REBUILD_RULES) as (RebuildType | "Treasury Investment")[];

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

function roundLabel(round: number) {
  return ROUND_LABELS[Math.min(Math.max(round - 1, 0), ROUND_LABELS.length - 1)];
}

function display(key: keyof TeamScore, value: number) {
  return key === "treasury" ? "Treasury " + Math.round(value).toLocaleString() : Math.round(value).toString();
}

function Meter({ metric, value }: { metric: keyof TeamScore; value: number }) {
  const scale = metric === "treasury" ? 1200 : 100;
  const width = Math.max(0, Math.min(100, value / scale * 100));
  return <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-[#2cff5e]" style={{ width: String(width) + "%" }} /></div>;
}

export default function DashboardGame({
  team,
  userEmail,
  initialScore,
  initialLeaderboard,
  initialRound,
  initialCompetition,
  initialAlert,
  initialIntelDossiers,
}: {
  team: TeamDetails;
  userEmail: string;
  initialScore: TeamScore;
  initialLeaderboard: Leaderboard[];
  initialRound: number;
  initialCompetition: CompetitionState;
  initialAlert?: AttackAlertState;
  initialIntelDossiers?: InterceptedDossier[];
}) {
  const router = useRouter();
  const [competition, setCompetition] = useState<CompetitionState>(initialCompetition);
  const [score, setScore] = useState(initialScore);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [round, setRound] = useState(initialRound);
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();
  const [attackAlert, setAttackAlert] = useState<AttackAlertState>(initialAlert ?? { hasAlert: false });
  const [dismissedAlertTimestamp, setDismissedAlertTimestamp] = useState<number>(0);
  const [intelDossiers, setIntelDossiers] = useState<InterceptedDossier[]>(initialIntelDossiers ?? []);
  const [isProbing, setIsProbing] = useState(false);
  const [launchChoice, setLaunchChoice] = useState<Record<upgradeOptions, upgradeTypes>>({
    "Transaction Fees": "Medium",
    "Security Budget": "Medium",
    "Validator Rewards": "Medium",
  });
  const [target, setTarget] = useState("");
  const [attack, setAttack] = useState<AttackCategory>("Spam Attack");
  const [attackLevel, setAttackLevel] = useState<AttackType>("Standard Attack");
  const [rebuild, setRebuild] = useState<RebuildType | "Treasury Investment">("Security Recovery");
  const [attackSim, setAttackSim] = useState<AttackSimState | null>(null);
  const [round4Orders, setRound4Orders] = useState<AttackOrder[]>([
    { id: "1", target: "", attack: "Spam Attack", level: "Standard Attack" },
  ]);

  const timer = useCentralizedRoundTimer(competition, setCompetition);

  // Poll for incoming attack alerts every 4 seconds
  useEffect(() => {
    const alertInterval = setInterval(async () => {
      try {
        const freshAlert = await getLatestAttackAlert();
        if (freshAlert.hasAlert) {
          setAttackAlert(freshAlert);
        }
      } catch {}
    }, 4000);

    return () => clearInterval(alertInterval);
  }, []);

  // Resume any active attack simulation if page was refreshed
  useEffect(() => {
    if (typeof window === "undefined") return;
    const timerId = setTimeout(() => {
      const key = `enigma_attack_sim_${team.teamName}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const elapsed = Math.floor((Date.now() - parsed.startedAt) / 1000);
          if (elapsed < (parsed.duration || 120)) {
            const attacks: AttackSimItem[] = Array.isArray(parsed.attacks)
              ? parsed.attacks
              : parsed.target
              ? [{
                  target: parsed.target,
                  attack: parsed.attack,
                  level: parsed.level,
                  strength: parsed.strength ?? 50,
                  defense: parsed.defense ?? 50,
                  chance: parsed.chance ?? 50,
                  cost: parsed.cost ?? 50,
                }]
              : [];
            setAttackSim({ attacks, startedAt: parsed.startedAt, duration: parsed.duration || 120 });
          } else {
            localStorage.removeItem(key);
          }
        } catch {
          localStorage.removeItem(key);
        }
      }
    }, 0);
    return () => clearTimeout(timerId);
  }, [team.teamName]);

  const opponents = useMemo(() => leaderboard.filter((row) => row.name !== team.teamName), [leaderboard, team.teamName]);
  const selectedTarget = opponents.find((row) => row.name === target);

  function applyResult(result: GameResult) {
    setScore(result.score);
    setRound(result.round);
    setLeaderboard((rows) => rows.map((row) => {
      if (row.name === team.teamName) return { ...row, ...result.score };
      if (result.target && row.name === result.target.name) return { ...row, ...result.target.score };
      if (result.targets) {
        const found = result.targets.find((t) => t.name === row.name);
        if (found) return { ...row, ...found.score };
      }
      return row;
    }));
    setNotice({ tone: "success", text: result.message });
    router.refresh();
  }

  function run(action: () => Promise<GameResult>) {
    setNotice(null);
    startTransition(async () => {
      try {
        applyResult(await action());
      } catch (error) {
        setNotice({ tone: "error", text: error instanceof Error ? error.message : "Something went wrong. Please try again." });
      }
    });
  }

  async function handleProbeIntelligence() {
    if (score.treasury < 2) {
      setNotice({ tone: "error", text: `Insufficient Treasury: Intercepting rival telemetry costs 2 Treasury (available: ${score.treasury}).` });
      return;
    }
    setIsProbing(true);
    setNotice(null);
    try {
      const res = await probeRandomTeamStability();
      setScore(res.score);
      setIntelDossiers(res.dossiers);
      setNotice({ tone: "success", text: res.message });
      router.refresh();
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Failed to intercept intelligence." });
    } finally {
      setIsProbing(false);
    }
  }

  function handleLaunchAttack() {
    if (round === 2) {
      if (!selectedTarget) return;
      const cost = ATTACK_LEVELS[attackLevel].cost;
      if (score.treasury < cost) {
        setNotice({ tone: "error", text: `Your treasury cannot fund this attack (cost: ${cost}, available: ${score.treasury}).` });
        return;
      }

      const now = Date.now();
      const simItem: AttackSimItem = {
        target,
        attack,
        level: attackLevel,
        strength: ATTACK_LEVELS[attackLevel].strength,
        cost,
      };

      const sim: AttackSimState = {
        attacks: [simItem],
        startedAt: now,
        duration: 120, // 120 seconds
      };

      setAttackSim(sim);
      if (typeof window !== "undefined") {
        localStorage.setItem(`enigma_attack_sim_${team.teamName}`, JSON.stringify(sim));
      }
    } else if (round === 4) {
      const activeOrders = round4Orders.filter((o) => Boolean(o.target));
      if (activeOrders.length === 0) {
        setNotice({ tone: "error", text: "Select at least one target team to attack." });
        return;
      }

      const targetsSet = new Set<string>();
      for (const o of activeOrders) {
        if (targetsSet.has(o.target)) {
          setNotice({ tone: "error", text: `Target '${o.target}' is targeted more than once. Each target can only be attacked once in this wave.` });
          return;
        }
        targetsSet.add(o.target);
      }

      const totalCost = activeOrders.reduce((sum, o) => sum + ATTACK_LEVELS[o.level].cost, 0);
      if (score.treasury < totalCost) {
        setNotice({ tone: "error", text: `Your treasury cannot fund all selected strikes (total cost: ${totalCost}, available: ${score.treasury}).` });
        return;
      }

      const now = Date.now();
      const simItems: AttackSimItem[] = activeOrders.map((o) => ({
        target: o.target,
        attack: o.attack,
        level: o.level,
        strength: ATTACK_LEVELS[o.level].strength,
        cost: ATTACK_LEVELS[o.level].cost,
      }));

      const sim: AttackSimState = {
        attacks: simItems,
        startedAt: now,
        duration: 120, // 120 seconds
      };

      setAttackSim(sim);
      if (typeof window !== "undefined") {
        localStorage.setItem(`enigma_attack_sim_${team.teamName}`, JSON.stringify(sim));
      }
    }
  }

  function finalizeAttack() {
    if (!attackSim) return;
    const sim = attackSim;
    setAttackSim(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(`enigma_attack_sim_${team.teamName}`);
    }

    run(() =>
      submitMultiAttack(
        sim.attacks.map((a) => ({
          targetName: a.target,
          category: a.attack,
          level: a.level,
        }))
      )
    );
  }

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  if (competition.status === "not_started") {
    return (
      <main className="min-h-screen bg-[#030604] text-[#f3fff0]">
        <Navbar
          teamName={team.teamName}
          teamMembers={team.teamMembers}
          userEmail={userEmail}
          links={[
            { id: "/dashboard", label: "Dashboard" },
            { id: "/rulebook", label: "Rulebook" },
          ]}
          onSignOut={() => { void signOut(); }}
        />
        <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
          <div className="w-full rounded-3xl border border-amber-400/30 bg-gradient-to-b from-[#181206]/90 to-[#0c0803]/90 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs font-bold text-amber-300">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Competition Standby Mode
            </div>
            <h1 className="mt-5 text-3xl font-black uppercase tracking-wider text-white">
              Competition Has Not Started
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#c9a6a8]">
              The competition administrator will launch Round 1 shortly. Your screen will automatically transition when the timer starts.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-5 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs uppercase font-bold text-[#8fae93]">Your Team</span>
                <span className="font-extrabold text-[#2cff5e]">{team.teamName}</span>
              </div>
              <div className="mt-3">
                <span className="text-[11px] uppercase font-bold text-[#8fae93] block mb-2">Registered Members ({team.teamMembers.length})</span>
                <div className="flex flex-wrap gap-2">
                  {team.teamMembers.map((m, i) => (
                    <span key={i} className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white">
                      {m}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/rulebook"
                className="rounded-xl border border-white/20 bg-white/5 px-5 py-2.5 text-xs font-bold text-white hover:bg-white/10 transition"
              >
                📖 Review Rulebook
              </Link>
            </div>

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-[#8fae93] font-mono animate-pulse">
              <span>● Listening for admin start signal...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (competition.status === "ended") {
    return (
      <main className="min-h-screen bg-[#030604] text-[#f3fff0]">
        <Navbar
          teamName={team.teamName}
          teamMembers={team.teamMembers}
          userEmail={userEmail}
          roundName="Competition Concluded"
          links={[
            { id: "/dashboard", label: "Dashboard" },
            { id: "/rulebook", label: "Rulebook" },
          ]}
          onSignOut={() => { void signOut(); }}
        />
        <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
          <div className="w-full rounded-3xl border border-red-500/30 bg-gradient-to-b from-[#180808]/90 to-[#0c0404]/90 p-8 sm:p-10 shadow-2xl backdrop-blur-md">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/40 px-4 py-1.5 text-xs font-bold text-red-300">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              Competition Finalized
            </div>
            <h1 className="mt-5 text-3xl font-black uppercase tracking-wider text-white">
              The Competition is Over!
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[#c9a6a8]">
              All rounds have officially concluded. Final blockchain scores and standings have been calculated.
            </p>

            <div className="mt-8 rounded-2xl border border-white/10 bg-black/40 p-5 text-left">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs uppercase font-bold text-[#8fae93]">Final Standing</span>
                <span className="font-extrabold text-[#2cff5e]">{team.teamName}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <span className="text-[10px] text-[#8fae93] uppercase font-bold block">Adoption</span>
                  <span className="text-sm font-bold text-white">{score.adoption}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8fae93] uppercase font-bold block">Security</span>
                  <span className="text-sm font-bold text-white">{score.security}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8fae93] uppercase font-bold block">Decentralization</span>
                  <span className="text-sm font-bold text-white">{score.decentralization}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8fae93] uppercase font-bold block">Treasury</span>
                  <span className="text-sm font-bold text-[#ff8080]">{score.treasury}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8fae93] uppercase font-bold block">Stability</span>
                  <span className="text-sm font-bold text-white">{score.stability}</span>
                </div>
              </div>
            </div>

            {intelDossiers.length > 0 && (
              <div className="mt-8 rounded-2xl border border-amber-400/20 bg-black/40 p-5 text-left">
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#a8f27a] block mb-3">
                  📁 Intercepted Tactical Dossiers ({intelDossiers.length})
                </span>
                <div className="grid gap-3">
                  {intelDossiers.map((d) => (
                    <div key={d.targetName} className="rounded-xl border border-white/10 bg-black/30 p-3">
                      <div className="flex items-center justify-between pb-2 border-b border-white/5">
                        <strong className="text-xs text-white">🎯 {d.targetName}</strong>
                        <span className="text-[10px] text-amber-300">Round {d.roundIntercepted} Intel</span>
                      </div>
                      <div className="mt-2 grid grid-cols-5 gap-1.5 text-center text-[10px]">
                        <div><span className="text-[#8fae93] block">Adoption</span><b className="text-white">{d.telemetry.adoption}</b></div>
                        <div><span className="text-[#8fae93] block">Security</span><b className="text-white">{d.telemetry.security}</b></div>
                        <div><span className="text-[#8fae93] block">Decentral.</span><b className="text-white">{d.telemetry.decentralization}</b></div>
                        <div><span className="text-[#8fae93] block">Treasury</span><b className="text-[#ff8080]">{d.telemetry.treasury}</b></div>
                        <div><span className="text-[#8fae93] block">Stability</span><b className="text-[#2cff5e]">{d.telemetry.stability}</b></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/rulebook"
                className="rounded-xl border border-white/20 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                📖 Review Campaign Rulebook
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#030604] text-[#f3fff0]">
      <Navbar
        teamName={team.teamName}
        teamMembers={team.teamMembers}
        userEmail={userEmail}
        roundNumber={round}
        roundName={roundLabel(round)}
        roundTimer={round <= 5 ? (timer.isExpired ? "EXPIRED" : timer.formatted) : undefined}
        links={[
          { id: "/dashboard", label: "Dashboard" },
          { id: "/rulebook", label: "Rulebook" },
        ]}
        onSignOut={() => { void signOut(); }}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Incoming Attack Alert Banner */}
        {attackAlert.hasAlert && (!dismissedAlertTimestamp || (attackAlert.timestamp && attackAlert.timestamp > dismissedAlertTimestamp)) && (
          <div className="mb-6 rounded-3xl border border-red-500/50 bg-gradient-to-r from-red-950/80 via-[#26090c]/90 to-amber-950/70 p-5 shadow-2xl backdrop-blur-md animate-pulse">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-500/20 text-2xl text-red-400">
                  🚨
                </div>
                <div>
                  <h4 className="text-base font-black uppercase tracking-wider text-red-200">
                    Hostile Attack Detected!
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm text-red-300/90 leading-relaxed">
                    {attackAlert.success
                      ? `Your chain was targeted in Round ${attackAlert.round ?? "Strike"} and suffered a security breach! Defenses were compromised.`
                      : `Your chain was targeted by an adversarial strike in Round ${attackAlert.round ?? "Strike"}! Your security node deflected the attack.`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDismissedAlertTimestamp(attackAlert.timestamp ?? Date.now())}
                className="shrink-0 rounded-xl border border-red-400/30 bg-red-500/20 px-4 py-2 text-xs font-bold text-red-200 hover:bg-red-500/30 transition self-end sm:self-auto"
              >
                Dismiss Alert ✕
              </button>
            </div>
          </div>
        )}

        <header className="rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.8)] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#a8f27a]">Blockchain economics strategy game</p>
          <div className="mt-3">
            <h1 className="text-4xl font-black">ENIGMA command center</h1>
            <p className="mt-2 text-sm text-[#a8c7ac]">Balance growth, security, decentralization, and sustainability.</p>
          </div>
        </header>

        <section className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Network metrics">
          {metrics.map((metric) => <article key={metric.key} className="rounded-2xl border border-[#2cff5e]/15 bg-[rgba(7,17,10,0.8)] p-4"><p className="text-xs font-bold uppercase tracking-wider text-[#a8f27a]">{metric.label}</p><p className="mt-2 text-2xl font-extrabold">{display(metric.key, score[metric.key])}</p><Meter metric={metric.key} value={score[metric.key]} /></article>)}
        </section>

        {/* Network Intelligence / Reconnaissance Widget */}
        <section className="mt-5 rounded-3xl border border-amber-400/30 bg-gradient-to-r from-[rgba(24,18,6,0.85)] to-[rgba(10,18,12,0.85)] p-5 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300">
                <span>📡</span> Network Intelligence &amp; Reconnaissance
              </div>
              <p className="mt-1 text-xs text-[#a8c7ac]">
                Deploy reconnaissance drones to intercept and decrypt live telemetry (Adoption, Security, Decentralization, Treasury, Stability) of rival networks (-2 Treasury per scan). All intercepted telemetry is permanently archived in your tactical dossier.
              </p>
            </div>
            <button
              type="button"
              disabled={isProbing || isPending || score.treasury < 2}
              onClick={handleProbeIntelligence}
              className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 px-4 py-2.5 text-xs font-extrabold text-amber-300 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40 transition shadow-lg"
            >
              <span>{isProbing ? "📡 Scanning rival frequency..." : `📡 Intercept Rival Telemetry (-2 Treasury)${intelDossiers.length > 0 ? ` (${intelDossiers.length} Probed)` : ""}`}</span>
            </button>
          </div>

          {intelDossiers.length > 0 && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#a8f27a]">
                  📁 Intercepted Tactical Dossiers ({intelDossiers.length})
                </span>
                <span className="text-[11px] text-[#8fae93]">
                  Permanent Tactical Telemetry Archive
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {intelDossiers.map((dossier) => (
                  <div
                    key={dossier.targetName}
                    className="rounded-2xl border border-amber-400/30 bg-black/40 p-4 shadow-lg backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-400/20 text-xs font-black text-amber-300">
                          🎯
                        </span>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-[#8fae93] block">Target Network</span>
                          <strong className="text-sm font-extrabold text-white">{dossier.targetName}</strong>
                        </div>
                      </div>
                      <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                        {dossier.roundIntercepted ? `Round ${dossier.roundIntercepted} Telemetry` : "Decrypted Telemetry"}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-5 gap-2">
                      <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                        <span className="text-[9px] uppercase font-bold text-[#8fae93] block">Adoption</span>
                        <span className="text-sm font-extrabold text-white">{dossier.telemetry.adoption}</span>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                        <span className="text-[9px] uppercase font-bold text-[#8fae93] block">Security</span>
                        <span className="text-sm font-extrabold text-white">{dossier.telemetry.security}</span>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                        <span className="text-[9px] uppercase font-bold text-[#8fae93] block">Decentral.</span>
                        <span className="text-sm font-extrabold text-white">{dossier.telemetry.decentralization}</span>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                        <span className="text-[9px] uppercase font-bold text-[#8fae93] block">Treasury</span>
                        <span className="text-sm font-extrabold text-[#ff8080]">{dossier.telemetry.treasury}</span>
                      </div>
                      <div className="rounded-xl border border-white/5 bg-black/30 p-2 text-center">
                        <span className="text-[9px] uppercase font-bold text-[#8fae93] block">Stability</span>
                        <span className="text-sm font-extrabold text-[#2cff5e]">{dossier.telemetry.stability}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        <section id="play" className="scroll-mt-24 mt-8 rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.8)] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8f27a]">Five-round campaign</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-extrabold">{round > 5 ? "Campaign complete" : "Round " + round + ": " + roundLabel(round)}</h2>
                {round <= 5 && (
                  <div className={cx(
                    "inline-flex items-center gap-2 rounded-xl border px-3 py-1 font-mono text-xs font-bold shadow-sm transition",
                    timer.timeLeft > 120 && "border-[#2cff5e]/30 bg-[#2cff5e]/10 text-[#a8f27a]",
                    timer.timeLeft <= 120 && timer.timeLeft > 30 && "border-amber-400/40 bg-amber-400/10 text-amber-300 animate-pulse",
                    timer.timeLeft <= 30 && timer.timeLeft > 0 && "border-red-500/50 bg-red-500/15 text-red-400 animate-pulse",
                    timer.isExpired && "border-red-600 bg-red-950/60 text-red-300"
                  )}>
                    <span>⏱️</span>
                    <span>{timer.isExpired ? "TIME EXPIRED" : `Round Timer: ${timer.formatted}`}</span>
                  </div>
                )}
              </div>
            </div>
            <ol className="grid grid-cols-5 gap-2 text-center">{["Launch", "Attack", "Rebuild", "Re-attack", "Market"].map((name, index) => <li key={name} className={cx("rounded-xl border px-2 py-2 text-[10px] font-bold uppercase", round === index + 1 && "border-[#2cff5e] bg-[#2cff5e]/15", round > index + 1 && "border-[#a8f27a]/35 text-[#a8f27a]", round < index + 1 && "border-white/10 text-[#728575]")}><span className="block text-sm">{round > index + 1 ? "✓" : index + 1}</span>{name}</li>)}</ol>
          </div>

          {/* Round Timer Progress Bar */}
          {round <= 5 && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={cx(
                  "h-full transition-all duration-1000",
                  timer.timeLeft > 120 && "bg-[#2cff5e]",
                  timer.timeLeft <= 120 && timer.timeLeft > 30 && "bg-amber-400",
                  timer.timeLeft <= 30 && "bg-red-500"
                )}
                style={{ width: `${Math.max(0, Math.min(100, (timer.timeLeft / timer.totalDuration) * 100))}%` }}
              />
            </div>
          )}

          {timer.isExpired && round <= 5 && (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs text-red-300 flex items-center justify-between">
              <span>⚠️ <b>Round {round} time has expired!</b> Please commit your decisions immediately to advance.</span>
            </div>
          )}

          {notice && <p role="status" className={cx("mt-6 rounded-xl border px-4 py-3 text-sm", notice.tone === "success" && "border-[#2cff5e]/35 bg-[#2cff5e]/10", notice.tone === "error" && "border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-[#ffc2c2]")}>{notice.text}</p>}

          {round > competition.currentRound && round <= 5 && (
            <div className="mt-8 rounded-2xl border border-[#2cff5e]/30 bg-[#2cff5e]/10 p-6 sm:p-8 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2cff5e]/40 bg-[#2cff5e]/20 px-3.5 py-1 text-xs font-bold text-[#a8f27a]">
                ✓ Round {round - 1} Decisions Locked
              </div>
              <h3 className="mt-4 text-xl font-black text-white">
                Waiting for Administrator to Begin Round {round}
              </h3>
              <p className="mt-2 text-xs text-[#a8c7ac] max-w-lg mx-auto">
                Your team has submitted its moves for this round. Round {round} will unlock automatically when the organizer advances the competition.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-[#8fae93]">
                <span>⏱️ Centralized clock:</span>
                <b className="text-white">{timer.formatted}</b>
              </div>
            </div>
          )}

          {round <= competition.currentRound && round === 1 && <LaunchPhase choice={launchChoice} onChoice={(category, option) => setLaunchChoice((current) => ({ ...current, [category]: option }))} pending={isPending} onSubmit={() => run(() => submitLaunch(launchChoice))} />}
          {round <= competition.currentRound && round === 2 && (
            attackSim ? (
              <AttackSimulationView
                attackerTeam={team.teamName}
                attacks={attackSim.attacks}
                startedAt={attackSim.startedAt}
                duration={attackSim.duration}
                onComplete={finalizeAttack}
                onFastForward={finalizeAttack}
              />
            ) : (
              <AttackPhase
                opponents={opponents}
                target={target}
                setTarget={setTarget}
                attack={attack}
                setAttack={setAttack}
                level={attackLevel}
                setLevel={setAttackLevel}
                pending={isPending}
                onSubmit={handleLaunchAttack}
              />
            )
          )}
          {round <= competition.currentRound && round === 4 && (
            attackSim ? (
              <AttackSimulationView
                attackerTeam={team.teamName}
                attacks={attackSim.attacks}
                startedAt={attackSim.startedAt}
                duration={attackSim.duration}
                onComplete={finalizeAttack}
                onFastForward={finalizeAttack}
              />
            ) : (
              <Round4MultiAttackPhase
                opponents={opponents}
                orders={round4Orders}
                setOrders={setRound4Orders}
                treasury={score.treasury}
                pending={isPending}
                onSubmit={handleLaunchAttack}
              />
            )
          )}
          {round <= competition.currentRound && round === 3 && <RebuildPhase selected={rebuild} setSelected={setRebuild} pending={isPending} onSubmit={() => run(() => submitRebuild(rebuild))} />}
          {round <= competition.currentRound && round === 5 && <MarketPhase pending={isPending} onSubmit={() => run(() => applyMarketEvent())} />}
          {round > 5 && <FinalPhase />}
        </section>
      </div>
    </main>
  );
}

function LaunchPhase({
  choice,
  onChoice,
  pending,
  onSubmit,
}: {
  choice: Record<upgradeOptions, upgradeTypes>;
  onChoice: (category: upgradeOptions, option: upgradeTypes) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-7">
      <p className="text-sm leading-6 text-[#a8c7ac]">Choose one level for fees, security, and validator rewards. Your launch profile becomes public after it is committed.</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {launchCategories.map((category) => (
          <fieldset key={category} className="rounded-2xl border border-white/10 bg-black/15 p-4">
            <legend className="px-1 text-sm font-bold">{category}</legend>
            <div className="mt-3 grid gap-2">
              {(["Low", "Medium", "High"] as upgradeTypes[]).map((option) => {
                const selected = choice[category] === option;
                const effects = LAUNCH_RULES[category][option];
                const description = metrics
                  .filter(({ key }) => effects[key])
                  .map(({ key }) => key + " " + (effects[key]! > 0 ? "+" : "") + effects[key])
                  .join(" · ") || "balanced baseline";
                return (
                  <button key={option} type="button" disabled={pending} onClick={() => onChoice(category, option)} className={cx(
                    "rounded-xl border p-3 text-left transition",
                    selected && "border-[#2cff5e] bg-[#2cff5e]/12",
                    !selected && "border-white/10 bg-white/[0.02] hover:border-[#a8f27a]/40",
                  )}>
                    <span className="block text-sm font-bold">{option}</span>
                    <span className="mt-1 block text-xs text-[#a8c7ac]">{description}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <button type="button" disabled={pending} onClick={onSubmit} className="mt-6 rounded-xl bg-[#a8f27a] px-5 py-3 text-sm font-extrabold text-[#031006] disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Committing…" : "Commit launch strategy"}
      </button>
    </div>
  );
}

function AttackSimulationView({
  attackerTeam,
  attacks,
  startedAt,
  duration = 120,
  onComplete,
  onFastForward,
}: {
  attackerTeam: string;
  attacks: AttackSimItem[];
  startedAt: number;
  duration?: number;
  onComplete: () => void;
  onFastForward: () => void;
}) {
  const [elapsed, setElapsed] = useState(() => Math.floor((Date.now() - startedAt) / 1000));
  const progress = Math.min(100, Math.max(0, (elapsed / duration) * 100));

  useEffect(() => {
    const timer = setInterval(() => {
      const nowElapsed = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(nowElapsed);
      if (nowElapsed >= duration) {
        clearInterval(timer);
        onComplete();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startedAt, duration, onComplete]);

  const isMulti = attacks.length > 1;
  const targetList = attacks.map((a) => a.target).join(", ");
  const totalCost = attacks.reduce((sum, a) => sum + a.cost, 0);

  const SIM_LOGS = [
    { at: 0, text: isMulti
        ? `Initiating synchronized multi-target assault across ${attacks.length} validator clusters (${targetList})...`
        : `Initiating ${attacks[0]?.level ?? "strike"} packet injection against target validator cluster '${attacks[0]?.target}'...` },
    { at: 12, text: `Routing through global mempool relay nodes. Synthetic load: ${isMulti ? "12,288" : "4,096"} tx/s...` },
    { at: 28, text: `Probing target chain defense mechanisms across targeted consensus layers...` },
    { at: 45, text: `Stress-testing Byzantine consensus quorum across ${targetList}...` },
    { at: 62, text: `Evaluating gossip protocol propagation delay and uncle block generation rate...` },
    { at: 80, text: `Simulating validator slashing conditions & mempool congestion buffer...` },
    { at: 98, text: `Cryptographic threshold signature verification under saturation...` },
    { at: 112, text: `Consensus finality epoch reached. Resolving strike attack outcomes...` },
    { at: 119, text: `Final strike telemetry reconciled. Applying on-chain network updates...` },
  ];

  const visibleLogs = SIM_LOGS.filter((log) => elapsed >= log.at);

  return (
    <div className="mt-7 rounded-2xl border border-red-500/30 bg-gradient-to-b from-[#180808]/90 to-[#0c0404]/90 p-6 sm:p-8 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-red-500/20 pb-5">
        <div className="flex items-center gap-3">
          <span className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
          <div>
            <h3 className="text-lg font-black uppercase tracking-wider text-red-400">
              Attack Pending • Simulation in Progress
            </h3>
            <p className="text-xs text-[#c9a6a8]">
              Simulating mempool propagation, validator peer gossip, and Byzantine consensus resolution.
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-950/40 px-3.5 py-1.5 text-xs font-bold text-red-300">
          <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
          <span>Active Simulation</span>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex justify-between text-xs font-semibold text-[#c9a6a8] mb-1.5">
          <span>Simulation Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-[#2cff5e] transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Target Strike Details */}
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8fae93]">Attacking Operation</p>
          <p className="mt-1 text-sm font-extrabold text-white">{attackerTeam}</p>
          <p className="text-xs text-red-300">{attacks.length} Target{attacks.length > 1 ? "s" : ""} Selected</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8fae93]">Target Vector(s)</p>
          <p className="mt-1 text-sm font-extrabold text-white truncate">
            {attacks.map((a) => a.target).join(", ")}
          </p>
          <p className="text-xs text-[#a8c7ac]">
            {isMulti ? "Simultaneous Strikes" : ATTACK_RULES[attacks[0].attack].label}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8fae93]">Treasury Committed</p>
          <p className="mt-1 text-sm font-extrabold text-[#ff8080]">{totalCost} Treasury</p>
          <p className="text-xs text-[#a8c7ac]">Deducted regardless of outcome</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-3.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8fae93]">Simulated Telemetry</p>
          <p className="mt-1 font-mono text-sm font-bold text-white">
            {Math.floor(elapsed * 285 * Math.max(1, attacks.length)) + 120} packets
          </p>
          <p className="text-xs text-[#8fae93] font-mono">
            {Math.min(128, Math.floor(elapsed * 0.7) + 8 * attacks.length)} active peers
          </p>
        </div>
      </div>

      {/* Breakdown per target if multi */}
      {isMulti && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {attacks.map((a, idx) => (
            <div key={idx} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-white">
                <span className="text-[#a8f27a]">🎯 {a.target}</span>
                <span className="text-red-300 font-mono">{a.cost} T</span>
              </div>
              <p className="mt-1 text-[11px] text-[#c9a6a8]">
                {ATTACK_RULES[a.attack].label} • {a.level}
              </p>
              <div className="mt-2 flex justify-between text-[10px] text-[#8fae93]">
                <span>Strength: {a.strength}</span>
                <span className="text-[#ff8080] font-semibold">{a.cost} Treasury</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-white/15 bg-black/75 p-4 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-500"></span>
            <span className="h-2 w-2 rounded-full bg-yellow-500"></span>
            <span className="h-2 w-2 rounded-full bg-green-500"></span>
            <span className="ml-2 text-[10px] uppercase tracking-wider text-[#8fae93]">Live Simulation Feed</span>
          </div>
          <span className="text-[10px] text-[#8fae93]">PORT: 8545 / P2P: 30303</span>
        </div>
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
          {visibleLogs.map((log, i) => (
            <div key={i} className="flex gap-2 text-[#a8f27a] leading-relaxed">
              <span className="text-[#8fae93] select-none">&gt;&gt;</span>
              <span>{log.text}</span>
            </div>
          ))}
          <div className="flex items-center gap-1 text-[#2cff5e] animate-pulse">
            <span>&gt; Simulating blockchain state execution on target node cluster...</span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-red-500/10">
        <p className="text-xs text-[#a8c7ac]">
          Simulation will conclude and finalize on-chain state when progress completes.
        </p>
        <button
          type="button"
          onClick={onFastForward}
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold text-[#c9a6a8] hover:border-white/40 hover:text-white transition"
          title="Skip the remainder of the simulation"
        >
          ⚡ Fast-Forward Simulation
        </button>
      </div>
    </div>
  );
}

function Round4MultiAttackPhase({
  opponents,
  orders,
  setOrders,
  treasury,
  pending,
  onSubmit,
}: {
  opponents: Leaderboard[];
  orders: AttackOrder[];
  setOrders: React.Dispatch<React.SetStateAction<AttackOrder[]>>;
  treasury: number;
  pending: boolean;
  onSubmit: () => void;
}) {
  const addOrder = () => {
    const existing = new Set(orders.map((o) => o.target));
    const nextAvailable = opponents.find((o) => !existing.has(o.name))?.name ?? "";
    setOrders((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        target: nextAvailable,
        attack: "Spam Attack",
        level: "Standard Attack",
      },
    ]);
  };

  const removeOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
  };

  const updateOrder = (id: string, updates: Partial<AttackOrder>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
  };

  const totalCost = orders.reduce((sum, o) => sum + (ATTACK_LEVELS[o.level]?.cost ?? 0), 0);
  const targets = orders.map((o) => o.target).filter(Boolean);
  const hasDuplicates = new Set(targets).size !== targets.length;
  const hasEmpty = orders.some((o) => !o.target);
  const isOverBudget = totalCost > treasury;

  return (
    <div className="mt-7">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-white">⚡ Round 4: Re-attack Wave (Multi-Target)</h3>
            <p className="mt-1 text-xs text-[#a8c7ac]">
              Configure coordinated strikes against multiple rival chains. Each strike costs Treasury based on attack intensity.
            </p>
          </div>
          <button
            type="button"
            disabled={pending || orders.length >= opponents.length}
            onClick={addOrder}
            className="rounded-xl border border-[#2cff5e]/40 bg-[#2cff5e]/10 px-3.5 py-2 text-xs font-bold text-[#a8f27a] hover:bg-[#2cff5e]/20 disabled:cursor-not-allowed disabled:opacity-40 transition"
          >
            + Add Another Target Strike
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {orders.map((order, index) => {
            const cost = ATTACK_LEVELS[order.level].cost;
            const otherTargets = new Set(orders.filter((o) => o.id !== order.id).map((o) => o.target));
            const isDuplicate = order.target && otherTargets.has(order.target);

            return (
              <div
                key={order.id}
                className={cx(
                  "rounded-xl border p-4 transition",
                  isDuplicate ? "border-red-500/50 bg-red-950/20" : "border-white/10 bg-black/30"
                )}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2cff5e]/20 text-[10px] font-extrabold text-[#2cff5e]">
                      {index + 1}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      Strike Target #{index + 1}
                    </span>
                    {isDuplicate && (
                      <span className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-300">
                        Duplicate Target
                      </span>
                    )}
                  </div>
                  {orders.length > 1 && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => removeOrder(order.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="mt-3 grid gap-3 md:grid-cols-3">
                  <label className="block text-xs font-bold uppercase tracking-[0.13em] text-[#a8f27a]">
                    Target Rival
                    <select
                      value={order.target}
                      disabled={pending}
                      onChange={(e) => updateOrder(order.id, { target: e.target.value })}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#061008] px-3 py-2 text-sm text-white"
                    >
                      <option value="">Select a team</option>
                      {opponents.map((opp) => (
                        <option
                          key={opp.name}
                          value={opp.name}
                          disabled={otherTargets.has(opp.name)}
                        >
                          {opp.name} {otherTargets.has(opp.name) ? "(Already selected)" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-[0.13em] text-[#a8f27a]">
                    Attack Vector
                    <select
                      value={order.attack}
                      disabled={pending}
                      onChange={(e) => updateOrder(order.id, { attack: e.target.value as AttackCategory })}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#061008] px-3 py-2 text-sm text-white"
                    >
                      {(Object.keys(ATTACK_RULES) as AttackCategory[]).map((cat) => (
                        <option key={cat} value={cat}>
                          {ATTACK_RULES[cat].label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-xs font-bold uppercase tracking-[0.13em] text-[#a8f27a]">
                    Attack Intensity
                    <select
                      value={order.level}
                      disabled={pending}
                      onChange={(e) => updateOrder(order.id, { level: e.target.value as AttackType })}
                      className="mt-1.5 w-full rounded-xl border border-white/15 bg-[#061008] px-3 py-2 text-sm text-white"
                    >
                      {(Object.keys(ATTACK_LEVELS) as AttackType[]).map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl} (Cost: {ATTACK_LEVELS[lvl].cost} T)
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-black/40 px-3 py-2 text-xs text-[#a8c7ac]">
                  <div>
                    Vector: <span className="font-bold text-white">{ATTACK_RULES[order.attack].label}</span>
                    <span className="mx-2 text-white/20">|</span>
                    Strength: <span className="font-mono font-bold text-[#2cff5e]">{ATTACK_LEVELS[order.level].strength}</span>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-[#ff8080]">
                      Cost: {cost} Treasury
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Multi-Attack Summary & Action */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div>
              <span className="text-[#8fae93]">Strikes Planned:</span>{" "}
              <b className="font-mono text-sm text-white">{orders.length}</b>
            </div>
            <div>
              <span className="text-[#8fae93]">Total Cost:</span>{" "}
              <b className={cx("font-mono text-sm", isOverBudget ? "text-red-400" : "text-[#ff8080]")}>
                {totalCost} Treasury
              </b>
            </div>
            <div>
              <span className="text-[#8fae93]">Available Treasury:</span>{" "}
              <b className="font-mono text-sm text-[#2cff5e]">{treasury}</b>
            </div>
          </div>

          <button
            type="button"
            disabled={pending || orders.length === 0 || hasEmpty || hasDuplicates || isOverBudget}
            onClick={onSubmit}
            className="rounded-xl bg-gradient-to-r from-red-600 to-amber-600 px-6 py-3 text-sm font-extrabold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Launching Multi-Strikes…" : `Launch ${orders.length} Multi-Target Strike${orders.length > 1 ? "s" : ""}`}
          </button>
        </div>

        {hasDuplicates && (
          <p className="mt-3 text-xs text-red-400">
            ⚠️ Duplicate targets detected. Each rival team can only be attacked once per re-attack wave.
          </p>
        )}
        {hasEmpty && (
          <p className="mt-3 text-xs text-amber-400">
            ⚠️ Please assign a target rival for every planned strike.
          </p>
        )}
        {isOverBudget && (
          <p className="mt-3 text-xs text-red-400">
            ⚠️ Insufficient Treasury. Reduce attack intensity or remove strikes to proceed.
          </p>
        )}
      </div>
    </div>
  );
}

function AttackPhase({
  opponents,
  target,
  setTarget,
  attack,
  setAttack,
  level,
  setLevel,
  pending,
  onSubmit,
}: {
  opponents: Leaderboard[];
  target: string;
  setTarget: (value: string) => void;
  attack: AttackCategory;
  setAttack: (value: AttackCategory) => void;
  level: AttackType;
  setLevel: (value: AttackType) => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_280px]">
      <div>
        <p className="text-sm leading-6 text-[#a8c7ac]">Configure your attack vector and intensity against a rival network. The treasury cost is deducted whether the attack succeeds or is deflected.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <label className="block text-xs font-bold uppercase tracking-[0.13em] text-[#a8f27a]">Target
            <select value={target} disabled={pending} onChange={(event) => setTarget(event.target.value)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#061008] px-3 py-3 text-sm text-white">
              <option value="">Choose a team</option>
              {opponents.map((opponent) => <option key={opponent.name} value={opponent.name}>{opponent.name}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.13em] text-[#a8f27a]">Attack type
            <select value={attack} disabled={pending} onChange={(event) => setAttack(event.target.value as AttackCategory)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#061008] px-3 py-3 text-sm text-white">
              {attackCategories.map((category) => <option key={category} value={category}>{ATTACK_RULES[category].label}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold uppercase tracking-[0.13em] text-[#a8f27a]">Attack level
            <select value={level} disabled={pending} onChange={(event) => setLevel(event.target.value as AttackType)} className="mt-2 w-full rounded-xl border border-white/15 bg-[#061008] px-3 py-3 text-sm text-white">
              {attackTypes.map((attackLevel) => <option key={attackLevel} value={attackLevel}>{attackLevel + " · cost " + ATTACK_LEVELS[attackLevel].cost}</option>)}
            </select>
          </label>
        </div>
        <button type="button" disabled={pending || !target} onClick={onSubmit} className="mt-5 rounded-xl bg-[#ff6b6b] px-5 py-3 text-sm font-extrabold text-[#250403] disabled:cursor-not-allowed disabled:opacity-50">
          {pending ? "Launching…" : "Launch " + level}
        </button>
      </div>
      <aside className="rounded-2xl border border-[#a8f27a]/25 bg-[#a8f27a]/5 p-5">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a8f27a]">Strike Configuration</p>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-[#8fae93]">Target</dt><dd className="font-bold text-white truncate">{target || "None selected"}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#8fae93]">Vector</dt><dd className="font-bold text-white">{ATTACK_RULES[attack].label}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#8fae93]">Attack strength</dt><dd className="font-bold text-[#2cff5e]">{ATTACK_LEVELS[level].strength}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-[#8fae93]">Treasury cost</dt><dd className="font-bold text-[#ff8080]">{ATTACK_LEVELS[level].cost} T</dd></div>
        </dl>
      </aside>
    </div>
  );
}

function RebuildPhase({
  selected,
  setSelected,
  pending,
  onSubmit,
}: {
  selected: RebuildType | "Treasury Investment";
  setSelected: (value: RebuildType | "Treasury Investment") => void;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-7">
      <p className="text-sm leading-6 text-[#a8c7ac]">Repair a weakness, reinforce your validator base, or invest in growth. Choose one rebuild action.</p>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {rebuildActions.map((action) => {
          const rule = REBUILD_RULES[action];
          return (
            <button key={action} type="button" disabled={pending} onClick={() => setSelected(action)} className={cx(
              "rounded-2xl border p-4 text-left transition",
              action === selected && "border-[#2cff5e] bg-[#2cff5e]/12",
              action !== selected && "border-white/10 bg-black/15 hover:border-[#a8f27a]/40",
            )}>
              <span className="block text-sm font-bold">{action}</span>
              <span className="mt-3 block text-xs text-[#a8c7ac]">{rule.cost ? "cost " + rule.cost + " treasury" : "no immediate cost"}</span>
              <span className="mt-1 block text-xs leading-5">{rule.description}</span>
            </button>
          );
        })}
      </div>
      <button type="button" disabled={pending} onClick={onSubmit} className="mt-6 rounded-xl bg-[#a8f27a] px-5 py-3 text-sm font-extrabold text-[#031006] disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Applying…" : "Apply " + selected}
      </button>
    </div>
  );
}

function MarketPhase({ pending, onSubmit }: { pending: boolean; onSubmit: () => void }) {
  return (
    <div className="mt-7 rounded-2xl border border-[#f0c85d]/35 bg-[#f0c85d]/[0.06] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f0d878]">Global market event</p>
      <h3 className="mt-2 text-xl font-extrabold">The market moves every network at once.</h3>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#d6d9cc]">Reveal the shared event and apply its effect to your network before final scoring. Every team receives the same event.</p>
      <button type="button" disabled={pending} onClick={onSubmit} className="mt-5 rounded-xl bg-[#f0d878] px-5 py-3 text-sm font-extrabold text-[#211d07] disabled:cursor-not-allowed disabled:opacity-50">
        {pending ? "Revealing…" : "Reveal market event"}
      </button>
    </div>
  );
}

function FinalPhase() {
  return (
    <div className="mt-7 rounded-2xl border border-[#2cff5e]/35 bg-[#2cff5e]/10 p-6">
      <div className="inline-flex items-center gap-2 rounded-full border border-[#2cff5e]/30 bg-[#2cff5e]/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#a8f27a]">
        ✓ Campaign Complete • Record Locked
      </div>
      <h3 className="mt-3 text-2xl font-extrabold">All 5 Rounds Completed!</h3>
      <p className="mt-2 text-sm leading-6 text-[#d6efd7]">
        Your team has completed all 5 rounds. Each team is permitted exactly one campaign run. Your final network telemetry is permanently logged in the registry. Await the final announcements from the administrators.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          href="/rulebook"
          className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
        >
          Review Campaign Rulebook
        </Link>
      </div>
    </div>
  );
}
