"use client";

import React, { useEffect, useState } from "react";

export type GamePhase = "UPGRADE" | "ATTACK" | "REBUILD" | "COUNTERATTACK" | "EVENT";

interface PhaseConfig {
  id: GamePhase;
  label: string;
  tag: string;
  color: string;
  badgeBg: string;
  borderColor: string;
  description: string;
}

export const PHASES: PhaseConfig[] = [
  {
    id: "UPGRADE",
    label: "Launch Your Blockchain",
    tag: "Round 1 / 5",
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400",
    borderColor: "border-emerald-500/40",
    description: "Set transaction fees, security budget, and validator rewards before the competition begins.",
  },
  {
    id: "ATTACK",
    label: "Attack Phase",
    tag: "Round 2 / 5",
    color: "text-rose-400",
    badgeBg: "bg-rose-500/10 border-rose-500/30 text-rose-400",
    borderColor: "border-rose-500/40",
    description: "Use public metrics to target a competing blockchain's strategic weakness.",
  },
  {
    id: "REBUILD",
    label: "Recovery & Upgrade",
    tag: "Round 3 / 5",
    color: "text-amber-400",
    badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-400",
    borderColor: "border-amber-500/40",
    description: "Balance growth, security, decentralization, and treasury after the first attack phase.",
  },
  {
    id: "COUNTERATTACK",
    label: "Counterattack Phase",
    tag: "Round 4 / 5",
    color: "text-orange-300",
    badgeBg: "bg-orange-500/10 border-orange-500/30 text-orange-300",
    borderColor: "border-orange-500/40",
    description: "Reassess the board after recovery actions, then make one final strategic attack.",
  },
  {
    id: "EVENT",
    label: "Global Market Event",
    tag: "Round 5 / 5",
    color: "text-purple-400",
    badgeBg: "bg-purple-500/10 border-purple-500/30 text-purple-400",
    borderColor: "border-purple-500/40",
    description: "Respond to a shared market event that changes every blockchain's economic conditions.",
  },
];

const PHASE_DURATION_SECONDS = 600; // 10 minutes

interface PhaseTimerHUDProps {
  currentPhase: GamePhase;
  onPhaseChange: (newPhase: GamePhase) => void;
}

export default function PhaseTimerHUD({ currentPhase, onPhaseChange }: PhaseTimerHUDProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(PHASE_DURATION_SECONDS);
  const [isDevControlsOpen, setIsDevControlsOpen] = useState<boolean>(false);

  // Active phase index
  const activeIndex = PHASES.findIndex((p) => p.id === currentPhase);
  const activePhase = PHASES[activeIndex] || PHASES[0];
  const nextPhase = PHASES[(activeIndex + 1) % PHASES.length];

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          // Transition to next phase
          const nextIdx = (activeIndex + 1) % PHASES.length;
          onPhaseChange(PHASES[nextIdx].id);
          return PHASE_DURATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeIndex, onPhaseChange]);

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const progressPercent = ((PHASE_DURATION_SECONDS - secondsRemaining) / PHASE_DURATION_SECONDS) * 100;

  // Dev skip controls
  const handleSkipPhase = () => {
    const nextIdx = (activeIndex + 1) % PHASES.length;
    onPhaseChange(PHASES[nextIdx].id);
    setSecondsRemaining(PHASE_DURATION_SECONDS);
  };

  const handleResetTimer = () => {
    setSecondsRemaining(PHASE_DURATION_SECONDS);
  };

  const handleFastForward = (secs: number) => {
    setSecondsRemaining((prev) => Math.max(5, prev - secs));
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-xl p-4 md:p-6 shadow-2xl relative overflow-hidden">
      {/* Background glow according to phase */}
      <div
        className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none transition-all duration-700 ${
          currentPhase === "UPGRADE"
            ? "bg-emerald-500"
            : currentPhase === "ATTACK"
            ? "bg-rose-500"
            : currentPhase === "REBUILD"
            ? "bg-amber-500"
            : currentPhase === "COUNTERATTACK"
            ? "bg-orange-500"
            : "bg-purple-500"
        }`}
      />

      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Current phase info */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg border shadow-inner ${activePhase.badgeBg}`}
          >
            {activeIndex + 1}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs uppercase font-mono tracking-wider px-2 py-0.5 rounded border ${activePhase.badgeBg}`}>
                {activePhase.tag}
              </span>
              <span className="text-xs text-zinc-400">10-Min Round</span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-wide mt-1">
              {activePhase.label}
            </h2>
            <p className="text-xs md:text-sm text-zinc-400 max-w-md mt-0.5">
              {activePhase.description}
            </p>
          </div>
        </div>

        {/* Phase Clock & Progress */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          {/* Digital Timer Clock */}
          <div className="flex items-center gap-3 bg-zinc-950/80 px-5 py-3 rounded-xl border border-zinc-800 shadow-inner">
            <div className="relative flex h-3 w-3">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  secondsRemaining < 60 ? "bg-rose-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3 w-3 ${
                  secondsRemaining < 60 ? "bg-rose-500" : "bg-emerald-500"
                }`}
              />
            </div>
            <div>
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
                Time Remaining
              </div>
              <div
                className={`text-2xl md:text-3xl font-mono font-extrabold tracking-widest ${
                  secondsRemaining < 60 ? "text-rose-400 animate-pulse" : "text-zinc-100"
                }`}
              >
                {formattedTime}
              </div>
            </div>
          </div>

          {/* Dev / Fast-Forward controls toggle */}
          <div className="flex flex-col gap-1 text-right">
            <button
              onClick={() => setIsDevControlsOpen((prev) => !prev)}
              className="text-xs font-mono text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700 transition"
              title="Test controls to skip or advance 10m timer"
            >
              {isDevControlsOpen ? "Hide Fast-Forward" : "⚡ Timer Controls"}
            </button>
            <span className="text-[11px] text-zinc-400">
              Next: <span className="text-zinc-300 font-medium">{nextPhase.label}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4 pt-3 border-t border-zinc-800/60">
        <div className="flex items-center justify-between text-xs text-zinc-400 font-mono mb-1.5">
          <span>Phase Progress</span>
          <span>{Math.round(progressPercent)}% elapsed</span>
        </div>
        <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800/80">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              currentPhase === "UPGRADE"
                ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                : currentPhase === "ATTACK"
                ? "bg-gradient-to-r from-rose-600 to-rose-400"
                : currentPhase === "REBUILD"
                ? "bg-gradient-to-r from-amber-600 to-amber-400"
                : currentPhase === "COUNTERATTACK"
                ? "bg-gradient-to-r from-orange-600 to-orange-400"
                : "bg-gradient-to-r from-purple-600 to-purple-400"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Dev Fast-Forward Bar */}
      {isDevControlsOpen && (
        <div className="mt-3 p-3 bg-zinc-950/90 rounded-xl border border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-zinc-400 font-mono">⚡ Demo Phase Override:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleFastForward(60)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition font-mono"
            >
              -1 min
            </button>
            <button
              onClick={() => handleFastForward(300)}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition font-mono"
            >
              -5 min
            </button>
            <button
              onClick={handleResetTimer}
              className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition font-mono"
            >
              Reset 10m
            </button>
            <button
              onClick={handleSkipPhase}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition shadow"
            >
              Next Phase &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
