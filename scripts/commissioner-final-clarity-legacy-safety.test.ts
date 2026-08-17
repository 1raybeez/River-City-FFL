import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const hub = readFileSync("app/commish/page.tsx", "utf8");
assert.match(hub, /operational ledger, expenses, reconciliation, awards, season close, archive, and exports/);
assert.match(hub, /current-season trades and maintain published auction values and ADP/);
assert.match(hub, /Draft Grades, Team Outlook, and League Recap; approve, publish, roll back, or unpublish/);
for (const route of ["/commish/finance/2026", "/commish/proposals", "/commish/maintenance", "/commish/auction", "/commish/post-draft", "href: '/'"]) {
  assert.match(hub, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
assert.match(hub, /focus-visible:ring-2/);
assert.match(hub, /grid gap-4 md:grid-cols-2 xl:grid-cols-3/);

const importer = readFileSync("scripts/importSleeperTrades.ts", "utf8");
assert.match(importer, /EXPECTED_PROJECT_ID = "river-city-ffl"/);
assert.match(importer, /process\.argv\.includes\("--apply"\)/);
assert.match(importer, /DRY RUN ONLY/);
assert.match(importer, /requiresApplyFlag: true/);
assert.match(importer, /getFirebaseAdminDiagnostics/);
assert.match(importer, /diagnostics\.projectId !== EXPECTED_PROJECT_ID/);
assert.match(importer, /firestore\.batch\(\)/);
assert.match(importer, /await batch\.commit\(\)/);

const runtime = readFileSync("lib/auction/productionRuntime.ts", "utf8");
assert.doesNotMatch(runtime, /SCRAPER_SECRET_KEY/);

for (const routePath of ["app/api/scrape-trades/route.ts", "app/api/normalize-trades/route.ts", "app/api/build-distribution/route.ts"]) {
  const route = readFileSync(routePath, "utf8");
  assert.match(route, /status: 410/);
  assert.doesNotMatch(route, /SCRAPER_SECRET_KEY/);
}

console.log("Commissioner final clarity and legacy safety checks passed.");
