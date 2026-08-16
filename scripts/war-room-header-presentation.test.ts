import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalAuctionTeams } from "../lib/auction/canonicalTeamCatalog";

const client = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");
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
assert.ok(prestigio?.logoUrl, "Prestigio must use the canonical team-logo mapping.");
assert.ok(shake?.logoUrl, "Shake-N-Bakers must use the canonical team-logo mapping.");
assert.match(client, /ownerBoardTeam = getCanonicalAuctionTeamByRosterId/);
assert.match(client, /Draft Board/);
assert.doesNotMatch(client, /formatDraftBoardTitle/);
assert.match(client, /riverCityLogoUrl/);
assert.match(client, /onError=\{\(event\) =>/);
assert.match(client, /<SignOutControl/);
assert.match(client, /canRecordSales/);
assert.match(siteShell, /fetch\("\/api\/auth\/logout", \{ method: "POST" \}\)/);
assert.match(siteShell, /router\.replace\("\/"\)/);
assert.match(client, /overflow-x-hidden/);

console.log("War Room header presentation checks passed.");
