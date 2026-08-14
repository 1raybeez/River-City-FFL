import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/page.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /League Info/);
assert.match(page, /River City League Hub/);
assert.match(page, /grid-cols-1[^\"]*md:grid-cols-2[^\"]*lg:grid-cols-3/);
assert.match(page, /focus-visible:ring/);

const destinations = {
  Constitution: '/league-info/constitution',
  Payouts: '/league-info/payouts',
  'Draft Board': '/league-info/draft',
  Archives: '/league-info/archives',
  Resources: '/league-info/resources',
  Rivalries: '/league-info/rivalries',
  'Trophy Room': '/league-info/trophy-room',
  'Trade Analyzer': '/league-info/analyzer',
};

for (const [title, href] of Object.entries(destinations)) {
  assert.match(page, new RegExp(`title: '${title}'`));
  assert.match(page, new RegExp(`href: '${href.replaceAll('/', '\\/')}'`));
}

assert.doesNotMatch(page, /from ['"]@\/lib\//);
assert.doesNotMatch(page, /loadPublicOperationalFinance|loadRivalry|<TradeAnalyzer/);
assert.doesNotMatch(page, /<nav/);
for (const [label, href] of [['Home', '/'], ['Matchups', '/matchups'], ['Managers', '/managers'], ['History', '/history'], ['League Info', '/league-info'], ['Commissioner Hub', '/commish']]) {
  assert.match(shell, new RegExp(label === 'Commissioner Hub' ? `href="${href}"` : `\"${label}\", \"${href}\"`));
}

console.log('League Info hub presentation test passed');
