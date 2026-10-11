"use client";

import React, { useState } from "react";
import { TeamScore, GlobalEventType } from "@/app/lib/types";
import { applyGlobalEventAction } from "@/app/actions/game";

interface GlobalEventPanelProps {
  teamName: string;
  onScoreUpdated: (newScore: TeamScore) => void;
  isActivePhase: boolean;
}

const POSSIBLE_EVENTS: { name: GlobalEventType; type: "bull" | "bear" | "neutral"; icon: string; impact: string }[] = [
  { name: "Bull Market", type: "bull", icon: "📈", impact: "Massive influx of capital & adoption surge across ecosystems" },
  { name: "AI Security Breakthrough", type: "bull", icon: "🤖", impact: "Automated auditing shields protocols from zero-day exploits" },
  { name: "Institutional Investment Wave", type: "bull", icon: "🏛️", impact: "Sovereign and enterprise funds pour into treasury reserves" },
  { name: "Major Exchange Listing", type: "bull", icon: "🚀", impact: "Tier-1 liquidity pairing expands global token circulation" },
  { name: "Open Source Contributor Boom", type: "bull", icon: "🧑‍💻", impact: "Developer talent accelerates protocol client diversity" },
  { name: "Security Grant", type: "bull", icon: "🛡️", impact: "Ecosystem foundation funds extensive consensus audits" },
  { name: "Validator Incentive Program", type: "bull", icon: "⚡", impact: "Higher staking participation decentralizes block production" },
  { name: "Market Crash", type: "bear", icon: "📉", impact: "Severe liquidity crunch and treasury asset devaluation" },
  { name: "Regulatory Crackdown", type: "bear", icon: "⚖️", impact: "Stricter compliance mandates dampens user adoption" },
  { name: "Coordinated Cyber Attack", type: "bear", icon: "👾", impact: "Cross-chain bridge and validator infrastructure under siege" },
];

export default function GlobalEventPanel({
  teamName,
  onScoreUpdated,
  isActivePhase,
}: GlobalEventPanelProps) {
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [eventResult, setEventResult] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleTriggerEvent = async () => {
    setIsTriggering(true);
    setEventResult(null);

    const res = await applyGlobalEventAction(teamName);
    setIsTriggering(false);

    if (res.success && res.data) {
      onScoreUpdated(res.data);
      setEventResult({ text: res.message || "Macro event materialized across the network!" });
    } else {
      setEventResult({ text: res.message || "Failed to trigger event", isError: true });
    }
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 md:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🌐</span> Global Macro Events
            </h3>
            {isActivePhase ? (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                Active Phase Window
              </span>
            ) : (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                Monitoring Horizon
              </span>
            )}
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Global economic shifts, regulatory rulings, and market cycles randomly alter protocol scores.
          </p>
        </div>
      </div>

      {/* Trigger Event Action Box */}
      <div className="p-5 rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-zinc-950 to-zinc-950 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h4 className="text-white font-bold text-base flex items-center gap-2">
            <span>⚡</span> Materialize Macro Event
          </h4>
          <p className="text-xs text-zinc-400 mt-1 max-w-xl">
            Simulate a sudden macro cycle shift. The event outcome is randomized from the 10 global event archetypes.
          </p>
        </div>

        <button
          onClick={handleTriggerEvent}
          disabled={isTriggering}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-purple-950/50 transition-all flex items-center gap-2 whitespace-nowrap"
        >
          {isTriggering ? (
            <>
              <span className="animate-spin text-sm">↻</span>
              <span>Processing Macro Event...</span>
            </>
          ) : (
            <>
              <span>🎲</span>
              <span>Trigger Global Shift</span>
            </>
          )}
        </button>
      </div>

      {eventResult && (
        <div
          className={`mb-6 p-4 rounded-xl text-xs font-mono border flex items-center gap-3 ${
            eventResult.isError
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-purple-500/10 border-purple-500/30 text-purple-300"
          }`}
        >
          <span className="text-xl">🌌</span>
          <span>{eventResult.text}</span>
        </div>
      )}

      {/* Matrix of possible events */}
      <div>
        <h4 className="text-xs uppercase font-mono text-zinc-400 mb-3">
          Potential Network Events in Rotation
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {POSSIBLE_EVENTS.map((ev) => (
            <div
              key={ev.name}
              className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{ev.icon}</span>
                  <span className="text-xs font-semibold text-zinc-200">{ev.name}</span>
                </div>
                <span
                  className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                    ev.type === "bull"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {ev.type === "bull" ? "+ Catalyst" : "- Hazard"}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">{ev.impact}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
