"use server";

import {
  AttackCategory,
  AttackType,
  RebuildType,
  upgradeOptions,
  upgradeTypes,
  Leaderboard,
  TeamScore,
  GlobalEventType,
} from "@/app/lib/types";
import getTeamScore from "@/app/utils/TeamScore/getTeamScore";
import getLeaderboard from "@/app/utils/Leaderboard/getLeaderboard";
import getDefenseScore from "@/app/utils/attack/ValuesGetter/getDefenseScore";
import applyUpgradePhase from "@/app/components/applyUpgradePhase";
import afterAttack from "@/app/components/afterAttack";
import applyRebuild from "@/app/utils/Rebuild/applyRebuild";
import applyEventChanges from "@/app/utils/GlobalEvents/applyEventChanges";

export interface GameActionResult<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

// In-memory simulation fallback database for when Supabase credentials/network are unreachable
const fallbackTeams: Map<string, TeamScore> = new Map([
  [
    "Bitcoin",
    { adoption: 88, security: 96, treasury: 780, decentralization: 92, stability: 84 },
  ],
  [
    "Ethereum",
    { adoption: 92, security: 89, treasury: 690, decentralization: 85, stability: 78 },
  ],
  [
    "Solana",
    { adoption: 84, security: 68, treasury: 540, decentralization: 62, stability: 66 },
  ],
  [
    "Cardano",
    { adoption: 68, security: 86, treasury: 490, decentralization: 78, stability: 82 },
  ],
  [
    "Avalanche",
    { adoption: 72, security: 79, treasury: 440, decentralization: 70, stability: 75 },
  ],
  [
    "Polygon",
    { adoption: 80, security: 74, treasury: 470, decentralization: 66, stability: 72 },
  ],
]);

function getSimTeam(teamName: string): TeamScore {
  if (!fallbackTeams.has(teamName)) {
    fallbackTeams.set(teamName, {
      adoption: 70,
      security: 70,
      treasury: 500,
      decentralization: 70,
      stability: 70,
    });
  }
  return { ...fallbackTeams.get(teamName)! };
}

function updateSimTeam(teamName: string, updates: Partial<TeamScore>): TeamScore {
  const current = getSimTeam(teamName);
  const updated: TeamScore = {
    adoption: Math.max(0, Math.min(100, Math.round(updates.adoption ?? current.adoption))),
    security: Math.max(0, Math.min(100, Math.round(updates.security ?? current.security))),
    treasury: Math.max(0, Math.round(updates.treasury ?? current.treasury)),
    decentralization: Math.max(
      0,
      Math.min(100, Math.round(updates.decentralization ?? current.decentralization))
    ),
    stability: Math.max(0, Math.min(100, Math.round(updates.stability ?? current.stability))),
  };
  fallbackTeams.set(teamName, updated);
  return updated;
}

/**
 * Fetch team metrics safely on server
 */
export async function fetchTeamScoreAction(teamName: string): Promise<GameActionResult<TeamScore>> {
  try {
    const score = await getTeamScore(teamName);
    return { success: true, data: score };
  } catch (error: any) {
    // Fallback to local simulation
    const simScore = getSimTeam(teamName);
    return { success: true, data: simScore };
  }
}

/**
 * Fetch leaderboard safely on server
 */
export async function fetchLeaderboardAction(): Promise<GameActionResult<Leaderboard[]>> {
  try {
    const data = await getLeaderboard();
    if (data && data.length > 0) {
      return { success: true, data: data as Leaderboard[] };
    }
  } catch (error: any) {
    // Fallback to local simulation
  }

  const list: Leaderboard[] = Array.from(fallbackTeams.entries()).map(([name, score]) => ({
    name,
    ...score,
  }));
  return { success: true, data: list };
}

/**
 * Preview target's defense score against a specific attack category
 */
export async function previewDefenseScoreAction(
  targetTeam: string,
  category: AttackCategory
): Promise<GameActionResult<number>> {
  try {
    const defenseScore = await getDefenseScore(targetTeam, category);
    return { success: true, data: defenseScore };
  } catch (error: any) {
    const target = getSimTeam(targetTeam);
    // Weight calculation based on attack vector
    let def = target.security * 0.5 + target.adoption * 0.2 + target.decentralization * 0.3;
    if (category === "Spam Attack") {
      def = target.stability * 0.6 + target.adoption * 0.4;
    } else if (category === "Validator Bribery") {
      def = target.decentralization * 0.6 + target.security * 0.4;
    } else if (category === "Governance Attack") {
      def = target.decentralization * 0.5 + target.treasury * 0.05 + target.security * 0.3;
    } else if (category === "Treasury Drain") {
      def = target.security * 0.7 + target.stability * 0.3;
    }
    return { success: true, data: Math.round(def * 10) / 10 };
  }
}

/**
 * Apply Upgrade Phase
 */
export async function applyUpgradeAction(
  teamName: string,
  option: upgradeOptions,
  type: upgradeTypes
): Promise<GameActionResult<TeamScore>> {
  try {
    await applyUpgradePhase(teamName, option, type);
    const updatedScore = await getTeamScore(teamName);
    return {
      success: true,
      message: `Successfully upgraded ${option} to ${type}`,
      data: updatedScore,
    };
  } catch (error: any) {
    // Local simulation fallback
    const current = getSimTeam(teamName);
    const multiplier = type === "Low" ? 1 : type === "Medium" ? 2 : 3.5;

    let dAdoption = 0;
    let dSecurity = 0;
    let dDecentralization = 0;
    let dTreasury = 0;
    let dStability = 0;

    if (option === "Transaction Fees") {
      if (type === "Low") {
        dAdoption = 8;
        dStability = 4;
        dTreasury = 10;
      } else if (type === "Medium") {
        dAdoption = 4;
        dStability = 6;
        dTreasury = 25;
      } else {
        dAdoption = -8;
        dStability = 2;
        dTreasury = 50;
      }
    } else if (option === "Security Budget") {
      dSecurity = Math.round(8 * multiplier);
      dTreasury = -Math.round(20 * multiplier);
      dStability = Math.round(3 * multiplier);
    } else if (option === "Validator Rewards") {
      dDecentralization = Math.round(7 * multiplier);
      dAdoption = Math.round(3 * multiplier);
      dTreasury = -Math.round(18 * multiplier);
      dStability = Math.round(4 * multiplier);
    }

    const updated = updateSimTeam(teamName, {
      adoption: current.adoption + dAdoption,
      security: current.security + dSecurity,
      decentralization: current.decentralization + dDecentralization,
      treasury: current.treasury + dTreasury,
      stability: current.stability + dStability,
    });

    return {
      success: true,
      message: `Successfully upgraded ${option} (${type})`,
      data: updated,
    };
  }
}

/**
 * Launch Attack against opposing team
 */
export async function launchAttackAction(
  attackingTeam: string,
  attackedTeam: string,
  category: AttackCategory,
  type: AttackType
): Promise<GameActionResult<{ attackerScore: TeamScore; targetScore: TeamScore; breakthrough: boolean }>> {
  try {
    const initialTargetScore = await getTeamScore(attackedTeam);
    await afterAttack(attackingTeam, attackedTeam, category, type);
    const newAttackerScore = await getTeamScore(attackingTeam);
    const newTargetScore = await getTeamScore(attackedTeam);

    const targetDamaged =
      newTargetScore.security < initialTargetScore.security ||
      newTargetScore.treasury < initialTargetScore.treasury ||
      newTargetScore.stability < initialTargetScore.stability ||
      newTargetScore.adoption < initialTargetScore.adoption;

    return {
      success: true,
      message: targetDamaged
        ? `💥 Attack breached ${attackedTeam}'s defenses!`
        : `🛡️ ${attackedTeam} deflected your attack! Treasury spent on deployment.`,
      data: {
        attackerScore: newAttackerScore,
        targetScore: newTargetScore,
        breakthrough: targetDamaged,
      },
    };
  } catch (error: any) {
    // Local simulation fallback
    const attacker = getSimTeam(attackingTeam);
    const target = getSimTeam(attackedTeam);

    // Cost by type
    const costMap: Record<AttackType, { cost: number; strength: number }> = {
      "Weak Attack": { cost: 25, strength: 35 },
      "Standard Attack": { cost: 50, strength: 60 },
      "Strong Attack": { cost: 90, strength: 85 },
      "Coordinated Attack": { cost: 140, strength: 110 },
      "All-Out Attack": { cost: 200, strength: 140 },
    };

    const { cost, strength } = costMap[type] || costMap["Standard Attack"];

    // Deduct attacker cost
    const updatedAttacker = updateSimTeam(attackingTeam, {
      treasury: Math.max(0, attacker.treasury - cost),
    });

    // Calculate defense
    let defense = target.security * 0.5 + target.adoption * 0.2 + target.decentralization * 0.3;
    const roll = Math.random() * 40; // randomness factor
    const breakthrough = strength + roll > defense;

    let updatedTarget = target;
    if (breakthrough) {
      if (category === "Smart Contract Exploit") {
        updatedTarget = updateSimTeam(attackedTeam, {
          security: target.security - 22,
          treasury: target.treasury - 45,
          stability: target.stability - 15,
        });
      } else if (category === "Spam Attack") {
        updatedTarget = updateSimTeam(attackedTeam, {
          stability: target.stability - 25,
          adoption: target.adoption - 18,
        });
      } else if (category === "Validator Bribery") {
        updatedTarget = updateSimTeam(attackedTeam, {
          decentralization: target.decentralization - 28,
          security: target.security - 16,
        });
      } else if (category === "Governance Attack") {
        updatedTarget = updateSimTeam(attackedTeam, {
          treasury: target.treasury - 65,
          decentralization: target.decentralization - 18,
        });
      } else if (category === "Treasury Drain") {
        const drainAmount = Math.min(target.treasury, 80);
        updatedTarget = updateSimTeam(attackedTeam, {
          treasury: target.treasury - drainAmount,
        });
        updateSimTeam(attackingTeam, {
          treasury: updatedAttacker.treasury + Math.round(drainAmount * 0.6),
        });
      } else if (category === "Network Fork Attack") {
        updatedTarget = updateSimTeam(attackedTeam, {
          decentralization: target.decentralization - 25,
          stability: target.stability - 22,
        });
      } else {
        // Reputation Attack
        updatedTarget = updateSimTeam(attackedTeam, {
          adoption: target.adoption - 24,
          stability: target.stability - 18,
        });
      }
    }

    return {
      success: true,
      message: breakthrough
        ? `💥 Direct hit! Breached ${attackedTeam}'s defenses with ${category}. Target suffered heavy structural damage!`
        : `🛡️ Defense held! ${attackedTeam} deflected your ${type}. Treasury spent on vector deployment.`,
      data: {
        attackerScore: getSimTeam(attackingTeam),
        targetScore: updatedTarget,
        breakthrough,
      },
    };
  }
}

/**
 * Apply Rebuild Protocol
 */
export async function applyRebuildAction(
  teamName: string,
  rebuildType: RebuildType
): Promise<GameActionResult<TeamScore>> {
  try {
    await applyRebuild(teamName, rebuildType);
    const updatedScore = await getTeamScore(teamName);
    return {
      success: true,
      message: `Protocol ${rebuildType} executed successfully`,
      data: updatedScore,
    };
  } catch (error: any) {
    const current = getSimTeam(teamName);
    let dAdoption = 0;
    let dSecurity = 0;
    let dDecentralization = 0;
    let dTreasury = 0;
    let dStability = 0;

    if (rebuildType === "Emergency Recovery") {
      dTreasury = -60;
      dSecurity = 16;
      dStability = 18;
    } else if (rebuildType === "Marketing Campaign") {
      dTreasury = -50;
      dAdoption = 22;
      dStability = 8;
    } else if (rebuildType === "Security Recovery") {
      dTreasury = -80;
      dSecurity = 28;
      dStability = 12;
    } else if (rebuildType === "Validator Recruitment") {
      dTreasury = -70;
      dDecentralization = 24;
      dStability = 10;
    }

    const updated = updateSimTeam(teamName, {
      adoption: current.adoption + dAdoption,
      security: current.security + dSecurity,
      decentralization: current.decentralization + dDecentralization,
      treasury: current.treasury + dTreasury,
      stability: current.stability + dStability,
    });

    return {
      success: true,
      message: `Rebuild protocol '${rebuildType}' executed successfully!`,
      data: updated,
    };
  }
}

/**
 * Apply Global Event
 */
export async function applyGlobalEventAction(
  teamName: string
): Promise<GameActionResult<TeamScore>> {
  try {
    await applyEventChanges(teamName);
    const updatedScore = await getTeamScore(teamName);
    return {
      success: true,
      message: "Global macro event wave applied to network!",
      data: updatedScore,
    };
  } catch (error: any) {
    const current = getSimTeam(teamName);
    const events: { name: GlobalEventType; impact: Partial<TeamScore> }[] = [
      { name: "Bull Market", impact: { adoption: 16, treasury: 70, stability: 12 } },
      { name: "AI Security Breakthrough", impact: { security: 20, stability: 10 } },
      { name: "Institutional Investment Wave", impact: { treasury: 90, adoption: 12 } },
      { name: "Major Exchange Listing", impact: { adoption: 20, treasury: 35 } },
      { name: "Open Source Contributor Boom", impact: { decentralization: 16, security: 12 } },
      { name: "Security Grant", impact: { security: 16, treasury: 40 } },
      { name: "Validator Incentive Program", impact: { decentralization: 22, stability: 8 } },
      { name: "Market Crash", impact: { treasury: -80, stability: -22, adoption: -16 } },
      { name: "Regulatory Crackdown", impact: { adoption: -22, stability: -18, treasury: -35 } },
      { name: "Coordinated Cyber Attack", impact: { security: -26, stability: -22, treasury: -45 } },
    ];

    const chosen = events[Math.floor(Math.random() * events.length)];
    const updated = updateSimTeam(teamName, {
      adoption: current.adoption + (chosen.impact.adoption || 0),
      security: current.security + (chosen.impact.security || 0),
      decentralization: current.decentralization + (chosen.impact.decentralization || 0),
      treasury: current.treasury + (chosen.impact.treasury || 0),
      stability: current.stability + (chosen.impact.stability || 0),
    });

    return {
      success: true,
      message: `Macro event '${chosen.name}' struck the network! Protocol scores rebalanced.`,
      data: updated,
    };
  }
}
