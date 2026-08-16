import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getConfiguredRiverCitySeasons, getRiverCitySeasonConfig } from "../lib/season/seasonConfig";
import { getCountdownParts, resolveBoxOneState } from "../lib/home/boxOneState";

const config = getRiverCitySeasonConfig(2026);
assert.equal(config?.seasonStartAt, "2026-09-09T20:20:00-04:00");
assert.equal(config?.timezone, "America/New_York");
assert.deepEqual(getConfiguredRiverCitySeasons(), [2026]);

const base = { season: 2026, draftId: "linked-draft", draftStartAt: "2026-08-29T14:00:19.000Z", seasonConfig: config, now: "2026-08-16T12:00:00.000Z" };
assert.equal(resolveBoxOneState({ ...base, draftStatus: "pre_draft" }).state, "DRAFT_UPCOMING");
assert.equal(resolveBoxOneState({ ...base, draftStatus: "drafting" }).state, "DRAFT_LIVE");
assert.equal(resolveBoxOneState({ ...base, draftStatus: "paused" }).state, "DRAFT_LIVE");
assert.equal(resolveBoxOneState({ ...base, draftStatus: "complete" }).state, "POST_DRAFT_PRESEASON");
assert.equal(resolveBoxOneState({ ...base, draftStatus: "complete", now: "2026-09-09T20:20:00-04:00" }).state, "SEASON_LIVE");
assert.equal(resolveBoxOneState({ ...base, draftStatus: "unknown" }).state, "DATA_UNAVAILABLE");
assert.equal(resolveBoxOneState({ ...base, draftStatus: "complete", seasonConfig: null }).state, "DATA_UNAVAILABLE");
assert.equal(resolveBoxOneState({ ...base, draftStatus: "complete", seasonConfig: { ...config!, seasonStartAt: "not-a-date" } }).state, "DATA_UNAVAILABLE");

assert.deepEqual(getCountdownParts("2026-09-09T19:00:00-04:00", "2026-09-09T20:20:00-04:00"), { days: 0, hours: 1, minutes: 20, reached: false });
assert.deepEqual(getCountdownParts("2026-09-09T20:20:01-04:00", "2026-09-09T20:20:00-04:00"), { days: 0, hours: 0, minutes: 0, reached: true });
assert.equal(getCountdownParts("invalid", "2026-09-09T20:20:00-04:00"), null);

const sleeper = readFileSync("lib/sleeper.ts", "utf8");
assert.match(sleeper, /league\.draft_id/);
assert.match(sleeper, /league_id === leagueId/);
assert.match(sleeper, /type === "auction"/);
const draftStatusResolver = sleeper.slice(
  sleeper.indexOf("export async function getRiverCityAuctionDraftStatus"),
  sleeper.indexOf("export async function getSleeperDraftPicks")
);
assert.doesNotMatch(draftStatusResolver, /find\(.*status/);

const home = readFileSync("app/HomeClient.tsx", "utf8");
assert.match(home, /2026 Draft Day/);
assert.match(home, /RSVP/);
assert.match(home, /calendar\.app\.google/);
assert.match(home, /meet\.google\.com/);
assert.match(home, /Location TBD/);
assert.match(home, /2026 Matchups/);

console.log("Home Box 1 H1/H2 checks passed.");
