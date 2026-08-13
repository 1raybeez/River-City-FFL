import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  aggregateStarterProjections,
  resolveStarterProjections,
  type MatchupsProjectionRecord,
} from "../lib/projectionAdapter";
import type { SleeperPlayerIdentity } from "../lib/sleeper";

const identities: Record<string, SleeperPlayerIdentity> = {
  "1": { playerId: "1", displayName: "Justin Jefferson", position: "WR", nflTeam: "MIN" },
  "2": { playerId: "2", displayName: "Chris Olave", position: "WR", nflTeam: "NO" },
  "3": { playerId: "3", displayName: "Jordan Love", position: "QB", nflTeam: "GB" },
  "4": { playerId: "4", displayName: "Jordan Love", position: null, nflTeam: null },
};

const projections: MatchupsProjectionRecord[] = [
  { playerId: "1", playerName: "Justin Jefferson", position: "WR", team: "MIN", week: 1, points: 22.5, passYds: 0, rushYds: 0, recYds: 0, passTd: 0, rushTd: 0, recTd: 0, receptions: 0 },
  { playerName: "Chris Olave", position: "WR", team: "NO", week: 1, points: 17.25, passYds: 0, rushYds: 0, recYds: 0, passTd: 0, rushTd: 0, recTd: 0, receptions: 0 },
  { playerName: "Jordan Love", position: "QB", team: "GB", week: 1, points: 19, passYds: 0, rushYds: 0, recYds: 0, passTd: 0, rushTd: 0, recTd: 0, receptions: 0 },
  { playerName: "Jordan Love", position: "QB", team: "NYJ", week: 1, points: 21, passYds: 0, rushYds: 0, recYds: 0, passTd: 0, rushTd: 0, recTd: 0, receptions: 0 },
];

const resolved = resolveStarterProjections(["1", "2"], identities, projections, "weekly-live");
assert.deepEqual(resolved.map((entry) => entry.coverageState), ["available", "available"]);
assert.deepEqual(resolved.map((entry) => entry.matchedBy), ["player-id", "name"]);
assert.deepEqual(resolved.map((entry) => entry.projectionPoints), [22.5, 17.25]);

const disambiguated = resolveStarterProjections(["3"], identities, projections, "weekly-derived");
assert.equal(disambiguated[0].coverageState, "available");
assert.equal(disambiguated[0].projectionPoints, 19);

const ambiguous = resolveStarterProjections(["4"], identities, projections, "weekly-live");
assert.equal(ambiguous[0].coverageState, "ambiguous");
assert.equal(ambiguous[0].projectionPoints, null);

const missing = resolveStarterProjections(["missing-id"], identities, projections, "weekly-live");
assert.equal(missing[0].coverageState, "unavailable");
assert.equal(missing[0].projectionPoints, null);

const complete = aggregateStarterProjections(resolved);
assert.equal(complete.projectedTotalPoints, 39.75);
assert.equal(complete.projectedStarterCount, 2);
assert.equal(complete.totalStarterCount, 2);
assert.equal(complete.coverageComplete, true);

const incomplete = aggregateStarterProjections([...resolved, ...missing]);
assert.equal(incomplete.projectedTotalPoints, null);
assert.equal(incomplete.knownSubtotalPoints, 39.75);
assert.deepEqual(incomplete.missingStarterIds, ["missing-id"]);
assert.equal(incomplete.coverageComplete, false);

const reordered = aggregateStarterProjections([...resolved].reverse());
assert.equal(reordered.knownSubtotalPoints, complete.knownSubtotalPoints);

const source = readFileSync("lib/projectionAdapter.ts", "utf8");
assert.doesNotMatch(source, /getAllPlayers|firestore|player_stats|winProb|predictor/i);
assert.doesNotMatch(source, /playerResolver/);

console.log("Matchups projection adapter tests passed.");
