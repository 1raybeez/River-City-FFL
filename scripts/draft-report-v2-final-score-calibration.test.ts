import assert from "node:assert/strict";
import { buildCalibrationInputsFromFrozenReview, calibrateFinalScores, runSyntheticGuardrails } from "../lib/draftReportV2/finalScoreCalibration";

const result = runSyntheticGuardrails();
const byId = new Map(result.teams.map((team) => [team.franchiseId, team]));
assert.equal(byId.get("elite-poor")!.candidates.A.rank <= 2, true);
assert.equal(byId.get("elite-poor")!.candidates.B.rank <= 2, true);
assert.equal(byId.get("elite-poor")!.candidates.C.rank <= 2, true);
assert.equal(byId.get("cheap-mediocre")!.candidates.A.rank > byId.get("elite-poor")!.candidates.A.rank, true);
assert.equal(byId.get("cheap-mediocre")!.candidates.C.rank > byId.get("elite-poor")!.candidates.C.rank, true);
assert.equal(byId.get("strong-both")!.candidates.A.score, 88.75);
assert.equal(byId.get("strong-both")!.candidates.B.score, 89.38);
assert.equal(byId.get("strong-both")!.candidates.C.score, 90);
assert.equal(byId.get("weak-poor")!.quadrant, "WEAK_BOTH");
assert.equal(byId.get("strong-both")!.quadrant, "STRONG_BOTH");
const frozenFixture = { snapshot: { teams: [{ franchiseId: "fixture", currentDisplayName: "Fixture" }] }, formulaC: [{ franchiseId: "fixture", rawDraftQuality: 43.98, draftQualityRank: 1 }], quality: { teams: [{ franchiseId: "fixture", draftQuality: { score: 999, leagueRank: 1 } }] }, auctionEfficiency: { teams: [{ franchiseId: "fixture", referenceSurplus: 10, auctionEfficiency: { leagueRank: 1 } }] } };
assert.equal(buildCalibrationInputsFromFrozenReview(frozenFixture)[0].draftQualityRaw, 43.98);
assert.notEqual(buildCalibrationInputsFromFrozenReview(frozenFixture)[0].draftQualityRaw, 999);
const tie = calibrateFinalScores([
  { franchiseId: "a", teamName: "A", draftQualityRaw: 10, draftQualityRank: 1, auctionEfficiencyRaw: 4, auctionEfficiencyRank: 1 },
  { franchiseId: "b", teamName: "B", draftQualityRaw: 10, draftQualityRank: 2, auctionEfficiencyRaw: 4, auctionEfficiencyRank: 2 },
]);
assert.deepEqual(tie.teams.map((team) => team.draftQualityNormalized), [50, 50]);
assert.deepEqual(tie.teams.map((team) => team.auctionEfficiencyNormalized), [50, 50]);
console.log("Draft Report Card V2 final-score calibration checks passed.");
