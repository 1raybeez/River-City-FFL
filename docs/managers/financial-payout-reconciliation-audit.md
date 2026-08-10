# Phase 5.5 Financial / Payout Reconciliation Audit

## Audit status

This is a discovery artifact, not approval of a financial engine or of any
historical career-money total. No application, UI, identity, season-result,
matchup, Head-to-Head, or Rivalries behavior is changed by this audit.

The original Phase 5.5 review used
`data/source/historical/river-city-final-standings-and-payouts.xlsx`, SHA-256
`4b0d96b19b93e6039807558f1f49ca9d4e7aae1a728bb5636001cef964fe6552`.
That binary was replaced twice during reconciliation. The **Phase 5.5B Final
Corrected-Workbook Verification and Engine Gate** section below is current and
supersedes every earlier finding wherever they differ. The workbook remains
evidence only and must never be parsed during a production build.

### Original Phase 5.5 executive conclusion

This subsection is retained as the record of the first-pass audit. It is not
the current conclusion; use the corrected-workbook section immediately below.

- A future authoritative financial layer should be transaction-based.
- Detailed annual rows for 2016–2025 are the best monetary evidence, but their
  award, payment, rollover, offset, and expense semantics are not fully
  reconciled.
- `Paid_Earnings` and `Sheet20` are summaries, not transaction sources.
  `Paid_Earnings` is stale for 2025 and conflicts materially with annual
  detail in 2017–2020 and 2022. Its 2016 dues also include an extra $50 for
  Doug that is absent from the annual 12-owner ledger.
- The current `/league-info/payouts` Earnings History publishes the
  `Paid_Earnings` matrix as gross won, dues paid, and net earnings. Those
  historical labels and totals are not yet safe to present as authoritative.
- The workbook supports recorded awards and partial payment evidence. It does
  not yet support authoritative owner career earnings, franchise career
  earnings, unpaid balances, or season net gain/loss.
- Co-owner sporting credit must not determine financial credit. Prestigio and
  2025 Shake-N-Bakers money need explicit allocation rulings.

## Phase 5.5B Final Corrected-Workbook Verification and Engine Gate

### Final source and gate result

- Workbook:
  `data/source/historical/river-city-final-standings-and-payouts.xlsx`
- Final SHA-256:
  `a042c3bba1789f2b39a5c36d3b51d494a1dc5b5074513162a754c54b692e288f`
- Relevant sheets: `2016_Payouts` through `2025_Payouts`; `Paid_Earnings`
  and `Sheet20` are comparison-only and excluded from calculations.
- Gate result: **passed**. Every 2016–2025 dues-funded pool reconciles, total
  unexplained is $0, and total outstanding is $0.

The final correction changes 2022 again. It restores Brian's explicit third
place to $75 and corrects the Tommy/Dave summary allocation to $100 plus $75
for each. The detailed `C37` total is $620 because it includes Billy's two
forfeited $10 rows as nominal rows. The authoritative owner summary excludes
those two forfeited rows and totals $595. The $20 is already absorbed into the
explicit Tommy/Dave settlement; it must not be counted a second time.

### Final reconciliation

| Season | Dues paid | Weekly paid | Forfeited / rolled | Rollover counted separately in winnings | Placement / championship | Loser bracket | Dues-funded expenses | Separate expenses | Recorded Winnings | Cash Paid | Outstanding | Unexplained |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2016 | $600 | $195 | $0 | $0 | $405 | $0 | $0 | $0 | $600 | $600 | $0 | $0 |
| 2017 | $600 | $195 | $0 | $0 | $400 | $0 | $5 | $0 | $595 | $595 | $0 | $0 |
| 2018 | $600 | $165 | $30 | $30 | $400 | $0 | $5 | $0 | $595 | $595 | $0 | $0 |
| 2019 | $600 | $165 | $30 | $30 | $400 | $0 | $5 | $0 | $595 | $595 | $0 | $0 |
| 2020 | $600 | $120 | $10 | $10 | $440 | $25 | $5 | $0 | $595 | $595 | $0 | $0 |
| 2021 | $600 | $80 | $60 | $60 | $430 | $25 | $5 | $0 | $595 | $595 | $0 | $0 |
| 2022 | $600 | $120 | $20 | $0—inside settlement | $450 | $25 | $5 | $0 | $595 | $595 | $0 | $0 |
| 2023 | $600 | $100 | $40 | $40 | $455 | $0 | $5 | $0 | $595 | $595 | $0 | $0 |
| 2024 | $600 | $140 | $0 | $0 | $455 | $0 | $5 | $60 food | $595 | $595 | $0 | $0 |
| 2025 | $600 | $140 | $0 | $0 | $444 | $0 | $16 | $0 | $584 | $584 | $0 | $0 |
| **Total** | **$6,000** | **$1,420** | **$190** | **$170 separately represented** | **$4,279** | **$75** | **$56** | **$60** | **$5,944** | **$5,944** | **$0** | **$0** |

The total funding equations are:

```text
$6,000 dues paid = $5,944 Recorded Winnings + $56 dues-funded expenses
$60 food contributions = $60 separately funded food expense
```

The $190 forfeited/rolled total is a movement classification, not an amount to
add to Recorded Winnings. Of that amount, $170 is represented as redirected
weekly transactions. The corrected 2022 settlement already contains its $20
rollover, so its weekly forfeiture rows carry $0 additional Recorded Winnings.

### Final 2022 forensic result

- Dues: twelve explicit $50 paid rows (`U2:U13`), `U14 = $600`, `V14 = $0`.
- Weekly: Weeks 1–14 at $10. Twelve rows are paid/settled ($120). Billy Weeks
  11–12 (`A27:F28`) are `No` and `rolled into the pot` ($20).
- Nameplate: Tommy/Dave, $5 (`A31:C31`).
- Loser Bracket Winner: Ray/Jeffrey, $25 paid (`A32:F32`), officially
  attributed to Ray.
- Fourth: Billy, $25 paid (`A33:D33`).
- Third: Brian, **$75 paid** (`A34:D34`).
- Second: Dave, $175 paid (`A35:D35`).
- Champion: Tommy, $175 paid (`A36:D36`).
- No additional expense or adjustment row exists.

```text
$600 dues
= $120 paid weekly
+ $25 loser bracket
+ $25 fourth
+ $75 third
+ $175 Dave settlement
+ $175 Tommy settlement (contains the $20 pot rollover)
+ $5 nameplate
```

`C37 = $620` is the raw nominal detail sum because it also includes the two
forfeited $10 rows. Subtracting those non-payments yields the exact $600 flow.
`I14 = $595` is the corrected winnings summary and excludes the $5 expense.

### Financial History Engine implementation

The reconciliation gate authorized implementation of:

- `lib/history/historicalFinancialData.ts`: checked-in static evidence with
  final workbook provenance, stable keys, source sheets/cells, raw labels,
  payment states, notes, categories, owner/franchise mappings, and resolution
  states. Production does not parse XLSX.
- `lib/history/financialHistory.ts`: pure build, reconciliation, season,
  owner, franchise, coverage, issue, filter, and accessor logic.
- `scripts/financial-history.test.ts`: provenance, reconciliation, rollover,
  identity, immutability, cache, and regression contract.

The engine contains 310 physical financial events, 22 owner summaries, and
22 franchise summaries. Prestigio financial flow routes only through Ray;
Jeffrey receives no duplicate totals. The 2025 Shake-N-Bakers flow routes only
through Jordan; Landon receives no duplicate 2025 totals. Private co-owner
transfers do not become league transactions.

Public engine APIs are:

- `buildFinancialHistory(input)`
- `getAllFinancialTransactions()`
- `getFinancialTransactions(filter?)`
- `getFinancialSeason(season)`
- `getAllFinancialSeasons()`
- `getOwnerFinancialSummary(ownerIdOrSlug)`
- `getFranchiseFinancialSummary(franchiseId)`
- `getFinancialCoverage()`
- `getFinancialReconciliationIssues()`

Accessors throw before initialization, return cloned results, and preserve the
last valid cache when a rebuild fails. Coverage is `reconciled` for 2016–2025,
`no-source` before 2016, and excludes current operational 2026 finances. Net
Earnings is not modeled or calculated. No UI, Manager Profile, Historical
Season Results, Rivalries, Head-to-Head, or matchup integration is included.

## Corrected Workbook Reconciliation (superseded by Phase 5.5B)

### Corrected archive and scope

The newest and only River City payout/final-standings workbook in
`data/source/historical/` was inspected at the annual transaction-row level:

- Filename:
  `data/source/historical/river-city-final-standings-and-payouts.xlsx`
- Corrected SHA-256:
  `6d8643704b935f0210b6c55a53291a1d6cd60542a0e3d6586d2f94bcd12f9df1`
- Seasons reconciled: 2016–2025
- Scope: documentation and reconciliation only; no engine, UI, Historical
  Season Results, Manager Profile, identity, or sporting-history change

The corrected annual rows and the commissioner rulings materially supersede
the earlier binary. The workbook's `Paid_Earnings` and `Sheet20` tabs remain
cached summaries and are not authoritative when they disagree with detailed
transactions.

### Commissioner rulings applied

1. Prestigio's official league cash flow through 2024 is attributed to Ray as
   primary financial owner. Jeffrey's payment to Ray and Ray's later private
   allocation to Jeffrey are outside the league ledger unless an explicit
   league transaction says otherwise.
2. From 2025, Shake-N-Bakers uses the same rule with Jordan as primary
   financial owner. Landon receives no duplicate or automatic half-credit.
3. A physical franchise award is recorded once. Sporting/title credit remains
   separate from financial attribution.
4. Each 2017–2019 $5 pool difference is a paid trophy-nameplate league
   expense.
5. A no-recap/unpaid weekly winner retains the sporting fact but receives $0
   Recorded Winnings for that prize. The amount is forfeited and rolled into
   that season's champion payout; it is neither outstanding nor a later-year
   liability.
6. Jordan's 2020 $25, Billy's 2021 $25, and Prestigio's 2022 $25 are
   `loser-bracket-winner` awards, not Toilet Bowl awards.
7. The corrected 2022 Brian third-place transaction is $50.
8. Tommy's platform first and Dave's platform second remain shared 2022
   sporting recognition, but their financial rows are not derived from that
   recognition.
9. The 2023 unpaid weekly rows rolled to the champion.
10. Doug's 2024 Week 12 $10 transaction is paid.
11. The 2024 $60 Damon Food flow is a separately funded league food expense,
    not dues, winnings, or an owner payout.
12. Aaron's 2025 $16 ring is a league/championship-award expense, not cash
    winnings.
13. Weekly availability is $15 for Weeks 1–13 in 2016–2019, $10 for Weeks
    1–13 in 2020, and $10 for Weeks 1–14 from 2021 onward.

### Revised source precedence

The corrected evidence supports this order:

1. explicit annual transaction/detail rows, including payment state and notes;
2. explicit payout/award rows;
3. commissioner-approved classification and attribution rulings;
4. annual owner-summary blocks;
5. `Paid_Earnings`;
6. cached/formula totals;
7. legacy website totals.

Rulings classify or redirect explicit transactions; they do not erase the raw
evidence. A forfeited weekly row and its champion rollover are one movement of
the same money and must not be summed as two payouts. `Paid_Earnings` cannot
override corrected detail.

### Revised 2016–2025 reconciliation

All amounts are dollars. `Placement/season awards` is the final award amount
after rollover treatment and includes the champion rollover shown separately
in column H as a memo subcomponent. **Do not add H again.** The 2025 value also
includes the three division awards. Column I includes all league expenses;
the parenthetical 2024 split identifies the separately funded food expense.

| Season | A Dues assessed | B Dues paid | C Weekly available | D Weekly credited | E Forfeited / rolled | F Placement / season awards (incl. H) | G LB award | H Champion rollover (memo) | I League expenses | J Recorded Winnings | K Cash Paid | L Outstanding | M Unexplained |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 2016 | $600 | $600 | $195 | $195 | $0 | $405 | $0 | $0 | $0 | $600 | $600 | $0 | $0 |
| 2017 | $600 | $600 | $195 | $195 | $0 | $400 | $0 | $0 | $5 | $595 | $595 | $0 | $0 |
| 2018 | $600 | $600 | $195 | $165 | $30 | $430 | $0 | $30 | $5 | $595 | $595 | $0 | $0 |
| 2019 | $600 | $600 | $195 | $165 | $30 | $430 | $0 | $30 | $5 | $595 | $595 | $0 | $0 |
| 2020 | $600 | $600 | $130 | $120 | $10 | $450 | $25 | $10 | $5 | $595 | $595 | $0 | $0 |
| 2021 | $600 | $600 | $140 | $80 | $60 | $490 | $25 | $60 | $5 | $595 | $595 | $0 | $0 |
| 2022 | $600 | $600 | $140 | $120 | $20 | $445 | $25 | $20 | $5 | $590 | $590 | $0 | $5 |
| 2023 | $600 | $600 | $140 | $100 | $40 | $495 | $0 | $40 | $5 | $595 | $595 | $0 | $0 |
| 2024 | $600 | $600 | $140 | $140 | $0 | $455 | $0 | $0 | $65 ($5 nameplate + $60 food) | $595 | $595 | $0 | $0 |
| 2025 | $600 | $600 | $140 | $140 | $0 | $444 | $0 | $0 | $16 | $584 | $584 | $0 | $0 |
| **Total** | **$6,000** | **$6,000** | **$1,610** | **$1,420** | **$190** | **$4,444** | **$75** | **$190** | **$116** | **$5,939** | **$5,939** | **$0** | **$5** |

The dues-funded equation is:

```text
$6,000 dues paid
= $5,939 Recorded Winnings / Cash Paid
+ $56 dues-funded league expenses
+ $0 legitimate outstanding
+ $5 unresolved (2022)
```

The separate food flow is `2024 food contributions $60 = 2024 food expense
$60`; neither side belongs in dues or winnings. Total league expenses are
$116: eight $5 nameplates from 2017–2024 ($40), 2024 food ($60), and the 2025
ring ($16). Of that total, $56 is funded by the $6,000 dues pool.

Season equations are therefore:

| Season | Collected-funds equation |
|---:|---|
| 2016 | $600 dues = $600 Recorded Winnings |
| 2017 | $600 dues = $595 Recorded Winnings + $5 nameplate |
| 2018 | $600 dues = $595 Recorded Winnings + $5 nameplate |
| 2019 | $600 dues = $595 Recorded Winnings + $5 nameplate |
| 2020 | $600 dues = $595 Recorded Winnings + $5 nameplate |
| 2021 | $600 dues = $595 Recorded Winnings + $5 nameplate |
| 2022 | $600 dues = $590 Recorded Winnings + $5 nameplate + $5 unresolved |
| 2023 | $600 dues = $595 Recorded Winnings + $5 nameplate |
| 2024 | $600 dues = $595 Recorded Winnings + $5 nameplate; separately, $60 food contributions = $60 food expense |
| 2025 | $600 dues = $584 Recorded Winnings + $16 ring expense |

The $190 rollover total is already inside champion Recorded Winnings and Cash
Paid. It is shown separately for auditability, not added to the $5,939 total.
No forfeited weekly winner has an outstanding balance.

### Prior-conflict disposition

| Prior conflict | Status | Corrected evidence or ruling |
|---|---|---|
| 2016 Doug $50 dues | **RESOLVED** | `2016_Payouts` documents twelve $50 participants totaling $600 and excludes Doug; corrected `Paid_Earnings!L20` is $0 and Doug's career paid total fell from $400 to $350. |
| 2017 Patrick dues | **RESOLVED** | `2017_Payouts!R7:T7` records Patrick paid $50 and owes $0; corrected `Paid_Earnings!Q18` is $50. |
| 2017 Patrick weekly award | **RESOLVED** | `2017_Payouts!A25:D25` records Patrick's Week 8 $15 as paid; corrected `Paid_Earnings!Q19` is $15. |
| 2017 $5 gap | **RESOLVED** | Commissioner ruling: league expense — trophy nameplate. |
| 2018 Brian/Landon $100 attribution | **RESOLVED for the authoritative ledger** | Corrected annual summary gives Brian $230 and Landon $0, matching the explicit annual result after Brian's own forfeited $30 is reclassified into his champion payout. `Paid_Earnings` remains stale and is excluded. |
| 2018 $5 gap | **RESOLVED** | Commissioner ruling: league expense — trophy nameplate. |
| 2019 $150 placement shortfall | **RESOLVED for the authoritative ledger** | Detail plus rollover ruling yields Brian $80, Travis $115, and Wade $275. The corrected annual summary now totals $595 but still misallocates those owners, so detail/ruling precedence controls. |
| 2019 $5 gap | **RESOLVED** | Commissioner ruling: league expense — trophy nameplate. |
| 2020 Billy $10 | **RESOLVED** | `2020_Payouts!A28:D28` records Billy's Week 12 $10 paid and corrected `Paid_Earnings!N13` is $10. |
| No-recap / unpaid weekly rows | **RESOLVED** | Commissioner ruling: $190 total is forfeited by the weekly winners and rolled into the same-season champions; $0 is outstanding. |
| 2022 Brian third place | **RESOLVED** | Corrected `2022_Payouts!A34:D34` records Brian third place, $50, paid. |
| 2022 rollover | **RESOLVED as a transaction classification** | Billy Weeks 11–12 total $20 and are rolled to Tommy's champion payout. The separate $5 pool remainder described below is not a rollover ambiguity. |
| 2023 unpaid weekly rows | **RESOLVED** | JD Weeks 4, 6, and 12 plus Billy Week 7 total $40; commissioner ruling rolls all $40 to Tommy and leaves no outstanding weekly balance. |
| 2024 Doug Week 12 | **RESOLVED** | Corrected `2024_Payouts!A28:D28` explicitly says `Yes` for Doug's $10. |
| 2024 Damon Food | **RESOLVED** | Commissioner ruling: $60 separately funded league food expense; not dues, winnings, or owner payout. |
| 2025 ring | **RESOLVED** | Commissioner ruling: the `2025_Payouts!A31:D31` Aaron $16 row is a paid championship ring expense, not Aaron cash winnings. |
| Stale 2025 `Paid_Earnings` | **STILL UNRESOLVED as a source defect; superseded for reconciliation** | `Paid_Earnings!A2:W3` still reports only $110 won. Correct annual detail supports $584 Recorded Winnings plus $16 ring expense. The matrix must be rebuilt or retired before production use. |

### Remaining unresolved discrepancies

1. **2022 pool remainder — $5.** Corrected explicit detail records $120 of
   credited weekly prizes, $20 rolled from Billy to Tommy, a $25 loser-bracket
   award, final placement/championship awards that produce $590 total Recorded
   Winnings after the ruling, and a $5 nameplate. That accounts for $595 of
   $600 dues. No corrected row or ruling identifies the last $5, so it remains
   unexplained and must not be silently assigned.
2. **Cached summary artifacts.** `Paid_Earnings` remains stale beyond its 2025
   row (notably 2018 and 2019), and `Sheet20` inherits summary defects. The
   corrected 2022 annual owner-summary formulas also double-credit Tommy and
   Dave across both second/first columns and cache a $770 total. These are
   excluded by precedence, but must be rebuilt or retired before an engine can
   consume summary data.

The old narrative settlement notes do not create current outstanding awards:
the applicable transaction rows are paid, the annual dues blocks show $0
owed, and the primary-owner ruling defines the official league attribution.
Private co-owner transfers remain intentionally outside league history.

### Co-owner financial accounting

- **Prestigio through 2024:** keep one franchise transaction; attribute
  official owner cash flow to Ray. Do not duplicate it to Jeffrey and do not
  infer 50/50. An explicitly recorded league payment to Jeffrey may remain as
  transaction evidence, but it does not change the primary-owner career
  attribution or turn private settlement into league cash flow.
- **Shake-N-Bakers from 2025:** keep one franchise transaction; attribute
  official owner cash flow to Jordan. Do not duplicate it to Landon and do not
  infer 50/50.
- Sporting results, co-ownership, and title recognition remain unchanged.

### 2022–2025 focused findings

- **2022:** Brian's authoritative third-place amount is $50. Ray/Prestigio's
  $25 is `loser-bracket-winner`. Dave's explicit second-place payout is $175;
  Tommy's explicit champion payout is $175, with Billy's $20 rollover added to
  Tommy for reconciliation. Co-champion recognition does not generate another
  payout. Recorded Winnings are $590, and $5 remains unexplained.
- **2023:** four unpaid weekly rows total $40 and roll to Tommy. They are not
  outstanding. Official Prestigio attribution routes through Ray despite the
  private half-payment notes. Recorded Winnings and Cash Paid are $595.
- **2024:** Doug Week 12 is paid. The $5 nameplate is dues-funded; the $60 food
  contributions and $60 food expense reconcile separately. Recorded Winnings
  and Cash Paid are $595.
- **2025:** the ring is a $16 championship-award expense associated with
  Aaron's title, not Aaron cash winnings. Recorded Winnings and Cash Paid are
  $584. Shake-N-Bakers' official financial attribution routes through Jordan.

### Revised totals and readiness

- Dues assessed: **$6,000**
- Dues documented paid: **$6,000**
- Recorded Winnings: **$5,939**
- Cash Paid: **$5,939**
- Forfeited / rolled to champions: **$190** (memo; already included in
  Recorded Winnings and Cash Paid)
- League expenses: **$116** total, comprising **$56 dues-funded** and **$60
  separately food-funded**
- Legitimate outstanding winnings: **$0**
- Undistributed / unexplained dues: **$5**, all in 2022

`Paid_Earnings` is not a usable career source. A future career summary can be
built from normalized detailed transactions plus the approved primary-owner
and rollover rulings, but it is **not production-ready** until the corrected
workbook is extracted into a checked-in provenance-preserving artifact, the
2022 $5 issue is surfaced as coverage, and cached matrices are excluded.

The Financial History Engine is likewise **not implementation-ready as a
fully reconciled engine**. Its data contract and precedence are now much more
specific, but implementation should wait for a deterministic extractor/raw
artifact, explicit tests for the $5 2022 coverage issue, owner/franchise
attribution tests, rollover non-duplication tests, and retirement or isolation
of `Paid_Earnings`/`Sheet20`. No engine or UI work is performed in this phase.

## 1. Source inventory

### Archived and typed historical sources

| Source | Content | Years | Assessment |
|---|---|---:|---|
| `data/source/historical/river-city-final-standings-and-payouts.xlsx` | Annual award rows, payment notes, entry-fee ledgers, summaries, standings, and championship corroboration | 2016–2025 money; 2011–2025 results | Primary archived evidence; not production-readable |
| `lib/finance/payoutHistoryData.ts` | Hand-copied `Paid_Earnings` paid/won matrix and `Sheet20` owner totals | 2016–2025 | Active but lower-precedence summary copy; unreconciled |
| `lib/finance/payoutHistoryTypes.ts` | Owner-season and owner/season summary shapes | 2016–2025 plus current-ledger source tag | Arithmetic model, not a transaction or provenance model |
| `lib/finance/payoutHistorySelectors.ts` | Owner/season aggregation and matrix-total validation | 2016–2025 | Reconciles the copied matrix to its copied totals only; does not validate annual detail |
| `lib/history/historicalSeasonResults.ts` | Canonical physical placements and source hash | 2011–2025 | Authoritative sporting-result input; not a financial source |

### Current operational sources

| Source | Content | Years | Assessment |
|---|---|---:|---|
| `lib/finance/firestoreFinance.ts` | Firestore season, rules, owner ledger, and award types; read/write/seed helpers | 2026 | Operational mutable ledger, separate from archived history |
| Firestore `finance_seasons/{year}` and `owners` / `awards`; `finance_rules/{year}` | Dues state, winnings, awards, rules | 2026 | Not represented by an immutable checked-in snapshot; cannot establish historical provenance from the repository alone |
| `app/league-info/payouts/page.tsx` | Active current ledger plus historical earnings presentation and admin writes | 2016–2026 | Active consumer; combines unreconciled static history with mutable current data |

### Duplicate or legacy calculations

| Source | Numbers or behavior | Status / risk |
|---|---|---|
| `lib/league-finance.ts` | $50 dues; $10 high scorer; $25 division; $219/$100/$50 placements | No imports found; duplicated policy constants |
| `lib/finance/paymentHandles.ts` | Weeks 1–14 at $10; division winners; $219/$100/$50 placements | No imports found; derives awards from Sleeper without a persisted financial transaction layer |
| `components/transactions/Treasury.tsx` | Same current rules plus an additional $10 season-long high scorer; assumes everyone paid | Dead according to import search and `docs/dead-code-inventory.md`; unsafe if reactivated |
| `lib/managers/activeManagers.ts` / `lib/managers/staff.ts` | `currentWinnings` values, including one checked-in nonzero value | No current consumer found; stale duplicate field risk |

### Rules, rulings, and documentation

- `lib/legislativeArchive.ts` records the passed 2020 payout structure, the
  2023 removal of the loser-bracket payout, and 2024 changes removing fourth
  place, reducing third to the entry fee, adding $25 division winners, and
  paying weekly high score regardless of recap.
- `lib/versionHistory.ts` corroborates the 2020 $240 champion structure and
  the 2024 finance changes.
- `lib/constitutionData.ts` sends financial detail to the Payouts page but
  intentionally carries no specific amounts.
- `docs/managers/historical-season-results-import-spec.md` and
  `docs/managers/historical-rulings.md` correctly defer payout reconciliation.
- `docs/managers/post-foundation-engine-gap-audit.md` correctly identifies the
  current Earnings History as unsafe for authoritative career display.
- `docs/managers/owner-career-summary-spec.md` and
  `lib/history/ownerCareerSummary.ts` reserve career winnings/net earnings for
  future enrichment; current values remain `null`.

No payout-calculation/import script exists in `scripts/`. The only checked-in
historical finance normalization is the manually copied `Paid_Earnings`
matrix.

## 2. Workbook financial sheet inventory

The workbook has 28 visible sheets. Contact and waiting-list sheets were not
used. Financially relevant or corroborating sheets are:

| Sheet | Seasons | Purpose | Raw versus calculated | Internal status | Identity form |
|---|---:|---|---|---|---|
| `Sheet20` | 2016–2025 aggregate | Owner totals and chart input | Cached/copied summary of `Paid_Earnings` | Agrees with `Paid_Earnings` owner totals, including its defects | Raw short owner labels |
| `Paid_Earnings` | 2016–2025 | Per-season `Paid` and `Won` matrix plus career totals | Season rows are cached values; rows 25–27 are formula totals | Internally adds correctly, but conflicts with annual ledgers | 22 raw short owner labels; no Jeffrey column |
| `DougMath` | 2016–2025 | Weekly-high-score counts and averages | Counts plus calculated averages | Useful only as a secondary count cross-check; no amounts/payment states | Raw labels, including `Ray/Jeffrey` and `Dave` |
| `2016_Payouts`–`2025_Payouts` | One season each | Entry fees, owner summary, weekly awards, placement/side awards, paid/owes notes, and standings | Lower transaction rows are direct evidence; top owner blocks and total rows are calculated/cached | Multiple conflicts documented below | Raw owner and historical team labels |
| `Past Standings` | 2011–2025 | Final placement order | Raw placement evidence plus derived career blocks | Authoritative only through Historical Season Results | Raw historical labels |
| `Prior_Champs` | 2011–2025 | Champion recognition | Raw/cached winner list | Corroborates 2022 `Tommy/Dave`; has no amounts | Raw labels |
| `2015_Regular_Season_Standings`–`2025_Regular_Season_Standings` | 2015–2025 | Standings and historical team-name evidence | Raw season aggregates and some formulas | Corroborating identity/franchise evidence, not money | Raw historical team names |

`Contact Details` and `League_Waiting_List` are excluded. The regular-season
standings sheets contain no payout transaction detail. `DougMath` is a cached
summary, not proof of an award or cash payment.

The workbook has two structured tables:

- `Table1`: `Paid_Earnings!A1:W21`.
- `Table2`: `Sheet20!G6:J28`.

The annual payout areas are ordinary ranges. Their lower detail rows preserve
the strongest source-cell provenance and should be imported offline before
any top summary or career total.

Annual sheet inventory, stated individually:

| Sheet | Source profile | Internal reconciliation | Raw labels / categories |
|---|---|---|---|
| `2016_Payouts` | Raw weekly and placement rows; calculated owner totals | Detail and owner gross both $600; annual dues $600 conflict with matrix dues $650 | Individual owners; weekly, third/fourth, runner-up, champion |
| `2017_Payouts` | Raw weekly/placement/payment rows; calculated owner totals | Detail and owner gross $595; matrix gross $580; pool $600 | Individual owners plus payment/offset notes |
| `2018_Payouts` | Raw weekly/placement/payment rows; calculated owner totals | Detail $595, owner summary $495, matrix $595 through conflicting attribution | Individual owners; weekly and four placements |
| `2019_Payouts` | Raw weekly/placement/payment rows; calculated owner totals | Detail $595, owner summary/matrix $445 | Individual and `Ray/Jeffrey`; weekly rollovers and placements |
| `2020_Payouts` | Raw weekly/placement/LB/payment rows; calculated owner totals | Detail $600, owner summary $595, matrix $585 | Individual and `Ray/Jeffrey`; weekly, LB, placements, nameplate |
| `2021_Payouts` | Raw weekly/placement/LB/payment rows; calculated owner totals | Detail $600, owner summary/matrix $595; multiple `No Recap` states | Individual and `Ray/Jeffrey`; weekly, LB, placements, nameplate |
| `2022_Payouts` | Raw weekly/placement/LB/payment rows; calculated owner totals | Detail $620, owner summary/matrix $570; rollover and Brian conflicts | Individual, `Ray/Jeffrey`, and `Tommy/Dave`; weekly, LB, placements, nameplate |
| `2023_Payouts` | Raw weekly/placement/payment rows; calculated owner totals | Detail $600, owner summary/matrix $595; unpaid and partial-pay notes | Individual and `Ray/Jeffrey`; weekly, placements, nameplate |
| `2024_Payouts` | Raw weekly/placement/payment/food rows; calculated owner totals | Detail $600, owner summary/matrix $595; one blank payment state; food is separate $60 | Individual and `Ray/Jeffrey`; weekly, placements, nameplate, food contribution |
| `2025_Payouts` | Raw weekly/division/placement/ring/payment rows; calculated owner totals | Detail/owner summary $600; matrix $110; net formulas use `Owes` incorrectly | Individual and `Ray/Jeffrey`; weekly, divisions, placements, ring |

## 3. Current site financial consumers

| Consumer | Financial display/calculation | Source | Reconciled? | Safe today? |
|---|---|---|---|---|
| `/league-info/payouts`, Current Ledger | Dues collected, total owed, prize-pool goal, 2026 rules, owner winnings/net, award activity | Mutable 2026 Firestore ledger/rules/awards | Not against an immutable archive | Safe only as clearly live operational data; not historical proof |
| `/league-info/payouts`, Earnings History | `Paid`, `Won`, `Net`, owner rankings, all-time totals, and season details | `Paid_Earnings` copy | No | No; currently presented too strongly as Earnings History/Gross Won/Net Earnings |
| Home page | “Every season” champion gets $219 plus ring | Hard-coded current-rule amount | No; historically false and 2026 amount is approximate | No; wording should eventually be current-season-specific |
| Manager Profile | No money displayed; future fields are `null` | `ownerCareerSummary` | Correctly deferred | Yes |
| Trophy Room | Championships/podiums only; no monetary amounts | Hard-coded sporting lists | Not a finance consumer | No finance risk in current display |
| `/history` | Titles/finishes only; no money | Legacy sporting history | Not a finance consumer | No finance number shown |
| Legacy `Treasury` | Derived pot, collected dues, and winnings | Live Sleeper plus hard-coded rules | No | Inactive; unsafe if restored |

The active historical UI exposes every value in the following
`Paid_Earnings`-derived all-time table. These numbers are internally copied
correctly, but none is authoritative career money yet:

| Display owner | “Paid” | “Won” | “Net” |
|---|---:|---:|---:|
| Tommy Moore | $500 | $1,060 | $560 |
| David Besedich | $350 | $670 | $320 |
| Jordan Maslyn | $450 | $425 | -$25 |
| JD Dowling | $500 | $635 | $135 |
| Aaron Hawkins | $50 | $0 | -$50 |
| Rashad Gresham | $200 | $10 | -$190 |
| Brian Stevens | $500 | $490 | -$10 |
| Wade Cameron | $500 | $380 | -$120 |
| Travis Miller | $500 | $195 | -$305 |
| Ray Long | $500 | $360 | -$140 |
| Doug Fordham | $400 | $155 | -$245 |
| Stan Schoppe | $50 | $0 | -$50 |
| Billy Biddle | $350 | $120 | -$230 |
| Landon Elliott | $450 | $245 | -$205 |
| Adam Lind | $100 | $105 | $5 |
| Patrick Leahey | $100 | $80 | -$20 |
| Chris Barras | $150 | $30 | -$120 |
| Ricky Taylor | $50 | $0 | -$50 |
| Garet Prior | $100 | $15 | -$85 |
| James Minnix | $100 | $245 | $145 |
| Gordie Gahagan | $50 | $50 | $0 |
| Bryan Doane | $50 | $0 | -$50 |
| **Matrix total** | **$6,000** | **$5,270** | **-$730** |

“Paid” in this matrix means recorded entry fees, not payout cash paid to an
owner. “Won” mixes nominal awards with summary corrections and stale data.
Consequently `Won - Paid` is not yet authoritative net income.

The checked-in 2026 seed defaults are a $50 fee, 12 expected managers, $600
pool, $10 weekly high score, $25 division winner, approximately $219 champion,
$100 runner-up, $50 third place, and an approximate $0 ring deduction. The
active page reads actual values from Firestore rather than from an immutable
repository snapshot. Therefore the precise live collected, owed, winnings,
net, ring, and award amounts cannot be historically certified from this audit;
they remain operational values with Firestore as their stated source.

## 4. Source precedence recommendation

Use precedence per fact, not one precedence for an entire row:

1. **Explicit annual transaction rows and attached notes.** Highest evidence
   for category, raw recipient, nominal amount, and recorded payment state.
   A `No`, rollover, offset, partial-payment, or non-cash note must remain a
   separate fact and must not be converted silently to cash paid.
2. **Explicit placement rows.** These are transaction rows and the strongest
   source for placement payout amounts. Sporting placement still comes from
   Historical Season Results, not from money.
3. **Explicit weekly award rows.** Strongest evidence for week, winner,
   amount, score, and payment note. They do not establish a game result.
4. **Commissioner-approved season rules.** Authoritative for what should have
   been assessed or awarded from their effective season; corroboration, not
   proof that a payment occurred.
5. **Annual owner summary blocks.** Derived cross-check only. They omit or
   misstate detail in several seasons.
6. **Recomputed annual totals.** Prefer recomputation from imported detail to
   cached formula values. Cached totals are useful conflict evidence only.
7. **`Paid_Earnings` and `Sheet20`.** Summary/cached evidence. They must never
   override transaction rows or payment notes.
8. **Legacy hard-coded site totals/calculators.** Policy hints only. They have
   no historical source-cell provenance and must not backfill history.

The biggest, newest, or arithmetically balancing number is not automatically
correct. A lower-precedence total can agree in aggregate while assigning
money to the wrong person, as in 2018.

## 5. Proposed typed architecture

Use immutable, integer-cent records. Physical evidence and derived summaries
must be different types.

```ts
type FinancialTransactionKind =
  | "dues-assessment"
  | "dues-payment"
  | "award"
  | "settlement"
  | "rollover"
  | "offset"
  | "expense";

type FinancialPayoutCategory =
  | "weekly-high-score"
  | "champion"
  | "runner-up"
  | "third-place"
  | "fourth-place"
  | "lower-bracket-winner-unresolved"
  | "division-winner"
  | "championship-ring-expense"
  | "nameplate-expense"
  | "food-contribution"
  | "entry-fee"
  | "other-source-labeled";

type FinancialResolutionState =
  | "resolved"
  | "recorded-paid"
  | "recorded-unpaid"
  | "rolled-over"
  | "offset-against-balance"
  | "partial-payment"
  | "non-cash-expense"
  | "source-conflict"
  | "unresolved-owner-allocation"
  | "unresolved-franchise";

type FinancialPayoutTransaction = Readonly<{
  transactionKey: string;
  season: number;
  kind: FinancialTransactionKind;
  category: FinancialPayoutCategory;
  rawCategory: string;
  amountCents: number;
  ownerIds: readonly string[];
  franchiseId: string | null;
  rawOwnerLabel: string | null;
  rawTeamLabel: string | null;
  description: string | null;
  resolutionState: FinancialResolutionState;
  linkedTransactionKeys: readonly string[];
  sourceSheet: string;
  sourceCell: string;
  sourceWorkbookHash: string;
  notes: readonly string[];
}>;

type PayoutRule = Readonly<{
  ruleKey: string;
  season: number;
  category: FinancialPayoutCategory;
  amountCents: number;
  effectiveState: "approved" | "observed-only";
  sourceReferences: readonly string[];
}>;

type AwardPayout = Readonly<{
  awardTransactionKey: string;
  paymentTransactionKeys: readonly string[];
  rolledTransactionKeys: readonly string[];
}>;

type FinancialSeasonLedger = Readonly<{
  seasonKey: string;
  season: number;
  transactions: readonly FinancialPayoutTransaction[];
  rules: readonly PayoutRule[];
  coverage: FinancialCoverage;
  issueKeys: readonly string[];
}>;
```

`OwnerFinancialSummary`, `FranchiseFinancialSummary`, and season totals should
contain derived values plus the exact included transaction keys and excluded
unresolved amounts. They must never be source records. A
`FinancialReconciliationIssue` should preserve expected/actual cents, issue
type, affected transaction keys, source references, and resolution notes.

## 6. Transaction model

The authoritative layer should be transaction-based because the workbook
records different physical events:

- entry-fee assessment and recorded payment;
- an award becoming payable;
- cash marked paid or unpaid;
- an award rolled into a championship pot;
- an award offset against dues or another balance;
- a partial payment to one co-owner;
- a ring/nameplate expense; and
- a separate food contribution.

One workbook award row may therefore create an award fact and, only when the
evidence supports it, a linked settlement fact. `amountCents` should never be
overwritten to make a season balance. Unknown cash amount remains `null` in a
settlement projection rather than being assumed equal to the award.

Observed normalized categories are limited to those in the type above. There
is no evidence here for a late fee, refund, generic penalty, or Toilet Bowl
payout category. Future source-labeled categories remain raw until approved.

### Explicit placement and season award rows

These are nominal source transactions, not career totals or proof of actual
cash distribution:

| Season | Champion | Runner-up | Third | Other explicit season rows |
|---:|---|---|---|---|
| 2016 | Tommy $200 | Minnix $105 | Ray $50 | Fourth Gordie $50 |
| 2017 | Tommy $195 | JD $105 | Minnix $50 | Fourth Travis $50 |
| 2018 | Brian $200 | Tommy $100 | Ray $50 | Fourth Jordan $50 |
| 2019 | Wade $200 | Travis $100 | Brian $50 | Fourth Patrick $50 |
| 2020 | JD $240 | Landon $100 | Dave $75 | Fourth Brian $25; LB Jordan $25; nameplate $5 |
| 2021 | Dave $230 | JD $100 | Adam $75 | Fourth Wade $25; LB Billy $25; nameplate $5 |
| 2022 | Tommy $175 | Dave $175 | Brian $75 | Fourth Billy $25; LB Ray/Jeffrey $25; nameplate $5 |
| 2023 | Tommy $230 | Brian $100 | Ray/Jeffrey $75 | Fourth JD $50; nameplate $5 |
| 2024 | Jordan $230 | Wade $100 | Doug $75 | Fourth Dave $50; nameplate $5 |
| 2025 | Aaron $219 | Travis $100 | JD $50 | Division winners JD/Aaron/Rashad $25 each; ring $16 |

Weekly awards in Section 10 are additional. The 2020 and 2021 nameplate rows
are recorded as `N/A` and Dave respectively; neither has a supported cash
payee interpretation. The 2022 Tommy/Dave placement split is addressed
separately below.

## 7. Owner and franchise mapping

### Owner labels

All 22 `Paid_Earnings` headers resolve to existing canonical owners:

| Raw label | Canonical owner |
|---|---|
| Tommy | `tommy-moore` |
| David / Dave | `david-besedich` |
| Jordan | `jordan-maslyn` |
| JD | `jd-dowling` |
| Aaron | `aaron-hawkins` |
| Rashad | `rashad-gresham` |
| Brian | `brian-stevens` |
| Wade | `wade-cameron` |
| Travis | `travis-miller` |
| Doug | `doug-fordham` |
| Stan | `stan-schoppe` |
| Billy | `billy-biddle` |
| Landon | `landon-elliott` |
| Adam | `adam-lind` |
| Patrick | `patrick-leahey` |
| Chris | `chris-barras` |
| Ricky | `ricky-taylor` |
| Garet | `garet-prior` |
| Minnix / James | `james-minnix` |
| Gordie | `gordie-gahagan` |
| Bryan / Bryan D | `bryan-doane` |

`Ray` resolves to `ray-long` only as a literal source label. Annual
`Ray/Jeffrey` rows resolve to the owner set `ray-long` and
`jeffrey-hudgins`, with **unresolved financial allocation**. They must not be
collapsed to Ray merely because `Paid_Earnings` has only a Ray column.

`Tommy/Dave` in the 2022 nameplate row is a shared label on a $5 non-cash
expense, not proof of an owner payout split. `N/A` and `Total` are not owner
identities. `Damon Food` is a contribution/expense heading and must not create
a competitive or financial owner identity.

No helper account appears in the financial source labels, and none should be
created during import.

### Franchise mapping

For 2016–2025, annual award recipients can be joined by season to accepted
Historical Season Results and thereby mapped to a canonical franchise. The
mapping is cross-source and must retain the raw team label from the annual
standings evidence.

- Prestigio rows map to `prestigio-mundial`; owner allocation remains
  unresolved for shared years.
- Jordan rows map to `shake-n-bakers` from 2017 onward.
- Landon rows through 2024 map to `special-brownies` and must never be merged
  into Shake-N-Bakers.
- The 2025 Jordan row maps to `shake-n-bakers`; Landon's 2025 co-ownership does
  not create a second payout or an automatic split.
- JD's 2011 franchise remains unresolved globally, but there is no 2011
  payout sheet, so it does not block the 2016–2025 financial import.

No 2016–2025 owner award row remains franchise-unresolved after the approved
season-result join. Non-owner expense rows may intentionally have no
franchise.

## 8. Co-owner payout questions

The safest model credits the physical award to the franchise result first,
then records actual payees separately. It must not duplicate the full amount
to every co-owner or default to an equal split.

### Prestigio Mundial

- Annual sheets use `Ray/Jeffrey` in 2017, 2019–2023, and 2025, and use `Ray`
  in some other views/years. `Paid_Earnings` has only `Ray`.
- 2019 weekly notes say Jeffrey received $7.50 of each $15 award while Ray did
  not pay himself.
- 2020 notes describe Ray paying $25 at season start, $40 won, Jeffrey owing
  $5, and Ray being able to pull $25 out.
- 2022 Week 4 says Jeffrey was paid the full $10; the lower-bracket award says
  “paid what we owed.”
- 2023 three weekly notes say half was paid to Jeffrey and Ray did not pay
  himself.

These notes prove that some actual splits differed by transaction. They do
not define a universal historical rule. Prestigio franchise awards are
supportable; Ray and Jeffrey career cash totals are not.

### Shake-N-Bakers

- Jordan is the raw financial label through 2025.
- Landon has separate Special Brownies rows through 2024.
- Landon joined Shake-N-Bakers in 2025, but the 2025 workbook still records
  the franchise's awards under Jordan and has no Landon payout row.

Do not duplicate or split Jordan's 2025 $20 weekly award without a
commissioner ruling. Financial credit can differ from shared sporting credit.

## 9. 2022 Damar Hamlin payout findings

Sporting recognition and money are separate:

- Platform result: Tommy first, Dave second.
- Historical recognition: Tommy and Dave co-champions.
- Detailed money: `2022_Payouts!C35` records Dave as `2nd Place` for $175;
  `C36` records Tommy as `Champ` for $175. Both are marked `Yes`.
- The owner summary gives each $100 in the second-place column and $75 in the
  first-place column, totaling the same $175 placement amount each.
- Tommy also has $20 weekly awards, producing $195 gross in the summary.
- Dave also has $40 weekly awards, producing $215 gross in the summary.
- The shared `Tommy/Dave` $5 nameplate is an expense row, not evidence of an
  equal cash split.

The evidence therefore supports equal **placement-related** recorded payouts
of $175, but not equal total season winnings. The co-championship ruling alone
must not be used to derive the payout.

The sheet also contains a separate conflict: detailed third place is Brian
$75, while the owner summary and `Paid_Earnings` credit Brian only $50.

## 10. Weekly award findings

| Season | Listed weeks | Rate | Nominal rows | Recorded payment exceptions |
|---:|---:|---:|---:|---|
| 2016 | 1–13 | $15 | $195 | All marked Yes |
| 2017 | 1–13 | $15 | $195 | All marked Yes |
| 2018 | 1–13 | $15 | $195 | Brian Weeks 10 and 12 say `no write up/no payout`, although numeric paid cells remain populated |
| 2019 | 1–13 | $15 | $195 | Brian Weeks 8 and 12 marked No and rolled into championship pot |
| 2020 | 1–13 | $10 | $130 | Jordan Week 10 marked No / no recap |
| 2021 | 1–14 | $10 | $140 | Six rows marked No / no recap: Landon 4, Brian 5 and 9, Jordan 8, Adam 10, Billy 12 |
| 2022 | 1–14 | $10 | $140 | Billy Weeks 11 and 12 marked No and rolled into pot; top summary counts only $120 weekly |
| 2023 | 1–14 | $10 | $140 | JD Weeks 4, 6, 12 and Billy Week 7 marked No; three Ray/Jeffrey rows say only Jeffrey's half was paid |
| 2024 | 1–14 | $10 | $140 | Doug Week 12 has blank payment status; other rows say Yes |
| 2025 | 1–14 | $10 | $140 | All marked Yes |

There is exactly one listed winner per week and no duplicate week/tie row.
The workbook does not define tie-breaking behavior, so no tie rule can be
inferred. There are no gaps inside each listed range. The rows stop at the
regular-season range used by that season; there is no evidence of playoff
weekly awards.

The 2024 passed rule to pay high score regardless of recap explains policy
from its effective season; it must not retroactively rewrite earlier `No`
rows. Weekly award earned, paid, forfeited, rolled, and partially paid must be
separate states.

## 11. LB Winner and other award findings

The workbook records three paid $25 `LB Winner` rows:

- 2020 Jordan;
- 2021 Billy; and
- 2022 Ray/Jeffrey.

These are valid monetary evidence and can become transactions with normalized
category `lower-bracket-winner-unresolved`. They must not be called Toilet
Bowl payouts. The 2023 passed ruling removed the loser-bracket payout, and no
such row appears from 2023 onward.

Other observed categories are 2023/2024 $5 nameplates, 2025 three $25 division
winners, a 2025 $16 championship ring, and the separate 2024 $5-per-owner
`Damon Food` contribution totaling $60. Ring, nameplate, and food are not
owner cash winnings unless a ruling explicitly says otherwise.

The recurring “Give Billy $50 FAAB when he's down to $150” note is non-cash
FAAB administration, not a financial payout or penalty.

## 12. Dues and entry-fee findings

- Every annual payout sheet from 2016 through 2025 shows a $50 entry fee for
  12 participating franchises: $600 per season.
- The annual paid/owes blocks generally total $600 paid and $0 owed.
- `Paid_Earnings` is $650 in 2016 because it includes $50 for Doug even though
  Doug is absent from the annual participant ledger. It is $550 in 2017
  because Patrick's annual $50 is absent. Those opposite errors cancel in the
  all-time matrix, which is why its $6,000 career dues total can appear valid
  while two seasons are wrong.
- The 2025 owner-summary `Entry Fee Paid` column is formula-linked to `Owes`
  and shows zero for everyone even though the separate paid block totals
  $600. Its `Total Earned` therefore equals gross rather than net.
- 2017 settlement notes include Landon paying Tommy and individual owed/food
  offsets. The cached $0 owes total does not settle those narrative balances.
- The 2020 Prestigio note documents a split dues/payment situation despite
  the summary showing the franchise paid.
- The 2024 $60 food contribution is separate from $600 league dues.

No trustworthy late-fee or generic penalty source was found. Weekly rollovers
into the championship pot exist; no other side pot is established. Co-owner
responsibility for the single $50 franchise fee is not defined globally.

## 13. Paid versus earned distinction

Use these terms:

- **Dues assessed:** amount the franchise/entry owed.
- **Dues recorded paid:** entry-fee amount marked received.
- **Award recorded:** nominal award attached to a result or weekly row.
- **Cash payout recorded paid:** amount explicitly marked paid to a payee.
- **Rolled/withheld amount:** award not paid directly and moved or forfeited.
- **Offset:** award applied against dues or another known balance.
- **Recorded winnings:** reconciled nominal awards, whether or not cash was
  paid; this is the safest eventual public umbrella term.
- **Net cash position:** cash received minus cash dues actually paid, only when
  both sides are fully reconciled.

`Paid_Earnings` uses `Paid` for dues and `Won` for a summary amount. It does
not prove that `Won` was paid in cash. `Sheet20`'s `Total Paid Out` values are
the dues totals, despite the ambiguous label.

Until settlement evidence is reconciled, the site should prefer “Recorded
Winnings” with coverage/status disclosures. “Career Payouts” should mean cash
paid only. “Career Earnings” and “Net Earnings” should remain unavailable.

## 14. Season-by-season reconciliation

`Detail total` is the recomputed sum of all lower annual detail amount rows,
including nominal unpaid/rolled awards and named expenses. `Owner summary` is
the annual top-block `Amount Won`. `Paid_Earnings` is the workbook matrix
contribution. `Pool` is the annual 12 × $50 entry-fee total.

| Season | Detail total | Owner summary | `Paid_Earnings` won | Pool | Exact reconciliation result | Coverage |
|---:|---:|---:|---:|---:|---|---|
| 2016 | $600 | $600 | $600 | $600 | Gross rows reconcile. `Paid_Earnings` dues are $650 versus annual $600 because of extra Doug $50. | `transaction-detail-available`, `source-conflict` |
| 2017 | $595 | $595 | $580 | $600 | `Paid_Earnings` omits Patrick's $15 weekly award and his $50 dues; $5 of the annual pool is not represented in detail. Narrative owner-to-owner settlements remain. | `source-conflict` |
| 2018 | $595 | $495 | $595 | $600 | Annual summary is $100 low. `Paid_Earnings` restores total by crediting Landon $100 while Brian is $100 below his detailed weekly + champion rows. $5 pool gap remains. | `source-conflict` |
| 2019 | $595 | $445 | $445 | $600 | Summary/matrix are $150 below detail: Wade is $100 low and Travis $50 low relative to explicit final rows. Two $15 weekly rows are marked rolled, while the explicit champion row remains $200. $5 pool gap remains. | `source-conflict` |
| 2020 | $600 | $595 | $585 | $600 | $5 detail difference is the N/A nameplate expense. One $10 weekly row is marked No but remains in annual owner gross; `Paid_Earnings` separately omits Billy's $10 weekly award. | `source-conflict` |
| 2021 | $600 | $595 | $595 | $600 | $5 difference is the Dave nameplate. Six $10 weekly rows marked No remain in gross summary. | `source-conflict` |
| 2022 | $620 | $570 | $570 | $600 | Detail includes two rolled $10 weekly awards and their redistribution plus $5 nameplate. Removing rolled duplicates and treating nameplate as expense yields $600 flow, but Brian detail $75 versus summary $50 leaves owner summary $25 low. | `source-conflict` |
| 2023 | $600 | $595 | $595 | $600 | $5 difference is nameplate. Four weekly rows are marked No; three Prestigio wins are only half-paid to Jeffrey according to notes. | `source-conflict`, `unresolved-owner` |
| 2024 | $600 | $595 | $595 | $600 | $5 difference is nameplate. Doug Week 12 payment state is blank. Separate $60 food contribution is excluded from winnings/pool. | `partially-reconciled` |
| 2025 | $600 | $600 | $110 | $600 | Matrix is stale by $490 versus owner summary/detail. Detail includes $16 ring as Aaron `Amount Won`; cash-versus-expense treatment is unresolved. Top net formula incorrectly uses zero `Owes` as entry fee. | `source-conflict` |

Across seasons, annual detail rows total $6,005 nominal dollars. This number is
not career payouts: it includes non-cash/nameplate/ring expenses and awards
also shown as rolled before redistribution. The `Paid_Earnings` matrix totals
$5,270 won. The $735 difference is not one missing transaction; it is the sum
of multiple season-specific conflicts above.

No season should yet receive a plain `reconciled` state. Every 2016–2025
season has transaction detail, but each retains at least one pool, payment,
allocation, or source conflict.

## 15. Owner mapping gaps

- Ordinary annual and matrix owner labels are resolved.
- `Ray/Jeffrey` is identity-resolved but allocation-unresolved.
- `Tommy/Dave` is identity-resolved as a non-cash shared nameplate context,
  not an owner cash recipient.
- No helper labels appear.
- `Damon Food`, `N/A`, and `Total` are not owner mappings.
- Actual payee data remains incomplete where notes say partial payment,
  rollover, offset, or informal settlement.

The current `payoutHistoryData.ts` mapping of the single matrix `Ray` column
to Ray is faithful to that summary header but insufficient for authoritative
owner history because annual evidence names and sometimes pays Jeffrey.

## 16. Franchise mapping gaps

- All competitive 2016–2025 award rows can be mapped to a canonical franchise
  through approved season results.
- Raw team labels must still be stored because several names and spellings
  change by season.
- Special Brownies remains separate from Shake-N-Bakers.
- The 2025 Shake-N-Bakers owner set does not establish a financial split.
- Prestigio's franchise amount can be summarized before its owner allocation
  is resolved.
- JD's unresolved 2011 franchise remains out of scope because no 2011 money
  source exists.
- League expenses and contributions may correctly have no franchise.

## 17. Current UI risk findings

### High risk

- `/league-info/payouts` labels the unreconciled matrix “Earnings History,”
  “Gross Won,” and “Net Earnings,” ranks owners by it, and exposes per-season
  details. The entire historical view is unsafe as authoritative money.
- 2025 history visibly omits $490 found in the annual summary/detail.
- 2018 all-time/season values contain a total-preserving but owner-changing
  $100 attribution conflict between Brian and Landon.
- Ray's displayed career row absorbs the combined Prestigio summary while
  Jeffrey has no row, despite annual partial-payment notes.

### Medium risk

- The current 2026 ledger is mutable and has no checked-in snapshot/hash or
  reconciliation coverage. It is suitable for operations, but archived
  career aggregation must wait until normalized and locked.
- The homepage states $219 as an every-season champion payout, although
  historical champion amounts vary and the 2026 rule marks $219 approximate.

### Dormant risk

- `Treasury.tsx`, `paymentHandles.ts`, and `league-finance.ts` duplicate rules
  and could generate conflicting awards if reactivated.
- `Treasury.tsx` adds a $10 season-long high-scorer prize not present in the
  current Firestore rule type or annual archive categories and assumes every
  roster has paid.
- `currentWinnings` in manager data is a duplicate, currently unused field.

Manager Profiles correctly show no financial totals. Trophy Room and History
show sporting facts but no monetary amounts.

## 18. Career earnings readiness

Trustworthy owner or franchise career earnings cannot currently be calculated.

Franchise-level **recorded awards** are closer to ready because physical
franchise mapping is supportable. They still require payment/expense/rollover
reconciliation. Owner career totals additionally require co-owner allocation
and the 2018/2019/2022/2025 conflict rulings.

Prerequisites for public career money:

1. transaction-level offline import with cells and workbook hash;
2. commissioner resolution of every issue below;
3. explicit award-versus-payment-versus-expense semantics;
4. owner payee allocation for co-owned teams;
5. tests at transaction, owner-season, franchise-season, season, and career
   levels; and
6. normalization and archival locking of 2026 Firestore data.

Do not add career earnings to Manager Profiles until all six are complete.

## 19. Coverage model

Coverage should be composable rather than one optimistic status:

```ts
type FinancialCoverageState =
  | "reconciled"
  | "partially-reconciled"
  | "source-conflict"
  | "summary-only"
  | "transaction-detail-available"
  | "no-source"
  | "unresolved-owner"
  | "unresolved-franchise";

type FinancialCoverage = Readonly<{
  states: readonly FinancialCoverageState[];
  transactionDetail: boolean;
  duesEvidence: boolean;
  awardEvidence: boolean;
  paymentEvidence: "complete" | "partial" | "none";
  ownerAllocation: "complete" | "partial" | "unresolved";
  franchiseAllocation: "complete" | "partial" | "unresolved";
  sourceReferences: readonly string[];
}>;
```

Suggested period coverage:

- pre-2016: `no-source` for money;
- 2016–2025: `transaction-detail-available` plus the season states in the
  reconciliation table;
- 2026: operational current coverage, not historical `reconciled`;
- Ray/Jeffrey owner summaries: `unresolved-owner` for shared rows;
- franchise summaries: resolvable for competitive award rows, but still
  affected by season payment conflicts.

An owner summary must state excluded unresolved dollars. It must not disappear
them or allocate them merely to make totals add up.

## 20. Stable keys

Recommended deterministic keys:

```text
financial-season:{season}
financial-transaction:{season}:{sourceSheet}:{sourceCell}
financial-rule:{season}:{category}:{sourceRef}
owner-financial:{ownerId}
franchise-financial:{franchiseId}
reconciliation-issue:{season}:{issueType}:{sourceSheet}:{sourceCell}
```

For a source range that becomes multiple facts, append a stable fact role,
for example `:award` and `:settlement`. Display names must never appear in
identity keys. The workbook hash belongs in provenance, not as the owner or
franchise identity.

## 21. Future public APIs

After reconciliation, expose pure immutable accessors:

```ts
buildFinancialHistory(input)
getFinancialSeason(season)
getAllFinancialSeasons()
getOwnerFinancialSummary(ownerId)
getFranchiseFinancialSummary(franchiseId)
getFinancialTransactions(filter?)
getFinancialCoverage()
getFinancialReconciliationIssues(filter?)
```

Useful filters include season, owner, franchise, category, resolution state,
and source. Summary APIs should return coverage and included/excluded
transaction keys with every amount.

## 22. Production architecture

```text
Archived XLSX
  -> offline extractor
  -> checked-in raw financial evidence artifact
  -> curated mappings and commissioner rulings
  -> pure reconciled financial ledger
  -> owner/franchise/season summaries with coverage
  -> presentation loaders
  -> UI
```

The generated artifact should contain raw labels, values, formulas/cached
values when relevant, cells, sheet names, notes, and workbook hash. A
checked-in JSON artifact is suitable for raw generated evidence. Curated
normalization rules and commissioner decisions belong in reviewed typed
source. Production imports only these checked-in artifacts and never the
XLSX parser or XLSX file.

The 2026 Firestore ledger needs an adapter to the same transaction contract.
On archival, create an immutable snapshot with provenance instead of merging
live mutable rows directly into historical career totals.

## 23. Implementation sequence

1. Build an offline, deterministic XLSX extractor for the ten annual sheets,
   `Paid_Earnings`, and `Sheet20`; preserve cell provenance and notes.
2. Check in the generated raw evidence artifact and validate the workbook
   hash, row counts, and recomputed totals.
3. Add canonical owner/franchise mapping with explicit unresolved co-owner
   allocations and no helper identities.
4. Encode commissioner decisions as separate reviewed rulings; never patch raw
   evidence.
5. Build the pure transaction ledger and reconciliation issue output.
6. Add season, owner, and franchise summaries with coverage and exclusions.
7. Normalize 2026 Firestore awards, dues, payments, and adjustments to the
   same contract; add immutable archival snapshots.
8. Replace the Payouts historical matrix consumer only after parity and issue
   tests pass. Use “Recorded Winnings” until cash settlement is complete.
9. Retire duplicate constants/calculators in a separate cleanup.
10. Consider Manager Profile career money only after every included season and
    co-owner allocation is commissioner-approved.

## 24. Commissioner decisions required

1. Decide whether owner career money means franchise award credit, actual
   payee cash, or both as separate metrics.
2. Define Prestigio allocation per transaction/season; do not apply a blanket
   50/50 rule without approval.
3. Define 2025 Shake-N-Bakers allocation between Jordan and Landon.
4. Resolve 2016 Doug's extra $50 `Paid_Earnings` dues entry.
5. Explain or classify the unrepresented $5 in 2017–2019 prize pools.
6. Resolve 2018 Brian/Landon $100 attribution conflict.
7. Resolve 2019 Wade/Travis $150 summary shortfall and whether rolled weekly
   awards increased actual final payouts.
8. Decide whether pre-2024 no-recap weekly rows were earned, forfeited, rolled,
   or later paid, especially 2018, 2020, and 2021.
9. Resolve 2022 Brian third place: $75 detail versus $50 summary.
10. Confirm 2022 rolled weekly awards and the $175/$175 Tommy/Dave settlement;
    classify the $5 nameplate separately.
11. Resolve 2023 JD/Billy unpaid rows and Prestigio half-payment allocation.
12. Resolve 2024 Doug Week 12 blank payment status and classify the $60 food
    contribution.
13. Replace or formally retire stale 2025 `Paid_Earnings`; decide whether the
    $16 ring is an owner benefit, league expense, or both with separate facts.
14. Define whether `Paid` means dues received, payout disbursed, or another
    concept in each workbook block.
15. Confirm whether any narrative “owes” notes remain actual unpaid balances;
    cached zero balances are insufficient.
16. Approve public terminology and the minimum coverage required before
    publishing owner/franchise career totals.
