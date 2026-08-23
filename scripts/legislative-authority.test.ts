import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  buildNormalizedLegislativeRecords,
  LEGISLATIVE_2026_RECONCILIATION,
} from "../lib/legislativeReadModel";
import {
  hasAllEligibleVotes,
  LEGACY_LEGISLATIVE_SESSION_CONFIG,
  LEGISLATIVE_ELIGIBLE_VOTE_COUNT,
  resolveLegislativeResult,
  resolveLegislativeSessionPhase,
} from "../lib/legislativeSession";
import { LEGISLATIVE_ARCHIVE } from "../lib/legislativeArchive";

const server = readFileSync("lib/legislativeServer.ts", "utf8");
const publicApi = readFileSync("app/api/league-info/legislative/route.ts", "utf8");
const voteApi = readFileSync("app/api/league-info/legislative/vote/route.ts", "utf8");
const requestSecurity = readFileSync("lib/auth/requestSecurity.ts", "utf8");

assert.equal(LEGISLATIVE_ELIGIBLE_VOTE_COUNT, 12);
assert.equal(LEGACY_LEGISLATIVE_SESSION_CONFIG.source, "legacy-fallback");
assert.equal(LEGACY_LEGISLATIVE_SESSION_CONFIG.sessionYear, 2027);
assert.equal(
  resolveLegislativeSessionPhase(
    LEGACY_LEGISLATIVE_SESSION_CONFIG,
    new Date("2026-08-21T00:00:00Z")
  ),
  "COLLECTING"
);
assert.equal(resolveLegislativeResult(7, 5), "passed");
assert.equal(resolveLegislativeResult(5, 7), "failed");
assert.equal(resolveLegislativeResult(6, 6), "tied");
assert.equal(hasAllEligibleVotes(7, 5), true);
assert.equal(hasAllEligibleVotes(6, 5), false);

const records = buildNormalizedLegislativeRecords(
  [
    {
      id: "ZgX6RYr0tVtl7SiF2Z5d",
      title: "Roster Continuity Clause",
      status: "passed",
      votes: { yes: ["a", "b"], no: ["c"] },
    },
    {
      id: "zVxQKXU9m9vJSMvDOF4N",
      title: "Don't Be a Bitch Rule",
      status: "passed",
      votes: { yes: ["a"], no: ["b"] },
    },
  ],
  LEGISLATIVE_ARCHIVE
);
assert.deepEqual(
  LEGISLATIVE_2026_RECONCILIATION["2026-roster-continuity-clause"],
  "ZgX6RYr0tVtl7SiF2Z5d"
);
assert.equal(
  records.filter((record) => record.title === "Roster Continuity Clause").length,
  1
);
assert.equal(
  records.filter((record) => record.reconciledProposalId === "zVxQKXU9m9vJSMvDOF4N").length,
  1
);
assert.equal(records.find((record) => record.title === "Roster Continuity Clause")?.source, "reconciled");
assert.deepEqual(
  records
    .filter((record) => record.sessionYear === 2026)
    .map((record) => record.title)
    .sort(),
  ["Don't Be a Bitch Rule", "Roster Continuity Clause"]
);
assert.equal(
  records.filter((record) => record.sessionYear === 2026).length,
  2
);
assert.equal(
  records.find((record) => record.title === "Roster Continuity Clause")?.sessionYear,
  2026
);

assert.match(server, /resolveLegislativeResult/);
assert.match(server, /status: result/);
assert.match(server, /tiedCount/);
assert.match(server, /allEligibleVotesCast/);
assert.match(server, /ratified_rules/);
assert.match(server, /version_history_updates/);
assert.doesNotMatch(server, /CURRENT_LEGISLATIVE_SESSION_YEAR =/);
assert.doesNotMatch(publicApi, /managerId: proposal\.managerId/);
assert.match(publicApi, /validateJsonMutationRequest/);
assert.match(voteApi, /validateJsonMutationRequest/);
assert.match(requestSecurity, /Cross-origin request denied/);
assert.match(requestSecurity, /JSON request required/);

assert.doesNotMatch(readFileSync("app/api/league-info/legislative/route.ts", "utf8"), /createdBy/);
assert.doesNotMatch(readFileSync("app/api/league-info/legislative/vote/route.ts", "utf8"), /managerId/);

console.log("Legislation authority/session contract checks passed.");
