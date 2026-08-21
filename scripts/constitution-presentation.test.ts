import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/constitution/page.tsx', 'utf8');
const section = fs.readFileSync('components/ConstitutionSection.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /River City Constitution/);
assert.match(page, /id="constitution-search"/);
assert.match(page, /combinedRules/);
assert.match(page, /getLatestRatifiedAt/);
assert.match(page, /Last updated/);
assert.match(page, /normalizeRatifiedAmendment/);
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
assert.match(section, /Ratified/);
assert.match(section, /voteTotals/);
const constitutionData = fs.readFileSync('lib/constitutionData.ts', 'utf8');
assert.match(constitutionData, /12\. Revision History & Amendments/);
assert.match(constitutionData, /12\.2 Constitution Version History/);
assert.match(constitutionData, /historical information available to the league/);
assert.doesNotMatch(constitutionData, /proposal authors, vote results, and effective seasons/);
assert.match(page, /Constitution History/);
assert.match(page, /href="\/history\/version-history"/);

console.log('Constitution presentation test passed');
