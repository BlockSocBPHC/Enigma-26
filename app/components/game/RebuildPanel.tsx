"use client";

import React, { useState } from "react";
import { RebuildType, TeamScore } from "@/app/lib/types";
import { applyRebuildAction } from "@/app/actions/game";

interface RebuildPanelProps {
  teamName: string;
  onScoreUpdated: (newScore: TeamScore) => void;
  isActivePhase: boolean;
}

const REBUILD_ACTIONS: {
  id: RebuildType;
  title: string;
  icon: string;
  benefit: string;
  description: string;
}[] = [
  {
    id: "Emergency Recovery",
    title: "Emergency Recovery",
    icon: "🚨",
    benefit: "Restores critical protocol stability and security",
    description: "Emergency hard-fork or patch to triage compromised infrastructure following attacks.",
  },
  {
    id: "Marketing Campaign",
    title: "Marketing Campaign",
    icon: "📣",
    benefit: "Accelerates user adoption and public ecosystem trust",
    description: "Global hackathons, developer grants, and public relations to restore user confidence.",
  },
  {
    id: "Security Recovery",
    title: "Security Recovery",
    icon: "🔐",
    benefit: "Deep auditing and zero-day patch deployments",
    description: "Contract re-audits, white-hat bounty rewards, and multi-sig key ceremony upgrades.",
  },
  {
    id: "Validator Recruitment",
    title: "Validator Recruitment",
    icon: "🛡️",
    benefit: "Expands validator pool & boosts decentralization",
    description: "Incentivized testnet and staking grants to onboard geographically distributed node runners.",
  },
];

export default function RebuildPanel({ teamName, onScoreUpdated, isActivePhase }: RebuildPanelProps) {
  const [selectedAction, setSelectedAction] = useState<RebuildType>("Emergency Recovery");
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [resultMessage, setResultMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleExecute = async () => {
    setIsExecuting(true);
    setResultMessage(null);

    const res = await applyRebuildAction(teamName, selectedAction);
    setIsExecuting(false);

    if (res.success && res.data) {
      onScoreUpdated(res.data);
      setResultMessage({ text: res.message || "Rebuild protocol executed successfully!" });
    } else {
      setResultMessage({ text: res.message || "Rebuild execution failed", isError: true });
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 md:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🛠️</span> Recovery & Upgrade Choices
            </h3>
            {isActivePhase ? (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Active Phase Window
              </span>
            ) : (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Standby Mode
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Respond to the attack phase by balancing growth, security, decentralization, and treasury reserves.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-6">
        {REBUILD_ACTIONS.map((action) => {
          const isSelected = selectedAction === action.id;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => setSelectedAction(action.id)}
              className={`text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? "bg-amber-500/15 border-amber-500/80 ring-1 ring-amber-500/40"
                  : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{action.icon}</span>
                  <span className="font-bold text-white text-sm md:text-base">{action.title}</span>
                </div>
                {isSelected && (
                  <span className="text-amber-400 text-xs font-mono font-semibold">SELECTED</span>
                )}
              </div>
              <p className="text-xs text-zinc-400 mb-2">{action.description}</p>
              <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <span>✦</span>
                <span>{action.benefit}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action footer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
        <div className="text-xs text-zinc-400 font-mono">
          Protocol: <span className="text-zinc-200">{teamName}</span> &bull; Directive:{" "}
          <span className="text-amber-400 font-semibold">{selectedAction}</span>
        </div>

        <button
          onClick={handleExecute}
          disabled={isExecuting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 disabled:opacity-50 text-zinc-950 font-bold text-sm shadow-lg shadow-amber-950/50 transition-all flex items-center justify-center gap-2"
        >
          {isExecuting ? (
            <>
              <span className="animate-spin text-sm">↻</span>
              <span>Rebuilding Network...</span>
            </>
          ) : (
            <>
              <span>🛠️</span>
              <span>Execute Rebuild Operation</span>
            </>
          )}
        </button>
      </div>

      {resultMessage && (
        <div
          className={`mt-4 p-3 rounded-xl text-xs font-mono border ${
            resultMessage.isError
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          {resultMessage.text}
        </div>
      )}
    </div>
  );
}
