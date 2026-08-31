import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateFairness } from "../lib/tradeComparison/fairness/evaluateFairness";
import { scoreHistoricalGap } from "../lib/tradeComparison/fairness/historicalCalibration";
import { adjustedKeeperSurplus, adjustedTalent, rosterTax } from "../lib/tradeComparison/fairness/packageValue";
import { serializePublicFairnessResult } from "../lib/tradeComparison/fairness/publicSerializer";
import { FANTASYCALC_FAIRNESS_CONFIGURATION, type FairnessProvenance } from "../lib/tradeComparison/fairness/sourceContracts";
import { normalizeKeeperSourceRecord, toFairnessKeeperCostStatus } from "../lib/tradeComparison/fairness/keeperCostSource";
import { ACQUISITION_SOURCE_PRIORITY, normalizeAcquisitionSourceRecord, reconcileAcquisitionSnapshot } from "../lib/tradeComparison/fairness/acquisitionCostSource";
import type { FairnessPlayer } from "../lib/tradeComparison/fairness/types";
import { buildFairnessMarketIntelligence } from "../lib/tradeComparison/fairness/marketIntelligence";

const player = (
  playerId: string,
  value: number | null,
  keeperCost: number | null,
  keeperCostStatus: FairnessPlayer["keeperCostStatus"] =
    keeperCost === null ? "MISSING" : keeperCost === 0 ? "KNOWN_ZERO" : "KNOWN_VALUE"
): FairnessPlayer => ({ playerId, value, keeperCost, keeperCostStatus });

const provenance: FairnessProvenance = {
  valueSource: "FantasyCalc-compatible fixture",
  valueSourceVersion: "fantasycalc-values-current-2026-06-13",
  acquisitionCostSource: "River City historical acquisition-cost fixture",
  acquisitionCostSourceVersion: "river-city-acquisition-costs-2026-from-sleeper-2025",
  keeperCostSource: "River City historical keeper-cost fixture",
  keeperCostSourceVersion: "river-city-keeper-costs-2026-from-sleeper-2025",
};

type EvaluationInput = Omit<Parameters<typeof evaluateFairness>[0], "provenance">;
const evaluate = (input: EvaluationInput) => evaluateFairness({ ...input, provenance });

assert.deepEqual(FANTASYCALC_FAIRNESS_CONFIGURATION, {
  format: "Dynasty",
  quarterbackFormat: "1QB",
  teams: 12,
  scoring: "Half PPR",
  tePremium: false,
});

const sourceRecord = {
  season: 2026,
  franchiseId: "prestigio-mundial",
  playerId: "player-keeper",
  isKeeper: true,
  keeperCost: 18,
  source: "Sleeper draft metadata",
  sourceVersion: "sleeper-draft-2026",
  generatedAt: "2026-08-17T00:00:00.000Z",
};
const knownKeeper = normalizeKeeperSourceRecord(sourceRecord);
assert.equal(knownKeeper.keeperStatus, "KEEPER");
assert.equal(knownKeeper.costState, "KNOWN_VALUE");
assert.equal(toFairnessKeeperCostStatus(knownKeeper, null), "KNOWN_VALUE");
const knownZeroKeeper = normalizeKeeperSourceRecord({ ...sourceRecord, playerId: "zero", keeperCost: 0 });
assert.equal(knownZeroKeeper.costState, "KNOWN_ZERO");
const nonKeeper = normalizeKeeperSourceRecord({ ...sourceRecord, playerId: "non-keeper", isKeeper: false, keeperCost: null });
assert.equal(nonKeeper.keeperStatus, "NON_KEEPER");
assert.equal(nonKeeper.costState, "NOT_APPLICABLE");
assert.equal(toFairnessKeeperCostStatus(nonKeeper, null), "MISSING");
assert.equal(toFairnessKeeperCostStatus(nonKeeper, "ZERO_COST_ASSET"), "KNOWN_ZERO");
const unknownKeeper = normalizeKeeperSourceRecord({ ...sourceRecord, playerId: "unknown", isKeeper: null, keeperCost: 0 });
assert.equal(unknownKeeper.keeperStatus, "UNKNOWN");
assert.equal(unknownKeeper.costState, "MISSING");

assert.deepEqual(ACQUISITION_SOURCE_PRIORITY.slice(0, 2), ["sleeper-finalized-draft", "sleeper-keeper"]);
const inflatedAuction = normalizeAcquisitionSourceRecord({ season: 2026, franchiseId: "prestigio-mundial", playerId: "inflated", acquisitionType: "AUCTION", acquisitionCost: 11, source: "sleeper-finalized-draft", sourceVersion: "draft-2026", generatedAt: "2026-08-17T00:00:00.000Z" });
const underpricedAuction = normalizeAcquisitionSourceRecord({ ...inflatedAuction, playerId: "underpriced", acquisitionCost: 12 });
assert.equal(inflatedAuction.costState, "KNOWN");
assert.equal(underpricedAuction.acquisitionCost, 12);
assert.equal(adjustedTalent([player("inflated", 5, 11)]), 5);
assert.ok(Math.abs(adjustedKeeperSurplus(player("inflated", 5, 11)) + 4.2) < 0.000001);
assert.equal(adjustedTalent([player("underpriced", 30, 12)]), 30);
assert.equal(adjustedKeeperSurplus(player("underpriced", 30, 12)), 19.8);
assert.equal(normalizeAcquisitionSourceRecord({ ...inflatedAuction, playerId: "pending", acquisitionCost: null }).costState, "PENDING_AUCTION");
assert.equal(normalizeAcquisitionSourceRecord({ ...inflatedAuction, playerId: "free-agent", acquisitionType: "FREE_AGENT", acquisitionCost: null }).costState, "MISSING");
const reconciliation = reconcileAcquisitionSnapshot({
  rosters: [{ franchiseId: "prestigio-mundial", playerIds: ["inflated", "underpriced"] }],
  acquisitions: [inflatedAuction, underpricedAuction, { ...inflatedAuction, playerId: "orphan" }],
});
assert.deepEqual(reconciliation.duplicatePlayerIds, []);
assert.deepEqual(reconciliation.orphanedAcquisitions, ["prestigio-mundial:orphan"]);
assert.deepEqual(reconciliation.rosteredWithoutAcquisition, []);

assert.equal(adjustedTalent([player("low", 40, 0)]), 40);
assert.equal(adjustedTalent([player("stud", 41, 0)]), 46);
assert.equal(adjustedTalent([player("stud", 60, 0), player("secondary", 20, 0)]), 82);
assert.equal(adjustedKeeperSurplus(player("positive", 50, 20)), 33);
assert.equal(adjustedKeeperSurplus(player("negative", 10, 20)), -7);
assert.equal(rosterTax([player("sent", 10, 0)], [player("a", 10, 0), player("b", 10, 0)]), 1.5);

assert.deepEqual(scoreHistoricalGap(23.33, { version: "fixture", p25: 23.33, p50: 45.34, p75: 84.74, p90: 125.28 }), { score: 100, band: "P25" });
assert.deepEqual(scoreHistoricalGap(45.34, { version: "fixture", p25: 23.33, p50: 45.34, p75: 84.74, p90: 125.28 }), { score: 90, band: "P50" });
assert.deepEqual(scoreHistoricalGap(84.74, { version: "fixture", p25: 23.33, p50: 45.34, p75: 84.74, p90: 125.28 }), { score: 70, band: "P75" });
assert.deepEqual(scoreHistoricalGap(125.28, { version: "fixture", p25: 23.33, p50: 45.34, p75: 84.74, p90: 125.28 }), { score: 40, band: "P90" });
assert.deepEqual(scoreHistoricalGap(125.29, { version: "fixture", p25: 23.33, p50: 45.34, p75: 84.74, p90: 125.28 }), { score: 10, band: "ABOVE_P90" });

const calibration = { version: "river-city-trades-2019-2025-v1", p25: 23.33, p50: 45.34, p75: 84.74, p90: 125.28 };
const cook = player("8138", 54, 40);
const london = player("8112", 59, 52);
const deebo = player("5872", 6, 21);
const goedert = player("5022", 12, 12);
const largeA = [player("4881", 39, 47), player("11631", 34, 26), player("12526", 48, 29), player("12527", 76, 72)];
const largeB = [player("7543", 32, 12), player("7569", 45, 31), player("12508", 30, 23), player("12517", 46, 63)];

const cookLondon = evaluate({ sideA: { playersSent: [cook], playersReceived: [london] }, sideB: { playersSent: [london], playersReceived: [cook] }, valueSource: provenance.valueSource, calibration });
assert.equal(cookLondon.status, "READY");
assert.ok(Math.abs((cookLondon.imbalanceGap ?? 0) - 0.76) < 0.01);
assert.equal(cookLondon.fairnessScore, 100);
assert.equal(cookLondon.leadingSide, "A");

const reversed = evaluate({ sideA: { playersSent: [deebo], playersReceived: [cook, goedert] }, sideB: { playersSent: [cook, goedert], playersReceived: [deebo] }, valueSource: provenance.valueSource, calibration });
// The recovered note says ~154.48, but the recovered code's asymmetric
// one-player roster tax produces 155.98. Preserve the code-level result.
assert.ok(Math.abs((reversed.imbalanceGap ?? 0) - 155.98) < 0.01);
assert.equal(reversed.fairnessScore, 10);
assert.equal(reversed.historicalPercentileBand, "ABOVE_P90");

const approvedLarge = evaluate({ sideA: { playersSent: largeA, playersReceived: largeB }, sideB: { playersSent: largeB, playersReceived: largeA }, valueSource: provenance.valueSource, calibration });
assert.ok(Math.abs((approvedLarge.imbalanceGap ?? 0) - 78.16) < 0.01);
assert.equal(approvedLarge.fairnessScore, 70);

const partial = evaluate({ sideA: { playersSent: [player("missing-value", null, 20)], playersReceived: [london] }, sideB: { playersSent: [london], playersReceived: [player("missing-value", null, 20)] }, valueSource: "fixture", calibration });
assert.equal(partial.status, "UNAVAILABLE");
assert.equal(partial.coverage, "PARTIAL");
assert.equal(partial.fairnessScore, null);

const missingKeeper = evaluate({ sideA: { playersSent: [player("missing-keeper", 40, null)], playersReceived: [london] }, sideB: { playersSent: [london], playersReceived: [player("missing-keeper", 40, null)] }, valueSource: "fixture", calibration });
assert.equal(missingKeeper.status, "UNAVAILABLE");
assert.equal(missingKeeper.fairnessScore, null);

const noCalibration = evaluate({ sideA: { playersSent: [cook], playersReceived: [london] }, sideB: { playersSent: [london], playersReceived: [cook] }, valueSource: "fixture", calibration: null });
assert.equal(noCalibration.status, "UNAVAILABLE");

const explicitFaab = evaluate({ sideA: { playersSent: [cook], playersReceived: [london], faabSent: 10 }, sideB: { playersSent: [london], playersReceived: [cook] }, valueSource: "fixture", calibration, faabMode: "EXPLICIT" });
assert.equal(explicitFaab.sideA?.deltaFaab, -10);
assert.ok(Math.abs((explicitFaab.sideA?.netValue ?? 0) + 0.12) < 0.000001);

const neutralFaab = evaluate({ sideA: { playersSent: [cook], playersReceived: [london], faabSent: 10 }, sideB: { playersSent: [london], playersReceived: [cook] }, valueSource: "fixture", calibration });
assert.equal(neutralFaab.sideA?.deltaFaab, 0);
assert.ok(neutralFaab.limitations.some((limitation) => /FAAB is neutral/i.test(limitation)));

const knownZero = evaluate({ sideA: { playersSent: [player("zero", 20, 0, "KNOWN_ZERO")], playersReceived: [london] }, sideB: { playersSent: [london], playersReceived: [player("zero", 20, 0, "KNOWN_ZERO")] }, valueSource: "fixture", calibration });
assert.equal(knownZero.status, "READY");
const missingInsteadOfZero = evaluate({ sideA: { playersSent: [player("ambiguous-zero", 20, 0, "MISSING")], playersReceived: [london] }, sideB: { playersSent: [london], playersReceived: [player("ambiguous-zero", 20, 0, "MISSING")] }, valueSource: "fixture", calibration });
assert.equal(missingInsteadOfZero.status, "UNAVAILABLE");
assert.equal(cookLondon.valueSourceVersion, provenance.valueSourceVersion);
assert.equal(cookLondon.acquisitionCostSourceVersion, provenance.acquisitionCostSourceVersion);
assert.equal(cookLondon.keeperCostSourceVersion, provenance.keeperCostSourceVersion);

const serialized = JSON.stringify(serializePublicFairnessResult(cookLondon));
assert.doesNotMatch(serialized, /target|cap|strategy|note|budget|finance|email|uid|warRoom|preferredEntry|private/i);
const activeAdapter = readFileSync("lib/tradeComparison/serverAdapter.ts", "utf8");
assert.match(activeAdapter, /buildAcquisitionSnapshot/);
assert.doesNotMatch(activeAdapter, /WarRoom|strategy|target|preferredEntry|private/i);
const fairnessSource = readFileSync("lib/tradeComparison/fairness/sourceContracts.ts", "utf8");
assert.doesNotMatch(fairnessSource, /target|preferredEntry|WarRoom|strategy|notes|budget|finance/i);
const keeperAdapter = readFileSync("lib/tradeComparison/fairness/keeperCostSource.ts", "utf8");
assert.doesNotMatch(keeperAdapter, /target|preferredEntry|WarRoom|strategy|notes|budget|finance|email|uid/i);
const acquisitionAdapter = readFileSync("lib/tradeComparison/fairness/acquisitionCostSource.ts", "utf8");
assert.doesNotMatch(acquisitionAdapter, /target|preferredEntry|WarRoom|strategy|notes|budget|finance|email|uid/i);

const marketPlayer = (playerId: string, modelValue: number, acquisitionCost: number, auctionConsensus: number | null, averageAdp: number | null) => ({
  playerId,
  value: modelValue,
  keeperCost: acquisitionCost,
  keeperCostStatus: "KNOWN_VALUE" as const,
  auctionConsensus,
  averageAdp,
});
const olave = marketPlayer("olave", 80, 18, 30, 12);
const etienne = marketPlayer("etienne", 70, 12, 16.4, 24);
assert.equal(olave.keeperCost, 18);
assert.equal(olave.auctionConsensus, 30);
assert.equal(etienne.keeperCost, 12);
assert.equal(etienne.auctionConsensus, 16.4);
assert.notEqual(olave.value, olave.keeperCost);
assert.notEqual(olave.keeperCost, olave.auctionConsensus);
assert.notEqual(olave.auctionConsensus, olave.averageAdp);

const marketAgreement = buildFairnessMarketIntelligence({
  packages: [
    { packageId: "A", players: [olave] },
    { packageId: "B", players: [etienne] },
  ],
  core: [
    { packageId: "A", netValue: 20, deltaTalent: 12, deltaSurplus: 8 },
    { packageId: "B", netValue: 5, deltaTalent: 3, deltaSurplus: 2 },
  ],
});
assert.equal(marketAgreement.packages[0].totalAuctionConsensus, 30);
assert.equal(marketAgreement.packages[0].medianAdp, 12);
assert.equal(marketAgreement.packages[0].auctionConsensusCoverage, "COMPLETE");
assert.equal(marketAgreement.packages[0].adpCoverage, "COMPLETE");
assert.equal(marketAgreement.signalAgreement.state, "STRONG_AGREEMENT");
assert.equal(marketAgreement.signalAgreement.modelPackageId, "A");
assert.deepEqual(
  marketAgreement.signalAgreement.supportingSignals.map((signal) => signal.disposition),
  ["AGREES", "AGREES", "AGREES", "AGREES"]
);

const marketDisagreement = buildFairnessMarketIntelligence({
  packages: [
    { packageId: "A", players: [marketPlayer("inflated", 5, 11, 3, 40)] },
    { packageId: "B", players: [marketPlayer("market", 30, 12, 20, 10)] },
  ],
  core: [
    { packageId: "A", netValue: 20, deltaTalent: 12, deltaSurplus: 8 },
    { packageId: "B", netValue: 5, deltaTalent: 3, deltaSurplus: 2 },
  ],
});
assert.equal(marketDisagreement.signalAgreement.state, "MIXED");
assert.ok(marketDisagreement.reasoning.some((factor) => factor.code === "MARKET_DISAGREEMENT"));

const strongWithoutAdp = buildFairnessMarketIntelligence({
  packages: [
    { packageId: "A", players: [marketPlayer("a1", 50, 10, 20, null)] },
    { packageId: "B", players: [marketPlayer("b1", 40, 15, 10, null)] },
  ],
  core: [
    { packageId: "A", netValue: 20, deltaTalent: 10, deltaSurplus: 8 },
    { packageId: "B", netValue: 5, deltaTalent: 2, deltaSurplus: 1 },
  ],
});
assert.equal(strongWithoutAdp.signalAgreement.state, "STRONG_AGREEMENT");

const moderateWithOnlyCore = buildFairnessMarketIntelligence({
  packages: [
    { packageId: "A", players: [marketPlayer("a2", 50, 10, null, null)] },
    { packageId: "B", players: [marketPlayer("b2", 40, 15, null, null)] },
  ],
  core: [
    { packageId: "A", netValue: 20, deltaTalent: 10, deltaSurplus: 0 },
    { packageId: "B", netValue: 5, deltaTalent: 2, deltaSurplus: 0 },
  ],
});
assert.equal(moderateWithOnlyCore.signalAgreement.state, "LIMITED_AGREEMENT");

const neutralAuction = buildFairnessMarketIntelligence({
  packages: [
    { packageId: "A", players: [marketPlayer("a3", 50, 10, 20, null)] },
    { packageId: "B", players: [marketPlayer("b3", 40, 15, 20, null)] },
  ],
  core: [
    { packageId: "A", netValue: 20, deltaTalent: 10, deltaSurplus: 8 },
    { packageId: "B", netValue: 5, deltaTalent: 2, deltaSurplus: 1 },
  ],
});
assert.equal(neutralAuction.signalAgreement.supportingSignals[2]?.disposition, "NEUTRAL");
assert.equal(neutralAuction.signalAgreement.state, "MODERATE_AGREEMENT");

const bothSidesReasoned = buildFairnessMarketIntelligence({
  packages: [
    { packageId: "A", players: [marketPlayer("a4", 50, 10, 20, 20)] },
    { packageId: "B", players: [marketPlayer("b4", 40, 15, 10, 10)] },
  ],
  core: [
    { packageId: "A", netValue: 20, deltaTalent: 10, deltaSurplus: -2 },
    { packageId: "B", netValue: 5, deltaTalent: -3, deltaSurplus: 8 },
  ],
});
assert.ok(bothSidesReasoned.reasoning.some((factor) => factor.packageId === "A"));
assert.ok(bothSidesReasoned.reasoning.some((factor) => factor.packageId === "B"));

const partialMarket = buildFairnessMarketIntelligence({
  packages: [
    { packageId: "A", players: [olave, marketPlayer("missing-auction-a", 20, 4, null, 10)] },
    { packageId: "B", players: [etienne, marketPlayer("missing-auction", 20, 4, null, 25)] },
  ],
  core: [
    { packageId: "A", netValue: 10, deltaTalent: 5, deltaSurplus: 5 },
    { packageId: "B", netValue: 10, deltaTalent: 5, deltaSurplus: 5 },
  ],
});
assert.equal(partialMarket.packages[0].auctionConsensusCoverage, "PARTIAL");
assert.equal(partialMarket.packages[1].auctionConsensusCoverage, "PARTIAL");
assert.equal(partialMarket.packages[1].adpCoverage, "COMPLETE");
assert.equal(partialMarket.signalAgreement.state, "INSUFFICIENT_DATA");

const serializedMarket = JSON.stringify({ ...serializePublicFairnessResult(cookLondon), marketIntelligence: marketAgreement });
assert.doesNotMatch(serializedMarket, /target|cap|strategy|note|budget|finance|email|uid|warRoom|preferredEntry|private/i);

console.log("Trade Fairness M5/M6/M7/M8 foundation checks passed.");
