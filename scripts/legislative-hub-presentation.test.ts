import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/commish/proposals/page.tsx", "utf8");
const shell = readFileSync("components/SiteShell.tsx", "utf8");
const layout = readFileSync("app/commish/proposals/layout.tsx", "utf8");
const constitution = readFileSync("app/league-info/constitution/page.tsx", "utf8");

assert.match(page, /import SiteShell from ['"]@\/components\/SiteShell['"]/);
assert.match(page, /<SiteShell activePath=['"]\/commish['"]/);
assert.doesNotMatch(page, /<nav/);
assert.match(page, /Commissioner Hub/);
assert.match(page, /Legislative Hub/);
assert.match(page, /Proposals, voting and amendments/);
assert.match(page, /Return to Commissioner Hub/);
assert.match(page, /Current_LEGISLATIVE_SESSION_YEAR|CURRENT_LEGISLATIVE_SESSION_YEAR/);
assert.match(page, /Floor is Open for Voting|Chamber Closed Until Meeting/);
assert.match(page, /Active Floor/);
assert.match(page, /Finalized Results/);
assert.match(page, /No active proposals currently on the floor/);
assert.match(page, /Finalize Voting/);
assert.match(page, /Open Floor/);
assert.match(page, /\/commish\/proposals\/new/);
assert.match(page, /handleVote\(prop\.id, 'yes'\)/);
assert.match(page, /handleVote\(prop\.id, 'no'\)/);
assert.match(page, /Session Archive/);
assert.match(page, /focus-visible:ring-2/);
assert.match(page, /max-w-7xl/);
assert.match(shell, /activePath === "\/commish"/);
assert.match(layout, /requireAuctionAccess|require/);
assert.match(constitution, /ratified|amendment|rule/i);

console.log("Legislative Hub presentation checks passed.");
