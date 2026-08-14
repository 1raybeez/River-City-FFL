import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/trophy-room/page.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /River City Trophy Room/);
assert.match(page, /href="\/league-info"/);
assert.match(page, /role="tablist"/);
assert.match(page, /aria-selected=\{activeTab === 'champions'\}/);
assert.match(page, /setActiveTab\('leaderboard'\)/);
assert.match(page, /setActiveTab\('shame'\)/);
for (const dataName of ['CHAMPIONS', 'PODIUMS', 'LOSERS']) assert.match(page, new RegExp(dataName));
for (const value of ['Nudas Priest', '2025', 'Tommy Moore', 'Ray Long', 'Darren Kusaj']) assert.match(page, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(page, /role="tabpanel"/);
assert.match(page, /grid-cols-1/);
assert.match(page, /focus-visible:ring/);
assert.doesNotMatch(page, /<nav/);
assert.match(shell, /\["League Info", "\/league-info"\]/);

console.log('Trophy Room presentation test passed');
