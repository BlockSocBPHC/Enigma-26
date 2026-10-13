"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/app/components/navbar";
import { createClient } from "@/utils/supabase/client";
import type { Leaderboard, TeamDetails } from "@/app/lib/types";

function cx(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}

type SortField = "name" | "adoption" | "security" | "decentralization" | "treasury" | "stability";

export default function ScoreboardView({
  team,
  userEmail,
  leaderboard,
  currentRound,
}: {
  team: TeamDetails;
  userEmail: string;
  leaderboard: Leaderboard[];
  currentRound: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
  }

  const userStats = useMemo(() => {
    return leaderboard.find((row) => row.name.toLowerCase() === team.teamName.toLowerCase());
  }, [leaderboard, team.teamName]);

  const filteredAndSortedRows = useMemo(() => {
    const list = leaderboard.filter((r) =>
      r.name.toLowerCase().includes(search.trim().toLowerCase())
    );

    list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "adoption":
          comparison = a.adoption - b.adoption;
          break;
        case "security":
          comparison = a.security - b.security;
          break;
        case "decentralization":
          comparison = a.decentralization - b.decentralization;
          break;
        case "treasury":
          comparison = a.treasury - b.treasury;
          break;
        case "stability":
          comparison = a.stability - b.stability;
          break;
      }
      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [leaderboard, search, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === "name");
    }
  };

  return (
    <main className="min-h-screen bg-[#030604] bg-[radial-gradient(1100px_650px_at_50%_-10%,#0b2a14,transparent_62%)] text-[#f3fff0]">
      <Navbar
        teamName={team.teamName}
        teamMembers={team.teamMembers}
        userEmail={userEmail}
        roundNumber={currentRound}
        roundName="Standings"
        links={[
          { id: "/dashboard", label: "Dashboard" },
          { id: "/scoreboard", label: "Scoreboard" },
          { id: "/rulebook", label: "Rulebook" },
        ]}
        onSignOut={() => { void signOut(); }}
      />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Header Section */}
        <header className="rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#2cff5e]/30 bg-[#2cff5e]/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#a8f27a]">
                <span className="h-2 w-2 rounded-full bg-[#2cff5e] animate-pulse" />
                Live Standings
              </div>
              <h1 className="mt-3 text-3xl font-black sm:text-5xl">Network Scoreboard</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#a8c7ac]">
                Live network telemetry across all teams. Track individual growth, defense, decentralization, treasury resources, and network stability.
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

        {/* User Team Banner */}
        {userStats && (
          <section className="mt-6 rounded-2xl border border-[#2cff5e]/30 bg-[rgba(14,58,26,0.35)] p-5 sm:p-6 backdrop-blur-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2cff5e]/40 bg-[#2cff5e]/20 text-xl font-black text-[#2cff5e]">
                  🛡
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#a8f27a]">Your Network</p>
                  <h2 className="text-2xl font-extrabold">{team.teamName}</h2>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <span className="block text-xs uppercase text-[#8fae93]">Adoption</span>
                  <span className="text-xl font-bold text-[#f3fff0]">{userStats.adoption}</span>
                </div>
                <div className="border-l border-white/10 pl-6">
                  <span className="block text-xs uppercase text-[#8fae93]">Security</span>
                  <span className="text-xl font-bold text-[#f3fff0]">{userStats.security}</span>
                </div>
                <div className="border-l border-white/10 pl-6">
                  <span className="block text-xs uppercase text-[#8fae93]">Decentralization</span>
                  <span className="text-xl font-bold text-[#f3fff0]">{userStats.decentralization}</span>
                </div>
                <div className="border-l border-white/10 pl-6">
                  <span className="block text-xs uppercase text-[#8fae93]">Treasury</span>
                  <span className="text-xl font-bold text-[#f3fff0]">{userStats.treasury}</span>
                </div>
                <div className="border-l border-white/10 pl-6">
                  <span className="block text-xs uppercase text-[#8fae93]">Stability</span>
                  <span className="text-xl font-bold text-[#f3fff0]">{userStats.stability}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Filter and Table Controls */}
        <section className="mt-8 rounded-3xl border border-[#2cff5e]/20 bg-[rgba(7,17,10,0.85)] p-5 sm:p-7 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold">All Networks Metrics</h2>
              <p className="mt-1 text-xs text-[#8fae93]">Showing {filteredAndSortedRows.length} total participants</p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                placeholder="Search team name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-black/40 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:border-[#2cff5e] focus:outline-none"
              />
            </div>
          </div>

          {/* Scoreboard Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-white/15 text-[11px] font-bold uppercase tracking-wider text-[#a8f27a]">
                <tr>
                  <th className="px-4 py-3">#</th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-white"
                    onClick={() => handleSort("name")}
                  >
                    Team {sortField === "name" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-white"
                    onClick={() => handleSort("adoption")}
                  >
                    Adoption {sortField === "adoption" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-white"
                    onClick={() => handleSort("security")}
                  >
                    Security {sortField === "security" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-white"
                    onClick={() => handleSort("decentralization")}
                  >
                    Decentralization {sortField === "decentralization" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-white"
                    onClick={() => handleSort("treasury")}
                  >
                    Treasury {sortField === "treasury" && (sortAsc ? "▲" : "▼")}
                  </th>
                  <th
                    className="cursor-pointer px-4 py-3 hover:text-white"
                    onClick={() => handleSort("stability")}
                  >
                    Stability {sortField === "stability" && (sortAsc ? "▲" : "▼")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {filteredAndSortedRows.map((row, index) => {
                  const isUserTeam = row.name.toLowerCase() === team.teamName.toLowerCase();
                  return (
                    <tr
                      key={row.name}
                      className={cx(
                        "transition",
                        isUserTeam ? "bg-[#2cff5e]/10 font-semibold" : "hover:bg-white/[0.03]"
                      )}
                    >
                      <td className="px-4 py-4 font-bold text-[#a8f27a]">{index + 1}</td>
                      <td className="px-4 py-4 font-bold">
                        <span className="flex items-center gap-2">
                          {row.name}
                          {isUserTeam && (
                            <span className="rounded-full border border-[#2cff5e]/40 bg-[#2cff5e]/20 px-2 py-0.5 text-[10px] font-black uppercase text-[#a8f27a]">
                              You
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#d6ecd7]">{row.adoption}</td>
                      <td className="px-4 py-4 text-[#d6ecd7]">{row.security}</td>
                      <td className="px-4 py-4 text-[#d6ecd7]">{row.decentralization}</td>
                      <td className="px-4 py-4 text-[#d6ecd7]">{row.treasury}</td>
                      <td className="px-4 py-4 text-[#d6ecd7]">{row.stability}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
