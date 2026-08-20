import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  isSiteNavItemActive,
  MOBILE_SITE_NAV_ITEMS,
  PRIMARY_SITE_NAV_ITEMS,
} from "@/lib/navigation/siteNavigation";

const shell = readFileSync("components/SiteShell.tsx", "utf8");
const home = readFileSync("app/HomeClient.tsx", "utf8");
const accountMenu = readFileSync("components/MemberAccountMenu.tsx", "utf8");

assert.deepEqual(
  PRIMARY_SITE_NAV_ITEMS.map((item) => item.label),
  ["Home", "Matchups", "Managers", "League Info"]
);
assert.equal(PRIMARY_SITE_NAV_ITEMS.some((item) => String(item.href) === "/history"), false);
assert.equal(PRIMARY_SITE_NAV_ITEMS.some((item) => String(item.href) === "/league-info/rivalries"), false);
assert.equal(MOBILE_SITE_NAV_ITEMS.some((item) => item.href === "/predictor"), true);
assert.equal(isSiteNavItemActive(PRIMARY_SITE_NAV_ITEMS[3], "/league-info/constitution"), true);
assert.equal(isSiteNavItemActive(PRIMARY_SITE_NAV_ITEMS[3], "/history"), false);

assert.match(shell, /PRIMARY_SITE_NAV_ITEMS/);
assert.match(shell, /MOBILE_SITE_NAV_ITEMS/);
assert.match(home, /PRIMARY_SITE_NAV_ITEMS/);
assert.match(home, /MOBILE_SITE_NAV_ITEMS/);
assert.doesNotMatch(home, /\[\[\"Home\", \"\/\"\], \[\"Matchups\"/);
assert.match(home, /href: \"\/commish\"/);
assert.match(accountMenu, /My War Room/);
assert.match(accountMenu, /member\.canAccessMaintenance/);
assert.match(home, /href=\"\/commish\/auction\"/);
assert.match(home, /initialMember\.canAccessMaintenance/);

console.log("navigation foundation checks passed.");
