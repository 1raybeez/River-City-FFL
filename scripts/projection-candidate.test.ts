import assert from "node:assert/strict";
import { buildProjectionCandidate } from "../lib/seasonSimulator/projectionCandidateService";

const playerDirectory = Object.fromEntries([
  ["qb", { full_name: "Quarterback", position: "QB", team: "BUF" }], ["rb", { full_name: "Running Back", position: "RB", team: "BUF" }], ["wr1", { full_name: "Wide One", position: "WR", team: "BUF" }], ["wr2", { full_name: "Wide Two", position: "WR", team: "BUF" }], ["te", { full_name: "Tight End", position: "TE", team: "BUF" }], ["flex", { full_name: "Flex Player", position: "WR", team: "BUF" }], ["k", { full_name: "Kicker", position: "K", team: "BUF" }], ["BUF", { full_name: "BUF DST", position: "DEF", team: "BUF" }],
]);
const rosters = Array.from({ length: 12 }, (_, index) => ({ roster_id: index + 1, owner_id: `owner-${index + 1}`, players: ["qb", "rb", "wr1", "wr2", "te", "flex", "k", "BUF"] }));
const projections = Object.entries(playerDirectory).map(([fpid, player]) => ({ fpid, name: player.full_name, position_id: player.position === "DEF" ? "DST" : player.position, team_id: player.team, stats: { points_half: 10 } }));
const sleeper = { playerDirectory: async () => playerDirectory, rosters: async () => rosters, league: async () => ({ season: "2026", settings: { rec: 0.5 } }) };
const fetchImpl: typeof fetch = async url => String(url).includes("fantasypros") ? new Response(JSON.stringify({ season: 2026, week: 2, players: projections }), { status: 200, headers: { "last-modified": "fixture" } }) : new Response("not found", { status: 404 });

(async () => {
  const candidate = await buildProjectionCandidate({ season: 2026, week: 2, now: new Date("2026-09-17T15:01:00-04:00"), apiKey: "injected-test-key", fetchImpl, sleep: async () => undefined, sleeper });
  assert.equal(candidate.franchisesFound, 12);
  assert.equal(candidate.expectedScoresAvailable, 12);
  assert.equal(candidate.artifact.expectedTeamScores && Object.keys(candidate.artifact.expectedTeamScores).length, 12);
  assert.equal(candidate.artifact.capturePurpose, "CALIBRATION_BASELINE");
  assert.equal(candidate.artifact.checksum, (await buildProjectionCandidate({ season: 2026, week: 2, now: new Date("2026-09-17T15:01:00-04:00"), apiKey: "injected-test-key", fetchImpl, sleep: async () => undefined, sleeper })).artifact.checksum);
  console.log("projection candidate service tests passed");
})().catch(error => { console.error(error); process.exitCode = 1; });
