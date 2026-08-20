import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const shell = readFileSync("components/SiteShell.tsx", "utf8");
const accountMenu = readFileSync("components/MemberAccountMenu.tsx", "utf8");
const history = readFileSync("app/history/page.tsx", "utf8");
const commish = readFileSync("app/commish/page.tsx", "utf8");
const login = readFileSync("app/commish/auction/login/page.tsx", "utf8");
const financeLayout = readFileSync("app/commish/finance/layout.tsx", "utf8");
const auctionPage = readFileSync("app/commish/auction/page.tsx", "utf8");
const nav = readFileSync("lib/navigation/siteNavigation.ts", "utf8");

assert.match(history, /<SiteShell activePath="\/history">/);
assert.match(shell, /PRIMARY_SITE_NAV_ITEMS/);
assert.match(shell, /isSiteNavItemActive/);
assert.match(nav, /Home/);
assert.match(nav, /Matchups/);
assert.match(nav, /Managers/);
assert.match(nav, /League Info/);
assert.doesNotMatch(nav, /label: "Rivalries"/);
assert.doesNotMatch(nav, /label: "History"/);
assert.match(nav, /pathname\.startsWith/);
assert.match(accountMenu, /member\.canAccessMaintenance[\s\S]*href="\/commish"/);
assert.match(history, /href="\/"/);
assert.match(commish, /redirect\('\/commish\/login\?returnTo=%2Fcommish'\)/);
assert.match(login, /useSearchParams/);
assert.match(login, /getSafeReturnTo/);
assert.match(login, /requestedReturnTo\.startsWith\('\/commish'\)/);
assert.match(login, /router\.replace\(returnTo\)/);
assert.match(financeLayout, /returnTo=%2Fcommish%2Ffinance%2F2026/);
assert.match(auctionPage, /returnTo=%2Fcommish%2Fauction/);
assert.doesNotMatch(commish, /redirect\('\/commish\/auction\/login'\)/);
assert.match(history, /Hall of Fame/);

console.log("Site-shell navigation checks passed.");
