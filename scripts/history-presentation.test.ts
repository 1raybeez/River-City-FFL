import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/history/page.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/history">/);
assert.match(page, /League History/);
assert.match(page, /River City Hall of Fame/);
assert.match(page, /calculateAllTimeStats\(\)/);
assert.match(page, /<table/);
assert.match(page, /<caption/);
for (const column of ['Rank', 'Manager', 'Titles', 'Avg Finish', 'Seasons']) {
  assert.match(page, new RegExp(column));
}
assert.match(page, /Title years/);
assert.match(page, /hidden[^\"]*md:block/);
assert.match(page, /md:hidden/);
assert.match(page, /Return to Home/);
assert.match(page, /focus-visible:ring/);

console.log('History presentation test passed');
