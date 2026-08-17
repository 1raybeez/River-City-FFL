import type { FairnessCalibration } from "./types";

export const RIVER_CITY_HISTORICAL_CALIBRATION: FairnessCalibration = {
  version: "river-city-trades-2019-2025-v1",
  p25: 23.33,
  p50: 45.34,
  p75: 84.74,
  p90: 125.28,
};

export type HistoricalPercentileBand = "P25" | "P50" | "P75" | "P90" | "ABOVE_P90";

export function scoreHistoricalGap(gap: number, calibration: FairnessCalibration) {
  if (gap <= calibration.p25) return { score: 100, band: "P25" as const };
  if (gap <= calibration.p50) return { score: 90, band: "P50" as const };
  if (gap <= calibration.p75) return { score: 70, band: "P75" as const };
  if (gap <= calibration.p90) return { score: 40, band: "P90" as const };
  return { score: 10, band: "ABOVE_P90" as const };
}
