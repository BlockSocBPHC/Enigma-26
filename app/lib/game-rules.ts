import type {
  AttackCategory,
  AttackType,
  GlobalEventType,
  RebuildType,
  TeamScore,
  upgradeOptions,
  upgradeTypes,
} from "@/app/lib/types";

export type ScoreDelta = Partial<TeamScore>;

export type LaunchChoice = Record<upgradeOptions, upgradeTypes>;

export const INITIAL_SCORE: TeamScore = {
  adoption: 100,
  security: 100,
  decentralization: 100,
  treasury: 100,
  stability: 100,
};

export const ROUND_LABELS = [
  "Launch",
  "Attack",
  "Rebuild",
  "Re-attack",
  "Global market",
  "Final results",
] as const;

export const LAUNCH_RULES: Record<upgradeOptions, Record<upgradeTypes, ScoreDelta>> = {
  "Transaction Fees": {
    Low: { adoption: 30, treasury: -10, stability: 5 },
    Medium: { adoption: 10, treasury: 10, stability: 0 },
    High: { adoption: -20, treasury: 30, stability: -5 },
  },
  "Security Budget": {
    Low: { security: -30, treasury: 20, stability: -10 },
    Medium: { security: 10, treasury: -10, stability: 0 },
    High: { security: 30, treasury: -30, stability: 5 },
  },
  "Validator Rewards": {
    Low: { adoption: -5, security: -10, decentralization: -20, treasury: 25, stability: 0 },
    Medium: { adoption: 5, security: 5, decentralization: 10, treasury: -10, stability: 0 },
    High: { adoption: 10, security: 10, decentralization: 20, treasury: -25, stability: 0 },
  },
};

export const ATTACK_RULES: Record<AttackCategory, { label: string; defense: ScoreDelta; effect: ScoreDelta }> = {
  "Spam Attack": {
    label: "Spam attack",
    defense: { security: 0.6, adoption: 0.4 },
    effect: { treasury: -10, adoption: -15, stability: -5 },
  },
  "Validator Bribery": {
    label: "Validator bribery",
    defense: { security: 0.7, decentralization: 0.3 },
    effect: { security: -10, decentralization: -15, adoption: -5, stability: -10 },
  },
  "Governance Attack": {
    label: "Governance attack",
    defense: { decentralization: 0.8, security: 0.2 },
    effect: { security: -5, decentralization: -20, treasury: -5, adoption: -10, stability: -10 },
  },
  "Treasury Drain": {
    label: "Treasury drain",
    defense: { treasury: 0.7, security: 0.3 },
    effect: { security: -5, treasury: -20, adoption: -10, stability: -15 },
  },
  "Network Fork Attack": {
    label: "Network fork attack",
    defense: { decentralization: 0.6, adoption: 0.4 },
    effect: { security: -10, decentralization: -25, treasury: -5, adoption: -15, stability: -20 },
  },
  "Reputation Attack": {
    label: "Reputation / FUD attack",
    defense: { adoption: 0.7, treasury: 0.3 },
    effect: { decentralization: -5, treasury: -5, adoption: -25, stability: -10 },
  },
  "Smart Contract Exploit": {
    label: "Smart contract exploit",
    defense: { security: 1 },
    effect: { security: -20, treasury: -30, adoption: -20, stability: -20 },
  },
};

export const ATTACK_LEVELS: Record<AttackType, { strength: number; cost: number }> = {
  "Weak Attack": { strength: 40, cost: 5 },
  "Standard Attack": { strength: 60, cost: 10 },
  "Strong Attack": { strength: 80, cost: 17 },
  "Coordinated Attack": { strength: 100, cost: 25 },
  "All-Out Attack": { strength: 120, cost: 35 },
};

export const REBUILD_RULES: Record<RebuildType | "Treasury Investment", { cost: number; effect: ScoreDelta; description: string }> = {
  "Security Recovery": { cost: 20, effect: { security: 25 }, description: "+25 security" },
  "Validator Recruitment": {
    cost: 20,
    effect: { decentralization: 20, stability: 5 },
    description: "+20 decentralization, +5 stability",
  },
  "Marketing Campaign": { cost: 15, effect: { adoption: 30 }, description: "+30 adoption" },
  "Emergency Recovery": {
    cost: 35,
    effect: { security: 20, adoption: 20, decentralization: 10, stability: 10 },
    description: "+20 security and adoption, +10 decentralization and stability",
  },
  "Treasury Investment": { cost: 0, effect: { treasury: 20 }, description: "+20 treasury next round" },
};

export const GLOBAL_EVENTS: Record<GlobalEventType, { description: string; effect: ScoreDelta }> = {
  "Bull Market": {
    description: "Investor confidence lifts blockchain adoption.",
    effect: { adoption: 20, treasury: 10, stability: 5 },
  },
  "Market Crash": {
    description: "A sharp market decline reduces activity and confidence.",
    effect: { adoption: -15, treasury: -10, stability: -5 },
  },
  "Regulatory Crackdown": {
    description: "Stricter regulation creates uncertainty.",
    effect: { adoption: -10, treasury: -10, stability: -10 },
  },
  "Major Exchange Listing": {
    description: "A major listing brings new visibility.",
    effect: { adoption: 20, treasury: 10, stability: 10 },
  },
  "Security Grant": {
    description: "A cybersecurity grant strengthens the ecosystem.",
    effect: { security: 20, stability: 5 },
  },
  "Open Source Contributor Boom": {
    description: "New contributors strengthen the network.",
    effect: { security: 10, decentralization: 15 },
  },
  "Coordinated Cyber Attack": {
    description: "Industry-wide attacks reduce trust and activity.",
    effect: { security: -10, adoption: -10, stability: -5 },
  },
  "Validator Incentive Program": {
    description: "More participants join as validators.",
    effect: { decentralization: 20, adoption: 5 },
  },
  "AI Security Breakthrough": {
    description: "New AI security tools become widely available.",
    effect: { security: 30, stability: 5 },
  },
  "Institutional Investment Wave": {
    description: "Institutions invest in blockchain technology.",
    effect: { treasury: 15, adoption: 15, stability: 5 },
  },
};

const SCORE_KEYS: (keyof TeamScore)[] = ["adoption", "security", "decentralization", "treasury", "stability"];

export function applyDelta(score: TeamScore, delta: ScoreDelta): TeamScore {
  return SCORE_KEYS.reduce<TeamScore>((next, key) => {
    next[key] = Math.max(0, Math.round((score[key] ?? 0) + (delta[key] ?? 0)));
    return next;
  }, { ...score });
}

export function combineDeltas(deltas: ScoreDelta[]): ScoreDelta {
  return deltas.reduce<ScoreDelta>((combined, delta) => {
    SCORE_KEYS.forEach((key) => {
      if (delta[key] !== undefined) combined[key] = (combined[key] ?? 0) + (delta[key] ?? 0);
    });
    return combined;
  }, {});
}

export function defenseScore(score: TeamScore, attack: AttackCategory) {
  return Object.entries(ATTACK_RULES[attack].defense).reduce((total, [metric, weight]) => {
    return total + score[metric as keyof TeamScore] * (weight ?? 0);
  }, 0);
}

export function successProbability(difference: number) {
  const d = Math.round(difference);
  if (d <= -30) return 5;
  if (d <= -20) return 15;
  if (d <= -10) return 30;
  if (d <= 9) return 50;
  if (d <= 19) return 75;
  if (d <= 29) return 90;
  return 100;
}

export function finalScore(score: TeamScore) {
  return 0.3 * score.adoption + 0.3 * score.security + 0.2 * score.treasury + 0.2 * score.stability;
}

export function isLaunchChoice(value: unknown): value is LaunchChoice {
  if (!value || typeof value !== "object") return false;
  const choice = value as LaunchChoice;
  return (Object.keys(LAUNCH_RULES) as upgradeOptions[]).every((category) => {
    return ["Low", "Medium", "High"].includes(choice[category]);
  });
}
