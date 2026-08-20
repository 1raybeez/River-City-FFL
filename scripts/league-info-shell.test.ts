import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getLeagueInfoSectionForPath,
  isLeagueInfoDestination,
  LEAGUE_INFO_SECTION_ITEMS,
} from "@/lib/navigation/leagueInfoNavigation";

const shell = readFileSync("components/LeagueInfoShell.tsx", "utf8");
const siteShell = readFileSync("components/SiteShell.tsx", "utf8");

assert.deepEqual(
  LEAGUE_INFO_SECTION_ITEMS.map((item) => item.label),
  ["Overview", "Constitution", "Legislation", "History", "Rivalries", "Draft", "Trade Analyzer", "Resources"]
);
assert.deepEqual(
  LEAGUE_INFO_SECTION_ITEMS.map((item) => item.href),
  ["/league-info", "/league-info/constitution", "/league-info/legislative", "/history", "/league-info/rivalries", "/league-info/draft", "/league-info/analyzer", "/league-info/resources"]
);

const activeRoutes = {
  "/league-info": "overview",
  "/league-info/constitution": "constitution",
  "/league-info/legislative/new": "legislation",
  "/history": "history",
  "/league-info/rivalries": "rivalries",
  "/league-info/draft": "draft",
  "/league-info/analyzer": "analyzer",
  "/league-info/resources": "resources",
  "/league-info/payouts": "overview",
  "/league-info/archives": "history",
  "/league-info/trophy-room": "history",
  "/history/version-history": "constitution",
} as const;

for (const [route, section] of Object.entries(activeRoutes)) {
  assert.equal(getLeagueInfoSectionForPath(route), section, `${route} should activate ${section}`);
  assert.equal(isLeagueInfoDestination(route), true);
}

assert.match(shell, /<nav aria-label="League Info sections"/);
assert.match(shell, /aria-current=\{isActive \? 'page' : undefined\}/);
assert.match(shell, /overflow-x-auto/);
assert.match(shell, /min-w-max/);
assert.match(shell, /focus-visible:ring/);
assert.match(siteShell, /isLeagueInfoDestination/);
assert.doesNotMatch(shell, /War Room|Commissioner Hub/);
assert.doesNotMatch(shell, /href=.*analyzer.*PRIMARY/);

for (const route of ["/league-info/payouts", "/league-info/archives", "/league-info/trophy-room", "/history/version-history"]) {
  assert.equal(isLeagueInfoDestination(route), true, `${route} must remain in League Info context`);
}

console.log("League Info shell checks passed");
