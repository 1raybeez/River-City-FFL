// /lib/timeline/keeperEngine.ts
//
// Fully typed, future‑proof keeper engine.
// This version uses explicit intermediate types so TypeScript
// never confuses KeeperInputPlayer with enriched objects.

export interface KeeperInputPlayer {
  playerId: string;
  fullName: string;

  keeperCost: number;
  totalValueScore: number;

  age?: number;
  position?: string;
  riskIndex?: number;
  yearsKept?: number;
}

export interface KeeperOutput {
  surplus: number;
  count: number;
  avgSurplus: number;
}

// -----------------------------------------------------
// Intermediate Types (this is the key to fixing your error)
// -----------------------------------------------------
interface InflatedPlayer extends KeeperInputPlayer {
  inflatedCost: number;
}

interface SurplusPlayer extends InflatedPlayer {
  surplus: number;
}

interface FinalKeeperPlayer extends SurplusPlayer {
  finalValue: number;
}

// -----------------------------------------------------
// 1. Inflation Model
// -----------------------------------------------------
function applyInflation(cost: number, yearsKept: number = 0): number {
  const INFLATION_PER_YEAR = 10;
  return cost + INFLATION_PER_YEAR * yearsKept;
}

// -----------------------------------------------------
// 2. Max Keepers
// -----------------------------------------------------
function enforceMaxKeepers(players: SurplusPlayer[]): SurplusPlayer[] {
  const MAX_KEEPERS = 2;
  return players.slice(0, MAX_KEEPERS);
}

// -----------------------------------------------------
// 3. Positional Caps
// -----------------------------------------------------
function enforcePositionalCaps(players: SurplusPlayer[]): SurplusPlayer[] {
  const caps: Record<string, number> = {
    RB: 1,
    WR: 1,
    QB: 1,
    TE: 1,
  };

  const counts: Record<string, number> = {};
  const result: SurplusPlayer[] = [];

  for (const p of players) {
    const pos = p.position ?? "UNK";
    counts[pos] = counts[pos] ?? 0;

    if (caps[pos] !== undefined && counts[pos] >= caps[pos]) {
      continue;
    }

    counts[pos]++;
    result.push(p);
  }

  return result;
}

// -----------------------------------------------------
// 4. Tiered Surplus Weighting
// -----------------------------------------------------
function tierMultiplier(totalValueScore: number): number {
  if (totalValueScore >= 90) return 1.5;
  if (totalValueScore >= 75) return 1.2;
  if (totalValueScore >= 60) return 1.0;
  return 0.7;
}

// -----------------------------------------------------
// 5. Age‑Based Future Value Curve
// -----------------------------------------------------
function ageMultiplier(age: number | undefined): number {
  if (!age) return 1.0;

  if (age <= 24) return 1.3;
  if (age <= 27) return 1.1;
  if (age <= 29) return 1.0;
  if (age <= 31) return 0.8;
  return 0.6;
}

// -----------------------------------------------------
// 6. Keeper Risk Index
// -----------------------------------------------------
function applyRiskAdjustment(value: number, riskIndex: number | undefined): number {
  const risk = riskIndex ?? 0.5;
  return value * (1 - risk);
}

// -----------------------------------------------------
// 7. Final Keeper Score Formula
// -----------------------------------------------------
export function computeKeeperValue(players: KeeperInputPlayer[]): KeeperOutput {
  if (!players || players.length === 0) {
    return { surplus: 0, count: 0, avgSurplus: 0 };
  }

  // Step 1: Inflation
  const inflated: InflatedPlayer[] = players.map((p) => ({
    ...p,
    inflatedCost: applyInflation(p.keeperCost, p.yearsKept ?? 0),
  }));

  // Step 2: Raw surplus
  const withSurplus: SurplusPlayer[] = inflated.map((p) => ({
    ...p,
    surplus: p.totalValueScore - p.inflatedCost,
  }));

  // Step 3: Only positive surplus
  const positive: SurplusPlayer[] = withSurplus.filter((p) => p.surplus > 0);

  if (positive.length === 0) {
    return { surplus: 0, count: 0, avgSurplus: 0 };
  }

  // Step 4: Positional caps
  const capped: SurplusPlayer[] = enforcePositionalCaps(positive);

  // Step 5: Max keepers
  const limited: SurplusPlayer[] = enforceMaxKeepers(capped);

  // Step 6: Tier + age + risk multipliers
  const finalValues: FinalKeeperPlayer[] = limited.map((p) => {
    const tier = tierMultiplier(p.totalValueScore);
    const ageMult = ageMultiplier(p.age);
    const base = p.surplus * tier * ageMult;
    const riskAdjusted = applyRiskAdjustment(base, p.riskIndex);

    return {
      ...p,
      finalValue: riskAdjusted,
    };
  });

  // Step 7: Final keeper score
  const total = finalValues.reduce((sum, p) => sum + p.finalValue, 0);

  return {
    surplus: total,
    count: finalValues.length,
    avgSurplus: total / finalValues.length,
  };
}
