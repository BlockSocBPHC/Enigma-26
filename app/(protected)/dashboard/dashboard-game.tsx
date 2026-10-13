"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/navbar";
import { createClient } from "@/utils/supabase/client";
import {
  ATTACK_LEVELS,
  ATTACK_RULES,
  defenseScore,
  LAUNCH_RULES,
  REBUILD_RULES,
  ROUND_LABELS,
  successProbability,
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
import { applyMarketEvent, resetGame, submitAttack, submitLaunch, submitRebuild } from "./actions";

type Notice = { tone: "success" | "error"; text: string } | null;
type GameResult = Awaited<ReturnType<typeof submitLaunch>>;

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
}: {
  team: TeamDetails;
  userEmail: string;
  initialScore: TeamScore;
  initialLeaderboard: Leaderboard[];
  initialRound: number;
}) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [leaderboard, setLeaderboard] = useState(initialLeaderboard);
  const [round, setRound] = useState(initialRound);
  const [notice, setNotice] = useState<Notice>(null);
  const [isPending, startTransition] = useTransition();
  const [launchChoice, setLaunchChoice] = useState<Record<upgradeOptions, upgradeTypes>>({
    "Transaction Fees": "Medium",
    "Security Budget": "Medium",
    "Validator Rewards": "Medium",
  });
  const [target, setTarget] = useState("");
  const [attack, setAttack] = useState<AttackCategory>("Spam Attack");
  const [attackLevel, setAttackLevel] = useState<AttackType>("Standard Attack");
  const [rebuild, setRebuild] = useState<RebuildType | "Treasury Investment">("Security Recovery");

  const opponents = useMemo(() => leaderboard.filter((row) => row.name !== team.teamName), [leaderboard, team.teamName]);
  const selectedTarget = opponents.find((row) => row.name === target);
  const chance = selectedTarget ? successProbability(ATTACK_LEVELS[attackLevel].strength - defenseScore(selectedTarget, attack)) : null;

  function applyResult(result: GameResult) {
    setScore(result.score);
    setRound(result.round);
    setLeaderboard((rows) => rows.map((row) => {
      if (row.name === team.teamName) return { ...row, ...result.score };
      if (result.target && row.name === result.target.name) return { ...row, ...result.target.score };
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

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#030604] text-[#f3fff0]">
      <Navbar
        teamName={team.teamName}
        teamMembers={team.teamMembers}
        userEmail={userEmail}
        roundNumber={round}
        roundName={roundLabel(round)}
        links={[
          { id: "/dashboard", label: "Dashboard" },
          { id: "/scoreboard", label: "Scoreboard" },
          { id: "/rulebook", label: "Rulebook" },
        ]}
        onSignOut={() => { void signOut(); }}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
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

        <section id="play" className="scroll-mt-24 mt-8 rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.8)] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#a8f27a]">Five-round campaign</p>
              <div className="mt-2 flex items-center gap-3">
                <h2 className="text-2xl font-extrabold">{round > 5 ? "Campaign complete" : "Round " + round + ": " + roundLabel(round)}</h2>
                {round > 1 && (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => run(() => resetGame())}
                    className="rounded-lg border border-white/10 px-2.5 py-1 text-xs text-[#8fae93] transition hover:border-white/30 hover:text-white"
                  >
                    Restart campaign
                  </button>
                )}
              </div>
            </div>
            <ol className="grid grid-cols-5 gap-2 text-center">{["Launch", "Attack", "Rebuild", "Counterattack", "Market"].map((name, index) => <li key={name} className={cx("rounded-xl border px-2 py-2 text-[10px] font-bold uppercase", round === index + 1 && "border-[#2cff5e] bg-[#2cff5e]/15", round > index + 1 && "border-[#a8f27a]/35 text-[#a8f27a]", round < index + 1 && "border-white/10 text-[#728575]")}><span className="block text-sm">{round > index + 1 ? "✓" : index + 1}</span>{name}</li>)}</ol>
          </div>

          {notice && <p role="status" className={cx("mt-6 rounded-xl border px-4 py-3 text-sm", notice.tone === "success" && "border-[#2cff5e]/35 bg-[#2cff5e]/10", notice.tone === "error" && "border-[#ff6b6b]/40 bg-[#ff6b6b]/10 text-[#ffc2c2]")}>{notice.text}</p>}

          {round === 1 && <LaunchPhase choice={launchChoice} onChoice={(category, option) => setLaunchChoice((current) => ({ ...current, [category]: option }))} pending={isPending} onSubmit={() => run(() => submitLaunch(launchChoice))} />}
          {(round === 2 || round === 4) && <AttackPhase opponents={opponents} target={target} setTarget={setTarget} attack={attack} setAttack={setAttack} level={attackLevel} setLevel={setAttackLevel} chance={chance} defense={selectedTarget ? defenseScore(selectedTarget, attack) : null} pending={isPending} onSubmit={() => run(() => submitAttack(target, attack, attackLevel))} />}
          {round === 3 && <RebuildPhase selected={rebuild} setSelected={setRebuild} pending={isPending} onSubmit={() => run(() => submitRebuild(rebuild))} />}
          {round === 5 && <MarketPhase pending={isPending} onSubmit={() => run(() => applyMarketEvent())} />}
          {round > 5 && <FinalPhase score={score} pending={isPending} onReset={() => run(() => resetGame())} />}
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

function AttackPhase({
  opponents,
  target,
  setTarget,
  attack,
  setAttack,
  level,
  setLevel,
  chance,
  defense,
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
  chance: number | null;
  defense: number | null;
  pending: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="mt-7 grid gap-5 xl:grid-cols-[1fr_280px]">
      <div>
        <p className="text-sm leading-6 text-[#a8c7ac]">Analyze public data, target a weak point, and fund an attack. Its treasury cost is paid whether it succeeds or fails.</p>
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
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a8f27a]">Attack preview</p>
        {chance === null || defense === null ? <p className="mt-4 text-sm leading-6 text-[#a8c7ac]">Choose a target to inspect its defense and exact success probability.</p> : (
          <>
            <p className="mt-3 text-4xl font-black">{chance}%</p>
            <p className="mt-1 text-sm text-[#a8c7ac]">success probability</p>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between gap-4"><dt className="text-[#8fae93]">Defense score</dt><dd className="font-bold">{defense.toFixed(1)}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#8fae93]">Attack strength</dt><dd className="font-bold">{ATTACK_LEVELS[level].strength}</dd></div>
              <div className="flex justify-between gap-4"><dt className="text-[#8fae93]">Treasury cost</dt><dd className="font-bold">{ATTACK_LEVELS[level].cost}</dd></div>
            </dl>
          </>
        )}
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

function FinalPhase({ onReset, pending }: { score: TeamScore; onReset: () => void; pending: boolean }) {
  return (
    <div className="mt-7 rounded-2xl border border-[#2cff5e]/35 bg-[#2cff5e]/10 p-6">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a8f27a]">Campaign complete</p>
      <h3 className="mt-2 text-2xl font-extrabold">All 5 Rounds Completed!</h3>
      <p className="mt-2 text-sm leading-6 text-[#d6efd7]">All rounds are completed. Compare your network’s Adoption, Security, Decentralization, Treasury, and Stability with competitor chains on the scoreboard.</p>
      <button
        type="button"
        disabled={pending}
        onClick={onReset}
        className="mt-5 rounded-xl bg-[#2cff5e] px-5 py-3 text-sm font-extrabold text-[#031006] transition hover:brightness-110 disabled:opacity-50"
      >
        {pending ? "Restarting…" : "Play again (Restart campaign)"}
      </button>
    </div>
  );
}
