export type SandboxMarketPlayer = {
  playerId: string;
  marketValue: number | null;
  auctionConsensus: number | null;
  medianAdp: number | null;
  marketSourceCount: number;
  adpSourceCount: number;
  evidence: "HIGH" | "MEDIUM" | "LOW";
};

export type SandboxFormulaResult = {
  packageValueA: number;
  packageValueB: number;
  fairnessScore: number | null;
  metric: number | null;
};

export type SandboxMarketFairnessResult = {
  status: "READY" | "UNAVAILABLE";
  packageValueA: number | null;
  packageValueB: number | null;
  fairnessScore: number | null;
  verdict: "VERY BALANCED" | "FAIR" | "SLIGHT EDGE" | "SIGNIFICANT EDGE" | "MAJOR IMBALANCE" | "UNAVAILABLE";
  higherValuePackage: "A" | "B" | "EVEN" | null;
  splitA: number | null;
  splitB: number | null;
  evidence: "HIGH" | "MEDIUM" | "LOW";
  warning: string | null;
};

function validPackageValue(value: number) {
  return Number.isFinite(value) && value > 0;
}

export function packageMarketValue(players: readonly SandboxMarketPlayer[]) {
  if (players.length === 0 || players.some((player) => !validPackageValue(player.marketValue ?? NaN))) return null;
  return players.reduce((total, player) => total + (player.marketValue as number), 0);
}

export function evidenceStrength(players: readonly SandboxMarketPlayer[]) {
  if (players.length === 0) return "LOW" as const;
  const complete = players.filter(
    (player) => player.marketSourceCount >= 4 && player.adpSourceCount >= 4,
  ).length;
  if (complete === players.length) return "HIGH" as const;
  if (players.some((player) => player.marketSourceCount > 0 || player.adpSourceCount > 0)) return "MEDIUM" as const;
  return "LOW" as const;
}

function packagePair(
  sideA: readonly SandboxMarketPlayer[],
  sideB: readonly SandboxMarketPlayer[],
) {
  const packageValueA = packageMarketValue(sideA);
  const packageValueB = packageMarketValue(sideB);
  if (packageValueA === null || packageValueB === null) return null;
  return { packageValueA, packageValueB };
}

/** Formula A: score is 100 at 50/50 and falls linearly with share distance. */
export function combinedValueShare(
  sideA: readonly SandboxMarketPlayer[],
  sideB: readonly SandboxMarketPlayer[],
): SandboxFormulaResult {
  const pair = packagePair(sideA, sideB);
  if (!pair) return { packageValueA: 0, packageValueB: 0, fairnessScore: null, metric: null };
  const total = pair.packageValueA + pair.packageValueB;
  const shareA = pair.packageValueA / total;
  return { ...pair, fairnessScore: 100 * (1 - Math.abs(shareA - 0.5) * 2), metric: shareA };
}

/** Formula B: relative gap, mapped to a bounded score for calibration only. */
export function relativePackageGap(
  sideA: readonly SandboxMarketPlayer[],
  sideB: readonly SandboxMarketPlayer[],
): SandboxFormulaResult {
  const pair = packagePair(sideA, sideB);
  if (!pair) return { packageValueA: 0, packageValueB: 0, fairnessScore: null, metric: null };
  const gap = Math.abs(pair.packageValueA - pair.packageValueB) / ((pair.packageValueA + pair.packageValueB) / 2);
  return { ...pair, fairnessScore: 100 / (1 + gap), metric: gap };
}

/** Formula C: direct package-value ratio, bounded to 0–100 for calibration only. */
export function valueRatio(
  sideA: readonly SandboxMarketPlayer[],
  sideB: readonly SandboxMarketPlayer[],
): SandboxFormulaResult {
  const pair = packagePair(sideA, sideB);
  if (!pair) return { packageValueA: 0, packageValueB: 0, fairnessScore: null, metric: null };
  const ratio = Math.min(pair.packageValueA, pair.packageValueB) / Math.max(pair.packageValueA, pair.packageValueB);
  return { ...pair, fairnessScore: ratio * 100, metric: ratio };
}

export function sandboxMarketFairness(
  sideA: readonly SandboxMarketPlayer[],
  sideB: readonly SandboxMarketPlayer[],
): SandboxMarketFairnessResult {
  const packageValueA = packageMarketValue(sideA);
  const packageValueB = packageMarketValue(sideB);
  const evidence = evidenceStrength([...sideA, ...sideB]);
  if (packageValueA === null || packageValueB === null) {
    return {
      status: "UNAVAILABLE",
      packageValueA,
      packageValueB,
      fairnessScore: null,
      verdict: "UNAVAILABLE",
      higherValuePackage: null,
      splitA: null,
      splitB: null,
      evidence,
      warning: "Limited market data: every selected player needs a positive published market value.",
    };
  }
  const formula = combinedValueShare(sideA, sideB);
  const total = packageValueA + packageValueB;
  const splitA = (packageValueA / total) * 100;
  const splitB = (packageValueB / total) * 100;
  const fairnessScore = formula.fairnessScore as number;
  const verdict = fairnessScore >= 95 ? "VERY BALANCED" : fairnessScore >= 85 ? "FAIR" : fairnessScore >= 70 ? "SLIGHT EDGE" : fairnessScore >= 50 ? "SIGNIFICANT EDGE" : "MAJOR IMBALANCE";
  return {
    status: "READY",
    packageValueA,
    packageValueB,
    fairnessScore,
    verdict,
    higherValuePackage: packageValueA === packageValueB ? "EVEN" : packageValueA > packageValueB ? "A" : "B",
    splitA,
    splitB,
    evidence,
    warning: null,
  };
}
