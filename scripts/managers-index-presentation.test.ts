import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/managers/page.tsx", "utf8");
const card = readFileSync("components/ManagerPortraitCard.tsx", "utf8");

assert.match(page, /import SiteShell from ["']@\/components\/SiteShell["']/);
assert.match(page, /<SiteShell activePath="\/managers">/);
assert.match(page, /MANAGERS|Managers/);
assert.match(page, /River City Managers/);
assert.match(page, /Owners, retired legacies, and the league office/);
assert.doesNotMatch(page, /<nav\b/);

for (const label of ["Active Owners", "Retired Owners", "Staff"]) {
  assert.match(page, new RegExp(label));
}
assert.match(page, /aria-pressed=\{view === "active"\}/);
assert.match(page, /aria-pressed=\{view === "retired"\}/);
assert.match(page, /aria-pressed=\{view === "staff"\}/);
assert.match(page, /focus-visible:ring/);

assert.match(page, /activeLayout === "division"/);
assert.match(page, /getDivisionName/);
assert.match(page, /getRosterDivisionId/);
assert.match(page, /api\.sleeper\.app\/v1\/league/);
assert.match(page, /<ManagerPortraitCard/);
assert.match(card, /getOwnerProfilePathByFullName/);
assert.match(card, /View \$\{manager\.fullName\} profile/);

assert.doesNotMatch(page, /Net Earnings|ROI|Projected Score|Rivalry Score|financial totals/);
assert.match(page, /Retired Owners/);
assert.match(page, /Staff/);

console.log("Managers index presentation checks passed.");
