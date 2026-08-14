import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/commish/maintenance/page.tsx", "utf8");
const layout = readFileSync("app/commish/maintenance/layout.tsx", "utf8");
const auth = readFileSync("lib/auth/auctionAccess.ts", "utf8");
const commish = readFileSync("app/commish/page.tsx", "utf8");
const proposalApi = readFileSync("app/api/commish/proposals/route.ts", "utf8");

assert.match(page, /import SiteShell from ["']@\/components\/SiteShell["']/);
assert.match(page, /<SiteShell activePath="\/commish" authenticated>/);
assert.match(page, /Commissioner Hub/);
assert.match(page, /<h1[^>]*>\s*Maintenance\s*<\/h1>/i);
assert.match(page, /Return to Commissioner Hub/);
assert.match(page, /Protected checks, publishing, and data maintenance/);

for (const endpoint of [
  "/api/auction/health",
  "/api/auction/values/status?season=2026",
  "/api/auction/adp/status?season=2026",
  "/api/scrape-trades",
  "/api/normalize-trades",
  "/api/build-distribution",
  "/api/history/trades?season=2026",
]) {
  assert.match(page, new RegExp(endpoint.replace(/[?]/g, "\\?")));
}

for (const confirmation of [
  "Publish these auction values to the War Room now?",
  "Roll back to the previous published auction values?",
  "Publish these ADP values to the War Room now?",
  "Roll back to the previous published ADP run?",
]) {
  assert.match(page, new RegExp(confirmation.replace(/[?]/g, "\\?")));
}

assert.match(page, /role="status" aria-live="polite"/);
assert.match(page, /focus-visible:ring-2/);
assert.match(page, /overflow-x-hidden/);
assert.match(page, /Confirmation required before running/);
assert.match(layout, /requireAuctionAccess\(\)/);
assert.match(layout, /returnTo=%2Fcommish%2Fmaintenance/);
assert.match(auth, /canAccessMaintenance: false/);
assert.match(commish, /requireAuctionAccess\("maintenance", "commish"\)/);
assert.match(proposalApi, /requireAuctionAccess\("maintenance", "proposal-api"\)/);
assert.match(auth, /temporary-auction-auth-diagnostic/);
assert.match(proposalApi, /getCommissionerActor/);

console.log("Maintenance presentation checks passed.");
