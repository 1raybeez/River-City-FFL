// /lib/timeline/seasonPhase.ts

import { SeasonPhase, SeasonPhaseWeights } from "./timelineTypes";

/**
 * Linear interpolation helper
 */
function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * t;
}

/**
 * Maps NFL week → early/mid/late season phase
 * Also returns linear weighting curves for each scoring component.
 *
 * Early season: Weeks 1–5
 * Mid season: Weeks 6–11
 * Late season: Weeks 12–17
 */
export function getSeasonPhase(nflWeek: number): SeasonPhase {
  const week = Math.max(1, Math.min(17, nflWeek));

  let phase: SeasonPhase["phase"];
  let t: number;

  if (week <= 5) {
    phase = "early";
    t = (week - 1) / 4;
  } else if (week <= 11) {
    phase = "mid";
    t = (week - 6) / 5;
  } else {
    phase = "late";
    t = (week - 12) / 5;
  }

  const weights: SeasonPhaseWeights =
    phase === "early"
      ? {
          talent: lerp(0.6, 0.8, t),
          keepers: lerp(1.0, 0.8, t),
          timeline: lerp(0.6, 0.8, t),
          rosterTax: lerp(0.5, 0.7, t),
          faab: lerp(0.4, 0.6, t),
        }
      : phase === "mid"
      ? {
          talent: lerp(0.8, 1.0, t),
          keepers: lerp(0.8, 0.6, t),
          timeline: lerp(0.8, 1.0, t),
          rosterTax: lerp(0.7, 0.9, t),
          faab: lerp(0.6, 0.8, t),
        }
      : {
          talent: lerp(1.0, 1.2, t),
          keepers: lerp(0.6, 0.4, t),
          timeline: lerp(1.0, 1.2, t),
          rosterTax: lerp(0.9, 1.1, t),
          faab: lerp(0.8, 1.0, t),
        };

  return { phase, weights };
}
