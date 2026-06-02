// /lib/trade/buildHistoricalPercentiles.ts

import { HistoricalPercentiles } from "@/lib/tradeFairnessEngine";

/**
 * Compute a percentile from a sorted numeric array using linear interpolation.
 */
function getPercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];

  const rank = (p / 100) * (sorted.length - 1);
  const lowIndex = Math.floor(rank);
  const highIndex = Math.ceil(rank);

  if (lowIndex === highIndex) {
    return sorted[lowIndex];
  }

  const weight = rank - lowIndex;
  return sorted[lowIndex] + (sorted[highIndex] - sorted[lowIndex]) * weight;
}

/**
 * Build HistoricalPercentiles from an array of historical net value gaps.
 *
 * Each entry in `gaps` should be:
 *   gap = maxTeamNetValue - minTeamNetValue
 * for a single historical trade.
 */
export function buildHistoricalPercentiles(
  gaps: number[]
): HistoricalPercentiles | null {
  if (!gaps || gaps.length === 0) {
    return null;
  }

  const sorted = [...gaps].map(Math.abs).sort((a, b) => a - b);

  return {
    p05: getPercentile(sorted, 5),
    p10: getPercentile(sorted, 10),
    p25: getPercentile(sorted, 25),
    p50: getPercentile(sorted, 50),
    p75: getPercentile(sorted, 75),
    p90: getPercentile(sorted, 90),
    p95: getPercentile(sorted, 95),
  };
}
