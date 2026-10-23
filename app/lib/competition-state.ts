export type CompetitionStatus = "not_started" | "running" | "ended";

export interface CompetitionState {
  status: CompetitionStatus;
  currentRound: number; // 1..5
  startedAt: number; // epoch ms
  duration: number; // in seconds
  timeLeft: number; // remaining seconds
  formattedTimeLeft: string; // MM:SS
}

export const ROUND_DURATIONS: Record<number, number> = {
  1: 5 * 60,  // 5 min
  2: 10 * 60, // 10 min
  3: 5 * 60,  // 5 min
  4: 20 * 60, // 20 min
  5: 10 * 60, // 10 min
};

export function formatSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function parseCompetitionRow(row: {
  adoption?: number | null;
  round_completed?: number | null;
  treasury?: number | null;
  created_at?: string | null;
  stability?: number | null;
} | null): CompetitionState {
  if (!row) {
    return {
      status: "not_started",
      currentRound: 1,
      startedAt: Date.now(),
      duration: ROUND_DURATIONS[1],
      timeLeft: ROUND_DURATIONS[1],
      formattedTimeLeft: formatSeconds(ROUND_DURATIONS[1]),
    };
  }

  // adoption: 0 = not_started, 1 = running, 2 = ended
  let status: CompetitionStatus = "not_started";
  if (row.adoption === 1) status = "running";
  else if (row.adoption === 2) status = "ended";

  const currentRound = Math.max(1, Math.min(5, row.round_completed ?? 1));
  const duration = row.treasury || ROUND_DURATIONS[currentRound] || 600;

  // Prefer stability (epoch seconds) to avoid timezone ambiguities
  let startedAt = Date.now();
  if (row.stability && row.stability > 1000000) {
    startedAt = row.stability * 1000;
  } else if (row.created_at) {
    const raw = row.created_at.trim();
    const withZ = raw.endsWith("Z") ? raw : `${raw}Z`;
    const parsed = new Date(withZ).getTime();
    startedAt = isNaN(parsed) ? Date.now() : parsed;
  }

  let timeLeft = 0;
  if (status === "running") {
    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    timeLeft = Math.max(0, duration - elapsed);
  } else if (status === "not_started") {
    timeLeft = duration;
  } else {
    timeLeft = 0;
  }

  return {
    status,
    currentRound,
    startedAt,
    duration,
    timeLeft,
    formattedTimeLeft: formatSeconds(timeLeft),
  };
}
