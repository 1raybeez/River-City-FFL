import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/constitution/page.tsx', 'utf8');
const section = fs.readFileSync('components/ConstitutionSection.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /River City Constitution/);
assert.match(page, /id="constitution-search"/);
assert.match(page, /combinedRules/);
assert.match(page, /onSnapshot\(/);
assert.match(page, /toggleSection/);
assert.match(page, /href="\/league-info"/);
assert.match(page, /max-w-5xl/);
assert.match(page, /focus-visible:ring/);
assert.doesNotMatch(page, /<nav/);
assert.match(section, /aria-expanded=\{isOpen\}/);
assert.match(section, /aria-controls=\{sectionContentId\}/);
assert.match(section, /id=\{sectionContentId\}/);
assert.match(section, /type="button"/);

console.log('Constitution presentation test passed');
