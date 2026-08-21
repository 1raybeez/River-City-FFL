import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/page.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');
const nav = fs.readFileSync('lib/navigation/siteNavigation.ts', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /League Snapshot/);
assert.match(page, /Current Season/);
assert.match(page, /League Format/);
assert.match(page, /Auction draft/);
assert.doesNotMatch(page, /In-person auction draft/);
assert.match(page, /Governance/);
assert.match(page, /History/);
assert.doesNotMatch(page, /River City League Hub/);
assert.doesNotMatch(page, /League destinations|League Destinations/);
assert.doesNotMatch(page, /More league records|Payouts|Archives|Trophy Room|Matchups/);
assert.match(page, /focus-visible:ring/);

const destinations = {
  Constitution: '/league-info/constitution',
  Legislation: '/league-info/legislative',
  History: '/history',
};

for (const [title, href] of Object.entries(destinations)) {
  assert.match(page, new RegExp(title));
  assert.match(page, new RegExp(`['\"]${href.replaceAll('/', '\\/')}['\"]`));
}

assert.match(page, /constitutionData/);
assert.match(page, /riverCityAuctionLeagueSettings/);
assert.match(page, /LEAGUE_ID/);
assert.doesNotMatch(page, /War Room|Commissioner Hub/);
assert.match(shell, /PRIMARY_SITE_NAV_ITEMS/);
assert.match(nav, /label: "Home"/);
assert.match(nav, /label: "Matchups"/);
assert.match(nav, /label: "Managers"/);
assert.match(nav, /label: "League Info"/);
assert.doesNotMatch(nav, /label: "History"/);
assert.doesNotMatch(nav, /label: "Rivalries"/);

console.log('League Info hub presentation test passed');
