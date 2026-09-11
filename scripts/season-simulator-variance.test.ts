import assert from "node:assert/strict";
import { buildVarianceModel, calculateResidualObservation, chooseVarianceModel, projectionBucket, sampleSimulatedPoints, type ProjectionResidualObservation } from "../lib/seasonSimulator/varianceFoundation";

const input = (projectedPoints: number, actualPoints: number, position: "QB" | "RB" | "WR" | "TE" | "K" | "DEF" = "RB") => calculateResidualObservation({season: 2026, week: 1, playerId: `${position}-${projectedPoints}-${actualPoints}`, position, projectedPoints, actualPoints, actualFinal: true, availabilityStatus: "ACTIVE", projectionSource: "FANTASYPROS", providerVersion: "v1"});
const observations = [input(4, 5), input(6, 8), input(7, 5), input(11, 15), input(12, 9), input(16, 18), input(21, 16)].filter((observation): observation is ProjectionResidualObservation => observation !== null);

assert.equal(calculateResidualObservation({...({season: 2026, week: 1, playerId: "", position: "RB", projectedPoints: 10, actualPoints: 10, actualFinal: true, availabilityStatus: null, projectionSource: "FANTASYPROS", providerVersion: null})}), null);
assert.equal(calculateResidualObservation({season: 2026, week: 1, playerId: "late", position: "RB", projectedPoints: 10, actualPoints: 10, actualFinal: false, availabilityStatus: null, projectionSource: "FANTASYPROS", providerVersion: null}), null);
assert.equal(projectionBucket(0), "0-5");
assert.equal(projectionBucket(5), "5-10");
assert.equal(projectionBucket(20), "20+");
assert.equal(observations[0].residual, 1);
const bucketModel = buildVarianceModel(observations, "RB", "0-5", 1);
assert.ok(bucketModel);
assert.equal(buildVarianceModel(observations, "RB", "0-5", 2), null);
const fallback = chooseVarianceModel(observations, "RB", "20+", {minimumBucketSampleCount: 2, minimumPositionSampleCount: 1, minimumLeagueSampleCount: 1});
assert.equal(fallback?.projectionBucket, null);
const sample = sampleSimulatedPoints(10, "RB", fallback, "seed");
assert.equal(sample, sampleSimulatedPoints(10, "RB", fallback, "seed"));
assert.notEqual(sample, sampleSimulatedPoints(10, "RB", fallback, "different-seed"));
assert.ok(sample !== null && Number.isFinite(sample) && sample >= 0);
const dstModel = buildVarianceModel([input(5, -4, "DEF")!], "DEF", "5-10", 1);
assert.equal(sampleSimulatedPoints(5, "DEF", dstModel, "dst"), -4);
assert.equal(sampleSimulatedPoints(10, "RB", null, "missing"), null);
assert.equal(bucketModel?.diagnostics.checksum, buildVarianceModel(observations, "RB", "0-5", 1)?.diagnostics.checksum);
console.log("Season simulator variance foundation tests passed.");
