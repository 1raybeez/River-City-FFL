import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const client = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
const card = readFileSync("app/commish/auction/RecommendedNow.tsx", "utf8");
const page = readFileSync("app/commish/auction/page.tsx", "utf8");
const preferences = readFileSync("lib/auction/ownerPreferences.ts", "utf8");
const recommendationServer = readFileSync("lib/auction/recommendedNowServer.ts", "utf8");
const recommendationRoute = readFileSync("app/api/auction/recommended-now/route.ts", "utf8");

// Persisted private state is loaded server-side for the authenticated owner and
// hydrated into the client preference map; no reset/recovery is part of M12B.
assert.match(page, /requireAuctionWarRoomAccess\(\)/);
assert.match(page, /readInitialOwnerPreferences\(ownerProfileId, warRoomId \?\? undefined\)/);
assert.match(page, /initialOwnerPreferences/);
assert.match(preferences, /getWarRoomPreferencePlayersCollection/);
assert.match(preferences, /getLegacyWarRoomProfileIds/);
assert.match(preferences, /preferredEntry: readNullableNumber/);
assert.match(preferences, /plannedCap: readNullableNumber/);
assert.match(client, /buildDraftPlanPreferenceMap\(initialOwnerPreferences \?\? \[\]\)/);

for (const label of ["Available", "Targets", "Watch", "Drafted", "Fades"]) {
  assert.match(client, new RegExp(`label: '${label}'`));
}
assert.match(client, /const activeMyBoardFilter = myBoardFilter;/);
assert.doesNotMatch(client, /myBoardFilter === 'targets' && availableTargetCount === 0/);
assert.match(client, /NEXT TARGETS/);

// Recommended Now is a local selection affordance, not a global nomination mutation.
assert.match(card, /onSelectPlayer: \(playerId: string\) => void/);
assert.match(card, /<button/);
assert.match(card, /aria-pressed=\{selectedPlayerId === recommendation\.playerId\}/);
assert.match(card, /onClick=\{\(\) => onSelectPlayer\(recommendation\.playerId\)\}/);
assert.match(client, /const selectRecommendedNowPlayer = \(playerId: string\) =>/);
assert.match(client, /setActiveWorkspace\('draft'\);[\s\S]*?selectManualSalePlayer\(player\);/);
assert.match(client, /onSelectPlayer=\{selectRecommendedNowPlayer\}/);
assert.match(client, /selectedPlayerId=\{selectedPlayer\?\.sleeperPlayerId \?\? null\}/);
assert.match(client, /const setCurrentNomination = async \(\) =>/);
assert.match(client, /fetch\('\/api\/auction\/nomination'/);

const selectionBlock = client.match(
  /const selectRecommendedNowPlayer = \(playerId: string\) => \{([\s\S]*?)\n  \};/
)?.[1] ?? "";
assert.notEqual(selectionBlock, "");
assert.doesNotMatch(selectionBlock, /fetch\(|setCurrentNomination|currentBid|purchase|recordSale|markAuctionPurchase/);
assert.match(client, /onClick=\{\(\) => void setCurrentNomination\(\)\}/);

// The server recommendation path is read-only and owner-scoped.
assert.match(recommendationRoute, /requireAuctionWarRoomAccess/);
assert.match(recommendationServer, /actor\.access\.ownerProfileId/);
assert.doesNotMatch(recommendationServer, /upsertAuctionOwnerPreference|clearAuctionOwnerPreference|recordSale|markAuctionPurchase/);

console.log("target state + recommended now selection: PASS");
