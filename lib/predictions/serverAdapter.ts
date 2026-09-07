import { loadCurrentPredictionInputSnapshot } from "@/lib/predictions/inputSnapshot";
import { buildPredictionStrengthReport, type PredictionStrengthReport } from "@/lib/predictions/teamStrength";

export async function getPredictionsLeagueReport(): Promise<PredictionStrengthReport> {
  const snapshot = await loadCurrentPredictionInputSnapshot({ fresh: true });
  return buildPredictionStrengthReport(snapshot);
}
