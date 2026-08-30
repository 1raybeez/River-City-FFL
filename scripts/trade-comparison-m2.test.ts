import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/trade-comparison/route.ts", "utf8");
const component = readFileSync("components/TradeComparison.tsx", "utf8");
const page = readFileSync("app/league-info/analyzer/page.tsx", "utf8");

assert.match(route, /getCurrentMember/);
assert.match(route, /League Member Login required/);
assert.match(route, /loadTradeComparisonContext/);
assert.match(route, /buildTradeComparison/);
assert.match(route, /serializePublicTradeComparison/);
assert.doesNotMatch(route, /email|uid|token|warRoom|target|budget|strategy|notes/i);
assert.match(component, /Trade builder/);
assert.match(component, /League Trade/);
assert.match(component, /Trade Sandbox/);
assert.match(component, /Analyze Trade/);
assert.match(component, /Add Participant/);
assert.match(component, /type="button"/);
assert.match(component, /Selected/);
assert.match(component, /positionalBefore|Positional roster counts/);
assert.match(component, /auctionCoverage|adpCoverage/);
assert.match(component, /AbortController|server-owned|current ownership/);
assert.doesNotMatch(component, /winner|loser|probability|Power Rankings|strategy|notes/i);
assert.doesNotMatch(page, /TradeAnalyzer/);

console.log("Trade Comparison M2 source checks passed.");
