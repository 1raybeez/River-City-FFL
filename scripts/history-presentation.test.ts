import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/history/page.tsx', 'utf8');
const explorer = fs.readFileSync('app/history/HallOfFameResumeExplorer.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /River City History/);
assert.match(page, /A league built over time/);
assert.match(page, /getCompletedHistoryResults/);
assert.match(page, /getCanonicalChampionshipResults/);
assert.match(page, /HISTORY_LAST_COMPLETED_SEASON/);
assert.match(page, /season is active/);
assert.match(page, /League at a glance/);
assert.match(page, /Seasons completed/);
assert.match(page, /Unique champions/);
assert.match(page, /Recent champions/);
assert.match(page, /CO-CHAMPIONS/);
assert.doesNotMatch(page, /Damar Hamlin/);
assert.match(explorer, /Hall of Fame/);
assert.match(explorer, /All-Time Résumés/);
assert.doesNotMatch(page, /Contextual preview|canonical authority|reviewed standings source above/);
assert.match(page, /getCanonicalHallOfFameResumes\(\)/);
assert.match(page, /League eras/);
assert.match(page, /2022–Present/);
assert.match(page, /Historical data coverage/);
assert.doesNotMatch(page, /2018–2025/);
assert.match(page, /getHistoricalPostseasonEra\(2011\)/);
assert.match(page, /getHistoricalPostseasonEra\(2022\)/);
assert.match(page, /Explore more history/);
for (const href of ['/league-info/rivalries', '/league-info/draft', '/league-info/legislative', '/league-info/payouts', '/history/version-history']) {
  assert.match(page, new RegExp(href.replaceAll('/', '\\/')));
}
assert.match(explorer, /md:hidden/);
assert.match(page, /Return to Home/);
assert.match(page, /focus-visible:ring/);

console.log('History presentation test passed');
