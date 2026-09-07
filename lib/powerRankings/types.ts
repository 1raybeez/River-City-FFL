import type { PredictionStrengthReport, PredictionTeamStrength } from "@/lib/predictions/teamStrength";

export type CanonicalPowerRankingsPhase = "PRESEASON";

export type CanonicalPowerRankings = Omit<PredictionStrengthReport, "teams"> & {
  season: 2026;
  phase: CanonicalPowerRankingsPhase;
  teams: readonly PredictionTeamStrength[];
  semantics: "Relative preseason ranking based on current roster strength; not a projected record or win probability.";
};

export function getHomePowerRankingTeams(teams: CanonicalPowerRankings["teams"]) {
  return teams.slice(0, 5);
}
