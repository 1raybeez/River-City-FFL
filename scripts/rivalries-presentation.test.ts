import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/rivalries/page.tsx', 'utf8');
const client = fs.readFileSync('components/league-info/RivalryHubClient.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /loadRivalryHubPresentation/);
assert.match(client, /<SiteShell activePath="\/league-info">/);
assert.match(client, /River City Rivalries/);
assert.match(client, /href="\/league-info"/);
assert.match(client, /Top Rivalries/);
assert.match(client, /All-Time/);
assert.match(client, /Active Owners/);
assert.match(client, /id="rivalry-owner-filter"/);
assert.match(client, /Find a Head-to-Head/);
assert.match(client, /id="head-to-head-owner"/);
assert.match(client, /id="head-to-head-opponent"/);
assert.match(client, /View Head-to-Head/);
assert.match(client, /aria-pressed=\{scope === value\}/);
assert.match(client, /role="tablist"/);
assert.match(client, /router\.push\(headToHeadOpponent\.href\)/);
assert.match(client, /overflow-x-hidden/);
assert.match(client, /focus-visible:ring/);
assert.doesNotMatch(client, /<nav/);
assert.match(shell, /\["League Info", "\/league-info"\]/);

console.log('Rivalries presentation test passed');
