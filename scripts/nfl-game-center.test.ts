import assert from "node:assert/strict";
import { buildNflGameCenterState, resolveNflWeek, selectNflGame } from "../lib/nflGameCenter";
import type { NflKickoff } from "../lib/nflKickoffSchedule";

const game = (overrides: Partial<NflKickoff> = {}): NflKickoff => ({
  season: 2026,
  week: 2,
  gameId: "game",
  kickoffAt: "2026-09-20T17:00:00.000Z",
  source: "fixture",
  status: "UPCOMING",
  broadcasts: ["FOX"],
  awayTeam: { name: "Carolina Panthers", abbreviation: "CAR", logo: "car.png", score: null },
  homeTeam: { name: "Atlanta Falcons", abbreviation: "ATL", logo: "atl.png", score: null },
  ...overrides,
});

assert.equal(resolveNflWeek(new Date("2026-09-19T15:00:00.000Z")), 2);
assert.equal(selectNflGame([game({ gameId: "later", kickoffAt: "2026-09-20T20:20:00.000Z" }), game({ gameId: "favorite", kickoffAt: "2026-09-20T17:00:00.000Z" })], "ATL")?.gameId, "favorite");
assert.equal(selectNflGame([game({ gameId: "live", status: "LIVE", kickoffAt: "2026-09-20T20:20:00.000Z" }), game({ gameId: "favorite", kickoffAt: "2026-09-20T17:00:00.000Z" })], "ATL")?.gameId, "live");
assert.equal(selectNflGame([game({ gameId: "tnf", kickoffAt: "2026-09-18T00:15:00.000Z" }), game({ gameId: "sun", kickoffAt: "2026-09-20T20:20:00.000Z" })])?.gameId, "tnf");
assert.equal(selectNflGame([game({ gameId: "snf", kickoffAt: "2026-09-21T00:20:00.000Z" }), game({ gameId: "mon", kickoffAt: "2026-09-22T00:15:00.000Z" })])?.gameId, "snf");
assert.equal(selectNflGame([game({ gameId: "monday", kickoffAt: "2026-09-22T00:15:00.000Z" })])?.gameId, "monday");
assert.equal(selectNflGame([game({ gameId: "chronological", kickoffAt: "2026-09-20T17:00:00.000Z" }), game({ gameId: "later", kickoffAt: "2026-09-20T18:00:00.000Z" })])?.gameId, "chronological");

const liveCard = buildNflGameCenterState([game({ status: "LIVE", awayTeam: { name: "Carolina Panthers", abbreviation: "CAR", logo: null, score: 14 }, homeTeam: { name: "Atlanta Falcons", abbreviation: "ATL", logo: null, score: 17 } })], "ATL", new Date("2026-09-20T18:00:00.000Z")).card;
assert.equal(liveCard?.status, "LIVE");
assert.equal(liveCard?.awayScore, 14);
assert.equal(liveCard?.network, "FOX");
assert.equal(liveCard?.isFavoriteTeamGame, true);

const finalCard = buildNflGameCenterState([game({ status: "FINAL", awayTeam: { name: "Carolina Panthers", abbreviation: "CAR", logo: null, score: 14 }, homeTeam: { name: "Atlanta Falcons", abbreviation: "ATL", logo: null, score: 17 } })], undefined, new Date("2026-09-21T00:00:00.000Z")).card;
assert.equal(finalCard?.status, "FINAL");
assert.equal(finalCard?.homeScore, 17);

const noNetwork = buildNflGameCenterState([game({ broadcasts: [] })]).card;
assert.equal(noNetwork?.network, null);
assert.equal(buildNflGameCenterState([]).card, null);
console.log("NFL Game Center tests passed.");
