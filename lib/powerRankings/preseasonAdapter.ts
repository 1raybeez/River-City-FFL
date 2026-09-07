import { getPredictionsLeagueReport } from "@/lib/predictions/serverAdapter";
import type { CanonicalPowerRankings } from "@/lib/powerRankings/types";

export async function getPreseasonPowerRankings(): Promise<CanonicalPowerRankings> {
  const report = await getPredictionsLeagueReport();
  const franchiseIds = new Set(report.teams.map((team) => team.franchiseId));
  if (report.teams.length !== 12 || franchiseIds.size !== report.teams.length) {
    throw new Error("Canonical preseason Power Rankings require 12 unique franchise results.");
  }
  return {
    ...report,
    season: 2026,
    phase: "PRESEASON",
    semantics: "Relative preseason ranking based on current roster strength; not a projected record or win probability.",
  };
}
