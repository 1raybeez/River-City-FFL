import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";
import { normalizeSleeperAuctionSyncSnapshot } from "../lib/auction/sleeperAuctionSync";

const client = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
const catalog = readFileSync("lib/auction/canonicalTeamCatalog.ts", "utf8");
const siteShell = readFileSync("components/SiteShell.tsx", "utf8");

const prestigio = canonicalAuctionTeams.find(
  (team) => team.franchiseId === "prestigio-mundial"
);
const shake = canonicalAuctionTeams.find(
  (team) => team.franchiseId === "shake-n-bakers"
);

assert.equal(prestigio?.teamName, "Prestigio Mundial");
assert.equal(shake?.teamName, "The Shake-N-Bakers");
assert.equal(prestigio?.ownerLabel, "Ray Long / Jeffrey Hudgins");
assert.equal(shake?.ownerLabel, "Jordan Maslyn / Landon Elliott");
assert.equal(canonicalAuctionTeams.length, 12);
const normalized = normalizeSleeperAuctionSyncSnapshot({
  leagueId: "fixture-league",
  season: 2026,
  fetchedAt: "2026-08-16T00:00:00.000Z",
  draftId: "fixture-draft",
  picks: [],
  rosters: canonicalAuctionTeams.map((team) => ({
    roster_id: team.rosterId,
    owner_id: team.managerId,
    players: [],
  })),
  users: canonicalAuctionTeams.map((team) => ({
    user_id: team.managerId,
    avatar: `fixture-avatar-${team.rosterId}`,
  })),
});
assert.equal(normalized.teams.filter((team) => team.avatar).length, 12);
assert.match(client, /ownerBoardTeam = getCanonicalAuctionTeamByRosterId/);
assert.match(client, /Draft Board/);
assert.doesNotMatch(client, /formatDraftBoardTitle/);
assert.match(client, /riverCityLogoUrl/);
assert.match(client, /sleepercdn\.com\/avatars\/thumbs/);
assert.match(client, /src=\{franchiseLogoUrl \?\? riverCityLogoUrl\}/);
assert.match(client, /width=\{52\}/);
assert.match(client, /height=\{52\}/);
assert.match(client, /className="h-9 w-9 shrink-0.*object-cover p-0.*sm:h-11 sm:w-11.*xl:h-\[52px\] xl:w-\[52px\]/);
assert.match(client, /xl:grid-cols-\[minmax\(320px,0\.95fr\)_minmax\(360px,1\.45fr\)_minmax\(290px,0\.9fr\)\]/);
assert.match(client, /<div className="flex min-w-0 items-center gap-2">\s*<Image/);
assert.match(client, /<div className="min-w-\[13rem\] flex-1">[\s\S]*ownerIdentityLabel[\s\S]*<SignOutControl[\s\S]*purchaseSourceLabel/);
assert.equal((client.match(/<SignOutControl/g) ?? []).length, 1);
assert.doesNotMatch(client, /team_logos\/nfl/);
assert.doesNotMatch(catalog, /colorTeamCode/);
assert.match(client, /onError=\{\(event\) =>/);
assert.match(client, /<SignOutControl/);
assert.match(client, /canRecordSales/);
assert.match(siteShell, /fetch\("\/api\/auth\/logout", \{ method: "POST" \}\)/);
assert.match(siteShell, /router\.replace\("\/"\)/);
assert.match(client, /overflow-x-hidden/);

console.log("War Room header presentation checks passed.");
