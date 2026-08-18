import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync("components/TradeComparison.tsx", "utf8");

assert.match(component, /Trade summary/);
assert.match(component, /River City analysis/);
assert.match(component, /Package details/);
assert.match(component, /Sends/);
assert.match(component, /Receives/);
assert.match(component, /Auction consensus/);
assert.match(component, /ADP/);
assert.match(component, /auctionCoverage|adpCoverage/);
assert.match(component, /before.*after/i);
assert.match(component, /grid gap-4 lg:grid-cols-2/);
assert.match(component, /aria-labelledby/);
assert.doesNotMatch(component, /\$0/);
assert.doesNotMatch(component, /winner|loser|probability|recommendation|\bAI\b|verdict|grade|fleece|steal|overpay|underpay|upgrade|downgrade|stronger|weaker/i);
assert.doesNotMatch(component, /fetch\(\s*["'][^"']*(player|players)/i);
assert.match(component, /RoutingResult|MarketContext/);

console.log("Trade Comparison M3 presentation checks passed.");
