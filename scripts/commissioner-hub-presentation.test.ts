import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/commish/page.tsx", "utf8");
const shell = readFileSync("components/SiteShell.tsx", "utf8");

assert.match(page, /import SiteShell from ['"]@\/components\/SiteShell['"]/);
assert.match(page, /<SiteShell activePath="\/commish">/);
assert.match(page, /Commissioner Hub/);
assert.match(page, /River City Commissioner Hub/);
assert.match(page, /League administration, finance, governance, maintenance, and draft operations\./);
assert.match(page, /requireAuctionAccess\(\)/);

const destinations = [
  ["2026 Finance", "/commish/finance/2026"],
  ["Legislative Hub", "/commish/proposals"],
  ["Maintenance", "/commish/maintenance"],
  ["Auction War Room", "/commish/auction"],
  ["Home", "/"],
] as const;

for (const [title, href] of destinations) {
  assert.match(page, new RegExp(title));
  assert.match(page, new RegExp(`href: ['"]${href.replaceAll("/", "\\/")}`));
}

assert.match(page, /Open the 2026 Auction War Room and draft-day tools\./);
assert.doesNotMatch(page, /commissioner-only views/);
assert.match(page, /grid gap-4 md:grid-cols-2 xl:grid-cols-3/);
assert.match(page, /focus-visible:ring-2/);
assert.doesNotMatch(page, /<ModeToggle/);
assert.doesNotMatch(page, /Back to Home/);
assert.match(shell, /aria-current=\{activePath === href \? "page"/);

console.log("Commissioner Hub presentation checks passed.");
