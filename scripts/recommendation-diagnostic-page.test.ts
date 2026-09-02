import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const page = readFileSync("app/commish/trade-recommendation-diagnostic/page.tsx", "utf8");
const client = readFileSync("app/commish/trade-recommendation-diagnostic/TradeRecommendationDiagnosticClient.tsx", "utf8");
const route = readFileSync("app/api/commish/trade-recommendation-diagnostic/route.ts", "utf8");
const adapter = readFileSync("lib/tradeComparison/serverRecommendationAdapter.ts", "utf8");
const commish = readFileSync("app/commish/page.tsx", "utf8");
const nav = readFileSync("lib/navigation/siteNavigation.ts", "utf8");

assert.match(page, /requireAuctionAccess\("maintenance"\)/);
assert.match(page, /dynamic = "force-dynamic"/);
assert.match(page, /buildServerDiagnosticPresets/);
assert.match(route, /requireAuctionAccess\("maintenance"\)/);
assert.match(route, /buildServerTradeRecommendation/);
assert.match(client, /\/api\/commish\/trade-recommendation-diagnostic/);
assert.match(client, /TIEBREAKER_ONLY|preseasonContext\.relevance/);
assert.match(adapter, /PUBLISHED_SERVER_ARTIFACT/);
assert.match(page, /buildServerDiagnosticPresets/);
assert.match(adapter, /Fairness available/);
assert.match(adapter, /Positive FAAB/);
assert.match(client, /No optimized starter changed/);
assert.match(client, /FantasyCalc REDRAFT/);
assert.match(client, /preseasonContext\.auctionConsensus/);
assert.doesNotMatch(commish, /trade-recommendation-diagnostic/);
assert.doesNotMatch(nav, /trade-recommendation-diagnostic/);
assert.doesNotMatch(client, /firestore|writeBatch|updateDoc|deleteDoc|mutateSleeper|PUT|PATCH|DELETE/);
assert.doesNotMatch(client, /currentValueByPlayer|acquisitionCost|keeperCost|fairnessScore/);
console.log("Recommendation diagnostic page contract checks passed.");
