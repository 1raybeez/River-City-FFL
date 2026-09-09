export const GRADE_BANDS = [
  { grade: "A+", minimum: 80 }, { grade: "A", minimum: 74 }, { grade: "A-", minimum: 68 },
  { grade: "B+", minimum: 62 }, { grade: "B", minimum: 56 }, { grade: "B-", minimum: 50 },
  { grade: "C+", minimum: 44 }, { grade: "C", minimum: 38 }, { grade: "C-", minimum: 32 },
  { grade: "D+", minimum: 26 }, { grade: "D", minimum: 20 }, { grade: "D-", minimum: 14 },
  { grade: "F", minimum: Number.NEGATIVE_INFINITY },
] as const;

export type LetterGrade = (typeof GRADE_BANDS)[number]["grade"];
export type MethodDInput = { franchiseId: string; teamName: string; draftQualityRaw: number; auctionEfficiencyRaw: number };
export type MethodDResult = MethodDInput & { methodDScore: number; grade: LetterGrade; overallRank: number };

const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const finite = (value: number, label: string) => {
  if (!Number.isFinite(value)) throw new Error(`Method D requires finite ${label}.`);
  return value;
};

function median(values: readonly number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) throw new Error("Method D requires at least one team.");
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function robustStats(values: readonly number[]) {
  const center = median(values);
  const mad = median(values.map((value) => Math.abs(value - center)));
  return { center, scale: 1.4826 * mad };
}

function robustZ(value: number, stats: { center: number; scale: number }) {
  return stats.scale === 0 ? 0 : (value - stats.center) / stats.scale;
}

export function empiricalPercentile(value: number, values: readonly number[]) {
  const less = values.filter((candidate) => candidate < value).length;
  const equal = values.filter((candidate) => candidate === value).length;
  if (!values.length) throw new Error("Empirical percentile requires at least one value.");
  return 100 * (less + 0.5 * equal) / values.length;
}

export function gradeForScore(score: number): LetterGrade {
  finite(score, "score");
  return GRADE_BANDS.find((band) => score >= band.minimum)!.grade;
}

/** Approved Method D: 70% robust-z composite and 30% centered-percentile composite. */
export function calculateMethodDScores(inputs: readonly MethodDInput[]): MethodDResult[] {
  if (inputs.length < 2) throw new Error("Method D requires at least two teams.");
  inputs.forEach((input) => { finite(input.draftQualityRaw, "Draft Quality"); finite(input.auctionEfficiencyRaw, "Auction Efficiency"); });
  const dqValues = inputs.map((input) => input.draftQualityRaw);
  const aeValues = inputs.map((input) => input.auctionEfficiencyRaw);
  const dqStats = robustStats(dqValues);
  const aeStats = robustStats(aeValues);
  const results = inputs.map((input) => {
    const robustComposite = 0.85 * robustZ(input.draftQualityRaw, dqStats) + 0.15 * robustZ(input.auctionEfficiencyRaw, aeStats);
    const percentileComposite = 0.85 * ((empiricalPercentile(input.draftQualityRaw, dqValues) - 50) / 10) + 0.15 * ((empiricalPercentile(input.auctionEfficiencyRaw, aeValues) - 50) / 10);
    const methodDScore = round(50 + 10 * (0.70 * robustComposite + 0.30 * percentileComposite));
    return { ...input, methodDScore, grade: gradeForScore(methodDScore), overallRank: 0 };
  });
  const ordered = [...results].sort((a, b) => b.methodDScore - a.methodDScore || a.franchiseId.localeCompare(b.franchiseId));
  const ranks = new Map(ordered.map((result, index) => [result.franchiseId, index + 1]));
  return results.map((result) => ({ ...result, overallRank: ranks.get(result.franchiseId)! })).sort((a, b) => a.overallRank - b.overallRank);
}

export function buildMethodDInputsFromFrozenReview(review: any): MethodDInput[] {
  return review.snapshot.teams.map((team: any) => {
    const formulaC = review.formulaC?.find((row: any) => row.franchiseId === team.franchiseId);
    const auction = review.auctionEfficiency?.teams?.find((row: any) => row.franchiseId === team.franchiseId);
    if (!formulaC || !auction) throw new Error(`Frozen review is missing Method D inputs for ${team.franchiseId}.`);
    return { franchiseId: team.franchiseId, teamName: team.currentDisplayName, draftQualityRaw: formulaC.rawDraftQuality, auctionEfficiencyRaw: auction.referenceSurplus };
  });
}

export function hydrateMethodDResults<T extends { finalGrades?: readonly MethodDResult[] }>(review: T): T & { finalGrades: MethodDResult[] } {
  if (Array.isArray(review.finalGrades)) return review as T & { finalGrades: MethodDResult[] };
  return { ...review, finalGrades: calculateMethodDScores(buildMethodDInputsFromFrozenReview(review)) };
}
