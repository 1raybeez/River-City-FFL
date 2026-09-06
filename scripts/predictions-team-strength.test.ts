import assert from "node:assert/strict";
import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { buildPredictionInputSnapshot } from "../lib/predictions/inputSnapshot";
import { buildPredictionStrengthReport } from "../lib/predictions/teamStrength";

const rosters = canonicalAuctionTeams.map((team, teamIndex) => ({
  roster_id: team.rosterId,
  players: ["QB", "RB1", "RB2", "WR1", "WR2", "TE", "FLEX", "K", "DEF", "BENCH"].map((position) => `${position}-${teamIndex}`),
  starters: [`QB-${teamIndex}`, `RB1-${teamIndex}`, `RB2-${teamIndex}`, `WR1-${teamIndex}`, `WR2-${teamIndex}`, `TE-${teamIndex}`, `FLEX-${teamIndex}`],
}));
const positions = ["QB", "RB", "RB", "WR", "WR", "TE", "WR", "K", "DEF", "RB"];
const playerDirectory = Object.fromEntries(rosters.flatMap((roster, teamIndex) => roster.players.map((playerId, index) => [playerId, { playerId, displayName: playerId, position: positions[index], nflTeam: "RC" }])));
const fantasyRows = new Map(rosters.flatMap((roster, teamIndex) => roster.players.filter((_, index) => ![7, 8].includes(index)).map((playerId, index) => [playerId, {
  playerId, rawSourceValue: 100 + (11 - teamIndex) * 10 - index, fantasycalcOverallRank: index + 1, fantasycalcPositionRank: index + 1,
  fantasycalcTrend30Day: null, generatedAt: "2026-08-31T20:36:31.331Z", fantasycalcName: playerId, fantasycalcId: playerId, fantasycalcSleeperId: playerId,
}])));
const snapshot = buildPredictionInputSnapshot({ rosters, playerDirectory, fantasyCalc: fantasyRows, generatedAt: "2026-09-06T12:00:00.000Z" });
const report = buildPredictionStrengthReport(snapshot);
const renamedSnapshot = { ...snapshot, franchises: snapshot.franchises.map((team) => ({ ...team, currentTeamName: `Display ${team.franchiseId}` })) };
const renamedReport = buildPredictionStrengthReport(renamedSnapshot);

assert.equal(report.modelVersion, "preseason-strength-v1");
assert.equal(report.teams.length, 12);
assert.deepEqual(new Set(report.teams.map((team) => team.leagueRelativeRank)).size, 12);
assert.deepEqual([...report.teams].map((team) => team.leagueRelativeRank).sort((a, b) => a - b), Array.from({ length: 12 }, (_, index) => index + 1));
for (const team of report.teams) {
  const lineupIds = team.startingLineup.flatMap((slot) => slot.playerId ? [slot.playerId] : []);
  assert.equal(new Set(lineupIds).size, lineupIds.length);
  assert.equal(team.startingLineup.length, 7);
  assert.equal(team.components.qb.totalPlayers, 1);
  assert.equal(team.components.rb.totalPlayers, 3);
  assert.equal(team.components.wr.totalPlayers, 3);
  assert.equal(team.components.te.totalPlayers, 1);
  assert.equal(team.components.flex.totalPlayers, 7);
  assert(team.tier.length > 0);
  assert(["HIGH", "MEDIUM", "LOW"].includes(team.confidence));
  assert.equal(team.coverage.fantasyCalc.state, "PARTIAL");
  const explanationRows = [
    ["starting lineup", team.components.starters], ["bench/depth", team.components.depth], ["QB room", team.components.qb],
    ["RB room", team.components.rb], ["WR room", team.components.wr], ["TE room", team.components.te], ["FLEX options", team.components.flex],
  ] as const;
  const strengthRow = explanationRows.find(([label]) => team.biggestStrength.startsWith(label));
  const weaknessRow = explanationRows.find(([label]) => team.biggestWeakness.startsWith(label));
  assert(strengthRow && weaknessRow);
  const strengthRank = Number(team.biggestStrength.match(/league rank (\d+)\//)?.[1]);
  const weaknessRank = Number(team.biggestWeakness.match(/league rank (\d+)\//)?.[1]);
  const availableRanks = explanationRows.map(([, value]) => value.leagueRank).filter((value): value is number => value !== null);
  assert.equal(strengthRank, Math.min(...availableRanks));
  assert.equal(weaknessRank, Math.max(...availableRanks));
}

const strongest = report.teams.find((team) => team.leagueRelativeRank === 1)!;
assert.equal(strongest.components.starters.score !== null, true);
assert.equal(strongest.components.depth.score !== null, true);
assert.equal(report.weights.starters, 0.6);
assert.equal(report.weights.depth, 0.25);
assert.equal(report.weights.positionalBalance, 0.15);
assert.match(report.normalization, /min-max normalization/);
assert.deepEqual(buildPredictionStrengthReport(snapshot).teams.map((team) => [team.biggestStrength, team.biggestWeakness]), report.teams.map((team) => [team.biggestStrength, team.biggestWeakness]));
assert.equal(report.teams.some((team) => team.strengthScore > 100 || team.strengthScore < 0), false);
assert.deepEqual(renamedReport.teams.map((team) => [team.franchiseId, team.strengthScore, team.leagueRelativeRank, team.tier, team.confidence]), report.teams.map((team) => [team.franchiseId, team.strengthScore, team.leagueRelativeRank, team.tier, team.confidence]));

const source = report.teams[0];
assert.equal(source.components.starters.coverage, "COMPLETE");
assert.equal(source.reasonCodes.includes("K_DEF_EXCLUDED_FROM_STRENGTH"), true);
assert.doesNotMatch(JSON.stringify(report), /projectedRecord|playoffProbability|championshipProbability|schedule|draftGrade|tradeAdvisor|warRoom/i);

console.log("Predictions P2 team-strength checks passed.");
