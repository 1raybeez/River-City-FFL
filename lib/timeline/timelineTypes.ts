// /lib/timeline/timelineTypes.ts

import { TeamData } from "./teamTypes";
import { LeagueData } from "./leagueTypes";

export type TimelineTag = "contender" | "bubble" | "rebuilder";

export interface TimelineResult {
  timelineScore: number;          // Raw 0–100 score
  timelinePercent: number;        // Decimal 0.0–1.0
  timelineTag: TimelineTag;       // contender | bubble | rebuilder
  timelineBadge: string;          // emoji + label
  timelineExplanation: string[];  // Sorted by impact
}

export interface SeasonPhase {
  phase: "early" | "mid" | "late";
  weights: SeasonPhaseWeights;
}

export interface SeasonPhaseWeights {
  talent: number;
  keepers: number;
  timeline: number;
  rosterTax: number;
  faab: number;
}

// Re-export for convenience
export type { TeamData, LeagueData };
