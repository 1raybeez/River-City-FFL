import { readFile, writeFile } from "node:fs/promises";
import { joinFantasyCalcMarketContext } from "../lib/tradeComparison/tradeMarketContext";

const candidatePath = "data/trade-analyzer/ros/ros-consensus-2026-2026-08-31.candidate.json";
const marketPath = "data/trade-analyzer/player-stats-2026.fantasycalc-redraft-candidate.json";
type RosCandidate = { rows: Array<{ playerId: string }>; tradeMarket?: { source: string; sourceDetail: string; sourceFreshnessPolicy: string; settings: { isDynasty: false; numQbs: "1"; numTeams: "12"; ppr: ".5" }; byPlayerId: Record<string, unknown> }; [key: string]: unknown };
const candidate = JSON.parse(await readFile(candidatePath, "utf8")) as RosCandidate;
const market = JSON.parse(await readFile(marketPath, "utf8")) as { generatedAt: string; players: Record<string, { playerId: string; rawSourceValue: number; fantasycalcOverallRank: number | null; fantasycalcPositionRank: number | null; fantasycalcTrend30Day: number | null; fantasycalcId: string | null; fantasycalcSleeperId: string | null; generatedAt: string }> };
candidate.tradeMarket = {
  source: "FantasyCalc REDRAFT",
  sourceDetail: "Current trade-market context only; not averaged into expert ROS consensus.",
  sourceFreshnessPolicy: "0-7 days FRESH, 8-14 days AGING, >14 days STALE",
  settings: { isDynasty: false, numQbs: "1", numTeams: "12", ppr: ".5" },
  byPlayerId: joinFantasyCalcMarketContext({ rosRows: candidate.rows, marketRows: Object.values(market.players), now: candidate.generatedAt as string }),
};
await writeFile(candidatePath, `${JSON.stringify(candidate, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ candidatePath, joinedPlayers: Object.values(candidate.tradeMarket.byPlayerId).filter(Boolean).length, rosPlayers: candidate.rows.length, marketSignal: "separate" }));
