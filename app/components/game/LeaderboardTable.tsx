"use client";

import React, { useEffect, useState } from "react";
import { Leaderboard } from "@/app/lib/types";
import { createClient } from "@/utils/supabase/client";
import { fetchLeaderboardAction } from "@/app/actions/game";

interface LeaderboardTableProps {
  initialLeaderboard: Leaderboard[];
  activeTeamName: string;
  onSelectTeam?: (name: string) => void;
}

export default function LeaderboardTable({
  initialLeaderboard,
  activeTeamName,
  onSelectTeam,
}: LeaderboardTableProps) {
  const [leaderboard, setLeaderboard] = useState<Leaderboard[]>(initialLeaderboard);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Compute final score for sorting
  const sorted = [...leaderboard].sort((a, b) => {
    const scoreA = 0.3 * a.adoption + 0.3 * a.security + 0.2 * a.treasury + 0.2 * a.stability;
    const scoreB = 0.3 * b.adoption + 0.3 * b.security + 0.2 * b.treasury + 0.2 * b.stability;
    return scoreB - scoreA;
  });

  const refreshLeaderboard = async () => {
    setIsRefreshing(true);
    const res = await fetchLeaderboardAction();
    if (res.success && res.data) {
      setLeaderboard(res.data);
    }
    setIsRefreshing(false);
  };

  // Realtime Supabase subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("teams_realtime_leaderboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "teams",
        },
        () => {
          refreshLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-xl p-5 md:p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span>🏆</span> Network Consensus Leaderboard
            </h3>
            <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Realtime
            </span>
          </div>
          <p className="text-xs md:text-sm text-zinc-400 mt-1">
            Global protocol rankings. Scores auto-update as attacks, upgrades, and macro events occur.
          </p>
        </div>

        <button
          onClick={refreshLeaderboard}
          disabled={isRefreshing}
          className="px-3.5 py-1.5 rounded-xl bg-zinc-800/90 hover:bg-zinc-700 text-xs font-mono text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
        >
          <span className={isRefreshing ? "animate-spin" : ""}>↻</span>
          <span>Refresh Table</span>
        </button>
      </div>

      {/* Table container */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800/80">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-950/80 uppercase font-mono text-zinc-400 border-b border-zinc-800">
            <tr>
              <th className="py-3 px-4 text-center w-16">Rank</th>
              <th className="py-3 px-4">Protocol Name</th>
              <th className="py-3 px-4 text-right">Adoption</th>
              <th className="py-3 px-4 text-right">Security</th>
              <th className="py-3 px-4 text-right">Treasury</th>
              <th className="py-3 px-4 text-right">Decentralization</th>
              <th className="py-3 px-4 text-right">Stability</th>
              <th className="py-3 px-4 text-right font-bold text-indigo-400">Final Score</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40 font-mono">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-400 italic">
                  No protocols found on the network.
                </td>
              </tr>
            ) : (
              sorted.map((team, idx) => {
                const isSelf = team.name === activeTeamName;
                const finalScore = (
                  0.3 * team.adoption +
                  0.3 * team.security +
                  0.2 * team.treasury +
                  0.2 * team.stability
                ).toFixed(1);

                return (
                  <tr
                    key={team.name}
                    onClick={() => onSelectTeam && onSelectTeam(team.name)}
                    className={`transition cursor-pointer ${
                      isSelf
                        ? "bg-indigo-950/30 hover:bg-indigo-950/50 text-white font-semibold"
                        : "hover:bg-zinc-800/40 text-zinc-300"
                    }`}
                  >
                    <td className="py-3 px-4 text-center">
                      {idx === 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          🥇 #1
                        </span>
                      ) : idx === 1 ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-zinc-400/20 text-zinc-200 border border-zinc-400/40 font-bold">
                          🥈 #2
                        </span>
                      ) : idx === 2 ? (
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-700/20 text-amber-500 border border-amber-700/40 font-bold">
                          🥉 #3
                        </span>
                      ) : (
                        <span className="text-zinc-400">#{idx + 1}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-sans font-bold flex items-center gap-2">
                      <span>{team.name}</span>
                      {isSelf && (
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          YOU
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right text-cyan-400">{team.adoption}</td>
                    <td className="py-3 px-4 text-right text-emerald-400">{team.security}</td>
                    <td className="py-3 px-4 text-right text-amber-400">{team.treasury}</td>
                    <td className="py-3 px-4 text-right text-purple-400">
                      {team.decentralization}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-400">{team.stability}</td>
                    <td className="py-3 px-4 text-right font-extrabold text-white text-sm">
                      {finalScore}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
