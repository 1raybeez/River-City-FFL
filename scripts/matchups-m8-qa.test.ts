import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/matchups/page.tsx", "utf8");

assert.match(page, /break-words text-sm font-black uppercase leading-tight/);
assert.match(page, /break-words text-\[11px\] font-bold/);
assert.match(page, /min-h-10 rounded-md px-4 py-2 text-\[10px\] font-black uppercase/);
assert.match(page, /overflow-x-auto pb-2/);
assert.match(page, /grid min-w-\[780px\] grid-cols-3/);
assert.match(page, /min-h-11 w-full/);
assert.match(page, /min-h-14 w-full min-w-0/);
assert.match(page, /min-h-10 min-w-10 rounded-lg/);
assert.match(page, /aria-expanded=\{isOpen\}/);
assert.match(page, /aria-controls=\{detailId\}/);
assert.match(page, /Historical Context/);
assert.match(page, /View Full Head-to-Head/);
assert.match(page, /View Rivalry Hub/);
assert.match(page, /getSleeperPlayerIdentityDirectory\(\s*rosterData\.flatMap/);
assert.match(page, /fetch\(`\/api\/projections\/active\?week=\$\{activeWeek\}`\)\.catch\(\(\) => null\)/);

console.log("Matchups M8 QA checks passed.");
