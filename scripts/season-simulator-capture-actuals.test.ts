import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildActualCapture, validateActualReadback, writeActualCapture } from "./season-simulator-capture-actuals";

const rosters = Array.from({ length: 12 }, (_, index) => ({ roster_id: index + 1 }));
const matchup = (rosterId: number, matchupId: number, score: number) => ({ roster_id: rosterId, matchup_id: matchupId, points: score, starters: ["8144"], starters_points: [score], players_points: { "8144": score } });
const matchups = Array.from({ length: 6 }, (_, index) => [matchup(index * 2 + 1, index + 1, 100 + index), matchup(index * 2 + 2, index + 1, 90 + index)]).flat();
const input = { season: 2026, week: 1, finalizedAt: "2026-09-15T00:00:00.000Z", state: { week: 2, display_week: 1, season: "2026" }, league: { status: "in_season", season: "2026", settings: { last_scored_leg: 1 } }, rosters, matchups };

async function main() {
const artifact = buildActualCapture(input);
assert.equal(artifact.schemaVersion, "river-city-actual-evidence-v1");
assert.equal(artifact.calibrationEligibility, "INELIGIBLE_PATH_C");
assert.equal(artifact.matchupResults.length, 12);
assert.equal(artifact.playerActuals.length, 12);
assert.equal(artifact.officialStarterIds && Object.keys(artifact.officialStarterIds).length, 12);
assert.equal(artifact.actualInputChecksum, buildActualCapture(input).actualInputChecksum);
assert.notEqual(artifact.schemaVersion, "river-city-projection-evidence-v1");
assert.throws(() => buildActualCapture({ ...input, matchups: matchups.slice(0, 11) }), /12 finalized matchup rows/);
assert.throws(() => buildActualCapture({ ...input, matchups: matchups.map((row, index) => index === 11 ? { ...row, roster_id: 11 } : row) }), /all 12 River City teams/);
assert.throws(() => buildActualCapture({ ...input, state: { ...input.state, week: 1 }, week: 2 }), /not yet current\/finalized/);
validateActualReadback(artifact);

const directory = await fs.mkdtemp(path.join(os.tmpdir(), "river-city-actual-capture-"));
const dryRun = await writeActualCapture(artifact, { targetDirectory: directory, dryRun: true });
assert.equal(dryRun.writePerformed, false);
assert.deepEqual(await fs.readdir(directory), []);
const written = await writeActualCapture(artifact, { targetDirectory: directory, dryRun: false });
assert.equal(written.writePerformed, true);
validateActualReadback(JSON.parse(await fs.readFile(written.artifactPath, "utf8")));
await assert.rejects(() => writeActualCapture(artifact, { targetDirectory: directory, dryRun: false }), /already exists/);
console.log("Season simulator actual capture tests passed.");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
