"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/navbar";
import { createClient } from "@/utils/supabase/client";
import {
  ATTACK_LEVELS,
  ATTACK_RULES,
  GLOBAL_EVENTS,
  LAUNCH_RULES,
  REBUILD_RULES,
} from "@/app/lib/game-rules";
import type { AttackCategory, AttackType, RebuildType, TeamDetails, upgradeOptions } from "@/app/lib/types";

const attackCategories = Object.keys(ATTACK_RULES) as AttackCategory[];
const attackTypes = Object.keys(ATTACK_LEVELS) as AttackType[];
const launchCategories = Object.keys(LAUNCH_RULES) as upgradeOptions[];
const rebuildActions = Object.keys(REBUILD_RULES) as (RebuildType | "Treasury Investment")[];

const NAV_LINKS = [
  { id: "/dashboard", label: "Dashboard" },
  { id: "/scoreboard", label: "Scoreboard" },
  { id: "/rulebook", label: "Rulebook" },
];

export default function RulebookView({
  team,
  userEmail,
  currentRound,
}: {
  team: TeamDetails;
  userEmail: string;
  currentRound: number;
}) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-[#030604] bg-[radial-gradient(1100px_650px_at_50%_-10%,#0b2a14,transparent_62%)] text-[#f3fff0]">
      <Navbar
        teamName={team.teamName}
        teamMembers={team.teamMembers}
        userEmail={userEmail}
        roundNumber={currentRound}
        roundName="Rulebook"
        links={NAV_LINKS}
        onSignOut={() => { void signOut(); }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header */}
        <header className="rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2cff5e]/30 bg-[#2cff5e]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#a8f27a]">
                📖 Official Documentation
              </div>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">ENIGMA Rulebook</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a8c7ac]">
                Master the economic models, offensive strike vectors, defensive formulas, and recovery protocols that dictate the battlefield.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
              >
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* 5-Round Campaign Overview */}
        <section className="mt-8 rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 sm:p-7 backdrop-blur-md">
          <h2 className="text-xl font-extrabold text-[#a8f27a]">Five-Round Campaign Structure</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-5">
            {[
              { num: 1, title: "Launch & Upgrades", desc: "Select fee policy, security allocation, and validator rewards." },
              { num: 2, title: "First Attack Wave", desc: "Inspect public telemetry and strike a competitor’s weak link." },
              { num: 3, title: "Rebuild Protocols", desc: "Spend Treasury to reinforce damaged network pillars." },
              { num: 4, title: "Counterattack Wave", desc: "Final strike phase before macro market movements hit." },
              { num: 5, title: "Global Macro Event", desc: "Market-wide event impacts all chains simultaneously." },
            ].map((round) => (
              <div key={round.num} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2cff5e]/20 text-xs font-black text-[#2cff5e]">
                  R{round.num}
                </span>
                <h3 className="mt-2 text-sm font-bold text-white">{round.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#a8c7ac]">{round.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Launch Upgrades (Round 1) */}
        <section className="mt-8 rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 sm:p-7 backdrop-blur-md">
          <h2 className="text-xl font-extrabold text-[#a8f27a]">Launch Upgrades & Policy Choices (Round 1)</h2>
          <p className="mt-1 text-sm text-[#a8c7ac]">Teams select an allocation tier for each core network parameter:</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {launchCategories.map((category) => (
              <div key={category} className="rounded-2xl border border-white/10 bg-black/25 p-4 text-xs">
                <h3 className="text-sm font-bold text-white">{category}</h3>
                <div className="mt-3 space-y-2.5">
                  {(["Low", "Medium", "High"] as const).map((tier) => (
                    <div key={tier} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5">
                      <span className="font-semibold text-[#a8f27a]">{tier}:</span>
                      <p className="mt-1 text-[11px] text-[#a8c7ac]">
                        {Object.entries(LAUNCH_RULES[category][tier])
                          .map(([stat, val]) => `${stat} ${(val ?? 0) > 0 ? "+" : ""}${val}`)
                          .join(", ")}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Core Game Mechanics */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Success Probability */}
          <article className="rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 backdrop-blur-md">
            <h2 className="text-lg font-bold text-[#a8f27a]">Attack Success Probability</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#a8c7ac]">
              Odds are calculated by: <b>Difference = Attack Strength − Target Defense Score</b>.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[10px] font-bold uppercase text-[#8fae93]">
                  <tr>
                    <th className="py-2">Net Difference</th>
                    <th className="py-2 text-right">Probability</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {[
                    { diff: "≤ -30", prob: "5%" },
                    { diff: "-29 to -20", prob: "15%" },
                    { diff: "-19 to -10", prob: "30%" },
                    { diff: "-9 to +9", prob: "50%" },
                    { diff: "+10 to +19", prob: "75%" },
                    { diff: "+20 to +29", prob: "90%" },
                    { diff: "≥ +30", prob: "100%" },
                  ].map((row) => (
                    <tr key={row.diff}>
                      <td className="py-2 font-mono text-[#f3fff0]">{row.diff}</td>
                      <td className="py-2 text-right font-bold text-[#2cff5e]">{row.prob}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>

          {/* Attack Levels */}
          <article className="rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 backdrop-blur-md">
            <h2 className="text-lg font-bold text-[#a8f27a]">Attack Levels & Cost</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#a8c7ac]">
              Treasury cost is deducted regardless of success or failure.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 text-[10px] font-bold uppercase text-[#8fae93]">
                  <tr>
                    <th className="py-2">Level</th>
                    <th className="py-2">Strength</th>
                    <th className="py-2 text-right">Treasury Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {attackTypes.map((level) => (
                    <tr key={level}>
                      <td className="py-2 font-bold text-[#f3fff0]">{level}</td>
                      <td className="py-2 text-[#a8c7ac]">{ATTACK_LEVELS[level].strength}</td>
                      <td className="py-2 text-right font-bold text-[#ff6b6b]">{ATTACK_LEVELS[level].cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </article>
        </div>

        {/* Defense Formulas & Rebuild Protocols */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* Defense Formulas */}
          <article className="rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 backdrop-blur-md">
            <h2 className="text-lg font-bold text-[#a8f27a]">Attack Defense Formulas</h2>
            <p className="mt-2 text-sm text-[#a8c7ac]">How a defending chain calculates its resistance:</p>
            <div className="mt-4 divide-y divide-white/[0.07]">
              {attackCategories.map((category) => (
                <div key={category} className="py-2.5 text-xs">
                  <div className="flex justify-between font-semibold text-white">
                    <span>{ATTACK_RULES[category].label}</span>
                    <span className="text-[#a8c7ac]">
                      {Object.entries(ATTACK_RULES[category].defense)
                        .map(([key, weight]) => `${Math.round((weight ?? 0) * 100)}% ${key}`)
                        .join(" + ")}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-[#ff8080]">
                    Impact on Hit:{" "}
                    {Object.entries(ATTACK_RULES[category].effect)
                      .map(([key, delta]) => `${key} ${delta}`)
                      .join(", ")}
                  </p>
                </div>
              ))}
            </div>
          </article>

          {/* Rebuild Actions */}
          <article className="rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 backdrop-blur-md">
            <h2 className="text-lg font-bold text-[#a8f27a]">Rebuild Protocols (Round 3)</h2>
            <p className="mt-2 text-sm text-[#a8c7ac]">Reconstruction protocols to repair network damage:</p>
            <div className="mt-4 divide-y divide-white/[0.07]">
              {rebuildActions.map((action) => {
                const rule = REBUILD_RULES[action];
                return (
                  <div key={action} className="py-3 text-xs">
                    <div className="flex justify-between font-bold text-white">
                      <span>{action}</span>
                      <span className="text-[#a8f27a]">Cost: {rule.cost} Treasury</span>
                    </div>
                    <p className="mt-1 text-[#a8c7ac]">{rule.description}</p>
                  </div>
                );
              })}
            </div>
          </article>
        </div>

        {/* Global Market Events */}
        <section className="mt-8 rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 sm:p-7 backdrop-blur-md">
          <h2 className="text-lg font-bold text-[#a8f27a]">Global Market Events (Round 5)</h2>
          <p className="mt-1 text-sm text-[#a8c7ac]">One macro event affects all participating networks:</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(GLOBAL_EVENTS).map(([event, rule]) => (
              <div key={event} className="rounded-xl border border-white/10 bg-black/25 p-3.5 text-xs">
                <p className="font-bold text-white">{event}</p>
                <p className="mt-1 text-[#a8c7ac]">{rule.description}</p>
                <p className="mt-1 text-[11px] font-semibold text-[#8fae93]">
                  Effect:{" "}
                  {Object.entries(rule.effect)
                    .map(([k, v]) => `${k} ${(v ?? 0) > 0 ? "+" : ""}${v}`)
                    .join(", ")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
