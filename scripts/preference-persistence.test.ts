import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mergeAuctionOwnerPreferencePatch } from "@/lib/auction/preferenceUpdateSemantics";

const saved = { tag: "target" as const, preferredEntry: 1, plannedCap: 75, note: null };

// A-C: target plus entry, max, or both preserves the target tag.
assert.equal(mergeAuctionOwnerPreferencePatch(saved, { preferredEntry: 2 }).tag, "target");
assert.equal(mergeAuctionOwnerPreferencePatch(saved, { plannedCap: 80 }).tag, "target");
assert.equal(mergeAuctionOwnerPreferencePatch(saved, { preferredEntry: 2, plannedCap: 80 }).tag, "target");

// D-E: tag changes preserve both independent prices.
assert.deepEqual(
  mergeAuctionOwnerPreferencePatch(saved, { tag: "watch" }),
  { tag: "watch", preferredEntry: 1, plannedCap: 75, note: null }
);
assert.deepEqual(
  mergeAuctionOwnerPreferencePatch({ ...saved, tag: "watch" }, { tag: "fade" }),
  { tag: "fade", preferredEntry: 1, plannedCap: 75, note: null }
);

// F-G: changing one field never resets another field.
assert.equal(mergeAuctionOwnerPreferencePatch(saved, { preferredEntry: 6 }).tag, "target");
assert.equal(mergeAuctionOwnerPreferencePatch(saved, { tag: "watch" }).preferredEntry, 1);

// H-I: explicit clears affect only the requested price field.
assert.deepEqual(mergeAuctionOwnerPreferencePatch(saved, { preferredEntry: null }), {
  tag: "target", preferredEntry: null, plannedCap: 75, note: null,
});
assert.deepEqual(mergeAuctionOwnerPreferencePatch(saved, { plannedCap: null }), {
  tag: "target", preferredEntry: 1, plannedCap: null, note: null,
});

// J: owner isolation is represented by independent records, never shared state.
const ownerA = mergeAuctionOwnerPreferencePatch(saved, { tag: "target" });
const ownerB = mergeAuctionOwnerPreferencePatch({ ...saved, tag: "watch" }, { plannedCap: 20 });
assert.equal(ownerA.tag, "target");
assert.equal(ownerB.tag, "watch");
assert.equal(ownerA.plannedCap, 75);
assert.equal(ownerB.plannedCap, 20);

// K-L: persisted target and reload hydration retain the target tag.
const persisted = mergeAuctionOwnerPreferencePatch(null, { tag: "target", preferredEntry: 1, plannedCap: 75 });
assert.equal(persisted.tag, "target");
assert.equal(mergeAuctionOwnerPreferencePatch(persisted, {}).tag, "target");

// Real UI path: the Draft Board star is an explicit target mutation, not read-only decoration.
const warRoomClient = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
assert.match(warRoomClient, /saveQuickPreferenceTag/);
assert.match(warRoomClient, /sleeperPlayerId,[\s\S]*tag,/);
assert.match(warRoomClient, /aria-label=\{`\$\{preferenceTags\.includes\('target'\) \? 'Remove' : 'Mark'\}/);
assert.match(warRoomClient, /Use Draft Plan to change WATCH or FADE preferences/);

console.log("preference persistence regression: PASS (A-L)");
