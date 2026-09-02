import { readFile, writeFile } from "node:fs/promises";
import { evaluateShadowRecommendation, type ExpertRosEvidence, type KeeperEvidence, type TradeMarketEvidence } from "../lib/tradeComparison/recommendationEngine";
import type { CurrentSeasonPlayerValue } from "../lib/tradeComparison/currentValue";
import type { TradeComparisonPlayer } from "../lib/tradeComparison/types";

const candidate = JSON.parse(await readFile("data/trade-analyzer/ros/ros-consensus-2026-2026-08-31.candidate.json", "utf8"));
const marketCandidate = JSON.parse(await readFile("data/trade-analyzer/player-stats-2026.fantasycalc-redraft-candidate.json", "utf8"));
const keeperCandidate = JSON.parse(await readFile("data/trade-analyzer/keeper-costs-2026.candidate.json", "utf8"));
const template = JSON.parse(await readFile("data/trade-analyzer/player-stats-2026.template.json", "utf8"));
const allPlayers = Object.values(template.players).map((row: any): TradeComparisonPlayer => ({ playerId: row.playerId, name: row.playerName, position: row.position, nflTeam: row.nflTeam }));
const marketRows = new Map(Object.values(marketCandidate.players).map((row: any) => [row.playerId, row]));
const expertRows = new Map<string, { playerId: string; playerName: string; consensusOverallRank: number | null; consensusPositionalRank: number | null; sourceCount: number; freshness: "FRESH" | "AGING" | "STALE" | "UNKNOWN"; confidence: "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE"; generatedAt: string; sourceRows: Array<{ source: string; overallRank: number | null; positionalRank: number | null }> }>(candidate.rows.map((row: any) => [row.playerId, row]));
const currentValues = new Map<string, CurrentSeasonPlayerValue>();
const expert = new Map<string, ExpertRosEvidence>();
const market = new Map<string, TradeMarketEvidence>();
const keeper = new Map<string, KeeperEvidence>();
for (const player of allPlayers) {
  const ros = expertRows.get(player.playerId);
  const fc = marketRows.get(player.playerId);
  const cost = keeperCandidate.players[player.playerId];
  if (ros) expert.set(player.playerId, { playerId: player.playerId, playerName: player.name ?? player.playerId, consensusOverallRank: ros.consensusOverallRank, consensusPositionalRank: ros.consensusPositionalRank, sourceCount: ros.sourceCount, freshness: ros.freshness, confidence: ros.confidence, sourceRanks: ros.sourceRows.map((row: any) => ({ source: row.source, overallRank: row.overallRank, positionalRank: row.positionalRank })) });
  if (fc) {
    currentValues.set(player.playerId, { playerId: player.playerId, playerName: player.name ?? player.playerId, position: player.position ?? "UNKNOWN", nflTeam: player.nflTeam, overallRank: fc.fantasycalcOverallRank, positionalRank: fc.fantasycalcPositionRank, currentValueScore: fc.rawSourceValue, mode: "REDRAFT", generatedAt: fc.generatedAt, ageDays: 0, freshness: "FRESH", confidence: "MEDIUM", sourceCount: 1, sources: [{ source: "FantasyCalc REDRAFT", rank: fc.fantasycalcOverallRank, value: fc.rawSourceValue, generatedAt: fc.generatedAt }], safeAsPrimaryCurrentValue: true, contextOnly: false });
    market.set(player.playerId, { playerId: player.playerId, fantasyCalcValue: fc.rawSourceValue, overallRank: fc.fantasycalcOverallRank, positionalRank: fc.fantasycalcPositionRank, trend30Day: fc.fantasycalcTrend30Day, generatedAt: fc.generatedAt, freshness: "FRESH" });
  } else if (ros) currentValues.set(player.playerId, { playerId: player.playerId, playerName: player.name ?? player.playerId, position: player.position ?? "UNKNOWN", nflTeam: player.nflTeam, overallRank: ros.consensusOverallRank, positionalRank: ros.consensusPositionalRank, currentValueScore: null, mode: "REST_OF_SEASON", generatedAt: ros.generatedAt, ageDays: 0, freshness: ros.freshness, confidence: ros.confidence, sourceCount: ros.sourceCount, sources: [], safeAsPrimaryCurrentValue: false, contextOnly: true });
  if (cost) keeper.set(player.playerId, { playerId: player.playerId, playerName: player.name ?? player.playerId, projectedCost: cost.projected2026KeeperCost ?? cost.keeperCost ?? null, confidence: "HIGH" });
}
const nameToPlayer = new Map(allPlayers.map((player) => [player.name, player]));
const get = (name: string) => nameToPlayer.get(name)!;
const lowExpertName = candidate.rows.find((row: any) => row.confidence === "LOW")?.playerName ?? "Michael Mayer";
const missingMarketName = candidate.rows.find((row: any) => !marketRows.has(row.playerId))?.playerName ?? "Michael Mayer";
const rosterById = new Map<number, TradeComparisonPlayer[]>();
for (const player of allPlayers) { const row = template.players[player.playerId]; const list = rosterById.get(row.rosterId) ?? []; list.push(player); rosterById.set(row.rosterId, list); }
const starterSlots = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF"];
const base = { currentValues, expertRos: expert, tradeMarket: market, keeper, starterSlots, now: "2026-08-31T23:59:59.000Z" };
function evaluate(franchiseId: string, franchiseName: string, outgoing: string[], incoming: string) { const rosterBefore = rosterById.get(Number(franchiseId)) ?? []; return evaluateShadowRecommendation({ ...base, franchiseId, franchiseName, rosterBefore, outgoing: outgoing.map(get), incoming: incoming.split("+").map((name) => get(name.trim())) }); }
const prestigo = evaluate("1", "Prestigio Mundial", ["Chris Olave", "Tyler Shough"], "Trevor Lawrence+Jaylen Waddle");
const reverse = evaluate("8", "Waddle's current River City franchise", ["Trevor Lawrence", "Jaylen Waddle"], "Chris Olave+Tyler Shough");
const cases = [
  { id: "A", label: "obvious starter upgrade", perspective: "1", outgoing: ["Tyler Shough"], incoming: "Trevor Lawrence" },
  { id: "B", label: "obvious starter downgrade", perspective: "1", outgoing: ["Trevor Lawrence"], incoming: "Tyler Shough" },
  { id: "C", label: "2-for-1 consolidation", perspective: "1", outgoing: ["Chris Olave", "Tyler Shough"], incoming: "Trevor Lawrence" },
  { id: "D", label: "1-for-2 depth trade", perspective: "1", outgoing: ["Chris Olave"], incoming: "Jaylen Waddle+Tyler Shough" },
  { id: "E", label: "same-position swap", perspective: "1", outgoing: ["Chris Olave"], incoming: "Jaylen Waddle" },
  { id: "F", label: "cross-position need trade", perspective: "1", outgoing: ["Tyler Shough"], incoming: "Trevor Lawrence" },
  { id: "G", label: "strong keeper benefit but current-season downgrade", perspective: "1", outgoing: ["Chris Olave"], incoming: "Tyler Shough" },
  { id: "H", label: "current-season upgrade but keeper downgrade", perspective: "1", outgoing: ["Tyler Shough"], incoming: "Chris Olave" },
  { id: "I", label: "market and ROS disagreement", perspective: "1", outgoing: ["Josh Allen"], incoming: "Chase Brown" },
  { id: "J", label: "LOW expert confidence", perspective: "1", outgoing: [lowExpertName], incoming: "Trevor Lawrence" },
  { id: "K", label: "missing FantasyCalc coverage", perspective: "1", outgoing: ["Chris Olave"], incoming: missingMarketName },
  { id: "L", label: "fairness unavailable due acquisition provenance", perspective: "1", outgoing: ["Chris Olave"], incoming: "Jaylen Waddle" },
];
const diagnosticCases = cases.map((test) => ({ ...test, result: evaluate(test.perspective, `Roster ${test.perspective}`, test.outgoing, test.incoming) }));
const report = { generatedAt: "2026-08-31T23:59:59.000Z", mode: "SHADOW_DIAGNOSTIC_ONLY", prestigo, reverse, diagnosticCases, notes: ["No roster, Firebase, or Sleeper state was mutated.", "The requested Prestigio package is not a valid two-team ownership shape in the local roster snapshot: Shough, Lawrence, and Waddle are not all owned by one counterparty.", "Fairness is unavailable in this local diagnostic because acquisition provenance was not supplied to the unchanged fairness evaluator."] };
await writeFile("data/trade-analyzer/ros/recommendation-engine-phase1-diagnostic.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: "data/trade-analyzer/ros/recommendation-engine-phase1-diagnostic.json", prestigo: { recommendation: prestigo.recommendation, confidence: prestigo.confidence, direction: prestigo.lineupImpact.direction, startersBefore: prestigo.lineupImpact.before.slots.map((slot) => slot.playerName), startersAfter: prestigo.lineupImpact.after.slots.map((slot) => slot.playerName), reasonCodes: prestigo.reasonCodes }, reverse: { recommendation: reverse.recommendation, confidence: reverse.confidence }, cases: diagnosticCases.map((test) => ({ id: test.id, recommendation: test.result.recommendation, confidence: test.result.confidence })) }, null, 2));
