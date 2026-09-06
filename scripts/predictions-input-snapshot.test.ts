import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { buildPredictionInputSnapshot } from "../lib/predictions/inputSnapshot";

const rosters = canonicalAuctionTeams.map((team) => ({
  roster_id: team.rosterId,
  owner_id: `user-${team.rosterId}`,
  players: [`player-${team.rosterId}`, `missing-fc-${team.rosterId}`],
  starters: [`player-${team.rosterId}`],
}));
const playerDirectory = Object.fromEntries(canonicalAuctionTeams.map((team) => [
  `player-${team.rosterId}`,
  { playerId: `player-${team.rosterId}`, displayName: `Player ${team.rosterId}`, position: "WR", nflTeam: "RC" },
  ]).concat(canonicalAuctionTeams.map((team) => [
    `missing-fc-${team.rosterId}`,
    { playerId: `missing-fc-${team.rosterId}`, displayName: `Missing Evidence ${team.rosterId}`, position: "RB", nflTeam: "RC" },
  ])));
const snapshot = buildPredictionInputSnapshot({
  rosters,
  users: [{ user_id: `user-${canonicalAuctionTeams[0].rosterId}`, metadata: { team_name: "Fixture Current Display" } }],
  playerDirectory,
  fantasyCalc: new Map(canonicalAuctionTeams.map((team) => [`player-${team.rosterId}`, {
    playerId: `player-${team.rosterId}`, rawSourceValue: 100, fantasycalcOverallRank: 1, fantasycalcPositionRank: 1,
    fantasycalcTrend30Day: null, generatedAt: "2026-08-31T20:36:31.331Z", fantasycalcName: "Player",
    fantasycalcId: "fc", fantasycalcSleeperId: `player-${team.rosterId}`,
  }])),
  ros: {
    valid: true, errors: [], playerCount: 12, generatedAt: "2026-08-31T23:59:59.000Z", sourceNames: ["Fixture"],
    artifactId: "fixture-ros", artifactPath: "fixture", checksum: "fixture", rows: new Map(canonicalAuctionTeams.map((team) => [`player-${team.rosterId}`, {
      playerId: `player-${team.rosterId}`, playerName: "Player", consensusOverallRank: 1, consensusPositionalRank: 1,
      sourceCount: 1, staleSourceCount: 0, generatedAt: "2026-08-31T23:59:59.000Z", freshness: "FRESH", confidence: "HIGH",
      sourceRanks: [{ source: "Fixture", overallRank: 1, positionalRank: 1 }],
    }])),
  },
  generatedAt: "2026-09-06T12:00:00.000Z",
});

assert.equal(snapshot.schemaVersion, "predictions-input-v1");
assert.equal(snapshot.franchises.length, 12);
assert.equal(snapshot.franchises[0].canonicalTeamName, canonicalAuctionTeams[0].teamName);
assert.equal(snapshot.franchises[0].currentTeamName, "Fixture Current Display");
assert.equal(snapshot.franchises[1].currentTeamName, snapshot.franchises[1].canonicalTeamName);
assert.equal(new Set(snapshot.franchises.map((team) => team.franchiseId)).size, 12);
assert.equal(new Set(snapshot.franchises.map((team) => team.currentSleeperRosterId)).size, 12);
assert.deepEqual(snapshot.franchises.map((team) => team.currentSleeperRosterId), canonicalAuctionTeams.map((team) => team.rosterId));
assert.equal(snapshot.coverage.identity.state, "COMPLETE");
assert.equal(snapshot.coverage.position.state, "COMPLETE");
assert.equal(snapshot.coverage.fantasyCalc.state, "PARTIAL");
assert.equal(snapshot.coverage.ros.state, "PARTIAL");
const firstRosterId = canonicalAuctionTeams[0].rosterId;
const firstFranchisePlayers = snapshot.franchises[0].rosterPlayers;
const coveredPlayer = firstFranchisePlayers.find((player) => player.sleeperPlayerId === `player-${firstRosterId}`)!;
const missingPlayer = firstFranchisePlayers.find((player) => player.sleeperPlayerId === `missing-fc-${firstRosterId}`)!;
assert(snapshot.coverage.fantasyCalc.missingIds.includes(`missing-fc-${firstRosterId}`));
assert.equal(coveredPlayer.evidence.fantasyCalc?.value, 100);
assert.equal(coveredPlayer.evidence.ros?.overallRank, 1);
assert.equal(missingPlayer.evidence.fantasyCalc, null);
assert.equal(missingPlayer.evidence.ros, null);
assert.equal(snapshot.evidenceFreshness[0].generatedAt, "2026-08-31T20:36:31.331Z");
assert.equal(snapshot.evidenceFreshness[1].generatedAt, "2026-08-31T23:59:59.000Z");
assert.equal("teamStrengthScore" in snapshot, false);
assert.equal("rankings" in snapshot, false);
assert.equal("projectedRecord" in snapshot, false);
assert.equal("playoffProbability" in snapshot, false);
assert.equal("championshipProbability" in snapshot, false);
assert.match(readFileSync("lib/predictions/inputSnapshot.ts", "utf8"), /getLeagueRosters/);
assert.doesNotMatch(readFileSync("lib/predictions/inputSnapshot.ts", "utf8"), /postDraftDraftNightRoster/);
assert.doesNotMatch(readFileSync("lib/predictions/inputSnapshot.ts", "utf8"), /lineupImpact/);
assert.doesNotMatch(readFileSync("lib/predictions/inputSnapshot.ts", "utf8"), /powerScore|normalizedIndex|tier/);
assert.doesNotMatch(readFileSync("lib/predictions/inputSnapshot.ts", "utf8"), /TradeAdvisor|WarRoom|Draft Report/);

console.log("Predictions P1 input snapshot checks passed.");
