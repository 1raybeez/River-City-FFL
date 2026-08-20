import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/archives/page.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /River City Archives/);
assert.match(page, /href="\/league-info"/);
assert.match(page, /getArchiveYears/);
assert.match(page, /api\.sleeper\.app/);
assert.match(page, /setExpandedCard/);
assert.match(page, /aria-expanded=\{isExpanded\}/);
assert.match(page, /role="status"/);
assert.match(page, /role="alert"/);
assert.match(page, /grid-cols-1/);
assert.match(page, /focus-visible:ring/);
assert.doesNotMatch(page, /<nav/);
assert.match(shell, /isSiteNavItemActive/);

console.log('Archives presentation test passed');
