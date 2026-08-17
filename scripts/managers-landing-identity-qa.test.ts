import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/managers/page.tsx", "utf8");
const card = readFileSync("components/ManagerPortraitCard.tsx", "utf8");

assert.match(page, /getDivisionName/);
assert.match(page, /getRosterDivisionId/);
assert.match(page, /fetch\(`https:\/\/api\.sleeper\.app\/v1\/league\/\$\{SLEEPER_LEAGUE_ID\}`\)/);
assert.match(page, /SLEEPER_LEAGUE_ID\}\/rosters`/);
assert.doesNotMatch(page, /\/users/);
assert.match(page, /Retired \/ Legacy/);
assert.match(card, /getOwnerCurrentTeamNameByFullName/);
assert.match(card, /Historical Franchise/);
assert.match(card, /break-words text-xs font-black uppercase tracking-widest/);
assert.match(page, /aria-pressed=\{view === "active"\}/);
assert.match(page, /aria-pressed=\{view === "retired"\}/);
assert.match(page, /aria-pressed=\{view === "staff"\}/);
assert.match(page, /min-h-10/);
assert.match(card, /View \$\{manager\.fullName\} profile/);

console.log("Managers landing identity/QA checks passed.");
