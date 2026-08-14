import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyWarRoomMigrationRecord,
} from "../lib/auction/warRoomMigrationClassifier";
import {
  classifyLegacyWarRoomScope,
  getLegacyWarRoomProfileIds,
} from "../lib/auction/warRoomScope";

const migration = readFileSync("scripts/migrate-war-room-live-state.ts", "utf8");
const rayScope = classifyLegacyWarRoomScope("ray-jeffrey");
const wadeScope = classifyLegacyWarRoomScope("wade");
const jdScope = classifyLegacyWarRoomScope("jd");
const rashadScope = classifyLegacyWarRoomScope("rashad");

assert.equal(rayScope?.targetWarRoomId, "2026:prestigio-mundial");
assert.equal(wadeScope?.targetWarRoomId, "2026:the-wildcard");
assert.equal(jdScope?.targetWarRoomId, "2026:the-art-of-war");
assert.equal(rashadScope?.targetWarRoomId, "2026:the-gresham-empire");
assert.deepEqual(getLegacyWarRoomProfileIds("2026:prestigio-mundial"), [
  "ray-jeffrey",
]);
assert.deepEqual(getLegacyWarRoomProfileIds("2026:the-wildcard"), ["wade"]);
assert.deepEqual(getLegacyWarRoomProfileIds("2026:the-art-of-war"), ["jd"]);
assert.deepEqual(getLegacyWarRoomProfileIds("2026:the-gresham-empire"), [
  "rashad",
]);
assert.equal(
  classifyWarRoomMigrationRecord({
    sourcePath: "auction_owner_preferences/2026_ray-jeffrey/players",
    sourceType: "owner-profile",
    ownerProfileId: "ray-jeffrey",
  }).action,
  "MIGRATE TO WAR ROOM"
);

assert.match(migration, /collectionGroup\("settings"\)/);
assert.match(migration, /collectionGroup\("players"\)/);
assert.match(migration, /DRY RUN ONLY/);
assert.doesNotMatch(migration, /\.set\(/);
assert.doesNotMatch(migration, /\.delete\(/);
assert.doesNotMatch(migration, /console\.log\([^\n]*(playerName|sleeperPlayerId|tag|note)/i);
assert.match(readFileSync("lib/auction/ownerPreferences.ts", "utf8"), /getLegacyWarRoomProfileIds/);
assert.match(readFileSync("lib/auction/ownerProfileSettings.ts", "utf8"), /getLegacyWarRoomProfileIds/);
assert.match(readFileSync("lib/auction/ownerPreferences.ts", "utf8"), /snapshot\.docs\.length === 0 && warRoomId/);
assert.match(readFileSync("lib/auction/ownerProfileSettings.ts", "utf8"), /!snapshot\.exists && warRoomId/);

console.log("War Room recovery compatibility checks passed (read fallback only; no writes).");
