import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/history/trades/route.ts", "utf8");
const refreshBody = route.match(/async function refreshCurrentSeasonTrades[\s\S]*?\n}\n\nexport async function GET/)?.[0] ?? "";

assert.match(route, /type WeekSourceResult/);
assert.match(route, /status: "success" \| "failure"/);
assert.match(route, /Array\.isArray\(payload\)/);
assert.match(route, /Malformed Sleeper transaction payload/);
assert.match(route, /Trade refresh aborted: Sleeper source coverage incomplete/);
assert.match(route, /failedWeeks/);
assert.match(route, /normalizedTradeCount/);
assert.match(route, /writtenCount/);

const fetchOffset = refreshBody.indexOf("Promise.all(");
const gateOffset = refreshBody.indexOf("if (failedResults.length > 0)");
const normalizeOffset = refreshBody.indexOf("const acceptedTrades");
const writeOffset = refreshBody.indexOf("firestore");
assert.ok(fetchOffset >= 0);
assert.ok(gateOffset > fetchOffset);
assert.ok(normalizeOffset > gateOffset);
assert.ok(writeOffset > gateOffset);
assert.doesNotMatch(refreshBody.slice(0, gateOffset), /firestore|\.set\(|\.merge\(/);

assert.match(route, /payload\.length/);
assert.match(route, /payload\.some/);
assert.match(route, /successfulWeeks/);
assert.match(route, /failedResults\.map\(\(result\) => result\.week\)/);
assert.match(route, /status: 502/);
assert.match(route, /requireAuctionAccess\("maintenance"\)/);

console.log("Trade refresh completeness checks passed.");
