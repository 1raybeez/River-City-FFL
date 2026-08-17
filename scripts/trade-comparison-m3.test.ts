import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const component = readFileSync("components/TradeComparison.tsx", "utf8");

assert.match(component, /Comparison summary/);
assert.match(component, /Side A/);
assert.match(component, /Side B/);
assert.match(component, /SENDS/);
assert.match(component, /RECEIVES/);
assert.match(component, /Known auction context/);
assert.match(component, /Auction context unavailable/);
assert.match(component, /PARTIAL/);
assert.match(component, /UNAVAILABLE/);
assert.match(component, /before.*after/i);
assert.match(component, /grid gap-5 lg:grid-cols-2/);
assert.match(component, /overflow-x-auto/);
assert.match(component, /aria-labelledby/);
assert.doesNotMatch(component, /\$0/);
assert.doesNotMatch(component, /winner|loser|fairness|probability|recommendation|\bAI\b|verdict|grade|fleece|steal|overpay|underpay|upgrade|downgrade|stronger|weaker/i);
assert.doesNotMatch(component, /fetch\(\s*["'][^"']*(player|players)/i);
assert.match(component, /TradeComparisonCoverage|PublicComparison/);

console.log("Trade Comparison M3 presentation checks passed.");
