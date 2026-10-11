"use client";

import React, { useState, useEffect } from "react";
import { AttackCategory, AttackType, Leaderboard, TeamScore } from "@/app/lib/types";
import { launchAttackAction, previewDefenseScoreAction } from "@/app/actions/game";

interface AttackPanelProps {
  attackingTeam: string;
  allTeams: Leaderboard[];
  onScoreUpdated: (newScore: TeamScore) => void;
  isActivePhase: boolean;
  mode?: "attack" | "counterattack";
}

const ATTACK_CATEGORIES: { id: AttackCategory; name: string; icon: string; description: string }[] = [
  { id: "Spam Attack", name: "Spam Attack", icon: "📨", description: "Flood mempool with junk transactions to degrade stability & adoption." },
  { id: "Validator Bribery", name: "Validator Bribery", icon: "💰", description: "Bribe block producers to manipulate ordering and compromise decentralization." },
  { id: "Governance Attack", name: "Governance Attack", icon: "🗳️", description: "Flash-loan voting power to push malicious protocol governance proposals." },
  { id: "Treasury Drain", name: "Treasury Drain", icon: "🏦", description: "Exploit liquidity bridges or oracle pricing to deplete treasury reserves." },
  { id: "Network Fork Attack", name: "Network Fork Attack", icon: "🍴", description: "Fracture network consensus into conflicting state forks." },
  { id: "Reputation Attack", name: "Reputation Attack", icon: "📢", description: "Disinformation campaign and social FUD targeting user trust." },
  { id: "Smart Contract Exploit", name: "Smart Contract Exploit", icon: "👾", description: "Reentrancy or logic vulnerability strike against mainnet contracts." },
];

const ATTACK_TYPES: { id: AttackType; label: string; strengthHint: string; costHint: string }[] = [
  { id: "Weak Attack", label: "Weak Attack", strengthHint: "Low Impact", costHint: "Low Cost" },
  { id: "Standard Attack", label: "Standard Attack", strengthHint: "Moderate Impact", costHint: "Standard Cost" },
  { id: "Strong Attack", label: "Strong Attack", strengthHint: "Heavy Damage", costHint: "High Cost" },
  { id: "Coordinated Attack", label: "Coordinated Attack", strengthHint: "Multi-Vector", costHint: "Very High Cost" },
  { id: "All-Out Attack", label: "All-Out Attack", strengthHint: "Maximum Devastation", costHint: "Massive Cost" },
];

export default function AttackPanel({
  attackingTeam,
  allTeams,
  onScoreUpdated,
  isActivePhase,
  mode = "attack",
}: AttackPanelProps) {
  const isCounterattack = mode === "counterattack";
  // Filter out self
  const targetCandidates = allTeams.filter((t) => t.name !== attackingTeam);
  const [selectedTarget, setSelectedTarget] = useState<string>(
    targetCandidates[0]?.name || ""
  );
  const activeTarget = targetCandidates.some((team) => team.name === selectedTarget)
    ? selectedTarget
    : targetCandidates[0]?.name || "";

  const [selectedCategory, setSelectedCategory] = useState<AttackCategory>("Smart Contract Exploit");
  const [selectedType, setSelectedType] = useState<AttackType>("Standard Attack");

  const [defenseScore, setDefenseScore] = useState<number | null>(null);
  const [isEvaluatingDefense, setIsEvaluatingDefense] = useState<boolean>(false);

  const [isStriking, setIsStriking] = useState<boolean>(false);
  const [strikeResult, setStrikeResult] = useState<{
    text: string;
    isSuccess: boolean;
  } | null>(null);

  // Auto preview defense score when target or category changes
  useEffect(() => {
    let active = true;
    if (!activeTarget) return;

    const fetchDefense = async () => {
      setIsEvaluatingDefense(true);
      const res = await previewDefenseScoreAction(activeTarget, selectedCategory);
      if (active && res.success && typeof res.data === "number") {
        setDefenseScore(res.data);
      }
      if (active) setIsEvaluatingDefense(false);
    };

    fetchDefense();
    return () => {
      active = false;
    };
  }, [activeTarget, selectedCategory]);

  const handleLaunchAttack = async () => {
    if (!activeTarget) return;
    setIsStriking(true);
    setStrikeResult(null);

    const res = await launchAttackAction(
      attackingTeam,
      activeTarget,
      selectedCategory,
      selectedType
    );
    setIsStriking(false);

    if (res.success && res.data) {
      onScoreUpdated(res.data.attackerScore);
      setStrikeResult({
        text: res.message || "Attack executed successfully!",
        isSuccess: !res.message?.includes("deflected"),
      });
    } else {
      setStrikeResult({
        text: res.message || "Failed to execute attack",
        isSuccess: false,
      });
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 md:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>{isCounterattack ? "↻" : "⚔️"}</span> {isCounterattack ? "Counterattack Phase" : "Attack Phase"}
            </h3>
            {isActivePhase ? (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                Active Phase Window
              </span>
            ) : (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Strategic Standby
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            {isCounterattack
              ? "Review the board after recovery actions, then commit one final strategic attack against a rival."
              : "Use public metrics to target a competing blockchain. Higher intensity attacks require greater treasury expenditure."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Step 1: Choose Target */}
        <div className="lg:col-span-1 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-4">
          <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">
            1. Select Rival Target
          </label>
          {targetCandidates.length === 0 ? (
            <div className="text-xs text-zinc-400 italic">No opposing teams detected.</div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {targetCandidates.map((t) => {
                const isSelected = activeTarget === t.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setSelectedTarget(t.name)}
                    className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                      isSelected
                        ? "bg-rose-500/15 border-rose-500/80 text-white"
                        : "bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{t.name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        Sec: {t.security} &bull; Trs: {t.treasury}
                      </div>
                    </div>
                    {isSelected && <span className="text-rose-400 font-bold text-xs">🎯 TARGET</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Target defense evaluation preview */}
          {activeTarget && (
            <div className="mt-4 pt-3 border-t border-zinc-800 text-xs">
              <div className="flex items-center justify-between text-zinc-400 font-mono">
                <span>Calculated Defense:</span>
                <span className="text-white font-bold">
                  {isEvaluatingDefense ? (
                    <span className="animate-pulse">Computing...</span>
                  ) : defenseScore !== null ? (
                    defenseScore.toFixed(1)
                  ) : (
                    "N/A"
                  )}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1">
                Weighted against target&apos;s Security, Adoption, and Decentralization.
              </p>
            </div>
          )}
        </div>

        {/* Step 2: Attack Category & Intensity */}
        <div className="lg:col-span-2 space-y-4">
          <div>
            <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">
              2. Attack Vector Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
              {ATTACK_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`text-left p-2.5 rounded-xl border transition ${
                      isSelected
                        ? "bg-rose-500/15 border-rose-500/70 text-white ring-1 ring-rose-500/40"
                        : "bg-zinc-950/60 border-zinc-800/80 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-xs font-semibold">{cat.name}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400 truncate mt-0.5">{cat.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">
              3. Strike Intensity & Scale
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {ATTACK_TYPES.map((t) => {
                const isSelected = selectedType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedType(t.id)}
                    className={`p-2.5 text-left rounded-xl border transition ${
                      isSelected
                        ? "bg-zinc-950 border-rose-500 text-white ring-1 ring-rose-500/40"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="text-xs font-bold text-white">{t.label}</div>
                    <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-1">
                      <span>{t.strengthHint}</span>
                      <span className="text-amber-400">{t.costHint}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Action and feedback */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
        <div className="text-xs text-zinc-400 font-mono">
          Attacking: <span className="text-rose-400 font-bold">{activeTarget || "No Target"}</span> &bull; Vector:{" "}
          <span className="text-zinc-200">{selectedCategory}</span> ({selectedType})
        </div>

        <button
          onClick={handleLaunchAttack}
          disabled={isStriking || !activeTarget}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-rose-950/50 transition-all flex items-center justify-center gap-2"
        >
          {isStriking ? (
            <>
              <span className="animate-spin text-sm">↻</span>
              <span>Deploying Vector...</span>
            </>
          ) : (
            <>
              <span>🚀</span>
              <span>{isCounterattack ? "Commit Counterattack" : "Commit Strategic Attack"}</span>
            </>
          )}
        </button>
      </div>

      {strikeResult && (
        <div
          className={`mt-4 p-4 rounded-xl text-xs font-mono border flex items-center gap-3 ${
            strikeResult.isSuccess
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span className="text-xl">{strikeResult.isSuccess ? "💥" : "🛡️"}</span>
          <span>{strikeResult.text}</span>
        </div>
      )}
    </div>
  );
}
