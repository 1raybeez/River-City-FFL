import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = readFileSync("lib/draftReportCard.ts", "utf8");
const ownerPage = readFileSync("app/league-info/draft-report/page.tsx", "utf8");
const overviewPage = readFileSync("app/league-info/draft-report/overview/page.tsx", "utf8");
const overview = readFileSync("app/commish/post-draft/ReportCardOverview.tsx", "utf8");
const view = readFileSync("app/league-info/draft-report/DraftReportCardView.tsx", "utf8");
const accountMenu = readFileSync("components/MemberAccountMenu.tsx", "utf8");

assert.match(contract, /loadPostDraftMetricsInput\(2026\)/);
assert.match(contract, /calculatePostDraftMetrics\(input\)/);
assert.match(contract, /calculatePublicDraftGrades\(metrics\)/);
assert.match(contract, /buildPostDraftTeamAnalysis\(publicRecord, input, metrics\)/);
assert.match(contract, /requireAuctionWarRoomAccess/);
assert.match(contract, /requireAuctionAccess\("maintenance"\)/);
assert.match(contract, /session\.access\.authorizedFranchiseId/);
assert.match(contract, /COMMISSIONER_PREVIEW/);
assert.match(ownerPage, /getOwnerDraftReportCard/);
assert.match(ownerPage, /returnTo=%2Fleague-info%2Fdraft-report/);
assert.match(overviewPage, /getOwnerDraftReportCardOverview/);
assert.match(overview, /href=\{`\/commish\/post-draft\/report\?franchiseId=\$\{encodeURIComponent\(row\.franchiseId\)\}`\}/);
assert.doesNotMatch(overview, /ownerMode \? null : <Link/);
assert.match(view, /What you did well/);
assert.match(view, /Where you missed/);
assert.match(view, /Draft verdict/);
assert.match(view, /Best buy/);
assert.match(view, /Biggest reach/);
assert.match(view, /Post-draft transactions do not alter the grade/);
assert.match(view, /Kicker and defense market rankings are limited/);
assert.match(accountMenu, /My Draft Report Card/);
assert.doesNotMatch(view, /playerId/);
assert.doesNotMatch(view, /warRoom|privateStrategy|internalNotes/);
assert.doesNotMatch(view, /was the biggest reach at \$\{money\(metrics\.biggestReach\.valueDifferential\)/);
assert.doesNotMatch(view, /<p className=\"mt-1 text-xs font-semibold text-slate-500\">\{part.status\}/);

console.log("RC2 draft report-card access and presentation checks passed.");
