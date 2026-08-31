import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { mergeIdentityValue } from "../lib/identity/mergeIdentity";

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

assert.equal(mergeIdentityValue("UNK", "DEF"), "DEF");
assert.equal(mergeIdentityValue("UNKNOWN", "QB"), "QB");
assert.equal(mergeIdentityValue("DEF", "UNK"), "DEF");
assert.equal(mergeIdentityValue("QB", "RB"), "QB");
assert.equal(mergeIdentityValue(null, "WR"), "WR");
assert.equal(mergeIdentityValue("", "TE"), "TE");

const mergedRegistry = new Map<string, { name: string | null; position: string | null }>();
const mergeRow = (playerId: unknown, name: unknown, position: unknown) => {
  if (playerId === null || playerId === undefined) return;
  const id = String(playerId);
  const current = mergedRegistry.get(id) ?? { name: null, position: null };
  mergedRegistry.set(id, {
    name: current.name ?? (typeof name === "string" ? name : null),
    position: mergeIdentityValue(current.position, typeof position === "string" ? position : null),
  });
};
masterview.rows.forEach((row: { sleeperPlayerId?: string; playerName?: string; position?: string }) => mergeRow(row.sleeperPlayerId, row.playerName, row.position));
adp.rows.forEach((row: { playerId?: string; playerName?: string; position?: string }) => mergeRow(row.playerId, row.playerName, row.position));
Object.values(tradePlayers.players).forEach((value) => {
  const row = value as { playerId?: string; playerName?: string; position?: string };
  mergeRow(row.playerId, row.playerName, row.position);
});

assert.equal(mergedRegistry.get("ATL")?.position, "DEF");
const defenseIds = new Set(["ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE", "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC", "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG", "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS"]);
const defenseRows = [...mergedRegistry.entries()].filter(([id, row]) => defenseIds.has(id) && row.name);
assert.equal(defenseRows.length, 32);
assert.equal(defenseRows.filter(([, row]) => row.position === "DEF" || row.position === "DST").length, 31);
assert.equal(defenseRows.find(([id]) => id === "WAS")?.[1].position, "UNK");

console.log("Sleeper player registry contract tests passed.");
