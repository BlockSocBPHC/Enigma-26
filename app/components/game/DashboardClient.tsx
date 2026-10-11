"use client";

import React, { useState, useEffect } from "react";
import { Leaderboard, TeamScore } from "@/app/lib/types";
import Navbar from "./Navbar";
import PhaseTimerHUD, { GamePhase } from "./PhaseTimerHUD";
import TeamStatsCard from "./TeamStatsCard";
import UpgradePanel from "./UpgradePanel";
import AttackPanel from "./AttackPanel";
import RebuildPanel from "./RebuildPanel";
import GlobalEventPanel from "./GlobalEventPanel";
import LeaderboardTable from "./LeaderboardTable";
import { fetchTeamScoreAction } from "@/app/actions/game";

interface DashboardClientProps {
  userEmail?: string | null;
  initialLeaderboard: Leaderboard[];
  initialActiveTeam: string;
  initialTeamScore: TeamScore | null;
}

type TabType = GamePhase | "LEADERBOARD";

export default function DashboardClient({
  userEmail,
  initialLeaderboard,
  initialActiveTeam,
  initialTeamScore,
}: DashboardClientProps) {
  // Current active team
  const [activeTeamName, setActiveTeamName] = useState<string>(initialActiveTeam);
  const [teamScore, setTeamScore] = useState<TeamScore | null>(initialTeamScore);
  const [loadingScore, setLoadingScore] = useState<boolean>(false);

  // Current round in the five-round strategy game
  const [currentPhase, setCurrentPhase] = useState<GamePhase>("UPGRADE");
  // Active UI tab
  const [activeTab, setActiveTab] = useState<TabType>("UPGRADE");

  const allTeamNames = initialLeaderboard.map((t) => t.name);

  // Fetch updated team score when team selection changes
  useEffect(() => {
    let active = true;
    const loadScore = async () => {
      setLoadingScore(true);
      const res = await fetchTeamScoreAction(activeTeamName);
      if (active && res.success && res.data) {
        setTeamScore(res.data);
      }
      if (active) setLoadingScore(false);
    };

    loadScore();
    return () => {
      active = false;
    };
  }, [activeTeamName]);

  // When timer switches 10m phase, align the active tab to the new phase
  const handlePhaseChange = (newPhase: GamePhase) => {
    setCurrentPhase(newPhase);
    setActiveTab(newPhase);
  };

  const handleScoreUpdated = (newScore: TeamScore) => {
    setTeamScore(newScore);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        userEmail={userEmail}
        activeTeamName={activeTeamName}
        allTeamNames={allTeamNames}
        onSelectTeam={(name) => setActiveTeamName(name)}
      />

      {/* Main Game Arena */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Five-round strategy HUD */}
        <PhaseTimerHUD currentPhase={currentPhase} onPhaseChange={handlePhaseChange} />

        {/* Team Score Card */}
        <TeamStatsCard teamName={activeTeamName} score={teamScore} loading={loadingScore} />

        {/* Phase Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/80 pb-3">
          <button
            onClick={() => setActiveTab("UPGRADE")}
            type="button"
            className={`px-4 py-2 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center gap-2 ${
              activeTab === "UPGRADE"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/40"
                : "bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span>⚡</span>
            <span>1. Launch strategy</span>
            {currentPhase === "UPGRADE" && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("ATTACK")}
            type="button"
            className={`px-4 py-2 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center gap-2 ${
              activeTab === "ATTACK"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-lg shadow-rose-950/40"
                : "bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span>⚔️</span>
            <span>2. Attack phase</span>
            {currentPhase === "ATTACK" && (
              <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("REBUILD")}
            type="button"
            className={`px-4 py-2 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center gap-2 ${
              activeTab === "REBUILD"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-950/40"
                : "bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span>🛠️</span>
            <span>3. Recovery</span>
            {currentPhase === "REBUILD" && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("COUNTERATTACK")}
            type="button"
            className={`px-4 py-2 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center gap-2 ${
              activeTab === "COUNTERATTACK"
                ? "bg-orange-500/20 text-orange-200 border border-orange-500/40 shadow-lg shadow-orange-950/40"
                : "bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span>↻</span>
            <span>4. Counterattack</span>
            {currentPhase === "COUNTERATTACK" && (
              <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("EVENT")}
            type="button"
            className={`px-4 py-2 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center gap-2 ${
              activeTab === "EVENT"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-950/40"
                : "bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <span>🌐</span>
            <span>5. Market event</span>
            {currentPhase === "EVENT" && (
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            )}
          </button>

          <div className="ml-auto">
            <button
              onClick={() => setActiveTab("LEADERBOARD")}
              type="button"
              className={`px-4 py-2 rounded-xl font-semibold text-xs md:text-sm transition-all flex items-center gap-2 ${
                activeTab === "LEADERBOARD"
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-lg shadow-indigo-950/40"
                  : "bg-zinc-900/60 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
              }`}
            >
              <span>🏆</span>
              <span>Leaderboard</span>
            </button>
          </div>
        </div>

        {/* Tab Content Panels */}
        <div className="transition-all duration-300">
          {activeTab === "UPGRADE" && (
            <UpgradePanel
              teamName={activeTeamName}
              onScoreUpdated={handleScoreUpdated}
              isActivePhase={currentPhase === "UPGRADE"}
            />
          )}

          {activeTab === "ATTACK" && (
            <AttackPanel
              attackingTeam={activeTeamName}
              allTeams={initialLeaderboard}
              onScoreUpdated={handleScoreUpdated}
              isActivePhase={currentPhase === "ATTACK"}
            />
          )}

          {activeTab === "REBUILD" && (
            <RebuildPanel
              teamName={activeTeamName}
              onScoreUpdated={handleScoreUpdated}
              isActivePhase={currentPhase === "REBUILD"}
            />
          )}

          {activeTab === "COUNTERATTACK" && (
            <AttackPanel
              attackingTeam={activeTeamName}
              allTeams={initialLeaderboard}
              onScoreUpdated={handleScoreUpdated}
              isActivePhase={currentPhase === "COUNTERATTACK"}
              mode="counterattack"
            />
          )}

          {activeTab === "EVENT" && (
            <GlobalEventPanel
              teamName={activeTeamName}
              onScoreUpdated={handleScoreUpdated}
              isActivePhase={currentPhase === "EVENT"}
            />
          )}

          {activeTab === "LEADERBOARD" && (
            <LeaderboardTable
              initialLeaderboard={initialLeaderboard}
              activeTeamName={activeTeamName}
              onSelectTeam={(name) => {
                setActiveTeamName(name);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
