import { config as loadEnv } from "dotenv";
import { readFile, writeFile } from "node:fs/promises";
import { evaluateShadowRecommendation, validateLeagueTradeOwnership, type ExpertRosEvidence, type KeeperEvidence, type TradeMarketEvidence } from "../lib/tradeComparison/recommendationEngine";
import type { CurrentSeasonPlayerValue } from "../lib/tradeComparison/currentValue";
import type { TradeComparisonPlayer } from "../lib/tradeComparison/types";

loadEnv({ path: ".env.local", override: false, quiet: true });
loadEnv({ override: false, quiet: true });

const leagueId = "1312149033254416384";
const [league, sleeperRosters, livePlayerDirectory] = await Promise.all([
  fetch(`https://api.sleeper.app/v1/league/${leagueId}`).then((response) => response.json() as Promise<any>),
  fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`).then((response) => response.json() as Promise<any[]>),
  fetch("https://api.sleeper.app/v1/players/nfl").then((response) => response.json() as Promise<Record<string, any>>),
]);
const [candidate, marketCandidate, keeperCandidate, template] = await Promise.all([
  readFile("data/trade-analyzer/ros/ros-consensus-2026-2026-08-31.candidate.json", "utf8").then(JSON.parse),
  readFile("data/trade-analyzer/player-stats-2026.fantasycalc-redraft-candidate.json", "utf8").then(JSON.parse),
  readFile("data/trade-analyzer/keeper-costs-2026.candidate.json", "utf8").then(JSON.parse),
  readFile("data/trade-analyzer/player-stats-2026.template.json", "utf8").then(JSON.parse),
]);
const templatePlayers = Object.values(template.players).map((row: any): TradeComparisonPlayer => ({ playerId: row.playerId, name: row.playerName, position: row.position, nflTeam: row.nflTeam }));
const allPlayers = [...new Map([...templatePlayers, ...sleeperRosters.flatMap((roster: any) => (Array.isArray(roster.players) ? roster.players : []).map(String).flatMap((playerId: string) => { const player = livePlayerDirectory[playerId]; return player ? [{ playerId, name: player.full_name ?? null, position: player.position ?? null, nflTeam: player.team ?? null } satisfies TradeComparisonPlayer] : []; }))].map((player) => [player.playerId, player] as const)).values()];
const byId = new Map(allPlayers.map((player) => [player.playerId, player]));
const marketRows = new Map<string, any>(Object.values(marketCandidate.players).map((row: any) => [row.playerId, row] as [string, any]));
const expertRows = new Map<string, any>((candidate.rows as any[]).map((row: any) => [row.playerId, row] as [string, any]));
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
    currentValues.set(player.playerId, { playerId: player.playerId, playerName: player.name ?? player.playerId, position: player.position ?? "UNKNOWN", nflTeam: player.nflTeam, overallRank: fc.fantasyCalcOverallRank, positionalRank: fc.fantasyCalcPositionRank, currentValueScore: fc.rawSourceValue, mode: "REDRAFT", generatedAt: fc.generatedAt, ageDays: 0, freshness: "FRESH", confidence: "MEDIUM", sourceCount: 1, sources: [{ source: "FantasyCalc REDRAFT", rank: fc.fantasyCalcOverallRank, value: fc.rawSourceValue, generatedAt: fc.generatedAt }], safeAsPrimaryCurrentValue: true, contextOnly: false });
    market.set(player.playerId, { playerId: player.playerId, fantasyCalcValue: fc.rawSourceValue, overallRank: fc.fantasyCalcOverallRank, positionalRank: fc.fantasyCalcPositionRank, trend30Day: fc.fantasyCalcTrend30Day, generatedAt: fc.generatedAt, freshness: "FRESH" });
  } else if (ros) currentValues.set(player.playerId, { playerId: player.playerId, playerName: player.name ?? player.playerId, position: player.position ?? "UNKNOWN", nflTeam: player.nflTeam, overallRank: ros.consensusOverallRank, positionalRank: ros.consensusPositionalRank, currentValueScore: null, mode: "REST_OF_SEASON", generatedAt: ros.generatedAt, ageDays: 0, freshness: ros.freshness, confidence: ros.confidence, sourceCount: ros.sourceCount, sources: [], safeAsPrimaryCurrentValue: false, contextOnly: true });
  if (cost) keeper.set(player.playerId, { playerId: player.playerId, playerName: player.name ?? player.playerId, projectedCost: cost.projected2026KeeperCost ?? cost.keeperCost ?? null, confidence: "HIGH" });
}
const byRosterId = new Map<number, any>(sleeperRosters.map((roster: any) => [Number(roster.roster_id), roster] as [number, any]));
const rosterNames = new Map<number, string>(Object.values(template.players).map((row: any) => [row.rosterId, row.teamName]).filter(([id, name]) => Number.isFinite(id) && typeof name === "string") as [number, string][]);
const rosterPlayers = new Map<number, TradeComparisonPlayer[]>();
for (const [rosterId, roster] of byRosterId) rosterPlayers.set(rosterId, (Array.isArray(roster.players) ? roster.players : []).map((playerId: unknown) => String(playerId)).map((playerId: string) => byId.get(playerId)).filter((player: TradeComparisonPlayer | undefined): player is TradeComparisonPlayer => Boolean(player)));
const currentRosters = new Map([...rosterPlayers.entries()].map(([rosterId, players]) => [String(rosterId), players] as const));
const starterSlots = (Array.isArray(league.roster_positions) ? league.roster_positions : []).filter((slot: unknown): slot is string => typeof slot === "string" && slot !== "BN" && slot !== "IR");
const common = { currentValues, expertRos: expert, tradeMarket: market, keeper, starterSlots, now: "2026-08-31T23:59:59.000Z" };
const find = (rosterId: number, position: string, excluded = new Set<string>()) => rosterPlayers.get(rosterId)?.find((player) => player.position === position && !excluded.has(player.playerId)) ?? null;
const named = (rosterId: number, name: string) => rosterPlayers.get(rosterId)?.find((player) => player.name === name) ?? null;
const required = (player: TradeComparisonPlayer | null, label: string): TradeComparisonPlayer => { if (!player) throw new Error(`Could not construct diagnostic asset: ${label}`); return player; };
function legalCase(id: string, label: string, teamA: number, teamB: number, sentA: TradeComparisonPlayer[], sentB: TradeComparisonPlayer[], faab: { senderFranchiseId: string; receiverFranchiseId: string; amount: number } | null = null) {
  const ownershipA = validateLeagueTradeOwnership({ sendingFranchiseId: String(teamA), receivingFranchiseId: String(teamB), outgoing: sentA, incoming: sentB, currentRosters });
  const ownershipB = validateLeagueTradeOwnership({ sendingFranchiseId: String(teamB), receivingFranchiseId: String(teamA), outgoing: sentB, incoming: sentA, currentRosters });
  const resultA = ownershipA.status === "VALID" ? evaluateShadowRecommendation({ ...common, franchiseId: String(teamA), franchiseName: rosterNames.get(teamA) ?? `Roster ${teamA}`, rosterBefore: rosterPlayers.get(teamA) ?? [], outgoing: sentA, incoming: sentB, fairness: null }) : null;
  const resultB = ownershipB.status === "VALID" ? evaluateShadowRecommendation({ ...common, franchiseId: String(teamB), franchiseName: rosterNames.get(teamB) ?? `Roster ${teamB}`, rosterBefore: rosterPlayers.get(teamB) ?? [], outgoing: sentB, incoming: sentA, fairness: null }) : null;
  return { id, label, teamA: String(teamA), teamB: String(teamB), teamAName: rosterNames.get(teamA) ?? `Roster ${teamA}`, teamBName: rosterNames.get(teamB) ?? `Roster ${teamB}`, sentByA: sentA.map((p) => p.name), sentByB: sentB.map((p) => p.name), faab, ownershipA, ownershipB, teamARecommendation: resultA, teamBRecommendation: resultB, fairness: { status: "UNAVAILABLE", reason: "This read-only diagnostic does not fabricate acquisition provenance; the server activation path remains the source of truth." } };
}
const ownerOf = (name: string) => [...rosterPlayers.entries()].find(([, players]) => players.some((player) => player.name === name))?.[0] ?? null;
const prestigoRosterId = ownerOf("Chris Olave") ?? 1;
const olave = required(named(prestigoRosterId, "Chris Olave"), "Prestigio Chris Olave");
const shough = required(named(prestigoRosterId, "Tyler Shough"), "Prestigio Tyler Shough");
const jordynTyson = required(named(prestigoRosterId, "Jordyn Tyson"), "Prestigio Jordyn Tyson");
const prestigoQb = required(find(prestigoRosterId, "QB"), "Prestigio QB");
const prestigoRb = required(find(prestigoRosterId, "RB"), "Prestigio RB");
const cam = required(named(1, "Cam Skattebo"), "Prestigio Cam Skattebo");
const lawrenceRosterId = ownerOf("Trevor Lawrence") ?? 4;
const waddleRosterId = ownerOf("Jaylen Waddle") ?? 4;
const kylerRosterId = ownerOf("Kyler Murray") ?? 12;
const lawrence = required(named(lawrenceRosterId, "Trevor Lawrence"), "Trevor Lawrence");
const waddle = required(named(waddleRosterId, "Jaylen Waddle"), "Jaylen Waddle");
const kyler = required(named(kylerRosterId, "Kyler Murray"), "Kyler Murray");
const qbB = required(find(lawrenceRosterId, "QB", new Set([lawrence.playerId])), "counterparty QB");
const rbB = required(find(lawrenceRosterId, "RB"), "counterparty RB");
const wrB = required(find(lawrenceRosterId, "WR"), "counterparty WR");
const goffRosterId = ownerOf("Jared Goff") ?? 2;
const goff = required(named(goffRosterId, "Jared Goff"), "Jared Goff");
const lowExpert = allPlayers.find((player) => expert.get(player.playerId)?.confidence === "LOW") ?? null;
const missingMarket = allPlayers.find((player) => !market.has(player.playerId)) ?? null;
const ownerForPlayer = (player: TradeComparisonPlayer) => [...rosterPlayers.entries()].find(([, players]) => players.some((candidate) => candidate.playerId === player.playerId))?.[0] ?? null;
const matrix = [
  legalCase("P1D", "required Tyler Shough + Jordyn Tyson package", prestigoRosterId, lawrenceRosterId, [shough, jordynTyson], [lawrence, waddle]),
  legalCase("A", "QB-for-QB", prestigoRosterId, kylerRosterId, [prestigoQb], [kyler]),
  legalCase("B", "WR-for-WR", prestigoRosterId, waddleRosterId, [olave], [waddle]),
  legalCase("C", "RB-for-RB", prestigoRosterId, lawrenceRosterId, [cam], [rbB]),
  legalCase("D", "cross-position starter need", prestigoRosterId, lawrenceRosterId, [olave], [rbB]),
  legalCase("E", "2-for-1 consolidation", prestigoRosterId, lawrenceRosterId, [olave, prestigoRb], [lawrence]),
  legalCase("F", "1-for-2 depth", prestigoRosterId, lawrenceRosterId, [olave], [wrB, qbB]),
  legalCase("G", "current-season improvement / keeper downgrade", prestigoRosterId, kylerRosterId, [prestigoQb], [kyler]),
  legalCase("H", "keeper improvement / current-season downgrade", kylerRosterId, prestigoRosterId, [kyler], [prestigoQb]),
  lowExpert && ownerForPlayer(lowExpert) !== null && ownerForPlayer(lowExpert) !== prestigoRosterId ? legalCase("J", "MEDIUM/LOW ROS confidence", prestigoRosterId, ownerForPlayer(lowExpert)!, [olave], [lowExpert]) : { id: "J", label: "MEDIUM/LOW ROS confidence", status: "NOT_FOUND" },
  missingMarket && ownerForPlayer(missingMarket) !== null && ownerForPlayer(missingMarket) !== prestigoRosterId ? legalCase("K", "missing FantasyCalc coverage", prestigoRosterId, ownerForPlayer(missingMarket)!, [olave], [missingMarket]) : { id: "K", label: "missing FantasyCalc coverage", status: "NOT_FOUND" },
  legalCase("L", "fairness unavailable", prestigoRosterId, waddleRosterId, [olave], [waddle]),
  legalCase("M", "Jared Goff post-draft acquisition basis", prestigoRosterId, goffRosterId, [prestigoQb], [goff]),
  legalCase("N", "positive FAAB, valuation-neutral", prestigoRosterId, lawrenceRosterId, [prestigoQb], [lawrence], { senderFranchiseId: String(prestigoRosterId), receiverFranchiseId: String(lawrenceRosterId), amount: 1 }),
];
const prestigo = matrix.filter((row) => ["A", "B", "E"].includes(row.id));
const ownershipTargets = ["Chris Olave", "Tyler Shough", "Trevor Lawrence", "Jaylen Waddle", "Kyler Murray", "Cam Skattebo", "Omarion Hampton"].map((name) => { const player = allPlayers.find((candidate) => candidate.name === name); const owner = player ? [...currentRosters.entries()].find(([, players]) => players.some((candidate) => candidate.playerId === player.playerId))?.[0] ?? null : null; return { name, franchiseId: owner }; });
const ownershipMap = [...rosterPlayers.entries()].map(([rosterId, players]) => { const counts = players.reduce<Record<string, number>>((acc, player) => { const position = player.position ?? "UNKNOWN"; acc[position] = (acc[position] ?? 0) + 1; return acc; }, {}); return { franchiseId: String(rosterId), displayName: rosterNames.get(rosterId) ?? `Roster ${rosterId}`, rosterSize: byRosterId.get(rosterId)?.players?.length ?? players.length, counts, starterIds: byRosterId.get(rosterId)?.starters ?? [] }; });
const report = { generatedAt: "2026-08-31T23:59:59.000Z", mode: "SHADOW_DIAGNOSTIC_ONLY", authoritativeSource: `Sleeper league ${leagueId} roster endpoint`, ownershipMap, ownershipTargets, matrix, prestigo, notes: ["No Firebase business data, Sleeper data, roster state, UI, or published ROS data was mutated.", "FantasyCalc REDRAFT and ROS candidate files remain local shadow inputs.", "Fairness is reported as unavailable here unless the existing server-owned acquisition activation supplies eligible provenance; fairness is not duplicated or recalibrated."] };
await writeFile("data/trade-analyzer/ros/recommendation-engine-phase1b-diagnostic.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: "data/trade-analyzer/ros/recommendation-engine-phase1b-diagnostic.json", ownershipTargets, matrix: matrix.map((row: any) => ({ id: row.id, label: row.label, teamA: row.teamARecommendation?.recommendation ?? row.status, teamB: row.teamBRecommendation?.recommendation ?? row.status, ownershipA: row.ownershipA?.status, ownershipB: row.ownershipB?.status })), prestigo: prestigo.map((row: any) => ({ id: row.id, recommendation: row.teamARecommendation?.recommendation, confidence: row.teamARecommendation?.confidence })) }, null, 2));
