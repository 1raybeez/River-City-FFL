import assert from "node:assert/strict";
import {
  buildSeparationRows,
  clampDecisionScore,
  fixedPolicyTransform,
  headroomAwareModifier,
  rawDecisionScore,
  spearmanCorrelation,
} from "../lib/auction/decisionScoreSeparation";

const results = [
  { sleeperPlayerId: "a", playerName: "Elite", position: "RB", nflTeam: "RIV", marketScore: 99, rayModifier: 7 },
  { sleeperPlayerId: "b", playerName: "Strong", position: "WR", nflTeam: "RIV", marketScore: 96, rayModifier: 5 },
  { sleeperPlayerId: "c", playerName: "Mid", position: "QB", nflTeam: "RIV", marketScore: 70, rayModifier: 5 },
] as const;

assert.equal(rawDecisionScore(results[0]), 106);
assert.equal(clampDecisionScore(106), 100);
assert.equal(fixedPolicyTransform(107), 100);
assert.equal(headroomAwareModifier(results[0]), 99.1);
const rows = buildSeparationRows(results);
assert.equal(rows[0].displayScores.A, 100);
assert.equal(rows[1].displayScores.A, 100);
assert.ok(rows[0].displayScores.E > rows[1].displayScores.E);
assert.equal(spearmanCorrelation(rows, "E"), 1);
assert.equal(rows[0].ranks.B, 1);
assert.equal(rows[2].ranks.B, 3);
assert.equal(buildSeparationRows(results)[0].displayScores.E, rows[0].displayScores.E);
for (const raw of [-7, -1, 0, 25, 50, 75, 100, 107, 120]) {
  const display = clampDecisionScore((raw * 100) / 107);
  assert.ok(display >= 0 && display <= 100);
}
assert.equal(rows[0].displayScores.E, fixedPolicyTransform(rawDecisionScore(results[0])));
assert.equal(rows[0].ranks.E, 1);
console.log("Decision score separation checks passed.");
