// /lib/analyzer/evaluateTrade.ts

import { TeamData } from "../timeline/teamTypes";
import { LeagueData } from "../timeline/leagueTypes";
import { calculateTimeline } from "../timeline/timelineEngine";
import { TimelineResult } from "../timeline/timelineTypes";

interface TradeInput {
  teamA: TeamData;
  teamB: TeamData;
  league: LeagueData;
  nflWeek: number;
}

interface TradeResult {
  teamA: {
    timeline: TimelineResult;
    talentDelta: number;
    keeperDelta: number;
    injuryDelta: number;
    rosterAgeDelta: number;
    tradeAggressionDelta: number;
  };
  teamB: {
    timeline: TimelineResult;
    talentDelta: number;
    keeperDelta: number;
    injuryDelta: number;
    rosterAgeDelta: number;
    tradeAggressionDelta: number;
  };
  fairnessScore: number;
  summary: string[];
}

export function evaluateTrade({
  teamA,
  teamB,
  league,
  nflWeek,
}: TradeInput): TradeResult {
  // -----------------------------
  // 1. TIMELINE SCORES
  // -----------------------------
  const timelineA = calculateTimeline(teamA, league, nflWeek);
  const timelineB = calculateTimeline(teamB, league, nflWeek);

  // -----------------------------
  // 2. TALENT / KEEPER / AGE / INJURY / AGGRESSION
  // (These are placeholders — replace with your real logic)
  // -----------------------------
  const talentDeltaA = teamA.tradeHistory.netTalentDelta;
  const talentDeltaB = teamB.tradeHistory.netTalentDelta;

  const keeperDeltaA = teamA.keeperValue.surplus;
  const keeperDeltaB = teamB.keeperValue.surplus;

  const injuryDeltaA = teamA.injuries.impactScore;
  const injuryDeltaB = teamB.injuries.impactScore;

  const rosterAgeDeltaA = teamA.rosterAge.avgAge;
  const rosterAgeDeltaB = teamB.rosterAge.avgAge;

  const tradeAggressionA =
    teamA.tradeHistory.consolidationMoves -
    teamA.tradeHistory.rebuildMoves;

  const tradeAggressionB =
    teamB.tradeHistory.consolidationMoves -
    teamB.tradeHistory.rebuildMoves;

  // -----------------------------
  // 3. FAIRNESS SCORE (placeholder)
  // -----------------------------
  const fairnessScore = Math.max(
    0,
    100 -
      Math.abs(talentDeltaA - talentDeltaB) * 2 -
      Math.abs(keeperDeltaA - keeperDeltaB) * 1.5
  );

  // -----------------------------
  // 4. SUMMARY
  // -----------------------------
  const summary = [
    `Team A timeline: ${timelineA.timelineBadge} (${timelineA.timelineScore})`,
    `Team B timeline: ${timelineB.timelineBadge} (${timelineB.timelineScore})`,
    `Fairness score: ${fairnessScore}`,
  ];

  // -----------------------------
  // 5. RETURN FINAL RESULT
  // -----------------------------
  return {
    teamA: {
      timeline: timelineA,
      talentDelta: talentDeltaA,
      keeperDelta: keeperDeltaA,
      injuryDelta: injuryDeltaA,
      rosterAgeDelta: rosterAgeDeltaA,
      tradeAggressionDelta: tradeAggressionA,
    },
    teamB: {
      timeline: timelineB,
      talentDelta: talentDeltaB,
      keeperDelta: keeperDeltaB,
      injuryDelta: injuryDeltaB,
      rosterAgeDelta: rosterAgeDeltaB,
      tradeAggressionDelta: tradeAggressionB,
    },
    fairnessScore,
    summary,
  };
}
