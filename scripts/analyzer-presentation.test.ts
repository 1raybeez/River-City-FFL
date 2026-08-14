import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/analyzer/page.tsx', 'utf8');
const analyzer = fs.readFileSync('components/TradeAnalyzer.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /<SiteShell activePath="\/league-info">/);
assert.match(page, /River City Trade Analyzer/);
assert.match(page, /<TradeAnalyzer \/>/);
assert.match(page, /href="\/league-info"/);
assert.match(page, /overflow-x-clip/);
assert.match(page, /focus-visible:ring/);
assert.match(analyzer, /export default function TradeAnalyzer/);
assert.match(analyzer, /selectedPlayers|selectedTeams|calculate|valuation|value/i);
assert.doesNotMatch(page, /win probability|confidence|predictive/i);
assert.doesNotMatch(page, /<nav/);
assert.match(shell, /\["League Info", "\/league-info"\]/);

console.log('Analyzer presentation test passed');
