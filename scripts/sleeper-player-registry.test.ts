import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const sleeperSource = fs.readFileSync(path.join(root, "lib/sleeper.ts"), "utf8");
const snapshotSource = fs.readFileSync(path.join(root, "app/api/auction/sleeper-snapshot/route.ts"), "utf8");
const recommendedSource = fs.readFileSync(path.join(root, "lib/auction/recommendedNowServer.ts"), "utf8");
const metricsSource = fs.readFileSync(path.join(root, "lib/postDraftMetrics.ts"), "utf8");
const masterview = JSON.parse(fs.readFileSync(path.join(root, "data/auction/generated/masterview-2026.json"), "utf8"));
const adp = JSON.parse(fs.readFileSync(path.join(root, "data/auction/adp/generated/adp-consensus-2026.json"), "utf8"));
const tradePlayers = JSON.parse(fs.readFileSync(path.join(root, "data/trade-analyzer/player-stats-2026.json"), "utf8"));

assert.deepEqual(Object.keys(masterview.rows[0]).includes("sleeperPlayerId"), true);
assert.deepEqual(Object.keys(adp.rows[0]).includes("playerId"), true);
assert.equal(Object.keys(tradePlayers.players).length, 163);
assert.match(sleeperSource, /export interface SleeperPlayerIdentity/);
assert.match(sleeperSource, /getSleeperPlayerIdentityDirectory\(playerIds\?/);
assert.match(snapshotSource, /getSleeperPlayerIdentityDirectory\(playerIds\)/);
assert.match(recommendedSource, /getSleeperPlayerIdentityDirectory\(snapshot\.picks\.map/);
assert.match(metricsSource, /sleeper\.getSleeperPlayerIdentityDirectory\(\)/);
assert.doesNotMatch(snapshotSource, /api\.sleeper\.app\/v1\/players\/nfl/);
assert.doesNotMatch(recommendedSource, /api\.sleeper\.app\/v1\/players\/nfl/);
assert.doesNotMatch(metricsSource, /api\.sleeper\.app\/v1\/players\/nfl/);

console.log("Sleeper player registry contract tests passed.");
