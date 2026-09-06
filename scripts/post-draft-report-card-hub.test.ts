import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const overview = readFileSync("app/commish/post-draft/ReportCardOverview.tsx", "utf8");
const index = readFileSync("lib/commissionerPostDraftIndex.ts", "utf8");
const page = readFileSync("app/commish/post-draft/page.tsx", "utf8");
const managerCard = readFileSync("components/ManagerPortraitCard.tsx", "utf8");

assert.match(overview, /rows = \[\.\.\.reportIndex\]\.sort/);
assert.match(overview, /Current 2026 team names/);
assert.match(overview, /row\.ownerName/);
assert.match(overview, /View report/);
assert.match(overview, /franchiseId\)}/);
assert.match(index, /currentTeamName/);
assert.match(page, /ReportCardOverview/);
assert.match(managerCard, /manager\.currentTeamName/);
assert.doesNotMatch(overview, /privateStrategy|trashTalk|internalNotes/);

console.log("Post-draft report-card hub checks passed.");
