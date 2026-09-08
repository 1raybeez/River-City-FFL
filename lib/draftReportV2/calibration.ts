import type { DraftReportV2Snapshot } from "@/lib/draftReportV2/types";
import { calculateDraftQuality } from "@/lib/draftReportV2/draftQuality";
import { POSITION_GROUP_WEIGHTS } from "@/lib/draftReportV2/types";

export type DraftQualityFormula = "A" | "B" | "C";
const round = (value: number) => Math.round(value * 100) / 100;
const weights: Record<DraftQualityFormula, { starters: number; positionGroup: number; depth: number }> = {
  A: { starters: 0.6, positionGroup: 0.25, depth: 0.15 },
  B: { starters: 0.15, positionGroup: 0.65, depth: 0.2 },
  C: { starters: 0.5, positionGroup: 0.35, depth: 0.15 },
};
const positionWeights = POSITION_GROUP_WEIGHTS;

function rank(value: number | null, values: readonly (number | null)[]) { return value === null ? null : values.filter((candidate): candidate is number => candidate !== null && candidate > value).length + 1; }

export function calculateDraftQualityCandidates(snapshot: DraftReportV2Snapshot) {
  const base = calculateDraftQuality(snapshot);
  return (Object.keys(weights) as DraftQualityFormula[]).map((formula) => {
    const formulaWeights = weights[formula];
    const teams = base.teams.map((team) => {
      const group: readonly [number | null, number][] = [
        [team.components.qbRoom.score, positionWeights.QB],
        [team.components.rbRoom.score, positionWeights.RB],
        [team.components.wrRoom.score, positionWeights.WR],
        [team.components.teRoom.score, positionWeights.TE],
      ];
      const coveredGroup = group.filter((row) => row[0] !== null) as readonly [number, number][];
      const groupWeight = coveredGroup.reduce((sum, [, weight]) => sum + weight, 0);
      const groupScore = groupWeight === 0 ? null : coveredGroup.reduce((sum, [score, weight]) => sum + score * weight, 0) / groupWeight;
      const scoreParts = [
        [team.components.startingLineup.score, formulaWeights.starters],
        [groupScore, formulaWeights.positionGroup],
        [team.components.depth.score, formulaWeights.depth],
      ].filter((row): row is [number, number] => row[0] !== null);
      return { ...team, formulaScore: round(scoreParts.reduce((sum, [score, weight]) => sum + score * weight, 0) / scoreParts.reduce((sum, [, weight]) => sum + weight, 0)) };
    });
    const scores = teams.map((team) => team.formulaScore);
    return { formula, weights: formulaWeights, positionWeights, scoreMeaning: "Provisional diagnostic only; no letter grade or final V2 overall grade.", teams: teams.map((team) => ({ ...team, formulaRank: rank(team.formulaScore, scores) })).sort((a, b) => (a.formulaRank ?? 99) - (b.formulaRank ?? 99) || a.franchiseId.localeCompare(b.franchiseId)) };
  });
}

export function componentOverlapDescription() {
  return {
    startingLineupVsRooms: "PARTIAL_DOUBLE_COUNT: lineup players are included in each position room.",
    startingLineupVsFlex: "MATERIAL_DOUBLE_COUNT if FLEX is independently weighted: the FLEX starter is already in the optimized lineup.",
    flexVsRooms: "PARTIAL_DOUBLE_COUNT: FLEX candidates overlap RB/WR/TE rooms.",
    roomsVsDepth: "EXPECTED_SUPPORTING_SIGNAL only when depth excludes optimized starters and is capped.",
    recommendation: "Use FLEX inside lineup and as unweighted versatility context; use hierarchical Formula C for candidate review.",
  } as const;
}
