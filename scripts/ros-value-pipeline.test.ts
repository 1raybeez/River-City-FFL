import assert from "node:assert/strict";
import { buildRosConsensus, importRosCsv } from "../lib/tradeComparison/rosValuePipeline";

const sleeperPlayers = [
  { playerId: "qb1", playerName: "Quarter Back", position: "QB", nflTeam: "BUF" },
  { playerId: "rb1", playerName: "Running Back", position: "RB", nflTeam: "ATL" },
  { playerId: "wr1", playerName: "Wide Receiver", position: "WR", nflTeam: "NYJ" },
  { playerId: "te1", playerName: "Tight End", position: "TE", nflTeam: "KC" },
  { playerId: "k1", playerName: "Kicker One", position: "K", nflTeam: "DAL" },
  { playerId: "def1", playerName: "Defense One", position: "DEF", nflTeam: "DEN" },
];
const csv = [
  "Rank,Name,Team,Position,PosRank,Value",
  "10,Quarter Back,BUF,QB,4,",
  "20,Running Back,,RB,8,",
  "30,Wide Receiver,NYJ,WR,12,",
  "40,Tight End,KC,TE,5,",
  "50,Kicker One,DAL,K,2,",
  "60,Defense One,DEN,DEF,3,",
  "bad,Wide Receiver,NYJ,WR,13,",
  "70,Unknown Player,NYJ,WR,30,",
  "80,Missing Position,NYJ,,",
  "90,Wide Receiver,NYJ,WR,14,",
].join("\n");
const imported = importRosCsv({ csv, source: "Fixture ROS", season: 2026, generatedAt: "2026-08-30T00:00:00.000Z", sleeperPlayers });
assert.equal(imported.matchedRows.length, 6);
assert.equal(imported.unmatchedRows.length, 1);
assert.equal(imported.duplicateRows.length, 1);
assert.ok(imported.issues.some((issue) => issue.code === "INVALID_RANK"));
assert.ok(imported.issues.some((issue) => issue.code === "INVALID_POSITION"));
assert.equal(imported.matchedRows.find((row) => row.playerId === "rb1")?.team, null);

const second = importRosCsv({ csv: "Rank,Name,Team,Position,PosRank\n12,Quarter Back,BUF,QB,5\n22,Running Back,ATL,RB,9", source: "Second ROS", season: 2026, generatedAt: "2026-08-29T00:00:00.000Z", sleeperPlayers });
const third = importRosCsv({ csv: "Rank,Name,Team,Position,PosRank\n8,Quarter Back,BUF,QB,3\n25,Running Back,ATL,RB,7", source: "Third ROS", season: 2026, generatedAt: "2026-08-28T00:00:00.000Z", sleeperPlayers });
const consensus = buildRosConsensus([imported, second, third], "2026-08-31T00:00:00.000Z");
const qb = consensus.rows.find((row) => row.playerId === "qb1")!;
assert.equal(qb.consensusOverallRank, 10);
assert.equal(qb.consensusPositionalRank, 4);
assert.equal(qb.sourceCount, 3);
assert.equal(qb.confidence, "HIGH");
assert.equal(qb.freshness, "FRESH");
assert.equal(consensus.coverage.byPosition.QB, 1);
assert.equal(consensus.coverage.singleSourcePlayers, 4);

const rotowire = importRosCsv({ csv: "\uFEFF,,,,,,Expert Ranks,,,,,,\nRank,Name,Team,Pos,BYE,Pts,Consensus\n1,Quarter Back,BUF,QB,6,300,1", source: "RotoWire ROS", season: 2026, generatedAt: "2026-08-31T00:00:00.000Z", sleeperPlayers });
assert.equal(rotowire.matchedRows[0]?.playerId, "qb1");
assert.equal(rotowire.matchedRows[0]?.positionalRank, null);

const draftSharks = importRosCsv({ csv: "Rank,Team,Player,\"Fantasy Position\",\"3D Value\"\n1,BUF,Quarter Back,QB,100", source: "DraftSharks ROS", season: 2026, generatedAt: "2026-08-31T00:00:00.000Z", sleeperPlayers });
assert.equal(draftSharks.matchedRows[0]?.playerId, "qb1");
assert.equal(draftSharks.matchedRows[0]?.sourceValue, 100);

const staleThird = { ...third, generatedAt: "2026-07-01T00:00:00.000Z", matchedRows: third.matchedRows.map((row) => ({ ...row, generatedAt: "2026-07-01T00:00:00.000Z" })) };
const mixed = buildRosConsensus([second, staleThird], "2026-08-31T00:00:00.000Z");
assert.equal(mixed.rows.find((row) => row.playerId === "qb1")?.freshness, "STALE");
assert.equal(mixed.rows.find((row) => row.playerId === "qb1")?.staleSourceCount, 1);
assert.equal(mixed.rows.find((row) => row.playerId === "qb1")?.confidence, "MEDIUM");

console.log("ROS value pipeline tests passed.");
