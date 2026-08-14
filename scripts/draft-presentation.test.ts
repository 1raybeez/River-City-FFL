import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/draft/page.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /River City Draft Board/);
assert.match(page, /href="\/league-info"/);
assert.match(page, /id="draft-season"/);
assert.match(page, /selectedYear/);
assert.match(page, /setSelectedYear/);
assert.match(page, /api\.sleeper\.app/);
assert.match(page, /pick_no|draft_slot/);
assert.match(page, /team\.name/);
assert.match(page, /custom-scrollbar max-w-full overflow-x-auto/);
assert.match(page, /role="region" aria-label="Scrollable draft board"/);
assert.match(page, /overflow-x-hidden/);
assert.match(page, /Search player or owner/);
assert.match(page, /focus:border-orange-600/);
assert.doesNotMatch(page, /<nav/);
assert.match(shell, /\["League Info", "\/league-info"\]/);

console.log('Draft presentation test passed');
