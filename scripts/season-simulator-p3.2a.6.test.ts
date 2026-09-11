import assert from "node:assert/strict";
import { normalizeFantasyProsFeed, FantasyProsWeeklyAdapter } from "../lib/seasonSimulator/fantasyProsAdapter";
import { findLegalProjectedLineup, type ProjectedLineupCandidate } from "../lib/seasonSimulator/lineupFeasibility";
import { buildExpectedTeamScore } from "../lib/seasonSimulator/expectedTeamScore";
import { buildProjectionEvidenceSnapshot } from "../lib/seasonSimulator/evidenceSnapshot";
import type { CrosswalkSleeperRecord } from "../lib/seasonSimulator/identityCrosswalk";
import type { NormalizedWeeklyProjection } from "../lib/seasonSimulator/prerequisites";

const sleeper = (playerId: string, full_name: string, position: CrosswalkSleeperRecord["position"], team: string): CrosswalkSleeperRecord => ({ player_id: playerId, full_name, position, team });
const baseSleeper = [sleeper("qb", "Quarterback", "QB", "BUF"), sleeper("rb", "Running Back", "RB", "BUF"), sleeper("wr1", "Wide One", "WR", "BUF"), sleeper("wr2", "Wide Two", "WR", "BUF"), sleeper("te", "Tight End", "TE", "BUF"), sleeper("flex", "Flex Player", "WR", "BUF"), sleeper("k", "Kicker", "K", "BUF"), sleeper("def", "Buffalo DST", "DEF", "BUF")];
const candidate = (playerId: string, position: ProjectedLineupCandidate["position"], projectedPoints: number): ProjectedLineupCandidate => ({ playerId, playerName: playerId, position, projectedPoints });
const fullLineup = [candidate("qb", "QB", 20), candidate("rb", "RB", 15), candidate("wr1", "WR", 10), candidate("wr2", "WR", 9), candidate("te", "TE", 8), candidate("flex", "WR", 30), candidate("k", "K", 7), candidate("def", "DEF", 6)];

const feed = normalizeFantasyProsFeed({season: 2026, week: 1, scoring: "STD", players: [
  {fpid: "qb-fp", name: "Quarterback", position_id: "QB", team_id: "BUF", stats: {points_half: 20}},
  {fpid: "rb-fp", name: "Running Back", position_id: "RB", team_id: "BUF", stats: {points_half: 0}},
  {fpid: "wr-fp", name: "Wide One", position_id: "WR", team_id: "BUF", stats: {points_half: "10.5"}},
  {fpid: "def-fp", name: "Buffalo", position_id: "DST", team_id: "BUF", stats: {points_half: 5}},
  {fpid: "bad", name: "No Points", position_id: "TE", team_id: "BUF", stats: {}},
  {fpid: "malformed", position_id: "RB", team_id: "BUF", stats: {points_half: 4}},
]}, [...baseSleeper, sleeper("def", "Buffalo", "DEF", "BUF"), sleeper("bad", "No Points", "TE", "BUF")], "2026-09-11T00:00:00.000Z");
assert.equal(feed.projections.find(p => p.providerPlayerId === "rb-fp")?.coverageStatus, "VALID_ZERO");
assert.equal(feed.projections.find(p => p.providerPlayerId === "wr-fp")?.projectedPoints, 10.5);
assert.equal(feed.projections.find(p => p.providerPlayerId === "bad")?.coverageStatus, "MISSING");
assert.equal(feed.projections.find(p => p.providerPlayerId === "malformed")?.coverageStatus, "UNRESOLVED");
assert.equal(feed.projections.find(p => p.providerPlayerId === "def-fp")?.playerId, "def");

(async () => {
let calls = 0;
const adapter = new FantasyProsWeeklyAdapter({apiKey: "secret", fetchImpl: async () => { calls += 1; return new Response(JSON.stringify({season: 2026, week: 1, players: []}), {status: 200, headers: {"last-modified": "now"}}); }, sleep: async () => undefined});
await adapter.fetchWeek(2026, 1, baseSleeper);
await adapter.fetchWeek(2026, 1, baseSleeper);
assert.equal(calls, 1);

const optimal = findLegalProjectedLineup(fullLineup);
assert.ok(optimal);
if (optimal) assert.equal(Object.values(optimal).reduce((sum, player) => sum + player.projectedPoints, 0), 105);
assert.equal(findLegalProjectedLineup(fullLineup.filter(player => player.position !== "K")), null);
assert.equal(findLegalProjectedLineup(fullLineup.filter(player => player.position !== "DEF")), null);
const tieLineup = findLegalProjectedLineup(fullLineup.concat(candidate("tie", "WR", 30)));
assert.equal(tieLineup?.FLEX.playerId, findLegalProjectedLineup(fullLineup.concat(candidate("tie", "WR", 30)))?.FLEX.playerId);

const normalized = fullLineup.map(player => ({season: 2026, week: 1, playerId: player.playerId, providerPlayerId: `fp-${player.playerId}`, playerName: player.playerName, position: player.position, nflTeam: "BUF", projectedPoints: player.projectedPoints, source: "FANTASYPROS", sourceAsOf: "now", scoringFormat: "HALF_PPR", providerVersion: "v1", coverageStatus: "PROJECTED", availabilityStatus: "UNKNOWN"}) as NormalizedWeeklyProjection);
const expected = buildExpectedTeamScore("team-1", 2026, 1, baseSleeper.map(player => ({playerId: player.player_id, playerName: player.full_name ?? player.player_id, position: player.position === "DEF" ? "DEF" : player.position as "QB" | "RB" | "WR" | "TE" | "K", nflTeam: player.team ?? null})), normalized);
assert.equal(expected.status, "AVAILABLE");
if (expected.status === "AVAILABLE") assert.equal(expected.expectedScore, 105);
const unavailable = buildExpectedTeamScore("team-2", 2026, 1, baseSleeper.filter(player => player.position !== "K").map(player => ({playerId: player.player_id, playerName: player.full_name ?? player.player_id, position: player.position === "DEF" ? "DEF" : player.position as "QB" | "RB" | "WR" | "TE" | "K", nflTeam: player.team ?? null})), normalized);
assert.deepEqual(unavailable.status === "UNAVAILABLE" ? [unavailable.expectedScore, unavailable.reason] : [], [null, "NO_PROJECTED_KICKER"]);

const snapshotInput = {schemaVersion: "season-simulator-projection-evidence-v1" as const, adapterVersion: "v1", season: 2026, week: 1, source: "FANTASYPROS" as const, sourceAsOf: "now", scoringFormat: "HALF_PPR" as const, scoringSettingsChecksum: "scoring", rosterEvidenceAsOf: "rosters", normalizedProjectionCount: normalized.length, identityDiagnostics: {}, teamResults: [expected], unavailableTeamDiagnostics: [] as readonly unknown[]};
const firstSnapshot = buildProjectionEvidenceSnapshot({...snapshotInput, projections: normalized, input: {roster: "same"}});
const secondSnapshot = buildProjectionEvidenceSnapshot({...snapshotInput, projections: normalized, input: {roster: "same"}});
assert.equal(firstSnapshot.inputChecksum, secondSnapshot.inputChecksum);
assert.notEqual(firstSnapshot.inputChecksum, buildProjectionEvidenceSnapshot({...snapshotInput, projections: normalized.slice(1), input: {roster: "same"}}).inputChecksum);
console.log("P3.2A.6 adapter, optimizer, expected-score, and snapshot tests passed.");
})();
