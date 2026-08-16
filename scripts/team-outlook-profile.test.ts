import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getOwnerProfileViewModelBySlug } from "../lib/managers/identitySelectors";

const page = readFileSync("app/managers/owners/[owner]/page.tsx", "utf8");
const profile = readFileSync("components/managers/OwnerProfile.tsx", "utf8");

assert.match(page, /getPublishedTeamOutlook/);
assert.match(page, /getPublishedTeamOutlook\(2026/);
assert.match(page, /publishedTeamOutlook/);
assert.match(profile, /PublicTeamOutlookSection/);
assert.match(profile, /Draft Grade/);
assert.match(profile, /Draft Score/);
assert.match(profile, /Power Rank/);
assert.match(profile, /not win probability, playoff odds, or championship odds/);
assert.match(profile, /Strengths/);
assert.match(profile, /Concerns/);
assert.match(profile, /Best Buy/);
assert.match(profile, /Biggest Reach/);
assert.match(profile, /X-Factor/);
assert.match(profile, /Commissioner Take/);
assert.match(profile, /publishedTeamOutlook &&/);
assert.match(profile, /flex-wrap/);
assert.doesNotMatch(profile, /privateStrategyTake|plannedCaps|preferredEntry|trashTalk|internalNotes|calculatePublicDraftGrades|getCanonicalPowerRankings/);

const ownerFranchise = (slug: string) => getOwnerProfileViewModelBySlug(slug)?.currentFranchises[0]?.id;
assert.equal(ownerFranchise("ray-long"), "prestigio-mundial");
assert.equal(ownerFranchise("jeffrey-hudgins"), "prestigio-mundial");
assert.equal(ownerFranchise("jordan-maslyn"), "shake-n-bakers");
assert.equal(ownerFranchise("landon-elliott"), "shake-n-bakers");

console.log("Public team outlook profile checks passed.");
