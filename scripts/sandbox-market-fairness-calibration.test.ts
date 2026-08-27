import assert from "node:assert/strict";
import {
  combinedValueShare,
  evidenceStrength,
  packageMarketValue,
  relativePackageGap,
  valueRatio,
  type SandboxMarketPlayer,
} from "../lib/tradeComparison/sandboxMarketFairnessCalibration";

const player = (playerId: string, marketValue: number | null, marketSourceCount = 5, adpSourceCount = 5): SandboxMarketPlayer => ({
  playerId,
  marketValue,
  auctionConsensus: marketValue,
  medianAdp: 10,
  marketSourceCount,
  adpSourceCount,
  evidence: marketSourceCount >= 4 && adpSourceCount >= 4 ? "HIGH" : "MEDIUM",
});
const side = (...values: number[]) => values.map((value, index) => player(`p-${index}-${value}`, value));

assert.equal(packageMarketValue(side(50)), 50);
assert.equal(packageMarketValue([player("missing", null)]), null);
assert.equal(evidenceStrength(side(50, 10)), "HIGH");
assert.equal(evidenceStrength([player("partial", 10, 2, 5)]), "MEDIUM");

for (const formula of [combinedValueShare, relativePackageGap, valueRatio]) {
  const balanced = formula(side(50), side(50));
  const swapped = formula(side(50), side(50));
  assert.equal(balanced.fairnessScore, 100);
  assert.deepEqual(balanced, swapped);
  assert.ok((balanced.fairnessScore ?? -1) >= 0 && (balanced.fairnessScore ?? 101) <= 100);
  assert.equal(formula(side(75), side(25)).fairnessScore, formula(side(25), side(75)).fairnessScore);
  assert.ok((formula(side(60), side(40)).fairnessScore ?? 0) >= (formula(side(80), side(20)).fairnessScore ?? 101));
  assert.equal(formula([player("missing", null)], side(10)).fairnessScore, null);
  assert.deepEqual(formula(side(30, 20), side(25, 25)), formula(side(30, 20), side(25, 25)));
}

const franchiseIndependentA = combinedValueShare(side(32.8, 6.8), side(16.6, 22));
const franchiseIndependentB = combinedValueShare(side(32.8, 6.8), side(16.6, 22));
assert.deepEqual(franchiseIndependentA, franchiseIndependentB);
assert.ok(Math.abs(franchiseIndependentA.packageValueA - 39.6) < 0.001);
assert.ok(Math.abs(franchiseIndependentA.packageValueB - 38.6) < 0.001);

console.log("Sandbox market fairness calibration properties passed.");
