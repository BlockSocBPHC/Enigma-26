"use client";

import React from "react";
import { TeamScore } from "@/app/lib/types";

interface TeamStatsCardProps {
  teamName: string;
  score: TeamScore | null;
  loading?: boolean;
}

interface StatMetric {
  name: string;
  value: number;
  max: number;
  color: string;
  barColor: string;
  icon: string;
  description: string;
}

export default function TeamStatsCard({ teamName, score, loading }: TeamStatsCardProps) {
  if (loading || !score) {
    return (
      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 animate-pulse">
        <div className="h-6 w-48 bg-zinc-800 rounded mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-zinc-800/60 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const metrics: StatMetric[] = [
    {
      name: "Adoption",
      value: score.adoption ?? 0,
      max: 100,
      color: "text-cyan-400",
      barColor: "bg-cyan-500",
      icon: "👥",
      description: "User network adoption & activity",
    },
    {
      name: "Security",
      value: score.security ?? 0,
      max: 100,
      color: "text-emerald-400",
      barColor: "bg-emerald-500",
      icon: "🛡️",
      description: "Cryptographic defense & audit integrity",
    },
    {
      name: "Decentralization",
      value: score.decentralization ?? 0,
      max: 100,
      color: "text-purple-400",
      barColor: "bg-purple-500",
      icon: "🌐",
      description: "Validator distribution & consensus",
    },
    {
      name: "Treasury",
      value: score.treasury ?? 0,
      max: 1000,
      color: "text-amber-400",
      barColor: "bg-amber-500",
      icon: "💰",
      description: "Protocol reserve budget for attacks & rebuilds",
    },
    {
      name: "Stability",
      value: score.stability ?? 0,
      max: 100,
      color: "text-blue-400",
      barColor: "bg-blue-500",
      icon: "⚖️",
      description: "Economic equilibrium & low volatility",
    },
  ];

  // Final score calculated or passed
  const calculatedFinal =
    (0.3 * (score.adoption || 0) +
      0.3 * (score.security || 0) +
      0.2 * (score.treasury || 0) +
      0.2 * (score.stability || 0)).toFixed(1);

  return (
    <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 md:p-6 shadow-xl relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-2xl shadow-inner">
            ⛓️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono text-indigo-400 font-semibold tracking-wider">
                Active Protocol
              </span>
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide">
              {teamName}
            </h1>
          </div>
        </div>

        {/* Composite Score Pill */}
        <div className="bg-zinc-950/80 border border-indigo-500/30 px-4 py-2.5 rounded-xl flex items-center gap-3 shadow-lg">
          <div className="text-right">
            <span className="text-[10px] uppercase font-mono text-zinc-400 tracking-wider block">
              Overall Score
            </span>
            <span className="text-2xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              {calculatedFinal}
            </span>
          </div>
          <div className="h-8 w-px bg-zinc-800" />
          <div className="text-xs font-mono text-zinc-400">
            <div>30% Adp / Sec</div>
            <div>20% Trs / Stb</div>
          </div>
        </div>
      </div>

      {/* 5 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {metrics.map((m) => {
          const percentage = Math.min(100, Math.max(0, (m.value / m.max) * 100));
          return (
            <div
              key={m.name}
              className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 hover:border-zinc-700 transition flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-zinc-300 flex items-center gap-1.5">
                  <span>{m.icon}</span>
                  {m.name}
                </span>
                <span className={`font-mono font-bold text-lg ${m.color}`}>
                  {m.value}
                </span>
              </div>

              {/* Meter bar */}
              <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${m.barColor}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>

              <div className="text-[11px] text-zinc-400 truncate" title={m.description}>
                {m.description}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
