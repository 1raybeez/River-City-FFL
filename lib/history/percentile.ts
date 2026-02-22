// lib/history/percentile.ts

export type PercentileTable = {
  p05: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
};

function getPercentile(sortedValues: number[], percentile: number): number {
  if (sortedValues.length === 0) return 0;
  const index = (percentile / 100) * (sortedValues.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sortedValues[lower];
  const weight = index - lower;
  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

export function buildPercentileTable(values: number[]): PercentileTable {
  const sorted = [...values].sort((a, b) => a - b);

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

/**
 * Given an imbalanceAbsolute and a percentile table,
 * returns a fairness score from 0–100.
 * Higher score = more fair (closer to typical trades).
 */
export function getFairnessScoreFromHistory(
  imbalanceAbsolute: number,
  table: PercentileTable
): number {
  // Simple mapping:
  // <= p25 → 90–100
  // p25–p50 → 70–90
  // p50–p75 → 40–70
  // p75–p90 → 20–40
  // > p90 → 0–20

  if (imbalanceAbsolute <= table.p25) {
    // map [0, p25] → [100, 90]
    const ratio = imbalanceAbsolute / (table.p25 || 1);
    return 100 - 10 * ratio;
  }

  if (imbalanceAbsolute <= table.p50) {
    const ratio = (imbalanceAbsolute - table.p25) / ((table.p50 - table.p25) || 1);
    return 90 - 20 * ratio; // 90 → 70
  }

  if (imbalanceAbsolute <= table.p75) {
    const ratio = (imbalanceAbsolute - table.p50) / ((table.p75 - table.p50) || 1);
    return 70 - 30 * ratio; // 70 → 40
  }

  if (imbalanceAbsolute <= table.p90) {
    const ratio = (imbalanceAbsolute - table.p75) / ((table.p90 - table.p75) || 1);
    return 40 - 20 * ratio; // 40 → 20
  }

  // > p90
  const maxImbalance = table.p95 || table.p90 || imbalanceAbsolute || 1;
  const ratio = Math.min(imbalanceAbsolute / maxImbalance, 2); // clamp a bit
  return Math.max(0, 20 - 20 * (ratio - 1)); // 20 → 0
}
