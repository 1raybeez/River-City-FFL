import assert from 'node:assert/strict';
import fs from 'node:fs';

const page = fs.readFileSync('app/league-info/payouts/page.tsx', 'utf8');
const client = fs.readFileSync('components/league-info/FinancialHistoryClient.tsx', 'utf8');
const shell = fs.readFileSync('components/SiteShell.tsx', 'utf8');

assert.match(page, /loadFinancialHistoryPresentationWithOperationalArchive/);
assert.match(page, /loadPublicOperationalFinancePresentation/);
assert.match(client, /<SiteShell activePath="\/league-info">/);
assert.match(client, /River City Payouts/);
assert.match(client, /2026 Current Season/);
assert.match(client, /Historical archive/);
assert.match(client, /currentSeason\.approvedRingExpenseCents/);
assert.match(client, /currentSeason\.projectedChampionCashCents/);
assert.match(client, /minimumFractionDigits: cents % 100 === 0 \? 0 : 2/);
assert.match(client, /seasonOptions/);
assert.match(client, /href="\/league-info"/);
assert.match(client, /focus-visible/);
assert.doesNotMatch(client, /Net Earnings|ROI|Venmo|idempotency|audit actor|payment reference/i);
assert.doesNotMatch(client, /<nav/);
assert.match(shell, /\["League Info", "\/league-info"\]/);

console.log('Payouts presentation test passed');
