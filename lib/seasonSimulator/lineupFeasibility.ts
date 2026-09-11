export type ProjectedLineupCandidate = {
  playerId: string;
  playerName: string;
  position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF";
  projectedPoints: number;
  mappingMethod?: string;
  nflTeam?: string | null;
};

export type LegalProjectedLineup = {
  QB: ProjectedLineupCandidate;
  RB: ProjectedLineupCandidate;
  WR1: ProjectedLineupCandidate;
  WR2: ProjectedLineupCandidate;
  TE: ProjectedLineupCandidate;
  FLEX: ProjectedLineupCandidate;
  K: ProjectedLineupCandidate;
  DEF: ProjectedLineupCandidate;
} | null;

export function findLegalProjectedLineup(candidates: readonly ProjectedLineupCandidate[]): LegalProjectedLineup {
  const byPosition = (position: ProjectedLineupCandidate["position"]) => candidates.filter(candidate => candidate.position === position);
  const qbs = byPosition("QB");
  const rbs = byPosition("RB");
  const wrs = byPosition("WR");
  const tes = byPosition("TE");
  const ks = byPosition("K");
  const defs = byPosition("DEF");
  const flexes = candidates.filter(candidate => ["RB", "WR", "TE"].includes(candidate.position));

  const lineups: NonNullable<LegalProjectedLineup>[] = [];
  for (const QB of qbs) for (const RB of rbs) for (let wr1Index = 0; wr1Index < wrs.length; wr1Index += 1) for (let wr2Index = wr1Index + 1; wr2Index < wrs.length; wr2Index += 1) for (const TE of tes) for (const FLEX of flexes) for (const K of ks) for (const DEF of defs) {
    const selected = [QB, RB, wrs[wr1Index], wrs[wr2Index], TE, FLEX, K, DEF];
    if (new Set(selected.map(candidate => candidate.playerId)).size !== selected.length) continue;
    lineups.push({ QB, RB, WR1: wrs[wr1Index], WR2: wrs[wr2Index], TE, FLEX, K, DEF });
  }
  lineups.sort((a, b) => compareLineups(a, b));
  return lineups[0] ?? null;
}

function compareLineups(a: NonNullable<LegalProjectedLineup>, b: NonNullable<LegalProjectedLineup>): number {
  const total = lineupTotal(b) - lineupTotal(a);
  if (total !== 0) return total;
  for (const slot of ["QB", "RB", "WR1", "WR2", "TE", "FLEX", "K", "DEF"] as const) {
    const points = b[slot].projectedPoints - a[slot].projectedPoints;
    if (points !== 0) return points;
  }
  return lineupIds(a).localeCompare(lineupIds(b));
}

function lineupTotal(lineup: NonNullable<LegalProjectedLineup>): number {
  return Object.values(lineup).reduce((total, candidate) => total + candidate.projectedPoints, 0);
}

function lineupIds(lineup: NonNullable<LegalProjectedLineup>): string {
  return [lineup.QB, lineup.RB, lineup.WR1, lineup.WR2, lineup.TE, lineup.FLEX, lineup.K, lineup.DEF].map(candidate => candidate.playerId).join("|");
}
