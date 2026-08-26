import type { ShadowDecisionResult } from "@/lib/auction/decisionScore";

type SeparationResult = Pick<ShadowDecisionResult, "sleeperPlayerId" | "playerName" | "marketScore" | "rayModifier"> & Partial<Pick<ShadowDecisionResult, "position" | "nflTeam" | "rawDecisionScore">>;

export type SeparationOption = "A" | "B" | "C" | "D" | "E" | "F";

export type SeparationRow = {
  result: SeparationResult;
  rawDecisionScore: number;
  displayScores: Record<SeparationOption, number>;
  ranks: Record<SeparationOption, number>;
};

export function rawDecisionScore(result: Pick<ShadowDecisionResult, "marketScore" | "rayModifier"> & Partial<Pick<ShadowDecisionResult, "rawDecisionScore">>) {
  return result.rawDecisionScore ?? result.marketScore + result.rayModifier;
}

export function clampDecisionScore(value: number) {
  return round(Math.min(Math.max(value, 0), 100));
}

export function fixedPolicyTransform(value: number, minimum = 0, maximum = 107) {
  return round(((value - minimum) / (maximum - minimum)) * 100);
}

export function percentileDisplay(value: number, sortedValues: readonly number[]) {
  if (sortedValues.length <= 1) return 100;
  const rank = sortedValues.findIndex((candidate) => candidate === value);
  return round(((sortedValues.length - 1 - Math.max(rank, 0)) / (sortedValues.length - 1)) * 100);
}

export function headroomDecisionScore(result: Pick<ShadowDecisionResult, "marketScore" | "rayModifier">, factor: number) {
  return round(result.marketScore * factor + result.rayModifier);
}

export function headroomAwareModifier(result: Pick<ShadowDecisionResult, "marketScore" | "rayModifier">) {
  return round(result.marketScore + result.rayModifier * Math.max(0, 1 - result.marketScore / 100));
}

export function rankBy(values: readonly number[]) {
  return [...values]
    .map((value, index) => ({ value, index }))
    .sort((a, b) => b.value - a.value || a.index - b.index)
    .map((entry, index) => ({ ...entry, rank: index + 1 }));
}

export function buildSeparationRows(results: readonly SeparationResult[], headroomFactor = 0.93): SeparationRow[] {
  const rawValues = results.map(rawDecisionScore);
  const sortedRaw = [...rawValues].sort((a, b) => b - a);
  const rows = results.map((result, index) => {
    const raw = rawValues[index];
    const optionF = headroomAwareModifier(result);
    return {
      result,
      rawDecisionScore: raw,
      displayScores: {
        A: clampDecisionScore(raw),
        B: clampDecisionScore(raw),
        C: percentileDisplay(raw, sortedRaw),
        D: headroomDecisionScore(result, headroomFactor),
        E: fixedPolicyTransform(raw),
        F: clampDecisionScore(optionF),
      },
      ranks: { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 },
    };
  });
  for (const option of ["A", "B", "C", "D", "E", "F"] as const) {
    rankBy(rows.map((row) => option === "B" ? row.rawDecisionScore : option === "F" ? row.rawDecisionScore : row.displayScores[option]))
      .forEach(({ index, rank }) => { rows[index].ranks[option] = rank; });
  }
  return rows;
}

export function spearmanCorrelation(rows: readonly SeparationRow[], option: SeparationOption) {
  if (rows.length < 2) return 1;
  const rawRanks = rankBy(rows.map((row) => row.rawDecisionScore));
  const optionRanks = rankBy(rows.map((row) => option === "B" ? row.rawDecisionScore : row.displayScores[option]));
  const sum = rows.reduce((total, _, index) => total + (rawRanks[index].rank - optionRanks[index].rank) ** 2, 0);
  return round(1 - (6 * sum) / (rows.length * (rows.length ** 2 - 1)));
}

export function countTies(values: readonly number[]) {
  return values.length - new Set(values).size;
}

export function round(value: number) {
  return Math.round(value * 10) / 10;
}
