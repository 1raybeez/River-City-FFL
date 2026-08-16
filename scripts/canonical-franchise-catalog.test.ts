import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { getApprovedCompetitiveOwnerIds } from "../lib/auth/canonicalAuctionAuthorizationMaintenance";
import { resolveCanonicalOwnerAuthorization } from "../lib/auth/canonicalAuctionAuthorization";

const client = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
const mockData = readFileSync("lib/auction/mockAuctionData.ts", "utf8");

assert.equal(canonicalAuctionTeams.length, 12);
assert.equal(new Set(canonicalAuctionTeams.map((team) => team.franchiseId)).size, 12);
assert.equal(new Set(canonicalAuctionTeams.map((team) => team.id)).size, 12);
assert.equal(new Set(canonicalAuctionTeams.map((team) => team.warRoomId)).size, 12);

const prestigio = canonicalAuctionTeams.find(
  (team) => team.franchiseId === "prestigio-mundial"
);
const shake = canonicalAuctionTeams.find(
  (team) => team.franchiseId === "shake-n-bakers"
);
assert.ok(prestigio);
assert.ok(shake);
assert.equal(prestigio.rosterId, 1);
assert.equal(prestigio.warRoomId, "2026:prestigio-mundial");
assert.equal(shake.rosterId, 3);
assert.equal(shake.warRoomId, "2026:shake-n-bakers");
assert.deepEqual(prestigio.ownerIds, ["ray-long", "jeffrey-hudgins"]);
assert.deepEqual(shake.ownerIds, ["jordan-maslyn", "landon-elliott"]);
assert.equal(prestigio.ownerNames.length, 2);
assert.equal(shake.ownerNames.length, 2);

const authorizedOwnerIds = getApprovedCompetitiveOwnerIds();
assert.equal(authorizedOwnerIds.length, 14);
for (const ownerId of authorizedOwnerIds) {
  const authorization = resolveCanonicalOwnerAuthorization(ownerId);
  assert.ok(authorization, `Missing authorization for ${ownerId}`);
  assert.ok(
    canonicalAuctionTeams.some(
      (team) => team.franchiseId === authorization.authorizedFranchiseId
    ),
    `Missing catalog franchise for ${ownerId}`
  );
}

assert.equal(canonicalAuctionTeams.every((team) => team.teamBudget === 200), true);
assert.match(client, /canonicalAuctionTeams\.map/);
assert.match(client, /buildBudgetRows/);
assert.doesNotMatch(client, /mockAuctionData|mockAuctionTeams/);
assert.match(client, /buyerOptions: canonicalAuctionTeams\.map/);
assert.match(mockData, /Local Demo Data only/);

console.log("Canonical franchise catalog checks passed.");
