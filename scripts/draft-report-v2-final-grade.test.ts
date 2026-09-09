import assert from "node:assert/strict";
import { buildMethodDInputsFromFrozenReview, calculateMethodDScores, empiricalPercentile, gradeForScore, hydrateMethodDResults } from "../lib/draftReportV2/finalGrade";

assert.deepEqual([10, 20, 30, 40].map((value) => empiricalPercentile(value, [10, 20, 30, 40])), [12.5, 37.5, 62.5, 87.5]);
assert.equal(empiricalPercentile(20, [10, 20, 20, 40]), 50);

const boundaries: [number, string][] = [[79.9999, "A"], [80, "A+"], [73.9999, "A-"], [74, "A"], [67.9999, "B+"], [68, "A-"], [61.9999, "B"], [62, "B+"], [55.9999, "B-"], [56, "B"], [49.9999, "C+"], [50, "B-"], [43.9999, "C"], [44, "C+"], [37.9999, "C-"], [38, "C"], [31.9999, "D+"], [32, "C-"], [25.9999, "D"], [26, "D+"], [19.9999, "D-"], [20, "D"], [13.9999, "F"], [14, "D-"]];
for (const [score, grade] of boundaries) assert.equal(gradeForScore(score), grade);
assert.equal(gradeForScore(100.0001), "A+");
assert.equal(gradeForScore(-100), "F");
assert.throws(() => gradeForScore(Number.NaN));
assert.throws(() => gradeForScore(Number.POSITIVE_INFINITY));

const inputs = [
  ["a", 10, 0], ["b", 20, 10], ["c", 30, 20], ["d", 40, 30],
].map(([franchiseId, draftQualityRaw, auctionEfficiencyRaw]) => ({ franchiseId: String(franchiseId), teamName: String(franchiseId), draftQualityRaw: Number(draftQualityRaw), auctionEfficiencyRaw: Number(auctionEfficiencyRaw) }));
const scored = calculateMethodDScores(inputs);
assert.equal(scored.find((row) => row.franchiseId === "a")?.overallRank, 4);
assert.equal(scored[0].overallRank, 1);
assert.equal(scored.find((row) => row.franchiseId === "a")?.grade, "D+");
const renamed = calculateMethodDScores(inputs.map((input) => ({ ...input, teamName: `Renamed ${input.teamName}` })));
assert.deepEqual(scored.map(({ teamName: _name, ...row }) => row), renamed.map(({ teamName: _name, ...row }) => row));

const frozen = { snapshot: { teams: [{ franchiseId: "a", currentDisplayName: "A" }, { franchiseId: "b", currentDisplayName: "B" }] }, formulaC: [{ franchiseId: "a", rawDraftQuality: 12 }, { franchiseId: "b", rawDraftQuality: 20 }], quality: { teams: [{ franchiseId: "a", draftQuality: { score: 999 } }, { franchiseId: "b", draftQuality: { score: 1 } }] }, auctionEfficiency: { teams: [{ franchiseId: "a", referenceSurplus: 3 }, { franchiseId: "b", referenceSurplus: 4 }] } };
assert.equal(buildMethodDInputsFromFrozenReview(frozen)[0].draftQualityRaw, 12);
assert.notEqual(buildMethodDInputsFromFrozenReview(frozen)[0].draftQualityRaw, 999);
const hydrated = hydrateMethodDResults(frozen as any);
assert.equal(hydrated.finalGrades.length, 2);

const expected = [
  ["Nudas Priest", 43.98, 24.20, 96.99, "A+", 1], ["The Mad \"Panda\"", 38.70, -3.68, 74.66, "A", 2],
  ["The Bowers That Be", 34.00, 10.67, 62.49, "B+", 3], ["Carolina Reapers", 33.96, 2.32, 58.04, "B", 4],
  ["2 Buds Smoking Bud, Bud", 33.67, 10.35, 56.89, "B", 5], ["Richmond Bengals", 33.15, 9.12, 52.79, "B-", 6],
  ["It’s a New Day", 33.01, 2.15, 48.54, "C+", 7], ["Trash Pandas", 32.39, -6.63, 43.13, "C", 8],
  ["The Schmendricks", 31.21, 7.68, 40.34, "C", 9], ["Stanal Fissures", 28.73, -34.49, 25.22, "D", 10],
  ["#FuckTSwift", 28.36, -44.25, 20.82, "D", 11], ["The Mind Goblins", 26.50, -17.27, 16.40, "D-", 12],
] as const;
const expectedResults = calculateMethodDScores(expected.map(([teamName, draftQualityRaw, auctionEfficiencyRaw]) => ({ franchiseId: teamName, teamName, draftQualityRaw, auctionEfficiencyRaw })));
for (const [teamName, , , score, grade, rank] of expected) {
  const result = expectedResults.find((row) => row.teamName === teamName)!;
  assert.equal(result.methodDScore, score);
  assert.equal(result.grade, grade);
  assert.equal(result.overallRank, rank);
}
console.log("Draft Report Card V2 final-grade checks passed.");
