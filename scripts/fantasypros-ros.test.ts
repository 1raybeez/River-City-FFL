import assert from "node:assert/strict";
import { adaptFantasyProsRosResponse, fantasyProsRowsToCsv } from "../lib/tradeComparison/fantasyProsRos";
import { importRosCsv } from "../lib/tradeComparison/rosValuePipeline";

const adapted = adaptFantasyProsRosResponse({ count: 100, limit: 10, public_api_limited: true, tier: "free", last_updated: "8/31", last_updated_ts: 1788208420, players: [{ player_name: "Chris Olave", player_team_id: "NO", player_position_id: "WR", rank_ecr: 10, pos_rank: "WR10" }] }, "2026-08-31T00:00:00.000Z");
assert.equal(adapted.truncated, true);
assert.equal(adapted.rows[0]?.positionalRank, 10);
const imported = importRosCsv({ csv: fantasyProsRowsToCsv(adapted.rows), source: "FantasyPros ROS", season: 2026, generatedAt: "2026-08-31T00:00:00.000Z", sleeperPlayers: [{ playerId: "8144", playerName: "Chris Olave", position: "WR", nflTeam: "NO" }] });
assert.equal(imported.matchedRows[0]?.playerId, "8144");
assert.equal(imported.matchedRows[0]?.sourceValue, null);
console.log("FantasyPros ROS tests passed.");
