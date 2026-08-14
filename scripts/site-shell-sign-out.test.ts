import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync("components/SiteShell.tsx", "utf8");
const logoutRoute = readFileSync("app/api/auth/logout/route.ts", "utf8");
const commish = readFileSync("app/commish/page.tsx", "utf8");
const proposals = readFileSync("app/commish/proposals/page.tsx", "utf8");
const finance = readFileSync(
  "app/commish/finance/2026/OperationalFinanceDashboardClient.tsx",
  "utf8"
);
const warRoom = readFileSync("app/commish/auction/AuctionWarRoomClient.tsx", "utf8");

assert.match(shell, /export function SignOutControl/);
assert.match(shell, /fetch\("\/api\/auth\/logout", \{ method: "POST" \}\)/);
assert.match(shell, /router\.replace\("\/"\)/);
assert.match(shell, /authenticated \? <SignOutControl/);
assert.match(shell, /id="site-mobile-navigation"[\s\S]*authenticated \? <SignOutControl/);
assert.match(shell, /aria-label="Sign out"/);
assert.doesNotMatch(shell, /email|identity|role|capabilit/i);
assert.match(logoutRoute, /export async function POST/);
assert.match(logoutRoute, /maxAge: 0/);
assert.match(logoutRoute, /expires: new Date\(0\)/);
assert.match(commish, /<SiteShell activePath="\/commish" authenticated>/);
assert.match(proposals, /<SiteShell activePath="\/commish" authenticated>/);
assert.match(finance, /<SiteShell activePath="\/commish" authenticated>/);
assert.match(warRoom, /import \{ SignOutControl \} from ['"]@\/components\/SiteShell['"]/);
assert.match(warRoom, /<SignOutControl/);

console.log("Site-shell sign-out checks passed.");
