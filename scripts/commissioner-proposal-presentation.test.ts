import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/commish/proposals/new/page.tsx", "utf8");
const api = readFileSync("app/api/commish/proposals/route.ts", "utf8");
const ownerForm = readFileSync("app/league-info/legislative/new/page.tsx", "utf8");
const layout = readFileSync("app/commish/proposals/layout.tsx", "utf8");

assert.match(page, /<SiteShell activePath="\/commish">/);
assert.match(page, /Commissioner Hub/);
assert.match(page, /New Proposal/);
assert.match(page, /href="\/commish\/proposals"/);
assert.match(page, /Back to Legislative Hub/);
for (const field of ["proposal-proposer", "proposal-section", "proposal-title", "proposal-description"]) {
  assert.match(page, new RegExp(`id="${field}"`));
}
assert.match(page, /managerId/);
assert.match(page, /Verify Identity/);
assert.match(page, /\/api\/commish\/proposals/);
assert.match(page, /JSON\.stringify\(formData\)/);
assert.match(api, /requireAuctionAccess\("maintenance"\)/);
assert.match(api, /createLegislativeProposal/);
assert.match(layout, /requireAuctionAccess/);
assert.match(ownerForm, /\/api\/league-info\/legislative/);
assert.doesNotMatch(page, /<nav/);
assert.match(page, /focus-visible:ring-2/);
assert.match(page, /min-h-12/);

console.log("Commissioner proposal presentation checks passed.");
