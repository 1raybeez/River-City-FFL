import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  FEEDBACK_AREAS,
  FEEDBACK_LIMITS,
  feedbackAreaForPath,
  normalizeFeedbackPagePath,
  normalizeFeedbackTitle,
  validateOwnerFeedbackInput,
  type OwnerFeedbackInput,
} from "../lib/feedback";

const page = readFileSync("app/feedback/FeedbackForm.tsx", "utf8");
const route = readFileSync("app/api/feedback/route.ts", "utf8");
const server = readFileSync("lib/feedbackServer.ts", "utf8");
const rules = readFileSync("firestore.rules", "utf8");
const shell = readFileSync("components/SiteShell.tsx", "utf8");
const home = readFileSync("app/HomeClient.tsx", "utf8");
const footer = readFileSync("components/OwnerFeedbackFooter.tsx", "utf8");

const validBug: OwnerFeedbackInput = {
  type: "BUG",
  title: "Login button is unclear",
  description: "The login button does not explain what happens next.",
  expectedBehavior: "The button should clearly identify the member login flow.",
  reproductionSteps: "Open the home page and inspect the top-right login control.",
  pagePath: "/league-info/legislative?session=2026",
  area: "LEGISLATION",
};
const bug = validateOwnerFeedbackInput(validBug);
assert.equal(bug.type, "BUG");
assert.equal(bug.pagePath, "/league-info/legislative");
assert.equal(bug.area, "LEGISLATION");
assert.equal(bug.suggestionRationale, null);

const suggestion = validateOwnerFeedbackInput({
  type: "SUGGESTION",
  title: "Add a compact archive index",
  description: "A small index would make older league material easier to find.",
  suggestionRationale: "It would reduce navigation friction.",
  pagePath: "/league-info",
  area: "LEAGUE_INFO",
});
assert.equal(suggestion.type, "SUGGESTION");
assert.equal(suggestion.expectedBehavior, null);
assert.equal(suggestion.reproductionSteps, null);

for (const invalid of [
  { ...validBug, type: "OTHER" },
  { ...validBug, area: "NOT_A_REAL_AREA" },
  { ...validBug, title: "   " },
  { ...validBug, title: "x".repeat(FEEDBACK_LIMITS.title + 1) },
  { ...validBug, description: "x".repeat(FEEDBACK_LIMITS.description + 1) },
  { ...validBug, expectedBehavior: "x".repeat(FEEDBACK_LIMITS.expectedBehavior + 1) },
  { ...validBug, reproductionSteps: "x".repeat(FEEDBACK_LIMITS.reproductionSteps + 1) },
  { ...suggestion, suggestionRationale: "x".repeat(FEEDBACK_LIMITS.suggestionRationale + 1) },
] as OwnerFeedbackInput[]) {
  assert.throws(() => validateOwnerFeedbackInput(invalid));
}

assert.equal(normalizeFeedbackPagePath("https://evil.example/steal"), "/feedback");
assert.equal(normalizeFeedbackPagePath("//evil.example/steal"), "/feedback");
assert.equal(normalizeFeedbackPagePath("/matchups?week=1"), "/matchups");
assert.equal(feedbackAreaForPath("/commish/auction"), "WAR_ROOM");
assert.equal(feedbackAreaForPath("/league-info/constitution"), "CONSTITUTION");
assert.equal(feedbackAreaForPath("/unknown"), "OTHER");
assert.equal(normalizeFeedbackTitle("  Same   title "), "same title");
assert.deepEqual(FEEDBACK_AREAS.at(-1), "OTHER");

assert.match(route, /validateJsonMutationRequest/);
assert.match(route, /requireLegislativeOwner/);
assert.doesNotMatch(route, /ownerProfileId/);
assert.doesNotMatch(route, /submittedByDisplayName/);
assert.match(server, /serverTimestamp/);
assert.match(server, /status: "OPEN"/);
assert.match(server, /DuplicateFeedbackError/);
assert.doesNotMatch(server, /email:/);
assert.doesNotMatch(server, /uid/);
assert.match(rules, /match \/site_feedback\/\{document\}/);
assert.match(rules, /match \/site_feedback\/\{document\} \{\n\s+allow read, write: if false;/);
assert.match(page, /Report a bug/);
assert.match(page, /Suggest an improvement/);
assert.match(page, /aria-live/);
assert.match(page, /disabled=\{state === 'SUBMITTING'\}/);
assert.match(shell, /OwnerFeedbackFooter/);
assert.match(home, /OwnerFeedbackFooter/);
assert.equal((home.match(/<OwnerFeedbackFooter \/>/g) ?? []).length, 1);
assert.equal((shell.match(/<OwnerFeedbackFooter \/>/g) ?? []).length, 1);
assert.match(footer, /feedbackFrom/);
assert.match(footer, /encodeURIComponent\(feedbackFrom\)/);
assert.match(footer, /normalizeFeedbackPagePath\(pathname \?\? "\/", "\/feedback"\)/);
assert.match(footer, /Found a problem or have an idea\?/);
assert.match(footer, /Send feedback/);
assert.equal(normalizeFeedbackPagePath("/"), "/");
assert.equal(feedbackAreaForPath(normalizeFeedbackPagePath("/")), "HOME");
assert.doesNotMatch(shell, /PRIMARY_SITE_NAV_ITEMS\.map.*feedback/);
assert.doesNotMatch(home, /PRIMARY_SITE_NAV_ITEMS\.map.*feedback/);
assert.doesNotMatch(shell, /window\.location\.href/);

console.log("Owner feedback Slice A checks passed.");
