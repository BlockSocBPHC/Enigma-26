"use client";

import React, { useState } from "react";
import { upgradeOptions, upgradeTypes, TeamScore } from "@/app/lib/types";
import { applyUpgradeAction } from "@/app/actions/game";

interface UpgradePanelProps {
  teamName: string;
  onScoreUpdated: (newScore: TeamScore) => void;
  isActivePhase: boolean;
}

const UPGRADE_OPTIONS: {
  id: upgradeOptions;
  title: string;
  icon: string;
  description: string;
}[] = [
  {
    id: "Transaction Fees",
    title: "Transaction Fees",
    icon: "💸",
    description: "Optimize fee mechanisms to balance network adoption and validator revenues.",
  },
  {
    id: "Security Budget",
    title: "Security Budget",
    icon: "🛡️",
    description: "Allocate treasury into smart contract auditing, bug bounties, and defense tooling.",
  },
  {
    id: "Validator Rewards",
    title: "Validator Rewards",
    icon: "⚡",
    description: "Adjust staking yield and epoch payouts to attract decentralized node operators.",
  },
];

const UPGRADE_TYPES: { id: upgradeTypes; label: string; tag: string; color: string }[] = [
  { id: "Low", label: "Conservative (Low)", tag: "Low Cost", color: "border-emerald-500/40 text-emerald-400" },
  { id: "Medium", label: "Moderate (Medium)", tag: "Balanced", color: "border-amber-500/40 text-amber-400" },
  { id: "High", label: "Aggressive (High)", tag: "High Impact", color: "border-rose-500/40 text-rose-400" },
];

export default function UpgradePanel({ teamName, onScoreUpdated, isActivePhase }: UpgradePanelProps) {
  const [selectedOption, setSelectedOption] = useState<upgradeOptions>("Transaction Fees");
  const [selectedType, setSelectedType] = useState<upgradeTypes>("Medium");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleUpgrade = async () => {
    setIsSubmitting(true);
    setStatusMessage(null);

    const res = await applyUpgradeAction(teamName, selectedOption, selectedType);
    setIsSubmitting(false);

    if (res.success && res.data) {
      onScoreUpdated(res.data);
      setStatusMessage({ text: res.message || "Upgrade applied successfully!" });
    } else {
      setStatusMessage({ text: res.message || "Failed to apply upgrade", isError: true });
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 md:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>⚡</span> Launch Strategy
            </h3>
            {isActivePhase ? (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                Active Phase Window
              </span>
            ) : (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Off-Cycle Tuning
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Choose the three founding decisions that trade growth, security, decentralization, and treasury against one another.
          </p>
        </div>
      </div>

      {/* Category selection */}
      <div className="mb-6">
        <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">
          1. Set Your Blockchain Parameters
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {UPGRADE_OPTIONS.map((opt) => {
            const isSelected = selectedOption === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setSelectedOption(opt.id)}
                type="button"
                className={`text-left p-4 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? "bg-indigo-600/15 border-indigo-500/80 ring-1 ring-indigo-500/50"
                    : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`font-semibold text-sm ${isSelected ? "text-indigo-300" : "text-white"}`}>
                    {opt.title}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 line-clamp-2">{opt.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Intensity Level Selection */}
      <div className="mb-6">
        <label className="block text-xs uppercase font-mono text-zinc-400 mb-2">
          2. Choose an Intensity
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {UPGRADE_TYPES.map((t) => {
            const isSelected = selectedType === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                type="button"
                className={`text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-zinc-950 border-white/60 ring-1 ring-white/30"
                    : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">{t.label}</span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${t.color}`}>
                    {t.tag}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Action and feedback */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-zinc-800/80">
        <div className="text-xs text-zinc-400 font-mono">
          Protocol: <span className="text-zinc-200">{teamName}</span> &bull; Decision:{" "}
          <span className="text-indigo-300 font-semibold">{selectedOption}</span> ({selectedType})
        </div>

        <button
          onClick={handleUpgrade}
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:opacity-50 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 transition-all flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="animate-spin text-sm">↻</span>
              <span>Applying Upgrade...</span>
            </>
          ) : (
            <>
              <span>⚡</span>
              <span>Launch Blockchain Strategy</span>
            </>
          )}
        </button>
      </div>

      {statusMessage && (
        <div
          className={`mt-4 p-3 rounded-xl text-xs font-mono border ${
            statusMessage.isError
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          {statusMessage.text}
        </div>
      )}
    </div>
  );
}
