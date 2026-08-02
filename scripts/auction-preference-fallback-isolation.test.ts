import assert from "node:assert/strict";

import {
  fadePlayerNames,
  targetPlayerNames,
  watchlistPlayerNames,
} from "../lib/auction/draftPreferences";
import {
  resolveAuctionPreferenceTag,
  resolveAuctionPreferenceTags,
} from "../lib/auction/preferenceFallbacks";
import { getAuctionPreferenceFallbacksForProfile } from "../lib/auction/preferenceFallbackData";
import { getAuctionOwnerPreferenceScopeId } from "../lib/auction/ownerPreferenceTypes";
import {
  AUCTION_OWNER_PROFILE_RAY_JEFFREY,
  buildCommissionerAccessResult,
  buildPilotAccessResult,
  getAuctionOwnerProfile,
} from "../lib/auction/ownerProfiles";

const fallbackExamples = [
  { playerName: targetPlayerNames[0], expectedTag: "target" as const },
  { playerName: watchlistPlayerNames[0], expectedTag: "watch" as const },
  { playerName: fadePlayerNames[0], expectedTag: "fade" as const },
];
const rayJeffreyFallbacks = getAuctionPreferenceFallbacksForProfile(
  AUCTION_OWNER_PROFILE_RAY_JEFFREY
);

for (const example of fallbackExamples) {
  assert.deepEqual(
    resolveAuctionPreferenceTags({
      fallbacks: rayJeffreyFallbacks,
      playerNames: [example.playerName],
      savedTag: null,
    }),
    [example.expectedTag],
    `ray-jeffrey should retain the ${example.expectedTag} fallback.`
  );
}

for (const pilotProfileId of ["wade", "jd", "rashad"] as const) {
  const fallbackLists = getAuctionPreferenceFallbacksForProfile(pilotProfileId);

  assert.deepEqual(fallbackLists.targetPlayerNames, []);
  assert.deepEqual(fallbackLists.watchlistPlayerNames, []);
  assert.deepEqual(fallbackLists.fadePlayerNames, []);

  for (const example of fallbackExamples) {
    assert.equal(
      resolveAuctionPreferenceTag({
        fallbacks: fallbackLists,
        playerNames: [example.playerName],
        savedTag: null,
      }),
      "open",
      `${pilotProfileId} should receive a neutral preference for ${example.playerName}.`
    );
  }
}

assert.deepEqual(
  resolveAuctionPreferenceTags({
    fallbacks: getAuctionPreferenceFallbacksForProfile("wade"),
    playerNames: [targetPlayerNames[0]],
    savedTag: "watch",
  }),
  ["watch"],
  "A saved pilot preference should override the neutral default."
);

assert.deepEqual(
  resolveAuctionPreferenceTags({
    fallbacks: rayJeffreyFallbacks,
    playerNames: [targetPlayerNames[0]],
    savedTag: "open",
  }),
  [],
  "A saved open row should suppress the commissioner fallback."
);

const pilotCoachPreference = resolveAuctionPreferenceTag({
  fallbacks: getAuctionPreferenceFallbacksForProfile("jd"),
  playerNames: [targetPlayerNames[0]],
  savedTag: null,
});
assert.equal(
  pilotCoachPreference,
  "open",
  "Pilot Coach context must not receive a commissioner fallback preference."
);

const pilotRecommendationTags = resolveAuctionPreferenceTags({
  fallbacks: getAuctionPreferenceFallbacksForProfile("rashad"),
  playerNames: [watchlistPlayerNames[0]],
  savedTag: null,
});
assert.deepEqual(
  pilotRecommendationTags,
  [],
  "Pilot recommendation inputs must not receive commissioner fallback tags."
);

const rayScope = getAuctionOwnerPreferenceScopeId(
  2026,
  AUCTION_OWNER_PROFILE_RAY_JEFFREY
);
for (const pilotProfileId of ["wade", "jd", "rashad"] as const) {
  assert.notEqual(
    getAuctionOwnerPreferenceScopeId(2026, pilotProfileId),
    rayScope,
    `${pilotProfileId} must retain a separate persistence scope.`
  );

  const profile = getAuctionOwnerProfile(pilotProfileId);
  assert.ok(profile, `${pilotProfileId} profile should exist.`);
  assert.equal(
    buildPilotAccessResult(profile, `${pilotProfileId}@example.test`)
      .ownerProfileId,
    pilotProfileId,
    `${pilotProfileId} access must remain scoped to its own profile.`
  );
}

const rayAccess = buildCommissionerAccessResult("ray@example.test");
const jeffreyAccess = buildCommissionerAccessResult("jeffrey@example.test");
assert.equal(rayAccess.ownerProfileId, AUCTION_OWNER_PROFILE_RAY_JEFFREY);
assert.equal(jeffreyAccess.ownerProfileId, AUCTION_OWNER_PROFILE_RAY_JEFFREY);
assert.equal(
  getAuctionOwnerPreferenceScopeId(2026, rayAccess.ownerProfileId ?? ""),
  getAuctionOwnerPreferenceScopeId(2026, jeffreyAccess.ownerProfileId ?? ""),
  "Ray and Jeffrey should retain the shared season/profile persistence scope."
);

console.log("Auction preference fallback isolation assertions passed.");
