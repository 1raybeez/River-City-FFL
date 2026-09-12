export type WeeklySpotlightPhase = "PRESEASON" | "WEEK_ACTIVE" | "PLAYOFFS" | "CHAMPIONSHIP_WEEK";

export function getWeeklySpotlightLabel(phase: WeeklySpotlightPhase, hasFinalizedWinner: boolean) {
  if (phase === "CHAMPIONSHIP_WEEK") return "CHAMPIONSHIP SPOTLIGHT";
  if (phase === "PLAYOFFS") return "PLAYOFF SPOTLIGHT";
  if (hasFinalizedWinner) return "WEEKLY HIGH SCORE";
  return "2026 WEEKLY SPOTLIGHT";
}
