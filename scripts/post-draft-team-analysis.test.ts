import assert from "node:assert/strict";
import { buildLeaguePositionStrengths, buildPostDraftTeamAnalysis } from "@/lib/postDraftTeamAnalysis";
import type { PostDraftMetricsInput, PostDraftPublicRecord } from "@/lib/postDraftMetrics";

const record = {
  season: 2026, franchiseId: "test-team", rosterId: 1, teamName: "Test Team", generatedAt: "2026-01-01", source: { draftId: null, draftStatus: "complete", metricsSchemaVersion: "post-draft-metrics-v1" }, coverage: { status: "complete", warnings: [], rosterValueCount: 5, valueDifferentialCount: 5, adpCount: 5, positionCount: 5 }, metrics: {
    totalSpend: 200, remainingBudget: 300, positionSpend: { RB: { totalSpend: 100, playerCount: 2, shareOfTotalSpend: .5 }, QB: { totalSpend: 20, playerCount: 1, shareOfTotalSpend: .1 }, WR: { totalSpend: 80, playerCount: 2, shareOfTotalSpend: .4 } }, positionCounts: { RB: 2, QB: 1, WR: 2 }, rosterSize: 5, starterCount: 3, benchDepthCount: 2, rosterValue: 300, valueDifferential: { total: 10, average: 2, comparablePlayerCount: 5 }, bestBuy: null, biggestReach: null, keeperCount: 0, totalKeeperCost: 0, keeperPublishedValue: 0, keeperValueDifferential: 0, nonKeeperAuctionSpend: 200, adpContext: { acquiredPlayerCount: 5, playersWithAdp: 5, averageAcquisitionAdp: 20 }, powerRanking: { rank: 1, rosterValue: 300, averageSOS: 0, rawScore: 0, normalizedIndex: 0, coverage: "complete", status: "Preseason Outlook" }, requiredStarterSlots: { QB: 1, RB: 2, WR: 2 }, coveredStarterSlots: 3, uncoveredStarterSlots: 2, starterCoverageByPosition: { QB: { required: 1, covered: 1, uncovered: 0 }, RB: { required: 2, covered: 2, uncovered: 0 }, WR: { required: 2, covered: 0, uncovered: 2 } }, depthByPosition: {}, totalDepth: 2, depthCoverageStatus: "complete", rosterSlotCapacity: 5, rosterCompleteness: { filledSlots: 5, capacity: 5, ratio: 1, status: "complete" },
  },
} as unknown as PostDraftPublicRecord;

const input = {
  season: 2026, draftId: null, draftStatus: "complete", draftPickCount: 5,
  rosters: [{ rosterId: 1, ownerUserId: "owner", teamName: "Test Team", playerIds: ["rb1", "rb2", "qb1", "wr1", "wr2"], starterIds: ["rb1", "rb2", "qb1"] }],
  acquisitions: ["rb1", "rb2", "qb1", "wr1", "wr2"].map((playerId, index) => ({ playerId, playerName: playerId, position: playerId.startsWith("rb") ? "RB" : playerId.startsWith("qb") ? "QB" : "WR", nflTeam: null, rosterId: 1, purchasePrice: [60, 40, 20, 40, 40][index], isKeeper: false, pickNumber: index + 1, keeperCost: null })),
  players: new Map([["rb1", { playerId: "rb1", playerName: "RB One", position: "RB", nflTeam: null, publishedValue: 90, adp: 1 }], ["rb2", { playerId: "rb2", playerName: "RB Two", position: "RB", nflTeam: null, publishedValue: 70, adp: 2 }], ["qb1", { playerId: "qb1", playerName: "QB One", position: "QB", nflTeam: null, publishedValue: 50, adp: 3 }], ["wr1", { playerId: "wr1", playerName: "WR One", position: "WR", nflTeam: null, publishedValue: 45, adp: 4 }], ["wr2", { playerId: "wr2", playerName: "WR Two", position: "WR", nflTeam: null, publishedValue: 45, adp: 5 }]]),
  powerRankings: {} as never, rosterRequirements: { rosterPositions: ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"], requiredStarterSlots: { QB: 1, RB: 2, WR: 2, TE: 1, K: 1, DEF: 1 }, flexSlots: 1, flexEligiblePositions: ["RB", "WR", "TE"], rosterSlotCapacity: 9, source: "Sleeper league.roster_positions" },
} as PostDraftMetricsInput;

const peerPlayers = Array.from({ length: 11 }, (_, index) => [
  [`peer-qb-${index}`, { playerId: `peer-qb-${index}`, playerName: `Peer QB ${index}`, position: "QB", nflTeam: null, publishedValue: 60 + index, adp: null }],
  [`peer-rb-${index}`, { playerId: `peer-rb-${index}`, playerName: `Peer RB ${index}`, position: "RB", nflTeam: null, publishedValue: index === 0 ? 300 : 5, adp: null }],
  [`peer-wr-a-${index}`, { playerId: `peer-wr-a-${index}`, playerName: `Peer WR A ${index}`, position: "WR", nflTeam: null, publishedValue: 100, adp: null }],
  [`peer-wr-b-${index}`, { playerId: `peer-wr-b-${index}`, playerName: `Peer WR B ${index}`, position: "WR", nflTeam: null, publishedValue: 100, adp: null }],
  [`peer-te-a-${index}`, { playerId: `peer-te-a-${index}`, playerName: `Peer TE A ${index}`, position: "TE", nflTeam: null, publishedValue: 20, adp: null }],
  [`peer-te-b-${index}`, { playerId: `peer-te-b-${index}`, playerName: `Peer TE B ${index}`, position: "TE", nflTeam: null, publishedValue: 20, adp: null }],
]).flat() as [string, any][];
const leagueInput = {
  ...input,
  rosters: [
    { ...input.rosters[0], playerIds: [...input.rosters[0].playerIds, "rb3"] },
    ...Array.from({ length: 11 }, (_, index) => ({ rosterId: index + 2, ownerUserId: `peer-${index}`, teamName: `Peer ${index}`, playerIds: [`peer-qb-${index}`, `peer-rb-${index}`, `peer-wr-a-${index}`, `peer-wr-b-${index}`, `peer-te-a-${index}`, `peer-te-b-${index}`], starterIds: [`peer-qb-${index}`, `peer-rb-${index}`, `peer-wr-a-${index}`, `peer-wr-b-${index}`, `peer-te-a-${index}`] })),
  ],
  players: new Map([...input.players, ["rb3", { playerId: "rb3", playerName: "RB Three", position: "RB", nflTeam: null, publishedValue: 10, adp: null }], ...peerPlayers]),
} as PostDraftMetricsInput;
const leagueMetrics = { records: [record, ...Array.from({ length: 11 }, (_, index) => ({ ...record, franchiseId: `peer-${index}`, rosterId: index + 2 }))] } as never;

const analysis = buildPostDraftTeamAnalysis(record, input);
assert.match(analysis.strengths[0], /RB One and RB Two/);
assert.match(analysis.concerns.join(" "), /quarterback/);
assert.match(analysis.nextMoves.join(" "), /QB|quarterback|trade|waivers/);
assert.ok(!JSON.stringify(analysis).includes("War Room"));
const ranked = buildLeaguePositionStrengths({ records: [record], } as never, input).get("test-team") ?? [];
assert.equal(ranked.find((row) => row.position === "DST")?.rank, null);
assert.equal(ranked.find((row) => row.position === "K")?.label, "DATA UNAVAILABLE");
const rankedAnalysis = buildPostDraftTeamAnalysis(record, input, { records: [record] } as never);
assert.match(rankedAnalysis.strengths.join(" "), /#1/);
assert.match(rankedAnalysis.insights.map((item) => item.text).join(" "), /#1/);
const semanticRecord = { ...record, metrics: { ...record.metrics, bestBuy: { playerId: "save", playerName: "Savings Player", position: "WR", purchasePrice: 8, publishedValue: 10, valueDifferential: 2, adp: 1 }, biggestReach: { playerId: "overpay", playerName: "Overpay Player", position: "RB", purchasePrice: 18, publishedValue: 10, valueDifferential: -8, adp: 2 } } } as PostDraftPublicRecord;
const semanticAnalysis = buildPostDraftTeamAnalysis(semanticRecord, input);
assert.match(semanticAnalysis.insights.map((item) => item.text).join(" "), /\$2 below market value/);
assert.match(semanticAnalysis.insights.map((item) => item.text).join(" "), /\$8 above market value/);
assert.doesNotMatch(semanticAnalysis.insights.map((item) => item.text).join(" "), /canonical|published positional|comparable-player/);
const noReach = buildPostDraftTeamAnalysis({ ...record, metrics: { ...record.metrics, bestBuy: null, biggestReach: null } } as PostDraftPublicRecord, input);
assert.match(noReach.insights.find((item) => item.label === "Biggest Reach")?.text ?? "", /NO MAJOR REACH/);
const named = buildPostDraftTeamAnalysis(record, leagueInput, leagueMetrics);
assert.match(named.nextMoves.join(" "), /RB Two/);
assert.match(named.nextMoves.join(" "), /RB One/);
assert.match(named.nextMoves.join(" "), /quarterback upgrade/);
assert.doesNotMatch(named.nextMoves.join(" "), /Peer|Josh Allen|trade .* for/);
console.log("Post-draft team analysis checks passed.");
