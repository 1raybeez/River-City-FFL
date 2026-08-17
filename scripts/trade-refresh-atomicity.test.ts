import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/history/trades/route.ts", "utf8");
const commitBody = route.match(/async function commitTradeWrites[\s\S]*?\n}\n\nasync function refreshCurrentSeasonTrades/)?.[0] ?? "";
const refreshBody = route.match(/async function refreshCurrentSeasonTrades[\s\S]*?\n}\n\nexport async function GET/)?.[0] ?? "";

assert.match(route, /MAX_ATOMIC_TRADE_WRITES = 500/);
assert.match(route, /type TradeWriteDependencies/);
assert.match(commitBody, /dependencies\.createBatch\(\)/);
assert.match(commitBody, /batch\.set\(/);
assert.match(commitBody, /await batch\.commit\(\)/);
assert.match(route, /Trade refresh could not be committed/);
assert.match(route, /Trade refresh exceeds the single-commit Firestore write limit/);

const normalizeOffset = refreshBody.indexOf("const acceptedTrades");
const commitOffset = refreshBody.indexOf("await commitTradeWrites");
assert.ok(commitOffset > normalizeOffset);
assert.doesNotMatch(refreshBody, /\.collection\("trades"\)[\s\S]*\.set\(/);
assert.equal((route.match(/await batch\.commit\(\)/g) ?? []).length, 1);
assert.match(route, /status: 502/);
assert.match(route, /requireAuctionAccess\("maintenance"\)/);

console.log("Trade refresh atomicity checks passed.");
