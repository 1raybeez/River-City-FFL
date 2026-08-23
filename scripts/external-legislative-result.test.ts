import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { normalizeLiveLegislativeRecord } from "../lib/legislativeReadModel";
import { resolveExternalLegislativeResult } from "../lib/legislativeExternalResult";

const server = readFileSync("lib/legislativeServer.ts", "utf8");
const route = readFileSync("app/api/commish/proposals/route.ts", "utf8");
const page = readFileSync("app/league-info/legislative/page.tsx", "utf8");

assert.equal(resolveExternalLegislativeResult(12, 0), "passed");
assert.equal(resolveExternalLegislativeResult(6, 6), "tied");
assert.equal(resolveExternalLegislativeResult(5, 7), "failed");

const external = normalizeLiveLegislativeRecord({
  id: "7LF5QjH7X4kRm4gantIX",
  sessionYear: 2027,
  title: "In-Person Draft",
  section: "1.1.1.1.33.1",
  submittedBy: "Travis Miller",
  status: "passed",
  votes: { yes: [], no: [] },
  externalResult: { yes: 12, no: 0, total: 12, sourceLabel: "Sleeper" },
  resultSource: "sleeper",
});
assert.equal(external.status, "passed");
assert.equal(external.yesVotes, 12);
assert.equal(external.noVotes, 0);
assert.equal(external.totalVotes, 12);
assert.equal(external.resultSourceLabel, "Sleeper");
assert.equal(external.currentRuleHref, null);
assert.equal(external.amendmentHistoryHref, null);

assert.match(server, /externalResult/);
assert.match(server, /isValidCurrentRuleId/);
assert.match(server, /Conflicting finalized result already exists/);
assert.match(server, /Website votes already exist/);
assert.match(server, /sourceLabel/);
assert.match(route, /requireAuctionAccess\("maintenance"\)/);
assert.match(route, /record-external-result/);
assert.match(page, /Vote recorded via/);
assert.match(page, /Approved by league vote/);
assert.doesNotMatch(server, /votes\.yes.*input\.yes/);

console.log("External legislative aggregate-result checks passed.");
