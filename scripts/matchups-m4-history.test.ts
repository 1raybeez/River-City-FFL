import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");
const route = readFileSync("app/api/matchups/history/route.ts", "utf8");

assert.match(route, /loadOwnerHeadToHeadPresentation/);
assert.match(route, /presentation\.meetings\.slice\(0, 5\)/);
assert.match(route, /presentation\.notableMeetings/);
assert.match(route, /largestLoss/);
assert.match(route, /getRivalry\(owner, opponent\)/);
assert.match(route, /rivalryHref/);
assert.match(route, /supported: presentation\.isSummarySupported/);
assert.match(route, /coverage: presentation\.coverage/);
assert.match(route, /streak: null/);
assert.doesNotMatch(route, /getOwnerHeadToHeadMeetings\([^)]*\).*filter/);

assert.match(page, /Historical Context/);
assert.match(page, /Recent Meetings/);
assert.match(page, /Closest game/);
assert.match(page, /Largest win/);
assert.match(page, /Streak: unavailable in the canonical history source/);
assert.match(page, /View Full Head-to-Head/);
assert.match(page, /View Rivalry Hub/);
assert.match(page, /historyPairs/);
assert.match(page, /Promise\.all\(historyPairs\.map/);
assert.match(page, /HistoryContext history=\{history\}/);

const historyFixture = {
  supported: true,
  ownerFranchiseName: "Prestigio Mundial",
  opponentFranchiseName: "The Shake-N-Bakers",
  series: {
    regularMeetings: "10",
    championshipPlayoffMeetings: "2",
    championshipGames: "1",
  },
  recentMeetings: [
    {
      meetingKey: "2025-week-14",
      season: 2025,
      contextLabel: "Week 14",
      classificationLabel: "Regular Season",
      isChampionshipGame: false,
      scoreLabel: "Prestigio Mundial 142.3, The Shake-N-Bakers 137.8",
      marginLabel: "Prestigio Mundial by 4.5",
      resultLabel: "Win" as const,
      ownerFranchiseName: "Prestigio Mundial",
      opponentFranchiseName: "The Shake-N-Bakers",
    },
  ],
};

assert.equal(historyFixture.recentMeetings.length, 1);
assert.equal(historyFixture.series.championshipGames, "1");
assert.equal(historyFixture.recentMeetings[0].resultLabel, "Win");
assert.equal(historyFixture.recentMeetings[0].season, 2025);

console.log("Matchups M4 historical context checks passed.");
