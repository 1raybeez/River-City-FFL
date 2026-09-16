import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { MATCHUP_POLL_INTERVAL_MS, shouldPollMatchups } from "../lib/matchupsPolling";

assert.equal(shouldPollMatchups({ selectedWeek: 2, currentWeek: 2, leagueStatus: "in_season" }), true);
assert.equal(shouldPollMatchups({ selectedWeek: 1, currentWeek: 2, leagueStatus: "in_season" }), false);
assert.equal(shouldPollMatchups({ selectedWeek: 3, currentWeek: 2, leagueStatus: "in_season" }), false);
assert.equal(shouldPollMatchups({ selectedWeek: 2, currentWeek: 2, leagueStatus: "complete" }), false);
assert.equal(shouldPollMatchups({ selectedWeek: 2, currentWeek: 2, leagueStatus: "pre_draft" }), false);
assert.equal(MATCHUP_POLL_INTERVAL_MS, 60_000);

const page = readFileSync("app/matchups/page.tsx", "utf8");
assert.match(page, /setInterval\(\(\) => void refreshScores\(\), MATCHUP_POLL_INTERVAL_MS\)/);
assert.match(page, /document\.hidden/);
assert.match(page, /visibilitychange/);
assert.match(page, /if \(!cancelled\) setRefreshError\(true\)/);
assert.match(page, /setMatchups\(Array\.isArray\(matchupData\) \? matchupData : \[\]\)/);
assert.doesNotMatch(page, /setMatchups\(\[\]\).*refreshError/);
assert.match(page, /lineupState === "LIVE" \? "In progress"/);
assert.doesNotMatch(page, /setInterval\([^\n]*[0-9]{1,4}\)/);

console.log("Matchups polling checks passed.");
