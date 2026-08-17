import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/history/trades/route.ts", "utf8");
const maintenance = readFileSync("app/commish/maintenance/page.tsx", "utf8");

assert.match(route, /requireAuctionAccess\("maintenance"\)/);
assert.match(route, /export async function POST/);
assert.match(route, /Commissioner maintenance authorization required/);
assert.match(route, /Only the supported current season may be refreshed/);
assert.match(route, /Number\.isInteger\(season\)/);
assert.match(route, /season !== CURRENT_SEASON/);

const getBody = route.match(/export async function GET\(\)[\s\S]*?\n}\n\nexport async function POST/)
  ?. [0] ?? "";
assert.match(getBody, /status: 410/);
assert.doesNotMatch(getBody, /refreshCurrentSeasonTrades|firestore|\.set\(|\.merge\(/);

const postBody = route.match(/export async function POST[\s\S]*/)?.[0] ?? "";
const guardOffset = postBody.indexOf('requireAuctionAccess("maintenance")');
const refreshOffset = postBody.indexOf("refreshCurrentSeasonTrades");
assert.ok(guardOffset >= 0);
assert.ok(refreshOffset > guardOffset);

assert.match(maintenance, /endpoint: "\/api\/history\/trades\?season=2026"/);
assert.match(maintenance, /method: "POST"/);

console.log("History admin authorization checks passed.");
