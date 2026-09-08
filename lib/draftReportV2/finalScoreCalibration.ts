export const FINAL_SCORE_CANDIDATES = {
  A: { draftQuality: 0.9, auctionEfficiency: 0.1 },
  B: { draftQuality: 0.85, auctionEfficiency: 0.15 },
  C: { draftQuality: 0.8, auctionEfficiency: 0.2 },
} as const;

export type CalibrationInput = {
  franchiseId: string;
  teamName: string;
  draftQualityRaw: number;
  draftQualityRank: number;
  auctionEfficiencyRaw: number;
  auctionEfficiencyRank: number;
};

export type NormalizedCalibrationInput = CalibrationInput & {
  draftQualityNormalized: number;
  auctionEfficiencyNormalized: number;
};

export type CalibrationResult = NormalizedCalibrationInput & {
  candidates: Record<keyof typeof FINAL_SCORE_CANDIDATES, { score: number; rank: number; changeFromDraftQualityRank: number }>;
  quadrant: "STRONG_BOTH" | "STRONG_DQ_WEAK_AE" | "WEAK_DQ_STRONG_AE" | "WEAK_BOTH";
};

export type CalibrationSummary = {
  candidate: keyof typeof FINAL_SCORE_CANDIDATES;
  largestUpwardMover: CalibrationResult;
  largestDownwardMover: CalibrationResult;
  maximumRankChange: number;
  maximumAuctionEfficiencyEffect: number;
};

export function buildCalibrationInputsFromFrozenReview(review: any): CalibrationInput[] {
  return review.snapshot.teams.map((team: any) => {
    const formulaC = review.formulaC?.find((row: any) => row.franchiseId === team.franchiseId);
    const auction = review.auctionEfficiency?.teams?.find((row: any) => row.franchiseId === team.franchiseId);
    if (!formulaC || !auction || typeof formulaC.rawDraftQuality !== "number" || typeof formulaC.draftQualityRank !== "number") throw new Error(`Frozen review is missing Formula C data for ${team.franchiseId}.`);
    return { franchiseId: team.franchiseId, teamName: team.currentDisplayName, draftQualityRaw: formulaC.rawDraftQuality, draftQualityRank: formulaC.draftQualityRank, auctionEfficiencyRaw: auction.referenceSurplus, auctionEfficiencyRank: auction.auctionEfficiency.leagueRank } satisfies CalibrationInput;
  });
}

function round(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }

export function normalizeLeagueRelative(values: readonly number[]) {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((value) => round(((value - min) / (max - min)) * 100));
}

function rankResults(results: readonly { franchiseId: string; score: number }[]) {
  const ordered = [...results].sort((a, b) => b.score - a.score || a.franchiseId.localeCompare(b.franchiseId));
  return new Map(ordered.map((result, index) => [result.franchiseId, index + 1]));
}

export function calibrateFinalScores(inputs: readonly CalibrationInput[]) {
  if (inputs.length < 2) throw new Error("At least two teams are required for league-relative normalization.");
  const dq = normalizeLeagueRelative(inputs.map((input) => input.draftQualityRaw));
  const ae = normalizeLeagueRelative(inputs.map((input) => input.auctionEfficiencyRaw));
  const normalized = inputs.map((input, index) => ({ ...input, draftQualityNormalized: dq[index], auctionEfficiencyNormalized: ae[index] }));
  const results = Object.fromEntries(Object.entries(FINAL_SCORE_CANDIDATES).map(([candidate, weights]) => {
    const scores = normalized.map((input) => ({ franchiseId: input.franchiseId, score: round(input.draftQualityNormalized * weights.draftQuality + input.auctionEfficiencyNormalized * weights.auctionEfficiency) }));
    const ranks = rankResults(scores);
    return [candidate, { scores, ranks }];
  })) as Record<keyof typeof FINAL_SCORE_CANDIDATES, { scores: { franchiseId: string; score: number }[]; ranks: Map<string, number> }>;
  const calibrated = normalized.map((input) => {
    const teamResults = Object.fromEntries(Object.keys(FINAL_SCORE_CANDIDATES).map((candidate) => [candidate, { score: results[candidate as keyof typeof FINAL_SCORE_CANDIDATES].scores.find((row) => row.franchiseId === input.franchiseId)!.score, rank: results[candidate as keyof typeof FINAL_SCORE_CANDIDATES].ranks.get(input.franchiseId)!, changeFromDraftQualityRank: results[candidate as keyof typeof FINAL_SCORE_CANDIDATES].ranks.get(input.franchiseId)! - input.draftQualityRank }])) as CalibrationResult["candidates"];
    const strongDq = input.draftQualityRank <= Math.ceil(inputs.length / 2);
    const strongAe = input.auctionEfficiencyRank <= Math.ceil(inputs.length / 2);
    return { ...input, draftQualityNormalized: input.draftQualityNormalized, auctionEfficiencyNormalized: input.auctionEfficiencyNormalized, candidates: teamResults, quadrant: strongDq ? (strongAe ? "STRONG_BOTH" : "STRONG_DQ_WEAK_AE") : (strongAe ? "WEAK_DQ_STRONG_AE" : "WEAK_BOTH") } satisfies CalibrationResult;
  });
  const summaries = Object.keys(FINAL_SCORE_CANDIDATES).map((candidate) => {
    const key = candidate as keyof typeof FINAL_SCORE_CANDIDATES;
    const upward = [...calibrated].sort((a, b) => a.candidates[key].changeFromDraftQualityRank - b.candidates[key].changeFromDraftQualityRank)[0];
    const downward = [...calibrated].sort((a, b) => b.candidates[key].changeFromDraftQualityRank - a.candidates[key].changeFromDraftQualityRank)[0];
    return { candidate: key, largestUpwardMover: upward, largestDownwardMover: downward, maximumRankChange: Math.max(...calibrated.map((row) => Math.abs(row.candidates[key].changeFromDraftQualityRank))), maximumAuctionEfficiencyEffect: round(Math.max(...calibrated.map((row) => row.auctionEfficiencyNormalized * (1 - FINAL_SCORE_CANDIDATES[key].draftQuality)))) } satisfies CalibrationSummary;
  });
  return { teams: calibrated, summaries };
}

export function runSyntheticGuardrails() {
  const base = [
    { franchiseId: "elite-poor", teamName: "Elite / Poor Efficiency", draftQualityRaw: 100, draftQualityRank: 1, auctionEfficiencyRaw: 0, auctionEfficiencyRank: 4 },
    { franchiseId: "strong-both", teamName: "Strong Both", draftQualityRaw: 90, draftQualityRank: 2, auctionEfficiencyRaw: 100, auctionEfficiencyRank: 1 },
    { franchiseId: "cheap-mediocre", teamName: "Cheap Mediocrity", draftQualityRaw: 45, draftQualityRank: 3, auctionEfficiencyRaw: 90, auctionEfficiencyRank: 2 },
    { franchiseId: "weak-poor", teamName: "Weak / Poor Efficiency", draftQualityRaw: 20, draftQualityRank: 4, auctionEfficiencyRaw: 10, auctionEfficiencyRank: 3 },
  ] satisfies CalibrationInput[];
  return calibrateFinalScores(base);
}
