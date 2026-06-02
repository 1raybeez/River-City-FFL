// /lib/timeline/timelineEngine.ts

import { TeamData } from "./teamTypes";
import { LeagueData } from "./leagueTypes";
import { TimelineResult, TimelineTag } from "./timelineTypes";
import { getSeasonPhase } from "./seasonPhase";

function safeNumber(value: any, fallback: number): number {
  return typeof value === "number" && !isNaN(value) ? value : fallback;
}

const badgeMap: Record<TimelineTag, string> = {
  contender: "🔥 Contender",
  bubble: "⚖️ Bubble",
  rebuilder: "🧱 Rebuilder",
};

export function calculateTimeline(
  teamData: TeamData,
  leagueData: LeagueData,
  nflWeek: number
): TimelineResult {
  const record = teamData.record;
  const injuries = teamData.injuries;
  const keepers = teamData.keeperValue;
  const rosterAge = teamData.rosterAge;
  const trades = teamData.tradeHistory;

  const winPct = safeNumber(record.winPct, 0.5);
  const powerRank = safeNumber(teamData.powerRank, leagueData.teamCount / 2);
  const pointsFor = safeNumber(teamData.pointsFor, leagueData.avgPointsFor);

  const injuryImpact = safeNumber(injuries.impactScore, 0);
  const keeperSurplus = safeNumber(keepers.surplus, 0);
  const avgAge = safeNumber(rosterAge.avgAge, leagueData.avgRosterAge);

  const netTalentDelta = safeNumber(trades.netTalentDelta, 0);
  const consolidationMoves = safeNumber(trades.consolidationMoves, 0);
  const rebuildMoves = safeNumber(trades.rebuildMoves, 0);

  const multiYearFinishes: number[] = Array.isArray(teamData.multiYearFinishes)
    ? teamData.multiYearFinishes
    : [];

  const { weights } = getSeasonPhase(nflWeek);

  // -----------------------------
  // Talent (win-now strength)
  // -----------------------------
  const talentScore =
    (1 - powerRank / leagueData.teamCount) * 100 * weights.talent;

  // -----------------------------
  // Record (actual results)
  // -----------------------------
  const recordScore = winPct * 100 * weights.timeline;

  // -----------------------------
  // Keeper surplus (future value)
  // -----------------------------
  const keeperScore =
    Math.min(keeperSurplus / 50, 1) * 100 * weights.keepers;

  // -----------------------------
  // Injuries (roster tax)
  // -----------------------------
  const injuryScore =
    Math.max(1 - injuryImpact / 10, 0) * 100 * weights.rosterTax;

  // -----------------------------
  // Age (future vs win-now)
  // -----------------------------
  const ageScore =
    (1 - Math.abs(avgAge - 27) / 10) * 100 * weights.timeline;

  // -----------------------------
  // Trades (aggression + direction)
  // -----------------------------
  const tradeAggressionScore =
    Math.min(
      (netTalentDelta + consolidationMoves * 2 - rebuildMoves * 2) / 10,
      1
    ) *
    100 *
    weights.timeline;

  // -----------------------------
  // Multi-year finishes (trend)
  // -----------------------------
  const historyScore =
    multiYearFinishes.length > 0
      ? ((multiYearFinishes.filter((x: number) => x <= 4).length /
          multiYearFinishes.length) *
          100 *
          weights.timeline)
      : 50 * weights.timeline;

  // -----------------------------
  // FAAB placeholder (future expansion)
  // -----------------------------
  const faabScore = 50 * weights.faab;

  // -----------------------------
  // Final score
  // -----------------------------
  const rawScore =
    talentScore +
    recordScore +
    keeperScore +
    injuryScore +
    ageScore +
    tradeAggressionScore +
    historyScore +
    faabScore;

  const timelineScore = Math.max(0, Math.min(rawScore, 100));
  const timelinePercent = timelineScore / 100;

  let timelineTag: TimelineTag;
  if (timelineScore >= 70) timelineTag = "contender";
  else if (timelineScore >= 40) timelineTag = "bubble";
  else timelineTag = "rebuilder";

  // -----------------------------
  // Explanations (ranked)
  // -----------------------------
  const explanations: { text: string; impact: number }[] = [
    {
      text: `This team ranks ${powerRank} in power rank, indicating strong weekly scoring stability.`,
      impact: talentScore,
    },
    {
      text: `Their win percentage reflects their current standing and contributes to their timeline posture.`,
      impact: recordScore,
    },
    {
      text: `Their keeper portfolio shows a surplus value of ${keeperSurplus}, strengthening long-term flexibility.`,
      impact: keeperScore,
    },
    {
      text: `Injury impact is currently assessed at ${injuryImpact}, affecting their weekly ceiling.`,
      impact: injuryScore,
    },
    {
      text: `The roster's average age of ${avgAge} influences their balance between short-term and long-term outlook.`,
      impact: ageScore,
    },
    {
      text: `Recent trade activity reflects a net talent delta of ${netTalentDelta}, shaping their competitive direction.`,
      impact: tradeAggressionScore,
    },
    {
      text: `Multi-year finishes indicate their historical performance trend within the league.`,
      impact: historyScore,
    },
  ];

  const timelineExplanation = explanations
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 6)
    .map((e) => e.text);

  return {
    timelineScore,
    timelinePercent,
    timelineTag,
    timelineBadge: badgeMap[timelineTag],
    timelineExplanation,
  };
}
