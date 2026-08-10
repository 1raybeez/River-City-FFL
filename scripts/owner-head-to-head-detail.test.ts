import assert from "node:assert/strict";
import type {
  CanonicalFranchiseMatchup,
  CanonicalMatchupType,
} from "../lib/history/canonicalMatchupHistory";
import {
  buildOwnerMatchupProjections,
  getOwnerMatchupProjectionCoverage,
} from "../lib/history/ownerMatchupProjection";
import {
  buildOwnerMatchupSummaries,
} from "../lib/history/ownerMatchupSummary";
import { getAllOwnerSeasonHistory } from "../lib/history/ownerSeasonHistory";
import {
  buildOwnerHeadToHeadDetails,
  getAllOwnerHeadToHeadDetails,
  getAllSupportedDirectionalHeadToHeadPairs,
  getOwnerHeadToHeadBuildCoverage,
  getOwnerHeadToHeadCoverage,
  getOwnerHeadToHeadDetail,
  getOwnerHeadToHeadMeeting,
  getOwnerHeadToHeadMeetings,
  getOwnerHeadToHeadMeetingsChronological,
} from "../lib/history/ownerHeadToHeadDetail";
import { ownerProfiles } from "../lib/managers/identityData";

function canonicalMatchup({
  key,
  season,
  type,
  home,
  away,
  homeScore = 100,
  awayScore = 90,
  complete = true,
  title = false,
  scoringWeeks = [1],
}: {
  key: string;
  season: number;
  type: CanonicalMatchupType;
  home: string | null;
  away: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  complete?: boolean;
  title?: boolean;
  scoringWeeks?: number[];
}): CanonicalFranchiseMatchup {
  const scoresResolved = homeScore !== null && awayScore !== null;
  const winner =
    complete && scoresResolved && homeScore !== awayScore
      ? (homeScore as number) > (awayScore as number)
        ? home
        : away
      : null;
  const loser =
    complete && scoresResolved && homeScore !== awayScore
      ? (homeScore as number) > (awayScore as number)
        ? away
        : home
      : null;
  const playoff = type !== "regular" && type !== "bye" && type !== "incomplete";

  return {
    matchupKey: key,
    season,
    leagueId: `head-to-head-fixture-${season}`,
    week: scoringWeeks[0] ?? 1,
    matchupType: type,
    bracketType: playoff ? (type === "championship-playoff" ? "winners" : "losers") : null,
    round: playoff ? 1 : null,
    bracketPlacement: title ? 1 : null,
    isChampionshipGame: title,
    scoringPeriods: scoringWeeks.map((week) => ({
      week,
      sourceMatchupId: type === "regular" ? 1 : null,
      homeScore: homeScore === null ? null : homeScore / scoringWeeks.length,
      awayScore: awayScore === null ? null : awayScore / scoringWeeks.length,
      isComplete: complete && scoresResolved,
    })),
    homeFranchiseId: home,
    awayFranchiseId: away,
    homeScore,
    awayScore,
    winnerFranchiseId: winner,
    loserFranchiseId: loser,
    isComplete: complete,
    correctionVersion: 1,
    source: {
      provider: "sleeper",
      sourceType: type === "regular" ? "weekly-matchup" : "bracket",
      bracketType: playoff ? (type === "championship-playoff" ? "winners" : "losers") : null,
      sourceMatchupId: type === "regular" ? 1 : null,
      bracketMatchNumber: playoff ? 1 : null,
      retrievedAt: null,
      sourceVersion: "head-to-head-fixture-v1",
    },
    coverage: {
      pairing: away === null ? "partial" : "resolved",
      scores: scoresResolved ? "resolved" : "missing",
      completion: complete ? "resolved" : "incomplete",
      franchises: "mapped",
      classification: complete ? "resolved" : "incomplete",
    },
  };
}

assert.throws(() => getAllOwnerHeadToHeadDetails(), /not initialized/);
assert.throws(
  () => getOwnerHeadToHeadDetail("ray-long", "wade-cameron"),
  /not initialized/
);
assert.throws(() => getOwnerHeadToHeadMeeting("missing"), /not initialized/);
assert.throws(() => getOwnerHeadToHeadBuildCoverage(), /not initialized/);

const canonicalMatchups: CanonicalFranchiseMatchup[] = [
  canonicalMatchup({
    key: "detail:2024:regular:prestigio-wildcard",
    season: 2024,
    type: "regular",
    home: "prestigio-mundial",
    away: "the-wildcard",
    homeScore: 110,
    awayScore: 100,
  }),
  canonicalMatchup({
    key: "detail:2024:title:prestigio-wildcard",
    season: 2024,
    type: "championship-playoff",
    home: "the-wildcard",
    away: "prestigio-mundial",
    homeScore: 120,
    awayScore: 105,
    title: true,
    scoringWeeks: [15, 16],
  }),
  canonicalMatchup({
    key: "detail:2024:third:prestigio-wildcard",
    season: 2024,
    type: "third-place",
    home: "prestigio-mundial",
    away: "the-wildcard",
    homeScore: 95,
    awayScore: 90,
  }),
  canonicalMatchup({
    key: "detail:2024:placement:prestigio-wildcard",
    season: 2024,
    type: "placement",
    home: "prestigio-mundial",
    away: "the-wildcard",
  }),
  canonicalMatchup({
    key: "detail:2024:toilet:prestigio-wildcard",
    season: 2024,
    type: "toilet-bowl",
    home: "prestigio-mundial",
    away: "the-wildcard",
  }),
  canonicalMatchup({
    key: "detail:2024:consolation:prestigio-wildcard",
    season: 2024,
    type: "consolation",
    home: "prestigio-mundial",
    away: "the-wildcard",
  }),
  canonicalMatchup({
    key: "detail:2024:tie:wildcard-prestigio",
    season: 2024,
    type: "regular",
    home: "the-wildcard",
    away: "prestigio-mundial",
    homeScore: 88,
    awayScore: 88,
  }),
  canonicalMatchup({
    key: "detail:2024:third:shake-special",
    season: 2024,
    type: "third-place",
    home: "shake-n-bakers",
    away: "special-brownies",
  }),
  canonicalMatchup({
    key: "detail:2025:regular:shake-hawkins",
    season: 2025,
    type: "regular",
    home: "shake-n-bakers",
    away: "hawkins-heroes",
  }),
  canonicalMatchup({
    key: "detail:2026:bye:prestigio",
    season: 2026,
    type: "bye",
    home: "prestigio-mundial",
    away: null,
  }),
  canonicalMatchup({
    key: "detail:2026:incomplete:prestigio-wildcard",
    season: 2026,
    type: "incomplete",
    home: "prestigio-mundial",
    away: "the-wildcard",
    homeScore: null,
    awayScore: null,
    complete: false,
  }),
];

const ownerSeasonRecords = getAllOwnerSeasonHistory();
const profiles = ownerProfiles.map(({ id, slug, status }) => ({ id, slug, status }));
const projections = buildOwnerMatchupProjections({
  canonicalMatchups,
  ownerSeasonRecords,
});
const projectionCoverage = getOwnerMatchupProjectionCoverage();
const summaries = buildOwnerMatchupSummaries({
  projections,
  ownerSeasonRecords,
  ownerProfiles: profiles,
  projectionCoverage,
});
const input = {
  canonicalMatchups,
  projections,
  opponentSummaries: summaries.opponentSummaries,
  careerSummaries: summaries.careerSummaries,
  seasonSummaries: summaries.seasonSummaries,
  ownerProfiles: profiles,
  projectionCoverage,
};
const inputSnapshot = JSON.stringify(input);
const firstBuild = buildOwnerHeadToHeadDetails(input);
const firstSnapshot = JSON.stringify(firstBuild);
const secondBuild = buildOwnerHeadToHeadDetails(input);
assert.equal(JSON.stringify(secondBuild), firstSnapshot);
assert.equal(JSON.stringify(input), inputSnapshot);

assert.equal(Object.isFrozen(firstBuild), true);
assert.equal(Object.isFrozen(firstBuild.details), true);
assert.equal(Object.isFrozen(firstBuild.meetings), true);
assert.equal(Object.isFrozen(firstBuild.meetings[0].scoringPeriods), true);
assert.equal(
  new Set(firstBuild.details.map((detail) => detail.relationshipKey)).size,
  firstBuild.details.length
);
assert.equal(
  new Set(firstBuild.meetings.map((meeting) => meeting.meetingKey)).size,
  firstBuild.meetings.length
);
assert.equal(
  getAllSupportedDirectionalHeadToHeadPairs().length,
  summaries.opponentSummaries.length
);
assert.equal(Object.isFrozen(getAllSupportedDirectionalHeadToHeadPairs()), true);
assert.equal(
  Object.isFrozen(
    getOwnerHeadToHeadMeetings("ray-long", "jeffrey-hudgins")
  ),
  true
);

const rayVsWade = getOwnerHeadToHeadDetail("ray-long", "wade-cameron");
const wadeVsRay = getOwnerHeadToHeadDetail("wade-cameron", "ray-long");
const jeffreyVsWade = getOwnerHeadToHeadDetail(
  "jeffrey-hudgins",
  "wade-cameron"
);
assert.ok(rayVsWade?.summary);
assert.ok(wadeVsRay?.summary);
assert.ok(jeffreyVsWade?.summary);
assert.deepEqual(rayVsWade.summary, summaries.opponentSummaries.find(
  (summary) => summary.ownerId === "ray-long" && summary.opponentOwnerId === "wade-cameron"
));
assert.equal(rayVsWade.relationshipKey, "owner-head-to-head:ray-long:vs:wade-cameron");
assert.equal(rayVsWade.summary.meetings, 7);
assert.equal(rayVsWade.summary.records.overall.games, 3);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron").length, 7);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron", "competitive").length, 3);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron", "regular").length, 2);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron", "championship-playoff").length, 1);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron", "championship-game").length, 1);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron", "third-place").length, 1);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron", "placement").length, 1);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron", "toilet-bowl").length, 1);
assert.equal(getOwnerHeadToHeadMeetings("ray-long", "wade-cameron", "consolation").length, 1);
assert.equal(rayVsWade.summary.records.overall.ties, 1);

const rayMeetings = getOwnerHeadToHeadMeetings("ray-long", "wade-cameron");
const chronological = getOwnerHeadToHeadMeetingsChronological("ray-long", "wade-cameron");
assert.deepEqual(
  [...chronological].reverse().map((meeting) => meeting.season),
  rayMeetings.map((meeting) => meeting.season)
);
const titleMeeting = rayMeetings.find((meeting) => meeting.isChampionshipGame);
assert.ok(titleMeeting);
assert.equal(titleMeeting.classification, "championship-playoff");
assert.equal(titleMeeting.scoringPeriods.length, 2);
assert.equal(
  getOwnerHeadToHeadMeeting(titleMeeting.meetingKey)?.canonicalMatchupKey,
  titleMeeting.canonicalMatchupKey
);
assert.equal(
  titleMeeting.meetingKey,
  `owner-head-to-head-meeting:ray-long:vs:wade-cameron:matchup:${titleMeeting.canonicalMatchupKey}`
);

const wadeMeetingByCanonical = new Map(
  getOwnerHeadToHeadMeetings("wade-cameron", "ray-long").map((meeting) => [
    meeting.canonicalMatchupKey,
    meeting,
  ])
);
rayMeetings.forEach((meeting) => {
  const reverse = wadeMeetingByCanonical.get(meeting.canonicalMatchupKey);
  assert.ok(reverse);
  assert.equal(meeting.ownerScore, reverse.opponentScore);
  assert.equal(meeting.opponentScore, reverse.ownerScore);
  assert.equal(meeting.pointDifferential + reverse.pointDifferential, 0);
  assert.equal(
    meeting.result === "win" ? "loss" : meeting.result === "loss" ? "win" : "tie",
    reverse.result
  );
  assert.deepEqual(meeting.winnerOwnerIds, reverse.winnerOwnerIds);
  assert.deepEqual(meeting.loserOwnerIds, reverse.loserOwnerIds);
});

assert.equal(getOwnerHeadToHeadDetail("ray-long", "jeffrey-hudgins"), null);
assert.equal(getOwnerHeadToHeadDetail("jeffrey-hudgins", "ray-long"), null);
assert.equal(
  getOwnerHeadToHeadCoverage("ray-long", "jeffrey-hudgins")?.state,
  "not-applicable"
);
assert.equal(jeffreyVsWade.summary.meetings, rayVsWade.summary.meetings);

const jordanVsLandon = getOwnerHeadToHeadDetail("jordan-maslyn", "landon-elliott");
assert.ok(jordanVsLandon?.summary);
assert.deepEqual(jordanVsLandon.summary.seasons, [2024]);
assert.equal(
  getOwnerHeadToHeadMeetings("jordan-maslyn", "landon-elliott").some(
    (meeting) => meeting.season >= 2025
  ),
  false
);
assert.equal(
  getOwnerHeadToHeadMeetings("landon-elliott", "jordan-maslyn")[0]?.ownerFranchiseId,
  "special-brownies"
);

assert.equal(
  firstBuild.details.some(
    (detail) => detail.ownerId === "aaron-hawkins" && detail.coverage.approvedOverlapSeasons.includes(2023)
  ),
  false
);
assert.equal(
  firstBuild.details.some(
    (detail) => detail.ownerId === "nakedbuddha" || detail.opponentOwnerId === "nakedbuddha"
  ),
  false
);
assert.equal(firstBuild.meetings.some((meeting) => meeting.season < 2018), false);
assert.equal(
  firstBuild.meetings.some(
    (meeting) => meeting.classification === ("bye" as never) || meeting.classification === ("incomplete" as never)
  ),
  false
);
assert.equal(
  getOwnerHeadToHeadCoverage("aaron-hawkins", "wade-cameron")?.state,
  "available-no-completed-pair-meetings"
);
assert.equal(
  getOwnerHeadToHeadCoverage("ray-long", "wade-cameron")?.isPartialCareerCoverage,
  true
);
assert.equal(
  getOwnerHeadToHeadCoverage("ray-long", "wade-cameron")?.sourceEnabledNoMeetingSeasons.includes(2026),
  true
);

firstBuild.meetings.forEach((meeting) => {
  const summary = firstBuild.details.find(
    (detail) => detail.relationshipKey === meeting.relationshipKey
  )?.summary;
  assert.ok(summary);
  assert.equal(
    meeting.notable.isClosestMeeting,
    summary.factualExtremes.closestMeeting?.canonicalMatchupKey === meeting.canonicalMatchupKey &&
      summary.factualExtremes.closestMeeting.ownerMatchupKey === meeting.ownerMatchupKey
  );
});

const buildCoverage = getOwnerHeadToHeadBuildCoverage();
assert.equal(buildCoverage.supportedDirectionalRelationships, summaries.opponentSummaries.length);
assert.equal(buildCoverage.directionalMeetings, summaries.opponentSummaries.reduce((total, summary) => total + summary.meetings, 0));
assert.equal(buildCoverage.competitiveMeetingCredits, summaries.opponentSummaries.reduce((total, summary) => total + summary.records.overall.games, 0));
assert.equal(buildCoverage.secondaryClassificationMeetingCredits, buildCoverage.directionalMeetings - buildCoverage.competitiveMeetingCredits);
assert.deepEqual(buildCoverage.duplicateRelationshipKeys, []);
assert.deepEqual(buildCoverage.duplicateMeetingKeys, []);
assert.deepEqual(buildCoverage.relationshipReconciliationFailures, []);
assert.deepEqual(buildCoverage.teammateViolations, []);
assert.deepEqual(buildCoverage.helperAttributionViolations, []);

const preservedCache = JSON.stringify(getAllOwnerHeadToHeadDetails());
const inconsistentSummary = {
  ...summaries.opponentSummaries[0],
  meetings: summaries.opponentSummaries[0].meetings + 1,
};
assert.throws(
  () =>
    buildOwnerHeadToHeadDetails({
      ...input,
      opponentSummaries: [
        inconsistentSummary,
        ...summaries.opponentSummaries.slice(1),
      ],
    }),
  /reconciliation failed/
);
assert.equal(JSON.stringify(getAllOwnerHeadToHeadDetails()), preservedCache);
assert.throws(
  () =>
    buildOwnerHeadToHeadDetails({
      ...input,
      canonicalMatchups: [...canonicalMatchups, canonicalMatchups[0]],
    }),
  /duplicate keys/
);
assert.equal(JSON.stringify(getAllOwnerHeadToHeadDetails()), preservedCache);

console.log("Owner head-to-head detail tests passed.");
console.log(JSON.stringify(buildCoverage, null, 2));
