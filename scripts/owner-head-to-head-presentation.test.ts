import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("components/managers/OwnerHeadToHeadPage.tsx", "utf8");
const detail = readFileSync("scripts/owner-head-to-head-detail.test.ts", "utf8");
const summary = readFileSync("scripts/owner-matchup-summary.test.ts", "utf8");
const canonical = readFileSync("scripts/canonical-matchup-history.test.ts", "utf8");

assert.match(page, /<SiteShell activePath="\/managers">/);
assert.match(page, /Head-to-Head/);
assert.match(page, /presentation\.perspectiveLabel/);
assert.match(page, /presentation\.backHref/);
assert.match(page, /ArrowLeft/);
assert.match(page, /Competitive Series Summary/);
assert.match(page, /All Completed Meetings/);
assert.match(page, /Meeting History/);
assert.match(page, /aria-labelledby="head-to-head-coverage"/);
assert.match(page, /aria-label=\{metric\.accessibleValue\}/);
assert.match(page, /focus-visible:ring-2/);
assert.match(page, /overflow-x-hidden/);
assert.doesNotMatch(page, /<nav/);
assert.match(detail, /Ray|Jeffrey|Jordan|Landon|ownerProfiles/);
assert.match(summary, /direction|summary|ordering/i);
assert.match(canonical, /canonical|ordering|history/i);

console.log("Owner Head-to-Head presentation checks passed.");
