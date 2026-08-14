import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/resources/page.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /River City Resources/);
assert.match(page, /href="\/league-info"/);
assert.match(page, /role="tablist"/);
assert.match(page, /aria-selected=\{activeTab === tab.id\}/);
assert.match(page, /setActiveTab\(tab.id\)/);
for (const category of ['playlists', 'podcasts', 'websites', 'analyzers']) assert.match(page, new RegExp(`id: '${category}'`));
for (const dataName of ['BROADCAST_FEED', 'PODCASTS', 'WEBSITES', 'ANALYZERS']) assert.match(page, new RegExp(dataName));
for (const href of ['appleMusicUrl', 'spotifyUrl', 'applePodcastUrl', 'url']) assert.match(page, new RegExp(href));
assert.match(page, /grid-cols-1/);
assert.match(page, /focus-visible:ring/);
assert.doesNotMatch(page, /<nav/);
assert.match(shell, /\["League Info", "\/league-info"\]/);

console.log('Resources presentation test passed');
