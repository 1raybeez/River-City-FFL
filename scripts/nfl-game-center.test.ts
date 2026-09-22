import assert from "node:assert/strict";
import { buildNflGameCenterState, getHomeNflGameCenter, getNflCardEyebrow, getNflEventLabel, getNflLiveDetail, resolveNflWeek, selectNflGame } from "../lib/nflGameCenter";
import { EspnNflScheduleAdapter, KickoffScheduleUnavailableError, resolveFirstKickoff, selectNflTeamLogo, type NflKickoff } from "../lib/nflKickoffSchedule";

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
assert.equal(selectNflTeamLogo([
  { href: "scoreboard.png", rel: ["full", "scoreboard"] },
  { href: "rams-head.png", rel: ["full", "secondary_logo_on_white_color"] },
  { href: "primary.png", rel: ["full", "primary_logo_on_white_color"] },
]), "rams-head.png");
assert.equal(selectNflTeamLogo([{ href: "primary.png", rel: ["full", "primary_logo_on_white_color"] }], "scoreboard.png"), "primary.png");
assert.equal(selectNflTeamLogo(undefined, "scoreboard.png"), "scoreboard.png");
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
assert.equal(liveCard?.eventLabel, "NEXT NFL GAME");
assert.equal(getNflCardEyebrow(liveCard!), "LIVE");
assert.equal(getNflLiveDetail(liveCard!), "LIVE");

const upcomingSnf = buildNflGameCenterState([game({ kickoffAt: "2026-09-21T00:20:00.000Z" })]).card!;
assert.equal(upcomingSnf.eventLabel, "SUNDAY NIGHT FOOTBALL");
assert.equal(getNflCardEyebrow(upcomingSnf, 2), "NEXT UP");
assert.equal(getNflLiveDetail(upcomingSnf), null);

const liveSnf = buildNflGameCenterState([game({ status: "LIVE", kickoffAt: "2026-09-21T00:20:00.000Z", period: 3, clock: "8:42" })]).card!;
assert.equal(liveSnf.eventLabel, "SUNDAY NIGHT FOOTBALL");
assert.equal(getNflCardEyebrow(liveSnf, 2), "LIVE");
assert.equal(getNflLiveDetail(liveSnf), "Q3 · 8:42");

const liveMnf = buildNflGameCenterState([game({ status: "LIVE", kickoffAt: "2026-09-22T00:15:00.000Z" })]).card!;
assert.equal(liveMnf.eventLabel, "MONDAY NIGHT FOOTBALL");
assert.equal(getNflCardEyebrow(liveMnf, 2), "LIVE");

const liveTnf = buildNflGameCenterState([game({ status: "LIVE", kickoffAt: "2026-09-18T00:15:00.000Z" })]).card!;
assert.equal(liveTnf.eventLabel, "THURSDAY NIGHT FOOTBALL");
assert.equal(getNflCardEyebrow(liveTnf, 2), "LIVE");

const halftime = buildNflGameCenterState([game({ status: "LIVE", statusDetail: "Halftime", period: 2, clock: "0:00" })]).card!;
assert.equal(getNflLiveDetail(halftime), "HALFTIME");

const finalWithNextGame = buildNflGameCenterState([game({ status: "FINAL" }), game({ gameId: "next", status: "UPCOMING", kickoffAt: "2026-09-21T00:20:00.000Z" })]).card!;
assert.equal(finalWithNextGame.status, "UPCOMING");
assert.equal(finalWithNextGame.eventLabel, "SUNDAY NIGHT FOOTBALL");

const crossWeek = buildNflGameCenterState([game({ week: 3, kickoffAt: "2026-09-25T00:15:00.000Z" })]).card!;
assert.equal(crossWeek.eventLabel, "THURSDAY NIGHT FOOTBALL");
assert.equal(getNflCardEyebrow(crossWeek, 2), "WEEK 3 · NEXT UP");
assert.equal(getNflEventLabel({ eventLabel: "Unknown broadcast", kickoffAt: "2026-09-20T17:00:00.000Z" }), "NEXT NFL GAME");

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
let requestInit: RequestInit | undefined;
const adapter = new EspnNflScheduleAdapter(async (_url, init) => {
  calls += 1;
  requestInit = init;
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
assert.equal((requestInit?.headers as Record<string, string>)["user-agent"], "river-city-ffl/1.0 (+https://rivercityffl.com)");
assert.equal(requestInit?.cache, "no-store");
assert.equal((await adapter.listGames(2099, 2)).length, 2);
assert.equal(calls, 1);

let logoCalls = 0;
const logoAdapter = new EspnNflScheduleAdapter(async (url) => {
  logoCalls += 1;
  if (String(url).includes("scoreboard")) {
    return new Response(JSON.stringify({ events: [{
      ...espnEvent("logo-game", "2095-09-20T17:00:00.000Z"),
      season: { year: 2095 },
      competitions: [{
        date: "2095-09-20T17:00:00.000Z",
        competitors: [
          { homeAway: "away", score: "0", team: { id: "14", displayName: "Los Angeles Rams", abbreviation: "LAR", logo: "scoreboard-lar.png" } },
          { homeAway: "home", score: "0", team: { id: "21", displayName: "New York Giants", abbreviation: "NYG", logo: "scoreboard-nyg.png" } },
        ],
      }],
    }] }), { status: 200 });
  }
  return new Response(JSON.stringify({ sports: [{ leagues: [{ teams: [
    { team: { id: "14", logos: [{ href: "primary-lar.png", rel: ["full", "primary_logo_on_white_color"] }, { href: "full-color-lar.png", rel: ["full", "secondary_logo_on_white_color"] }] } },
    { team: { id: "21", logos: [{ href: "primary-nyg.png", rel: ["full", "primary_logo_on_white_color"] }] } },
  ] }] }] }), { status: 200 });
}, () => 4);
const logoGames = await logoAdapter.listGames(2095, 2);
assert.equal(logoGames[0]?.awayTeam?.logo, "full-color-lar.png");
assert.equal(logoGames[0]?.homeTeam?.logo, "primary-nyg.png");
assert.equal(logoCalls, 2);

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
assert.equal(unavailable.reasonCode, "NO_EVENTS");
assert.equal(unavailable.eventCount, 0);

let selectedWeek: number | null = null;
await getHomeNflGameCenter({ now: new Date("2026-09-20T18:00:00.000Z"), readLeagueState: async () => ({ season: "2026", week: 3 }), adapter: { listGames: async (_season, week) => { selectedWeek = week; return [game({ week: 3 })]; } } });
assert.equal(selectedWeek, 3);

const providerFailure = await getHomeNflGameCenter({ now: new Date("2026-09-20T18:00:00.000Z"), adapter: { listGames: async () => { throw new Error("provider failure"); } } });
assert.equal(providerFailure.reasonCode, "ESPN_FETCH_FAILED");
assert.equal(providerFailure.unavailable, true);

const finalFavoriteAndLive = selectNflGame([
  game({ gameId: "atl-final", status: "FINAL", kickoffAt: "2026-09-20T17:00:00.000Z" }),
  game({ gameId: "live-other", status: "LIVE", kickoffAt: "2026-09-20T20:05:00.000Z", awayTeam: { name: "Jacksonville Jaguars", abbreviation: "JAX", logo: null, score: 10 }, homeTeam: { name: "Denver Broncos", abbreviation: "DEN", logo: null, score: 14 } }),
], "ATL", new Date("2026-09-20T21:00:00.000Z"));
assert.equal(finalFavoriteAndLive?.gameId, "live-other");

const finalFavoriteAndSundayNight = selectNflGame([
  game({ gameId: "atl-final", status: "FINAL", kickoffAt: "2026-09-20T17:00:00.000Z" }),
  game({ gameId: "snf-upcoming", status: "UPCOMING", kickoffAt: "2026-09-21T00:20:00.000Z" }),
], "ATL", new Date("2026-09-20T21:00:00.000Z"));
assert.equal(finalFavoriteAndSundayNight?.gameId, "snf-upcoming");
console.log("NFL Game Center tests passed.");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
