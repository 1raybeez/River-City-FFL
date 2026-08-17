import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const routePaths = [
  "app/api/scrape-trades/route.ts",
  "app/api/normalize-trades/route.ts",
  "app/api/build-distribution/route.ts",
];

for (const routePath of routePaths) {
  const route = readFileSync(routePath, "utf8");
  assert.match(route, /status: 410/);
  assert.match(route, /Deprecation: "true"/);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.doesNotMatch(route, /SCRAPER_SECRET_KEY|scrapeAllHistoricalTrades|normalizeAllHistoricalTrades|buildHistoricalImbalanceDistribution/);
  assert.doesNotMatch(route, /fetch\(|\.set\(|\.merge\(|firestore/);
}

const maintenance = readFileSync("app/commish/maintenance/page.tsx", "utf8");
assert.doesNotMatch(maintenance, /api\/(scrape-trades|normalize-trades|build-distribution)/);
assert.doesNotMatch(maintenance, /scraper-key|scraperKey|requiresKey/);
assert.match(maintenance, /\/api\/history\/trades\?season=2026/);
assert.match(maintenance, /method: "POST"/);

console.log("Legacy secret-route hardening checks passed.");
