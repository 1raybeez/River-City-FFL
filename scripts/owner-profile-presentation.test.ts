import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/managers/owners/[owner]/page.tsx", "utf8");
const source = readFileSync("components/managers/OwnerProfile.tsx", "utf8");

assert.match(source, /import SiteShell from ["']@\/components\/SiteShell["']/);
assert.match(source, /<SiteShell activePath="\/managers">/);
assert.match(source, /text-orange-600[\s\S]*>\s*Managers\s*<\/p>/);
assert.match(source, /<h1[\s\S]*>\s*\{owner\.fullName\}/);
assert.match(source, /href="\/managers"[\s\S]*Back to Managers/);
assert.match(source, /aria-label="Manager profile sections"/);
assert.match(source, /href: "#overview"/);
assert.match(source, /href: "#timeline"/);
assert.match(source, /href: "#seasons"/);
assert.match(source, /href: "#opponents"/);
assert.match(source, /href: "#division"/);
assert.match(source, /flex flex-wrap gap-1/);

for (const phrase of [
  "Owner Summary",
  "financialSnapshot\.title",
  "Career Record",
  "Canonical Franchise Career",
  "Career Timeline",
  "Season History",
  "Opponent History",
  "View Full Head-to-Head",
]) {
  assert.match(source, new RegExp(phrase));
}

assert.match(source, /financialSnapshot\.recordedWinningsLabel/);
assert.doesNotMatch(source, /Net Earnings|\bROI\b|profitability/);

for (const loader of [
  "loadOwnerFinancialSnapshot",
  "loadOwnerCareerMatchupSummary",
  "loadOwnerFranchiseLegacy",
  "getOwnerProfileViewModelBySlug",
]) {
  assert.match(page, new RegExp(loader));
}

assert.match(source, /OwnerProfileStatus\.Staff/);
assert.match(source, /statusLabel/);
assert.match(source, /coOwnerDisplay/);
assert.match(source, /rivalProfilePath/);

console.log("Owner Profile presentation checks passed.");
