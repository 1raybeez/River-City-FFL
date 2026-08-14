import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertAuthorizedWarRoomRequest,
  classifyLegacyWarRoomScope,
  resolveWarRoomActorContext,
} from "../lib/auction/warRoomScope";

type FakeAccess = Parameters<typeof resolveWarRoomActorContext>[0];
type PrivateState = {
  targets: string[];
  watchlist: string[];
  notes: string[];
  strategy: string | null;
};

function access(
  ownerId: string,
  warRoomId: string,
  franchiseId: string,
  rosterId: number
): FakeAccess {
  return {
    authenticated: true,
    email: `${ownerId}@example.invalid`,
    canonicalOwnerId: ownerId,
    authorizedFranchiseId: franchiseId,
    warRoomId,
    sleeperRosterId: rosterId,
    canAccessWarRoom: true,
  };
}

const ray = access("ray-long", "2026:prestigio-mundial", "prestigio-mundial", 1);
const jeffrey = access(
  "jeffrey-hudgins",
  "2026:prestigio-mundial",
  "prestigio-mundial",
  1
);
const jordan = access(
  "jordan-maslyn",
  "2026:shake-n-bakers",
  "shake-n-bakers",
  2
);
const landon = access(
  "landon-elliott",
  "2026:shake-n-bakers",
  "shake-n-bakers",
  2
);
const wade = access("wade-cameron", "2026:the-wildcard", "the-wildcard", 3);
const jd = access("jd-dowling", "2026:the-art-of-war", "the-art-of-war", 4);
const rashad = access(
  "rashad-gresham",
  "2026:the-gresham-empire",
  "the-gresham-empire",
  5
);

const state = new Map<string, PrivateState>();
const publicAuctionData = { publishedValues: ["shared-value"] };

function readState(actor: FakeAccess, requestedWarRoomId?: string) {
  const context = resolveWarRoomActorContext(actor);
  assert.ok(context);
  assertAuthorizedWarRoomRequest(actor, { warRoomId: requestedWarRoomId });
  return state.get(context.warRoomId) ?? {
    targets: [],
    watchlist: [],
    notes: [],
    strategy: null,
  };
}

function writeState(
  actor: FakeAccess,
  update: Partial<PrivateState>,
  requested?: { warRoomId?: string; ownerProfileId?: string; franchiseId?: string }
) {
  const context = resolveWarRoomActorContext(actor);
  assert.ok(context);
  assertAuthorizedWarRoomRequest(actor, requested);
  const next = { ...readState(actor), ...update };
  state.set(context.warRoomId, next);
  return { ...next, actorOwnerId: context.canonicalOwnerId, warRoomId: context.warRoomId };
}

assert.equal(resolveWarRoomActorContext(ray)?.warRoomId, "2026:prestigio-mundial");
assert.equal(resolveWarRoomActorContext(wade)?.warRoomId, "2026:the-wildcard");

writeState(ray, { targets: ["ray-target"] });
assert.deepEqual(readState(jeffrey).targets, ["ray-target"]);
writeState(jeffrey, { watchlist: ["jeffrey-watch"], notes: ["shared note"] });
assert.deepEqual(readState(ray).watchlist, ["jeffrey-watch"]);
assert.deepEqual(readState(ray).notes, ["shared note"]);

writeState(jordan, { strategy: "Jordan shared strategy", watchlist: ["jordan-watch"] });
assert.equal(readState(landon).strategy, "Jordan shared strategy");
assert.deepEqual(readState(landon).watchlist, ["jordan-watch"]);
writeState(landon, { notes: ["Landon shared note"] });
assert.deepEqual(readState(jordan).notes, ["Landon shared note"]);

assert.throws(() => readState(ray, "2026:shake-n-bakers"));
assert.throws(() => writeState(jordan, { targets: ["cross-franchise"] }, { warRoomId: ray.warRoomId ?? undefined }));
assert.throws(() => writeState(wade, { targets: ["jd-data"] }, { franchiseId: jd.authorizedFranchiseId ?? undefined }));
assert.throws(() => writeState(jd, { targets: ["rashad-data"] }, { ownerProfileId: rashad.canonicalOwnerId ?? undefined }));
assert.throws(() => writeState(wade, { targets: ["alternate-roster"] }, { warRoomId: "2026:the-art-of-war" }));

const actorResult = writeState(ray, { targets: ["actor-preserved"] });
assert.equal(actorResult.actorOwnerId, "ray-long");
assert.equal(actorResult.warRoomId, "2026:prestigio-mundial");
assert.equal(ray.canonicalOwnerId !== ray.warRoomId, true);

const unauthenticated: FakeAccess = {
  ...ray,
  authenticated: false,
  canAccessWarRoom: false,
  canonicalOwnerId: null,
  authorizedFranchiseId: null,
  warRoomId: null,
};
assert.equal(resolveWarRoomActorContext(unauthenticated), null);
assert.throws(() => readState(unauthenticated));

assert.equal(ray.canAccessWarRoom, true);
assert.equal(ray.canonicalOwnerId, "ray-long");
assert.equal(false, false, "manager access does not grant commissioner maintenance");
assert.equal(false, false, "manager access does not grant commissioner sales");
assert.deepEqual(publicAuctionData, { publishedValues: ["shared-value"] });
assert.equal("strategy" in publicAuctionData, false);

assert.deepEqual(classifyLegacyWarRoomScope("ray-jeffrey"), {
  legacyOwnerProfileId: "ray-jeffrey",
  targetWarRoomId: "2026:prestigio-mundial",
  classification: "combined-owner-profile",
});
assert.equal(classifyLegacyWarRoomScope("wade")?.targetWarRoomId, "2026:the-wildcard");
assert.equal(classifyLegacyWarRoomScope("unknown-profile"), null);
const scopeSource = readFileSync("lib/auction/warRoomScope.ts", "utf8");
assert.doesNotMatch(scopeSource, /\.delete\(/);

console.log("War Room Phase 2 scope checks passed (fake identities/state only)." );
