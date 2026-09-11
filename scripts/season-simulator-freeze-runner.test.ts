import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { parseFreezeArgs, runFreeze, validateFreezeWindow } from "./season-simulator-freeze-projections";
import { evaluateFreezeWindow } from "../lib/seasonSimulator/freezeWindow";

assert.deepEqual(parseFreezeArgs(["--season", "2026", "--week", "2", "--dry-run"], new Date("2026-09-10T12:00:00-04:00"), "/tmp/calibration"), {season: 2026, week: 2, dryRun: true, now: new Date("2026-09-10T12:00:00-04:00"), targetDirectory: "/tmp/calibration"});
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T14:59:59-04:00")).reason, "BEFORE_APPROVED_FREEZE_WINDOW");
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T15:00:00-04:00")).eligible, true);
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T17:00:00-04:00")).eligible, true);
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T20:14:59-04:00")).eligible, true);
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T20:15:00-04:00")).reason, "AT_OR_AFTER_FIRST_KICKOFF");
assert.equal(evaluateFreezeWindow(2026, 2, new Date("2026-09-17T21:00:00-04:00")).eligible, false);
assert.equal(evaluateFreezeWindow(2026, 3, new Date("2026-09-17T15:00:00-04:00")).reason, "MISSING_APPROVED_FREEZE_WINDOW");
assert.equal(validateFreezeWindow({season: 2026, week: 2, now: new Date("2026-09-17T20:15:00-04:00")}), false);
assert.equal(validateFreezeWindow({season: 2026, week: 2, now: new Date("2026-09-17T20:14:59-04:00")}), true);

const fixture = async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "river-city-freeze-"));
  const players: Record<string, Record<string, unknown>> = {};
  for (const [id, full_name, position, team] of [["qb", "Quarterback", "QB", "BUF"], ["rb", "Running Back", "RB", "BUF"], ["wr1", "Wide One", "WR", "BUF"], ["wr2", "Wide Two", "WR", "BUF"], ["te", "Tight End", "TE", "BUF"], ["flex", "Flex", "WR", "BUF"], ["k", "Kicker", "K", "BUF"]]) players[id] = {full_name, position, team};
  const rosters = Array.from({length: 12}, (_, index) => ({roster_id: index + 1, owner_id: `owner-${index + 1}`, players: ["qb", "rb", "wr1", "wr2", "te", "flex", "k", "BUF"]}));
  const fetchImpl: typeof fetch = async (url) => {
    const value = String(url);
    if (value.includes("fantasypros.com")) return new Response(JSON.stringify({season: 2026, week: 2, players: [
      ...[["qb", "Quarterback", "QB"], ["rb", "Running Back", "RB"], ["wr1", "Wide One", "WR"], ["wr2", "Wide Two", "WR"], ["te", "Tight End", "TE"], ["flex", "Flex", "WR"], ["k", "Kicker", "K"]].map(([fpid, name, position]) => ({fpid, name, position_id: position, team_id: "BUF", stats: {points_half: 10}})),
      {fpid: "def", name: "Buffalo", position_id: "DST", team_id: "BUF", stats: {points_half: 5}},
    ]}), {status: 200, headers: {"last-modified": "fixture"}});
    if (value.endsWith("/players/nfl")) return new Response(JSON.stringify(players), {status: 200});
    if (value.endsWith("/rosters")) return new Response(JSON.stringify(rosters), {status: 200});
    if (value.endsWith("/users")) return new Response(JSON.stringify(rosters.map(roster => ({user_id: roster.owner_id, display_name: `Owner ${roster.roster_id}`}))), {status: 200});
    return new Response(JSON.stringify({scoring_settings: {rec: 0.5}}), {status: 200});
  };
  return {directory, fetchImpl};
};

 (async () => {
const {directory, fetchImpl} = await fixture();
const summary = await runFreeze({season: 2026, week: 2, dryRun: true, now: new Date("2026-09-10T12:00:00-04:00"), targetDirectory: directory, fetchImpl, sleep: async () => undefined});
assert.equal(summary.writePerformed, false);
assert.equal(summary.officialFreezeEligible, false);
assert.equal(summary.eligibilityReason, "BEFORE_APPROVED_FREEZE_WINDOW");
assert.equal(JSON.stringify(summary).includes("FANTASYPROS_API_KEY"), false);
assert.equal(summary.franchisesFound, 12);
assert.equal(await fs.readdir(directory).then(files => files.length), 0);

await fs.writeFile(path.join(directory, "2026-week-02-projection-evidence-early.json"), JSON.stringify({season: 2026, week: 2, createdAt: "2026-09-11T22:53:52.560Z", checksum: "diagnostic"}));
const opened = await runFreeze({season: 2026, week: 2, dryRun: false, now: new Date("2026-09-17T15:00:00-04:00"), targetDirectory: directory, fetchImpl, sleep: async () => undefined});
assert.equal(opened.writePerformed, true);
assert.equal(opened.officialFreezeEligible, true);
const written = JSON.parse(await fs.readFile(opened.artifactTargetPath, "utf8"));
assert.equal(written.capturePurpose, "CALIBRATION_BASELINE");
assert.equal(written.freezeWindowOpen, "2026-09-17T15:00:00-04:00");
assert.equal(written.firstKickoff, "2026-09-17T20:15:00-04:00");
assert.equal(written.capturedWithinApprovedWindow, true);
await assert.rejects(() => runFreeze({season: 2026, week: 2, dryRun: false, now: new Date("2026-09-17T17:00:00-04:00"), targetDirectory: directory, fetchImpl, sleep: async () => undefined}), /authoritative calibration baseline already exists/);
console.log("Season simulator freeze-runner tests passed.");
})();
