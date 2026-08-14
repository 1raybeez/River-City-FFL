import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("app/page.tsx", "utf8");
const publicFinanceRoute = readFileSync("app/api/public-finance/summary/route.ts", "utf8");

assert.match(page, /2026 Power Rankings/);
assert.doesNotMatch(page, /Championship Odds/);
assert.match(page, /Power rankings reflect roster strength and schedule factors/);
assert.match(page, /href="\/predictor"/);
assert.match(page, /Open 2026 Matchups/);
assert.match(page, /href="\/matchups"/);
assert.doesNotMatch(page, /\$219/);
assert.doesNotMatch(page, /Upcoming Schedule/);
assert.match(page, /2026 Payouts/);
assert.match(page, /href="\/league-info\/payouts"/);
assert.match(page, /break-words text-\[9px\] font-black uppercase leading-4 tracking-widest/);
assert.doesNotMatch(page, /truncate text-\[9px\] font-black uppercase tracking-widest/);
assert.match(page, /fetch\("\/api\/public-finance\/summary"\)/);
assert.match(publicFinanceRoute, /loadPublicOperationalFinancePresentation/);
assert.doesNotMatch(publicFinanceRoute, /amountOwedCents|paymentHandle|paymentTimestamp|commissionerNote|idempotencyKey|externalReference|duesRows/);
assert.doesNotMatch(page, /calculateChampionPayout|duesAssessedCents|duesCollectedCents|projectedChampionCashCents/);
assert.doesNotMatch(page, /amountOwedCents|paymentHandle|paymentTimestamp|venmo|commissionerNote|idempotencyKey|externalReference/);
assert.match(page, /aria-label="Close league history"/);
assert.match(page, /aria-label="Close commissioner briefing"/);
assert.match(page, /role="dialog" aria-modal="true"/);
assert.match(page, /2026 public draft status/);
assert.match(page, /Commissioner Corner/);
assert.match(page, /Reigning Champion/);
assert.match(page, /Latest Commissioner Briefing/);
assert.doesNotMatch(page, /Quick Links/);

console.log("Home-page fixture checks passed.");
