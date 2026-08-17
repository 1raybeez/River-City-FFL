import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const home = readFileSync("app/HomeClient.tsx", "utf8");
const historicalResults = readFileSync("lib/history/historicalSeasonResults.ts", "utf8");

assert.match(page, /getCurrentMember\(\)/);
assert.match(page, /getPublishedLeagueRecap\(2026\)/);
assert.match(page, /getHomeBoxOneState\(2026\)/);
assert.match(page, /Public Home remains available/);
assert.match(page, /legacy client recap remains available/);
assert.match(page, /boxOneState = \{[\s\S]*DATA_UNAVAILABLE/);

assert.match(home, /MiniStat label="Draft countdown" value=\{draftCountdownLabel\}/);
assert.match(home, /event\.meetLink/);
assert.match(home, /Join Google Meet/);
assert.match(home, /DRAFT_UPCOMING/);
assert.match(home, /DRAFT_LIVE/);
assert.match(home, /POST_DRAFT_PRESEASON/);
assert.match(home, /SEASON_LIVE/);
assert.match(home, /DATA_UNAVAILABLE/);
assert.match(home, /commissionerEyebrow/);
assert.match(home, /commissionerDescription/);
assert.doesNotMatch(home, /Draft day is virtual: August 29, 2026/);
assert.doesNotMatch(home, /championship allocation is \$235/);
assert.doesNotMatch(home, /approved \$13\.77 ring expense/);
assert.match(home, /historyFinanceText/);
assert.match(home, /public finance summary reports/);
assert.match(home, /setPublicFinance\(null\)/);
assert.match(home, /setPredictorError\("Power rankings data could not be loaded\."\)/);
assert.match(home, /catch \(error\) \{[\s\S]*setIsSubmittingRsvp\(false\)/);
assert.match(home, /showRsvp \? onSnapshot/);

assert.match(home, /useModalFocusTrap/);
assert.match(home, /aria-modal="true"/);
assert.match(home, /recapDialogRef/);
assert.match(home, /historyDialogRef/);
assert.match(home, /recapTriggerRef/);
assert.match(home, /historyTriggerRef/);
assert.match(home, /event\.key !== "Tab"/);
assert.match(home, /event\.key !== "Escape"/);
assert.match(home, /max-w-3xl overflow-y-auto/);
assert.match(home, /lg:grid-cols-12/);
assert.doesNotMatch(home, /document\.documentElement\.style/);

assert.match(historicalResults, /isHistoricalChampion/);
assert.match(historicalResults, /finalPlacement/);
assert.doesNotMatch(historicalResults, /wins|losses/);
assert.match(home, /Aaron Hawkins/);
assert.match(home, /Official 2025 winner/);
assert.match(home, /value=\"9-5\"/);

for (const unsafeField of ["email", "firebaseUid", "canonicalOwnerId", "warRoomId", "rosterId", "idToken", "plannedCaps", "preferredEntry"]) {
  assert.doesNotMatch(home, new RegExp(unsafeField, "i"));
}

console.log("Home final QA fixture checks passed.");
