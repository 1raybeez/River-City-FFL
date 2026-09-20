import assert from "node:assert/strict";
import { buildNflGameCenterState, getHomeNflGameCenter, resolveNflWeek, selectNflGame } from "../lib/nflGameCenter";
import { EspnNflScheduleAdapter, KickoffScheduleUnavailableError, resolveFirstKickoff, type NflKickoff } from "../lib/nflKickoffSchedule";

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
assert.equal(resolveFirstKickoff([game({ gameId: "same-time-a" }), game({ gameId: "same-time-b" })]).gameId, "same-time-a");
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
assert.equal(buildNflGameCenterState([game({ awayTeam: { ...game().awayTeam!, logo: null }, homeTeam: { ...game().homeTeam!, logo: null } })]).card?.awayLogo, null);
assert.equal(selectNflGame([game({ gameId: "favorite-absent", homeTeam: { name: "New York Giants", abbreviation: "NYG", logo: null, score: null } })], "ATL")?.gameId, "favorite-absent");
assert.equal(buildNflGameCenterState([]).card, null);

const espnEvent = (id: string, kickoffAt: string, overrides: Record<string, unknown> = {}) => ({
  id,
  date: kickoffAt,
  season: { year: 2099 },
  week: { number: 2 },
  status: { type: { state: "pre", completed: false } },
  competitions: [{
    date: kickoffAt,
    broadcasts: [{ names: ["FOX"] }],
    competitors: [
      { homeAway: "away", score: "0", team: { displayName: "Atlanta Falcons", abbreviation: "ATL" } },
      { homeAway: "home", score: "0", team: { displayName: "Carolina Panthers", abbreviation: "CAR" } },
    ],
    ...overrides,
  }],
});

(async () => {

let calls = 0;
const adapter = new EspnNflScheduleAdapter(async () => {
  calls += 1;
  return new Response(JSON.stringify({ events: [
    espnEvent("same-time-1", "2099-09-20T17:00:00.000Z"),
    espnEvent("same-time-2", "2099-09-20T17:00:00.000Z", { broadcasts: [] }),
  ] }), { status: 200, headers: { "content-type": "application/json" } });
}, () => 0);
const parsed = await adapter.listGames(2099, 2);
assert.equal(parsed.length, 2);
assert.equal(parsed[0]?.status, "UPCOMING");
assert.deepEqual(parsed[1]?.broadcasts, []);
assert.equal(calls, 1);
assert.equal((await adapter.listGames(2099, 2)).length, 2);
assert.equal(calls, 1);

const failedAdapter = new EspnNflScheduleAdapter(async () => new Response("provider down", { status: 503 }), () => 1);
await assert.rejects(() => failedAdapter.listGames(2098, 2), KickoffScheduleUnavailableError);
const emptyAdapter = new EspnNflScheduleAdapter(async () => new Response(JSON.stringify({ events: [] }), { status: 200 }), () => 2);
await assert.rejects(() => emptyAdapter.listGames(2097, 2), KickoffScheduleUnavailableError);

let recoveryCalls = 0;
const recoveryAdapter = new EspnNflScheduleAdapter(async () => {
  recoveryCalls += 1;
  if (recoveryCalls === 1) return new Response("temporary failure", { status: 503 });
  return new Response(JSON.stringify({ events: [{ ...espnEvent("recovered", "2096-09-20T17:00:00.000Z"), season: { year: 2096 } }] }), { status: 200 });
}, () => 3);
await assert.rejects(() => recoveryAdapter.listGames(2096, 2), KickoffScheduleUnavailableError);
assert.equal((await recoveryAdapter.listGames(2096, 2))[0]?.gameId, "recovered");
assert.equal(recoveryCalls, 2);

const unavailable = await getHomeNflGameCenter({ now: new Date("2026-09-20T18:00:00.000Z"), adapter: { listGames: async () => [] } });
assert.equal(unavailable.card, null);
assert.equal(unavailable.unavailable, false);
console.log("NFL Game Center tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
