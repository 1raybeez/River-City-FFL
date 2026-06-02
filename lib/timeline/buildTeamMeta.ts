// /lib/timeline/buildTeamMeta.ts

import { TeamData } from "./teamTypes";
import { LeagueData } from "./leagueTypes";

/**
 * Compute a simple z-score style normalization.
 */
function normalize(value: number, avg: number, spread: number): number {
  if (spread === 0) return 0;
  return (value - avg) / spread;
}

/**
 * Build power rankings and standings for all teams based on:
 * - record (winPct)
 * - pointsFor (vs league average)
 * - keeper surplus
 * - injury impact
 * - trade history (netTalentDelta + volume)
 */
export function buildTeamMeta(teams: TeamData[], league: LeagueData): void {
  if (!teams.length) return;

  // --- League-level aggregates for normalization ---
  const winPcts = teams.map((t) => t.record.winPct);
  const pointsFor = teams.map((t) => t.pointsFor);
  const keeperSurpluses = teams.map((t) => t.keeperValue.surplus);
  const injuryImpacts = teams.map((t) => t.injuries.impactScore);

  const avgWinPct =
    winPcts.reduce((sum, v) => sum + v, 0) / (winPcts.length || 1);
  const avgPointsFor =
    pointsFor.reduce((sum, v) => sum + v, 0) / (pointsFor.length || 1);
  const avgKeeperSurplus =
    keeperSurpluses.reduce((sum, v) => sum + v, 0) /
    (keeperSurpluses.length || 1);
  const avgInjuryImpact =
    injuryImpacts.reduce((sum, v) => sum + v, 0) /
    (injuryImpacts.length || 1);

  const spreadWinPct =
    Math.sqrt(
      winPcts.reduce((sum, v) => sum + Math.pow(v - avgWinPct, 2), 0) /
        (winPcts.length || 1)
    ) || 0;

  const spreadPointsFor =
    Math.sqrt(
      pointsFor.reduce(
        (sum, v) => sum + Math.pow(v - avgPointsFor, 2),
        0
      ) / (pointsFor.length || 1)
    ) || 0;

  const spreadKeeperSurplus =
    Math.sqrt(
      keeperSurpluses.reduce(
        (sum, v) => sum + Math.pow(v - avgKeeperSurplus, 2),
        0
      ) / (keeperSurpluses.length || 1)
    ) || 0;

  const spreadInjuryImpact =
    Math.sqrt(
      injuryImpacts.reduce(
        (sum, v) => sum + Math.pow(v - avgInjuryImpact, 2),
        0
      ) / (injuryImpacts.length || 1)
    ) || 0;

  // --- Compute a composite power score for each team ---
  const scores = new Map<string, number>();

  for (const team of teams) {
    const winPctNorm = normalize(
      team.record.winPct,
      avgWinPct,
      spreadWinPct
    );
    const pointsForNorm = normalize(
      team.pointsFor,
      avgPointsFor,
      spreadPointsFor
    );
    const keeperNorm = normalize(
      team.keeperValue.surplus,
      avgKeeperSurplus,
      spreadKeeperSurplus
    );
    const injuryNorm = normalize(
      team.injuries.impactScore,
      avgInjuryImpact,
      spreadInjuryImpact
    );

    // Trade history aggression proxy:
    // more trades + positive netTalentDelta = more aggressive
    const tradeVolume = team.tradeHistory.tradesLast12Months;
    const tradeTalent = team.tradeHistory.netTalentDelta;
    const tradeAggression =
      tradeVolume * 0.2 + Math.sign(tradeTalent) * Math.min(Math.abs(tradeTalent) / 100, 1);

    // Composite score:
    // - winPct: heavy weight
    // - pointsFor: strong weight
    // - keeper surplus: medium weight
    // - injuries: negative weight
    // - tradeAggression: light spice
    const score =
      winPctNorm * 0.45 +
      pointsForNorm * 0.35 +
      keeperNorm * 0.1 -
      injuryNorm * 0.1 +
      tradeAggression * 0.1;

    scores.set(team.ownerId, score);
  }

  // --- Rank teams by score (higher = better) ---
  const sorted = [...teams].sort((a, b) => {
    const sa = scores.get(a.ownerId) ?? 0;
    const sb = scores.get(b.ownerId) ?? 0;
    return sb - sa;
  });

  // Assign powerRank and standing (1 = best)
  sorted.forEach((team, index) => {
    const rank = index + 1;
    const score = scores.get(team.ownerId) ?? 0;

    // Mutate original team objects
    const original = teams.find((t) => t.ownerId === team.ownerId);
    if (!original) return;

    original.powerRank = score;
    original.record.standing = rank;
  });
}
