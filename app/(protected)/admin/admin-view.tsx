"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/app/components/navbar";
import {
  AdminTeamRow,
  adminLogoutAction,
  advanceRoundAction,
  endCompetitionAction,
  getAdminCompetitionData,
  resetCompetitionAction,
  restartTimerAction,
  setRoundAction,
  startCompetitionAction,
} from "./actions";
import {
  CompetitionState,
  formatSeconds,
  ROUND_DURATIONS,
} from "@/app/lib/competition-state";

export default function AdminView({
  initialState,
  initialTeams,
  userEmail,
}: {
  initialState: CompetitionState;
  initialTeams: AdminTeamRow[];
  userEmail: string;
}) {
  const router = useRouter();
  const [state, setState] = useState<CompetitionState>(initialState);
  const [teams, setTeams] = useState<AdminTeamRow[]>(initialTeams);
  const [isPending, startTransition] = useTransition();
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "error" } | null>(null);
  const [resetTeams, setResetTeams] = useState(false);

  // Derived synchronized clock using a 1-second tick
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (state.status !== "running") return;

    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [state.status]);

  const elapsed = Math.floor((now - state.startedAt) / 1000);
  const timeLeft = state.status === "running"
    ? Math.max(0, state.duration - elapsed)
    : state.status === "not_started"
    ? state.duration
    : 0;

  // Periodic poll to keep admin in sync with server every 4 seconds
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const fresh = await getAdminCompetitionData();
        setState(fresh.state);
        setTeams(fresh.teams);
      } catch {
        // ignore background poll error
      }
    }, 4000);

    return () => clearInterval(pollInterval);
  }, []);

  const runAction = (fn: () => Promise<CompetitionState>, successMessage: string) => {
    startTransition(async () => {
      try {
        const next = await fn();
        setState(next);
        const fresh = await getAdminCompetitionData();
        setTeams(fresh.teams);
        setNotice({ text: successMessage, tone: "success" });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Action failed";
        setNotice({ text: message, tone: "error" });
      }
    });
  };

  const roundProgress = state.duration > 0
    ? Math.max(0, Math.min(100, ((state.duration - timeLeft) / state.duration) * 100))
    : 0;

  return (
    <div className="min-h-screen bg-[#030805] text-[#f3fff0]">
      <Navbar
        teamName="Admin Panel"
        teamMembers={["Competition Organizer"]}
        userEmail={userEmail}
        roundNumber={state.currentRound}
        roundName={`Round ${state.currentRound}`}
        roundTimer={formatSeconds(timeLeft)}
      />

      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2cff5e]/30 bg-[#2cff5e]/10 px-3 py-1 text-xs font-bold text-[#a8f27a] mb-2">
              <span className="h-2 w-2 rounded-full bg-[#2cff5e] animate-pulse" />
              Centralized Competition Controller
            </div>
            <h1 className="text-3xl font-black uppercase tracking-wider text-white">
              Admin & Competition Management
            </h1>
            <p className="mt-1 text-sm text-[#8fae93]">
              Start rounds, synchronize the global clock, and control competition status for all teams.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-extrabold uppercase tracking-wider ${
                state.status === "running"
                  ? "border-[#2cff5e]/40 bg-[#2cff5e]/15 text-[#2cff5e]"
                  : state.status === "ended"
                  ? "border-red-500/40 bg-red-950/40 text-red-400"
                  : "border-amber-400/40 bg-amber-400/10 text-amber-300"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  state.status === "running"
                    ? "bg-[#2cff5e] animate-pulse"
                    : state.status === "ended"
                    ? "bg-red-400"
                    : "bg-amber-400"
                }`}
              />
              {state.status === "running" && `LIVE • ROUND ${state.currentRound}`}
              {state.status === "ended" && "COMPETITION OVER"}
              {state.status === "not_started" && "NOT STARTED (WAITING)"}
            </span>
            <button
              type="button"
              onClick={async () => {
                await adminLogoutAction();
                router.push("/admin/login");
                router.refresh();
              }}
              className="rounded-xl border border-white/20 bg-white/5 px-3.5 py-2 text-xs font-bold text-[#8fae93] hover:text-white hover:bg-white/10 transition"
            >
              Sign Out Admin
            </button>
          </div>
        </div>

        {notice && (
          <div
            className={`mt-6 rounded-xl border p-4 text-sm font-semibold flex items-center justify-between ${
              notice.tone === "success"
                ? "border-[#2cff5e]/40 bg-[#2cff5e]/10 text-[#a8f27a]"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            <span>{notice.text}</span>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Central Timer & Status Card */}
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#8fae93]">Centralized Clock</p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  Round {state.currentRound} Timer
                </h2>
              </div>
              <div className="font-mono text-4xl sm:text-5xl font-black tracking-tight text-[#2cff5e]">
                {formatSeconds(timeLeft)}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex justify-between text-xs font-semibold text-[#8fae93] mb-2">
                <span>Round Progress ({Math.round(roundProgress)}%)</span>
                <span>Duration: {Math.round(state.duration / 60)} minutes</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-[#2cff5e] transition-all duration-1000"
                  style={{ width: `${roundProgress}%` }}
                />
              </div>
            </div>

            {/* Round info badges */}
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                <p className="text-[10px] uppercase font-bold text-[#8fae93]">Status</p>
                <p className="mt-1 font-bold text-sm text-white capitalize">{state.status.replace("_", " ")}</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                <p className="text-[10px] uppercase font-bold text-[#8fae93]">Active Round</p>
                <p className="mt-1 font-bold text-sm text-[#a8f27a]">Round {state.currentRound} of 5</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                <p className="text-[10px] uppercase font-bold text-[#8fae93]">Total Teams</p>
                <p className="mt-1 font-bold text-sm text-white">{teams.length} Teams</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                <p className="text-[10px] uppercase font-bold text-[#8fae93]">Round Finished</p>
                <p className="mt-1 font-bold text-sm text-[#ff8080]">
                  {teams.filter((t) => t.round_completed >= state.currentRound).length} / {teams.length}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 flex flex-col justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#8fae93]">Primary Controls</p>
              <h3 className="mt-1 text-lg font-extrabold text-white">Competition Actions</h3>
              <p className="mt-2 text-xs text-[#a8c7ac]">
                All button actions immediately broadcast to every team dashboard.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {state.status === "not_started" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => startCompetitionAction(1), "Competition launched! Round 1 started.")}
                  className="w-full rounded-xl bg-gradient-to-r from-[#2cff5e] to-[#a8f27a] py-3.5 text-center text-sm font-black text-[#031006] hover:brightness-110 shadow-[0_0_20px_rgba(44,255,94,0.3)] transition disabled:opacity-50"
                >
                  {isPending ? "Starting…" : "▶ START COMPETITION (ROUND 1)"}
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isPending || state.status === "ended"}
                    onClick={() => runAction(advanceRoundAction, `Advanced to next round.`)}
                    className="rounded-xl bg-[#2cff5e]/20 border border-[#2cff5e]/40 py-3 text-xs font-bold text-[#a8f27a] hover:bg-[#2cff5e]/30 transition disabled:opacity-50"
                  >
                    ⏭ Next Round
                  </button>
                  <button
                    type="button"
                    disabled={isPending || state.status !== "running"}
                    onClick={() => runAction(restartTimerAction, "Current round clock restarted.")}
                    className="rounded-xl bg-amber-400/15 border border-amber-400/40 py-3 text-xs font-bold text-amber-300 hover:bg-amber-400/25 transition disabled:opacity-50"
                  >
                    ⏱ Reset Timer
                  </button>
                </div>
              )}

              {state.status !== "ended" ? (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(endCompetitionAction, "Competition marked as OVER.")}
                  className="w-full rounded-xl border border-red-500/50 bg-red-950/40 py-3 text-xs font-bold text-red-300 hover:bg-red-900/50 transition disabled:opacity-50"
                >
                  ⏹ END COMPETITION
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => startCompetitionAction(1), "Competition restarted with Round 1.")}
                  className="w-full rounded-xl border border-[#2cff5e]/40 bg-[#2cff5e]/15 py-3 text-xs font-bold text-[#a8f27a] hover:bg-[#2cff5e]/25 transition disabled:opacity-50"
                >
                  ▶ RESUME / RESTART COMPETITION
                </button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-white/10">
              <label className="flex items-center gap-2 text-xs text-[#8fae93] cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={resetTeams}
                  onChange={(e) => setResetTeams(e.target.checked)}
                  className="rounded border-white/20 bg-black text-[#2cff5e]"
                />
                <span>Also reset all teams&apos; completed rounds to 0</span>
              </label>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  runAction(
                    () => resetCompetitionAction(resetTeams),
                    "Competition reset to Not Started state."
                  )
                }
                className="w-full rounded-lg border border-white/15 bg-white/5 py-2 text-[11px] font-semibold text-[#8fae93] hover:text-white transition disabled:opacity-50"
              >
                🔄 Reset Everything to Not Started
              </button>
            </div>
          </div>
        </div>

        {/* Set Specific Round Directly */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-[#8fae93]">
            Direct Round Selector & Jump
          </h3>
          <p className="mt-1 text-xs text-[#a8c7ac]">
            Directly jump all teams to a specific round and initialize that round&apos;s duration clock.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((r) => {
              const durMinutes = Math.round(ROUND_DURATIONS[r] / 60);
              const isCurrent = state.currentRound === r && state.status === "running";
              return (
                <button
                  key={r}
                  type="button"
                  disabled={isPending}
                  onClick={() => runAction(() => setRoundAction(r), `Switched directly to Round ${r}.`)}
                  className={`rounded-xl border p-4 text-left transition ${
                    isCurrent
                      ? "border-[#2cff5e] bg-[#2cff5e]/15 shadow-[0_0_15px_rgba(44,255,94,0.2)]"
                      : "border-white/10 bg-black/40 hover:border-white/30"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase text-[#a8f27a]">Round {r}</span>
                    {isCurrent && <span className="h-2 w-2 rounded-full bg-[#2cff5e] animate-pulse" />}
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-white">
                    {r === 1 && "Launch"}
                    {r === 2 && "Attack"}
                    {r === 3 && "Rebuild"}
                    {r === 4 && "Re-attack"}
                    {r === 5 && "Market"}
                  </p>
                  <p className="mt-1 text-[11px] text-[#8fae93] font-mono">{durMinutes} min timer</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scoreboard & Teams Live Progress (Sorted by Final Score) */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/30 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-base font-extrabold text-white">🏆 Official Scoreboard (Sorted by Final Score)</h3>
              <p className="mt-1 text-xs text-[#8fae93]">
                Real-time admin standings ranked by final score formula (0.3 Adoption + 0.3 Security + 0.2 Treasury + 0.2 Stability).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/scoreboard"
                className="rounded-xl border border-[#2cff5e]/40 bg-[#2cff5e]/10 px-3.5 py-1.5 text-xs font-bold text-[#a8f27a] hover:bg-[#2cff5e]/20 transition"
              >
                📊 Open Scoreboard View
              </Link>
              <span className="text-xs font-mono text-[#a8f27a]">{teams.length} Teams Registered</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#8fae93]">
                <tr>
                  <th className="py-3 px-3">Rank</th>
                  <th className="py-3 px-3">Team Name</th>
                  <th className="py-3 px-3 text-center">Final Score</th>
                  <th className="py-3 px-3">Rounds Done</th>
                  <th className="py-3 px-3">Status in R{state.currentRound}</th>
                  <th className="py-3 px-3 text-right">Treasury</th>
                  <th className="py-3 px-3 text-right">Security</th>
                  <th className="py-3 px-3 text-right">Adoption</th>
                  <th className="py-3 px-3 text-right">Stability</th>
                  <th className="py-3 px-3 text-right">Decentralization</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...teams]
                  .sort((a, b) => (b.final_score ?? 0) - (a.final_score ?? 0))
                  .map((t, idx) => {
                    const hasDoneCurrent = t.round_completed >= state.currentRound;
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] transition">
                        <td className="py-3 px-3 font-mono font-black text-[#a8f27a]">
                          #{idx + 1}
                        </td>
                        <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-[#2cff5e]/10 text-[10px] font-black text-[#2cff5e]">
                            {t.name.charAt(0).toUpperCase()}
                          </span>
                          <span>{t.name}</span>
                        </td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className="inline-block rounded-lg bg-[#2cff5e]/15 border border-[#2cff5e]/30 px-2.5 py-0.5 text-xs font-black text-[#2cff5e]">
                            {t.final_score !== null && t.final_score !== undefined ? t.final_score.toFixed(1) : "—"}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className="rounded bg-white/10 px-2 py-0.5 font-bold text-white">
                            {t.round_completed} / 5
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {hasDoneCurrent ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#2cff5e]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#2cff5e]">
                              <span>✓</span> Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> In Progress
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-[#ff8080]">{t.treasury}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#a8c7ac]">{t.security}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#a8c7ac]">{t.adoption}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#a8c7ac]">{t.stability}</td>
                        <td className="py-3 px-3 text-right font-mono text-[#a8c7ac]">{t.decentralization}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
