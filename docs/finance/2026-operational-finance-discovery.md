# 2026 Operational Finance Automation Discovery

Status: discovery and architecture only. No operational finance behavior was implemented.

## Executive recommendation

Build a new commissioner-only, server-written operational ledger for 2026 and later. Treat the current Firestore finance model as an unverified migration source, not as the foundation to extend. The new ledger should store immutable financial events, keep an award obligation separate from its cash settlement, retain Sleeper snapshots and calculation provenance, and derive every dashboard total from ledger entries rather than editable owner totals.

The safe boundary is:

```text
approved season rule snapshot
  -> Sleeper/manual proposals
  -> commissioner approval
  -> immutable obligations and cash events
  -> reconciliation and close gate
  -> immutable canonical JSON close artifact
  -> Financial History Engine adapter
  -> public history and Manager Profile history
```

The existing 2016–2025 Financial History Engine remains unchanged. Unreconciled 2026 amounts must not enter its `Recorded Winnings` totals.

## 1. Audit scope and sources

### Operational finance and current consumers

| Source | Finding | Disposition |
|---|---|---|
| `lib/finance/firestoreFinance.ts` | Client-SDK model for season, rules, owner summaries, and awards. It has read, seed, and write helpers for `finance_seasons` and `finance_rules`. | Preserve read-only until remote data is inventoried; replace rather than extend. |
| `lib/finance/paymentHandles.ts` | Unused Sleeper calculator for weeks 1–14, division leaders, and fixed placement payouts. | Obsolete and unsafe as an accounting source; eventually delete after migration. |
| `lib/league-finance.ts` | Unused duplicated constants and an all-paid owner list. | Obsolete policy duplication; eventually delete. |
| `components/transactions/Treasury.tsx` | Unused React-side calculation. Fetches Sleeper in the browser, assumes all dues are paid, and adds a season-high-score award absent from the Firestore rule type. | Dead-code inventory already flags it; do not reactivate. Eventually delete. |
| `app/league-info/payouts/page.tsx` | Current public route loads only reconciled 2016–2025 Financial History presentation. | Trustworthy historical consumer; keep operational data separate until approved for public display. |
| `lib/history/historicalFinancialData.ts`, `lib/history/financialHistory.ts` | Authoritative reconciled history for 2016–2025. | Hard boundary; do not change during operational implementation. |
| `lib/managers/financialHistoryLoader.ts`, `lib/managers/financialHistoryPresentation.ts` | Explicitly label 2026 as outside the historical ledger. | Preserve until a closed-season adapter is approved. |

Static import search found no current consumer of `Treasury`, `paymentHandles`, `league-finance`, or any `firestoreFinance` read/write/initialization function. Git history shows the former Payouts page once performed unaudited client-side Firestore award and dues mutations; Phase 5.6 removed that UI.

### Rules and league structure

| Source | Authority and evidence |
|---|---|
| `lib/constitutionData.ts` §11 | Authoritative that the website/Payouts Hub is the financial source of truth and that specific amounts are intentionally not in the Constitution. |
| `lib/legislativeArchive.ts` | Approved votes: 2020 Week 1–13 weekly high score at $10 and old placement structure; 2023 loser-bracket payout removed; 2024 fourth-place payout removed, third reduced to the entry fee, each division winner gets $25, and weekly high score no longer depends on recap completion. The 2024 Toilet Bowl payment portion was removed. |
| `lib/versionHistory.ts` | Corroborates the 2020 and 2024 changes and a $5-per-owner auctioneer dinner/drinks decision. |
| `lib/finance/firestoreFinance.ts` defaults | Implementation defaults only: $50, 12 teams, $600 pool, weekly $10, division $25, champion approximately $219, runner-up $100, third $50, ring cost unresolved. Not independently authoritative. |
| `lib/auction/leagueSettings.ts` | Corroborates 12 teams for 2026, but is an auction configuration, not a financial rules source. |
| `lib/managers/identityData.ts`, `lib/history/ownerSeasonHistory.ts`, `lib/managers/activeManagers.ts` | Canonical owner/franchise and current roster mapping. Finance must apply the approved primary-financial-owner rule rather than duplicating co-owners. |
| `lib/sleeper.ts` | Current 2026 league ID is `1312149033254416384`; provides league, roster, user, matchup, and bracket acquisition. |
| `lib/auth/auctionAccess.ts`, `app/commish/**`, `app/api/auction/**` | Existing verified Firebase session and protected server-route patterns; usable as a reference, not as a finance-specific authorization contract. |
| `lib/auction/adpRefreshService.ts`, `lib/auction/valueRefreshService.ts` | Strong repository examples for server-only Firestore transactions, runs, validation, publishing, rollback, and append-only audit records. |
| `firebase.json`, `lib/firebase.ts`, `lib/firebaseAdmin.ts` | Firebase client and Admin configuration exist. No checked-in `firestore.rules` was found. Phase 6.1B later inspected the deployed rules directly and found unrestricted public reads and writes; see the live inventory below. |

Environment configuration includes public Firebase client identifiers and server-only Firebase Admin credentials. Finance needs no new secret for Sleeper because its league endpoints are public. Secret values were not inspected or recorded.

## 2. Existing operational-finance architecture

The existing Firestore shape is:

```text
finance_seasons/{year}
  entryFee, expectedManagers, prizePool, aggregate counters,
  ringDeduction, status, notes, timestamps
  owners/{ownerDocumentId}
    manager/roster identity, paid boolean, entryFee,
    duesPaidAt, winnings, netPosition, achievement tags
  awards/{awardId}
    type, managerId, amount, label, source, week, locked, timestamps

finance_rules/{year}
  fixed amounts, approximate champion/ring fields, notes
```

This is not an adequate permanent ledger:

- Owner `winnings`, `netPosition`, tags, and season aggregates are mutable duplicated totals that can drift from awards.
- A single `paid` boolean cannot represent partial, over-, split-, refunded, or corrected dues payments.
- Awards do not represent approval, settlement, forfeiture, rollover, expense, contribution, or correction history.
- Award creation and owner total updates were formerly done from React with the client SDK.
- Seed writes use merge semantics and can partially overwrite real data without an import/reconciliation gate.
- Missing or malformed numeric fields map to zero, hiding corruption.
- There is no idempotency key, immutable source snapshot, actor, reason, revision, or close artifact.
- `locked` is only a boolean and has no enforced transition or audit semantics.

Useful data worth migrating, if it exists remotely, is limited to raw season/rule fields, owner dues status/date, and award documents plus their Firestore metadata. Computed owner totals and tags should be recalculated, not trusted.

## 3. Current 2026 financial rules

Repository evidence supports the following without importing 2025 behavior merely because it is recent:

| Rule | 2026 finding | Best source | Confidence |
|---|---|---|---|
| Entry fee | $50 per competitive franchise | Historical rule plus current Firestore and league constants | High, but confirm as the 2026 rule snapshot because the Constitution omits amounts |
| Paying franchises | 12 | Current identity/roster and auction settings | High |
| Dues pool | $600 if all 12 $50 assessments are approved | Arithmetic, not an independent rule | High conditional on fee/count |
| Weekly amount | $10 | 2020 approved structure and current code | High |
| Eligible weeks | 2020 says Weeks 1–13; unused current calculators say 1–14 | Conflict | Commissioner decision |
| Weekly definition | Highest team score for an eligible scoring week; recap is not required | 2024 vote | High, except ties/finality/eligibility details |
| Playoff weekly awards | Not established | No approved current source | Commissioner decision |
| Division prize | $25 per division winner | 2024 vote | High |
| Number/division tiebreak | Current code assumes three divisions and wins then points | Implementation only | Confirm from 2026 Sleeper settings and commissioner rule |
| Champion | Current defaults say approximately $219 after fixed payouts and actual ring cost | Approximate code/default and homepage narrative | Not final; formula and expense treatment require decision |
| Runner-up | $100 | 2020 structure and current code | High continuity, but include in approved 2026 snapshot |
| Third | Entry fee, therefore $50 if entry fee is $50 | 2024 vote | High conditional on entry fee |
| Fourth | No payout | 2024 vote | High |
| Loser bracket / Toilet Bowl | No financial payout; loser punishment is nonfinancial | 2023 and 2024 votes | High |
| Season-long high scorer | Only dead `Treasury`/`league-finance` code has $10 | Conflict with Firestore rule model and approved categories | Do not award absent a commissioner ruling |
| Forfeiture and rollover | Historical cases exist, but no current policy is codified | Historical behavior only | Commissioner decision |
| Ring/nameplate | Ring is expected; exact cost and funding treatment are unresolved | Constitution transparency requirement and approximate default | Commissioner decision |
| Auctioneer dinner/drinks | 2024 vote records $5 per owner | Legislative archive/version history | Treat as separately funded unless commissioner rules otherwise; confirm it still applies in 2026 |
| Other expenses/contributions | None established for 2026 | No current source | Manual evidence required |
| Due/payment deadlines and methods | Not established | No current source | Commissioner decision |
| Commissioner discretion | No finance-specific scope established | No current source | Limit to documented corrections/exceptions, never silent policy changes |

No 2026 award should be generated until these rules are saved as an approved, versioned season snapshot. Later rule changes should create a new version and record effective dates, not mutate the snapshot in place.

## 4. Sleeper automation capability

### A. Fully automatable from Sleeper acquisition

- Resolve the configured 2026 league ID.
- Fetch league metadata/settings, users, rosters, primary `owner_id`, raw `co_owners`, roster IDs, divisions, records, and points.
- Fetch each scoring period's roster scores and matchup IDs.
- Fetch winners and losers bracket structures and their raw winner/loser/placement fields.
- Re-fetch a source and compare its content hash to a prior snapshot.

“Fully automatable” means acquisition and normalization, not automatic financial approval. Canonical owner/franchise attribution must still pass the repository identity layer.

### B. Automatable with commissioner confirmation recommended

- Weekly high scorer after the week-final gate, including all tied top scores.
- Regular-season range from approved finance rules plus Sleeper league settings.
- Division winner after applying an explicitly approved tiebreak policy.
- Champion, runner-up, third, and fourth from a complete winners bracket.
- Toilet Bowl/consolation result from the losers bracket, for nonfinancial display or punishment workflow only.
- Classification of regular-season, winners-bracket, consolation, and bye rows.
- Detection of a score/stat correction by snapshot hash and score delta.

These are deterministic once rules and finality are explicit, but money should remain a proposal until commissioner review.

### C. Not reliably available from Sleeper alone

- A legally/accountingly “final” week. Endpoint presence or a nonzero score is insufficient; stat corrections can occur.
- League-specific weekly tie handling, playoff weekly eligibility, division tiebreaks, or award forfeiture policy.
- Whether a seeded/incomplete bracket row represents a completed result.
- The primary financial owner where co-ownership exists.
- The authoritative ring cost, dues-funded expense policy, or champion residual formula.

### D. Manual or commissioner evidence required

- Dues receipt, date, amount, method/reference, refunds, and outstanding balance.
- Prize payment/settlement.
- Expenses, receipts, payees, and funding source.
- Separately funded contributions.
- Forfeiture, rollover destination, correction reason, and exceptional rulings.
- Approval to reconcile and close a season.

The generic `sleeperFetch` currently returns fallback/empty data on failure. That behavior is acceptable for presentation but dangerous for money. Finance acquisition should be server-only and strict: store HTTP/source status, retrieved time, league/season/week, payload hash, validation counts, warnings, and the relevant normalized evidence. An outage or partial response must create an exception, never a zero-dollar or no-winner result.

## 5. Weekly prize workflow

Recommended workflow:

1. A protected server job or commissioner refresh fetches and stores a strict Sleeper snapshot for the approved eligible week.
2. The week is eligible only when the NFL state and league scoring period have advanced beyond it, every expected roster has a valid score, pairings/classification validate, and a configurable correction grace period has elapsed. Recommended default: next league week plus 24 hours; playoff/late-season weeks need the equivalent next-period or commissioner finality confirmation.
3. The proposal engine applies the approved eligibility and tie rule, canonicalizes roster -> franchise -> primary financial owner, and creates an idempotent proposal key such as `2026:weekly-high-score:week-07:rules-v1`.
4. Re-running before approval updates/replaces the proposal and records the source delta. It does not create another award.
5. Commissioner review shows scores, ties, source timestamp/hash, owner/franchise mapping, rule version, and warnings.
6. Commissioner approval creates an immutable recorded award obligation. Automatic approval is not recommended in the first operational season.
7. Sending money creates a separate prize-payment settlement allocated to the award.

Before approval, a Sleeper correction recalculates the proposal. After approval, the original award is never edited: create a reversal/correction proposal and require commissioner approval. If already paid, record the recovery, offset, or commissioner exception as a linked settlement/correction.

Tie handling must be explicit. Recommended default is to split the fixed weekly amount evenly in cents among tied eligible franchises, with any indivisible cent assigned only under a documented rule; do not silently select the first/last roster. If league policy instead awards the full amount to each tie, the rule snapshot must increase the pool allocation accordingly.

Forfeiture should close the original award as forfeited and create a linked rollover allocation/award for the approved destination. Reconciliation counts only the live destination allocation, while the audit trail preserves both events.

## 6. Dues workflow

Generate one proposed assessment for each canonical 2026 competitive franchise, then require a commissioner to confirm the participant list and rule snapshot before recording all assessments in one atomic operation. This minimizes typing while preventing current roster/co-owner data from silently becoming money.

Each assessment stores amount in integer cents, season, franchise, primary financial owner, canonical identity/version references, due date if approved, and funding pool. Ray is the financial owner for Prestigio; Jeffrey is not separately assessed. Jordan is the financial owner for Shake-N-Bakers; Landon is not separately assessed. Private transfers remain outside league accounting.

Each payment is a separate receipt allocated to an assessment and records amount, received date, actor, optional private method/reference, and note. Outstanding balance is derived as assessment minus valid receipts/refunds. This supports partial payments and corrections and makes the existing owner `paid` boolean unnecessary.

## 7. Durable transaction and storage model

Use integer cents everywhere and immutable IDs generated on the server. Recommended Firestore layout:

```text
finance_operational_seasons/{season}
  status, activeRuleVersion, reconciliation, close metadata,
  derived summary cache + cache version
  rules/{version}
  participants/{franchiseId}
  proposals/{proposalId}
  entries/{entryId}
  settlements/{settlementId}
  source_snapshots/{snapshotId}
  audit_events/{eventId}
  exports/{exportId}

finance_archive/{season}
  immutable close manifest and artifact references
```

An `entry` is an obligation/allocation: dues assessment, weekly prize, division prize, placement/championship prize, lower-bracket prize if ever approved, expense, separately funded contribution obligation, retained-funds classification, or adjustment. A `settlement` is actual cash movement: dues receipt/refund, prize payment/recovery, expense payment/refund, or contribution receipt/refund. Awards and cash payments must be separate because earning money and sending money are different facts and dates.

Forfeiture, rollover, void, and correction are immutable linked events against prior entries, not destructive edits. A rollover links a source forfeiture to exactly one or more destination allocations whose cents sum to the forfeited amount.

Minimum shared envelope fields:

- `id`, `season`, `kind`, `category`, `amountCents`, `currency`;
- `ownerId`, `franchiseId`, and frozen display labels where applicable;
- `fundingSource` (`dues`, `separately-funded`, or an explicitly approved class);
- `sourceType`, `sourceRef`, rule version, Sleeper snapshot/hash, and provenance;
- `status`, `createdAt`, `createdBy`, `approvedAt`, `approvedBy`;
- `effectiveAt`, `settledAt`, commissioner note/reason;
- `idempotencyKey`, linked/reversal/replacement IDs, and schema version.

Derived season/owner totals may be cached for speed but must include a ledger revision and be reproducible. They are never primary records.

## 8. State model

Use a small obligation lifecycle and model cash separately:

```text
proposal: proposed -> rejected
                   -> approved (atomically creates recorded entry)

entry: recorded -> settled
                -> forfeited -> rolled
                -> voided

settlement: recorded -> reversed
```

- Sleeper refresh may create or recalculate only `proposed` records.
- Commissioner action is required for approve, reject, settle, forfeit, roll, void, reverse, correct, reconcile, and close.
- `approved` is a proposal outcome and timestamp, not a long-lived money state.
- `earned` and `payment-pending` are derived labels for a recorded award with no full settlement; they do not need separate persisted states.
- `paid` is derived when valid settlements allocated to an award equal its active amount.
- `corrected` is a relationship to reversal/replacement events, not a state that hides the prior value.
- Partial settlement is derived from allocation totals and shown as partially paid.

State transitions run in an Admin SDK Firestore transaction with precondition checks and an audit event. Closed seasons reject all operational writes; a correction requires an explicit reopen/superseding archive process.

## 9. Commissioner dashboard

Place the workflow at `/commish/finance`, with `/commish/finance/2026` as the season workspace. Use a finance-specific commissioner capability, not a browser toggle.

The overview should derive and show:

- dues assessed, collected, outstanding, and participant exceptions;
- dues-funded pool and separately funded balance in separate cards;
- proposed, recorded, paid, unpaid, forfeited, and rolled prizes;
- recorded and paid expenses by funding source;
- projected unallocated dues pool;
- Sleeper sync/finality status and proposal exceptions;
- reconciliation checks, unexplained cents, and close readiness.

Primary queues should be “Needs review,” “Needs payment,” “Dues outstanding,” and “Reconciliation exceptions.” Actions should use prefilled forms from rules/identity/Sleeper: refresh week, approve/reject proposal, record dues receipt, settle prize, record expense/contribution, forfeit/roll, reverse/correct with reason, attach evidence, export, reconcile, and close.

Every confirmation should preview the accounting effect and require a reason for exceptional/destructive-equivalent actions. No free-form mutation of aggregate totals should exist.

## 10. Audit trail

Use append-only `audit_events` written atomically with every mutation. Each event records actor UID/email (email may be redacted in public exports), request ID, idempotency key, action, target, timestamp, reason, prior document hash/version, new document hash/version, and a compact changed-field representation. Full prior records remain available through immutable entries/reversals; do not rely only on a human-readable diff.

Firestore does not make an application collection immutable by itself. Enforce immutability in the server service, deny client writes in Firestore rules, use transaction preconditions, and export closed artifacts to versioned object storage with cryptographic hashes and retention. Audit events themselves must never be updated or deleted by ordinary application paths.

## 11. Reconciliation model

Run two independent equations in integer cents.

Pool allocation equation:

```text
valid dues assessments
= active recorded prizes
 + active dues-funded expenses
 + explicitly classified retained funds
```

Cash equation:

```text
dues receipts + separately funded contribution receipts + other approved cash inflows
= prize payments + expense payments + refunds/outflows + cash on hand
```

Separately funded contributions and their expenses appear in the cash equation but never inflate or close the dues-funded prize pool.

Close checks must require:

1. approved rule snapshot and expected participant count;
2. every participant/franchise/financial owner resolves canonically;
3. assessments match the approved entry fee and all required dues are settled or an explicit exception exists;
4. one complete set of required weekly, division, and placement awards;
5. no duplicate idempotency/source key;
6. no proposed/rejected-needed or unresolved source/identity exception;
7. forfeiture destination sums equal their sources and no amount is counted twice;
8. all expenses have category, funding source, evidence, and approval;
9. no unexplained cent in either equation;
10. no unpaid prize unless the close policy explicitly permits and classifies it;
11. derived owner, franchise, category, and season totals reproduce from entries;
12. export/hash generation succeeds before the season becomes closed.

The reconciliation report should list every included entry and settlement, not merely display green totals.

## 12. Season close and historical archive

Recommend option B: create a canonical, schema-versioned JSON close artifact, while retaining Firestore as the live application system of record. Do not make the 2016–2025 engine depend directly on mutable or remotely available Firestore, and do not generate hand-edited TypeScript as the primary archive.

Close sequence:

1. freeze new proposals and acquire a Firestore transaction/lease;
2. run reconciliation and source/identity validation against a fixed ledger revision;
3. commissioner previews and explicitly approves close;
4. create canonical JSON containing rules, participants, entries, settlements, provenance, reconciliation report, and public/private export manifests;
5. hash the artifact, store it in versioned immutable cloud storage, and write the manifest/hash to `finance_archive/{season}`;
6. verify the stored artifact by read-back/hash;
7. mark the operational season closed with artifact hash and ledger revision;
8. use a tested adapter to produce Financial History Engine-compatible closed-season data;
9. optionally check a redacted copy or manifest into the repository after review.

For 2026, first add a narrow adapter/new archive source alongside—not inside—the existing 2016–2025 checked-in source. Only after that path proves stable should a later phase consider unifying the historical engine's storage.

## 13. Backup and export

At minimum produce on demand and at close:

- canonical private JSON with full provenance and audit links;
- redacted public JSON for application presentation;
- human-readable CSV transaction/settlement exports;
- a PDF or HTML reconciliation statement with equations and approvals;
- manifest containing schema version, counts, totals, hashes, generation time, ledger revision, and actor.

Store versioned exports in a dedicated Firebase/Google Cloud Storage path with retention and restricted access. Enable scheduled Firestore managed exports to a separate restricted bucket/project and document restore drills. A repository copy is useful for the redacted close artifact or hash manifest, but Git is not the sole backup and must not contain private payment references, receipts, or email addresses.

## 14. Public versus commissioner data

Public `/league-info/payouts`, once implemented for current operations, may show approved recorded awards, award categories, reconciled/closed season totals, public owner/franchise labels, and league-expense category totals if the commissioner approves transparency. Clearly label current data as provisional until close.

Commissioner-only data includes dues outstanding, payment dates/methods/references, prize settlement status, receipts/payees, private notes, source payloads, correction controls, actor identities, audit detail, reconciliation exceptions, and exports containing private fields. Do not expose co-owner private transfers because the league does not account for them.

## 15. Manager Profile future boundary

Keep `Recorded Winnings (2016–2025)` unchanged throughout the live 2026 season. A future profile may show a separate “2026 current-season status” sourced from approved operational awards and visibly marked provisional; it must not alter career totals or net history. Only the verified close artifact may flow through the historical adapter into `Recorded Winnings` and career aggregation.

Ray/Jeffrey and Jordan/Landon sporting ownership remains unchanged. Financial Profile attribution follows only the approved primary financial owner, while private co-owner allocations remain undisclosed and unmodeled.

## 16. External integrations

| Integration | Benefit/data | Complexity and risk | Recommendation |
|---|---|---|---|
| Venmo operational payments | Venmo is the only supported operational payment method for now; the commissioner records the payment fact and optional private reference | No Venmo API integration is required; private handles/references must remain commissioner-only | Model a `paymentMethod` value that is currently restricted to `venmo`, but keep the field extensible so a future explicit international exception can be added without reshaping old records. Do not implement Sleeper Safe or a generic multi-provider workflow. |
| Email/text/Slack notifications | Remind owners of dues and commissioner of approvals/payments | Contact consent, provider secrets, delivery failures, and public/private content boundaries | Optional later phase after ledger stability. Send no amounts/private notes without consent; notifications never mutate status. |
| Receipt storage/OCR | Attach and extract ring/expense evidence | Sensitive files, retention/access rules, OCR errors | Useful later as private evidence; extracted values must remain proposals requiring confirmation. |
| Scheduled Cloud task | Automatically refresh completed weeks and create proposals | Service identity, retries, idempotency, monitoring | Worth pursuing after manual server refresh is proven; it should propose only, never approve/pay. |

Sleeper remains the only necessary external data source for the first release.

## 17. Security

- Create a generic commissioner authorization service/capability such as `canManageFinance`; the current verified, revoked-token-checked Firebase session pattern is a useful base, but “auction maintenance” is not a durable finance role name.
- Require server-rendered route protection and repeat authorization in every mutation API/server action. Never trust the UI/layout alone.
- Perform all Firestore finance writes through Firebase Admin. Public/client SDK access should be read-only only if explicitly needed; preferably serve redacted data from server loaders.
- Check in, test with the emulator, and deploy Firestore rules that deny all client writes to operational/archive/audit collections. The repository has no auditable rules file, and the Phase 6.1B live inventory confirmed that the deployed catch-all rule currently allows every read and write without authentication.
- Validate schemas strictly, use integer cents and allowlisted categories/transitions, reject unknown fields, enforce season/rule/identity versions, and cap notes/attachments.
- Require idempotency keys, Firestore transactions, document version preconditions, origin/host and content-type validation, same-site secure HttpOnly sessions, and CSRF protection for mutations.
- Keep Firebase Admin and future integration secrets server-only. Never store payment credentials or receipt URLs in public records.
- Reduce authentication logging: existing auction auth logs allowed/pilot email lists; finance paths should log opaque actor IDs and request IDs, not entire allowlists.
- Separate permissions for view, record, approve, settle, reconcile, close, reopen, and export if additional commissioner staff are added.

## 18. Failure and recovery

| Failure | Required behavior |
|---|---|
| Sleeper outage | Mark sync failed with timestamp/error; keep prior snapshot; create no proposal and never translate failure to empty scores. |
| Partial response | Fail validation on expected counts/types/pairings; store diagnostics; require retry or commissioner exception. |
| Duplicate import/retry | Deterministic idempotency/source keys return the existing result; conflicting payload under the same key becomes an exception. |
| Week recalculation | Update proposal before approval; after approval create reviewed reversal/replacement events. |
| Firestore write failure | Transaction commits entry, derived revision, and audit together or commits nothing; retry with same idempotency key. |
| Commissioner mistake | Reverse and replace; never edit/delete the original event. Require reason and show accounting impact. |
| Incorrect/already-paid payout | Preserve award/payment; record recovery, offset, or approved exception and link it to the correction. |
| Paid marked accidentally | Reverse the settlement event; award becomes derived unpaid/partial again. |
| Owner/franchise identity change | Freeze the identity/version used by existing entries; propose an explicit reattribution correction if the financial owner was wrong. Sporting identity is not rewritten. |
| Season-close failure | Leave season in `reconciling` or return it to `open`; do not mark closed until artifact write and hash read-back succeed. Use a lease to prevent concurrent close. |
| Archive corruption/loss | Verify hash, restore from versioned object and managed Firestore exports, and retain the manifest in a separate location/repository. |

Alerts and the dashboard must expose stale syncs, failed jobs, partial settlements, invariant violations, and unallocated cents. Fail loudly.

## 19. Current Firestore finance migration

The original repository-only discovery could establish only possible schema and historical write paths. Phase 6.1B subsequently completed the authorized read-only live inventory documented below. It confirmed legacy 2026 documents but cannot authenticate whether the five manually changed dues flags represent production truth because the deployed rules are public and the records have no actor/audit fields. No Firestore data was mutated.

Potential existing paths are:

- `finance_seasons/2026`;
- `finance_seasons/2026/owners/{ownerDocumentId}`;
- `finance_seasons/2026/awards/{awardId}`;
- `finance_rules/2026`.

Before new writes, run a commissioner-authorized, read-only inventory/export that captures every document, Firestore create/update metadata where available, and a content hash. Classify each record as empty seed, real operational evidence, derived duplicate, test, or unresolved. Reconcile owner dues dates and award rows with commissioner evidence.

Migration recommendation:

- import credible raw evidence into a staging migration run with original path/document JSON and hash;
- map it to proposed new entries/settlements, never directly to recorded money;
- recalculate owner/season totals from migrated events;
- require commissioner approval of every unresolved/missing field;
- preserve the legacy export in restricted archive storage;
- freeze legacy collections against writes once migration begins;
- archive rather than delete them after acceptance.

Discard any record only after the commissioner explicitly classifies it as test/invalid and the immutable import/audit record preserves that decision.

## 20. Recommended implementation phases

1. **6.2 — Rule snapshot and canonical finance identity contract.** Resolve the decisions below; add types, rule validation, cents arithmetic, primary-financial-owner projection, and tests. No persistence/UI.
2. **6.3 — Strict Sleeper evidence and proposal engine.** Server-only snapshots, week/finality checks, award proposals, idempotency, tie fixtures, corrections, and failure diagnostics. No automatic approval.
3. **6.4 — Operational ledger and security foundation.** Admin-only Firestore service, entries/settlements/audit schema, transactions, rules, emulator tests, idempotency, and legacy read-only inventory/migration tooling.
4. **6.5 — Commissioner dues workflow.** Participant confirmation, generated assessments, receipts/refunds, outstanding balances, and private dashboard queue.
5. **6.6 — Commissioner awards/settlement workflow.** Proposal review, approval, prize payment, expense/contribution, forfeiture/rollover, and reversal/correction controls.
6. **6.7 — Reconciliation engine.** Both equations, completeness/identity/duplicate checks, exception reports, and close-readiness tests.
7. **6.8 — Backup/export and close artifact.** Private/public JSON, CSV/report, storage retention, hash/read-back, managed backup, and restore test.
8. **6.9 — Season close and Historical Engine adapter.** Immutable 2026 artifact, adapter tests, explicit close/reopen procedure; keep 2016–2025 unchanged.
9. **6.10 — Public current-season presentation.** Add only approved/redacted current data to Payouts with provisional labels; closed data enters history only through the adapter.
10. **6.11 — Optional Profile/notification/automation integrations.** Separate provisional profile card, scheduled proposal refresh, reminders, and receipt tooling only after the ledger is proven.

## 21. Commissioner decisions required at initial discovery

The approved policy supplied with Phase 6.1B resolves or supersedes most of this initial list: Weeks 1–14, Sleeper tiebreakers, residual champion pool, dues-funded ring capped at $80 absent further approval, no season-high-score/recap-forfeiture/lower-bracket award, pre-draft dues, post-finalization payouts, Venmo, separately funded auctioneer food, and no commissioner fee are now explicit. The live-inventory section contains the shorter remaining decision list.

1. **Approve the 2026 base rule snapshot.** Evidence: current code and prior approved votes converge on $50 x 12, $10 weekly, $25 per division winner, $100 runner-up, third equal to the $50 fee, no fourth/lower-bracket payout. Recommended default: approve those values explicitly for 2026 rather than treating code constants as authority.
2. **Choose eligible weekly-prize weeks and playoff treatment.** Evidence: the 2020 approved rule says Weeks 1–13; unused current calculators use Weeks 1–14, and no source establishes playoff eligibility. Recommended default: regular-season scoring weeks only, derived from the approved 2026 league schedule; no playoff weekly prizes unless expressly approved.
3. **Choose weekly tie handling.** Evidence: no approved rule; old code silently selects one roster. Recommended default: split the fixed $10 evenly among tied eligible franchises and record cent handling explicitly.
4. **Confirm the division winner rule.** Evidence: $25 each is approved; current code assumes three divisions and ranks by wins then points, but that tiebreak is not an approved finance source. Recommended default: use final Sleeper divisions and official Sleeper standings/tiebreak result, with commissioner confirmation when tied.
5. **Approve the champion/ring formula.** Evidence: code says champion is approximately $219 and should receive the pool remainder after fixed awards and actual ring cost; exact ring cost is unknown. Recommended default: record the actual ring as a dues-funded league expense and make champion payout the exact residual that brings the dues-pool equation to zero.
6. **Rule on the season-long high-score item.** Evidence: a $10 item exists only in dead `Treasury`/constants and not in the Firestore rule contract or identified approved vote. Recommended default: exclude it from 2026 unless Ray supplies an approved current rule.
7. **Approve forfeiture and rollover policy.** Evidence: historical forfeitures/rollovers occurred, but no current general rule defines cause, timing, or destination. Recommended default: no automatic forfeiture; require an explicit commissioner ruling per event and a linked destination that preserves all cents.
8. **Set dues and payout timing.** Evidence: no authoritative deadline, allowed method, or settlement deadline exists. Recommended default: define one dues due date before the draft and require prizes to be marked settled promptly after commissioner payment, with exceptions documented rather than inferred.
9. **Classify 2026 auctioneer dinner/drinks and other non-prize costs.** Evidence: a 2024 vote approved $5 per owner, while the finance requirement distinguishes separately funded contributions from dues-funded expenses. Recommended default: track the $5-per-owner auctioneer cost as a separate contribution/expense pool if it remains in force; never deduct it from the $600 dues pool without an explicit ruling.
10. **Choose the public current-season privacy level.** Evidence: the Constitution favors financial transparency, while payment references, outstanding dues, and notes are private operational data. Recommended default: publish approved award/category totals and aggregated expenses; keep dues status, payment dates/methods, receipts, notes, and audit actors commissioner-only.
11. **Authorize migration treatment after a read-only Firestore inventory.** Evidence: the repository cannot prove whether legacy 2026 documents exist or are real/test. Recommended default: export and stage everything, migrate only commissioner-verified evidence, then freeze and archive legacy collections; do not delete them.

## 22. Acceptance boundaries for the next phase

- No operational write path should exist until decisions 1–5 define a complete pool formula.
- Phase 6.2 should not read or write remote Firestore.
- All money is integer cents and all identities use canonical IDs plus frozen season labels.
- Sleeper produces evidence/proposals only; commissioner approval creates money.
- Public and Profile consumers remain isolated until explicit later phases.
- A season cannot close with unexplained cents or without an immutable verified artifact.

## LIVE FIRESTORE FINANCE INVENTORY

Inventory date: August 10, 2026 local / August 11, 2026 UTC. The inspection used only Firestore Admin reads, collection counts/listing, and read-only Firebase metadata/rules API requests. It made no Firestore writes, deletes, migrations, exports, rule changes, or backup-setting changes. Temporary inspection helpers remained outside the repository.

### 1. Project and database

| Item | Live finding |
|---|---|
| Firebase project | `river-city-ffl`, matching `.firebaserc` default and the expected project |
| Firestore database | `projects/river-city-ffl/databases/(default)` |
| Database type/location | Firestore Native, `us-central1`, pessimistic concurrency |
| Local execution environment | Normal `.env.local`/Firebase Admin setup; local `NODE_ENV` reported `development`, but the target was the live `river-city-ffl` project, not an emulator |
| Admin credentials | Available and valid through the normal project setup; no secret values were printed |
| Firebase hosting/function region | `us-central1` in `firebase.json`, consistent with the database location |
| Recovery controls | Point-in-time recovery disabled; database delete protection disabled |

### 2. Finance collection paths

Exactly three populated finance paths were discovered:

```text
finance_rules/2026
finance_seasons/2026
finance_seasons/2026/owners/{ownerId}
```

`finance_seasons/2026` has only the `owners` nested collection. It has no `awards` collection. Collection-group checks found zero documents for `finance`, `finances`, `payout`, `payouts`, `dues`, `awards`, `winnings`, `payments`, `settlements`, `expenses`, `treasury`, and `transactions`.

The root `ratified_rules` collection was inspected because its name matched the search term. Its two records concern 2026 keeper/roster authority rules and are not finance datasets.

### 3. Document counts

| Collection path | Count | Document IDs |
|---|---:|---|
| `finance_rules` | 1 | `2026` |
| `finance_seasons` | 1 | `2026` |
| `finance_seasons/2026/owners` | 12 | Canonical-style owner slugs, one for each primary 2026 financial owner |
| `finance_seasons/2026/awards` | 0 / nonexistent | None |
| All other searched finance collection groups | 0 | None |

The season/rules/owner seed was created at approximately `2026-06-05T01:40:16Z`. The rules document was last updated at `2026-06-05T20:28:18Z`. Five owner documents were updated between `01:53:17Z` and `01:53:45Z` on June 5; the other seven retain the seed timestamp.

### 4. Schema summary

`finance_rules/2026` fields:

```text
leagueFee, weeklyHighScore, divisionWinner,
champion, championIsApproximate, championCalculation,
runnerUp, thirdPlace,
ringDeduction, ringDeductionIsApproximate,
seasonYear, notes, updatedAt
```

`finance_seasons/2026` fields:

```text
seasonYear, status, entryFee, expectedManagers, prizePool,
weeklyPrizeTotalAwarded, divisionPrizeTotalAwarded,
championshipPotRemaining, ringDeduction, nameplateDeduction,
notes, createdAt, updatedAt
```

Each owner summary contains:

```text
managerId, displayName, teamName, sleeperUserId, rosterId, avatar,
entryFee, paid, duesPaidAt, winnings, netPosition,
achievementTags, updatedAt
```

There is no `franchiseId`, co-owner field, payment amount/method/reference, created actor, updated actor, source, rule version, revision, settlement, expense, reconciliation, or correction relationship.

### 5. Live 2026 contents

| Requested content | Live result |
|---|---|
| Dues assessments | No assessment transactions. Twelve owner summaries each carry `entryFee: 50`, implying the seed expectation only. |
| Dues payments | No payment records. Five summaries have `paid: true` and `duesPaidAt`; seven have `paid: false` and no paid date. |
| Payout rules | One rules document, detailed below. |
| Weekly awards | 0 |
| Division awards | 0 |
| Placement awards | 0 |
| Expenses | 0 |
| Ring cost | No actual cost. `ringDeduction` is zero and approximate. |
| Payment settlements | 0 |
| Owner balances | Twelve mutable summaries; every `winnings` value is zero. The five paid rows have `netPosition: -50`; the other seven have zero. |
| Franchise balances | None; no `franchiseId` or franchise ledger exists. |
| Reconciliation totals | No reconciliation record. Season counters say weekly awarded $0, division awarded $0, and championship pot remaining $600. |
| Commissioner notes | Season notes empty. Rules contain two static seed notes only. |

The five paid flags are David Besedich, JD Dowling, Rashad Gresham, Ray Long, and Wade Cameron. If every flag represents one full $50 payment, the summaries imply $250 collected and $350 outstanding. That arithmetic is not a verified cash ledger because no receipt amount, method, actor, reference, or revision exists.

### 6. Live payout-rule values

| Field | Live value |
|---|---:|
| `seasonYear` | 2026 |
| `leagueFee` | $50 |
| `weeklyHighScore` | $10 |
| `divisionWinner` | $25 |
| `thirdPlace` | $50 |
| `runnerUp` | $100 |
| `champion` | $219 |
| `championIsApproximate` | `true` |
| `ringDeduction` | $0 |
| `ringDeductionIsApproximate` | `true` |

The champion calculation says the final amount should come from the remaining prize pool after fixed payouts and actual trophy/ring/nameplate costs. The two notes say that the Payouts page is official and that the current ledger starts with every manager unpaid and winnings at zero.

### 7. Differences from approved 2026 policy

The live document agrees with the approved policy on $50 entry fee, $600 seeded pool, $10 weekly amount, $25 division amount, $50 third, and $100 runner-up. It does not fully encode the policy:

- It has no eligible-week field for Weeks 1–14.
- It has no field requiring three division winners.
- It has no Sleeper-tiebreak or result-finalization rule.
- It stores an approximate champion value of $219 instead of the approved $235 residual before actual ring cost.
- Its $219 value implies an unstated $16 deduction while `ringDeduction` remains zero, so the live fields are internally incomplete.
- It does not state that the ring is dues-funded or capped at $80 without further commissioner approval.
- It has no explicit exclusion fields for season-high-score, recap forfeiture, or lower-bracket awards. Their absence is consistent with policy but is not a durable rule assertion.
- It has no pre-draft dues deadline, post-Sleeper-final payout timing, Venmo method, separately funded auctioneer-food classification, or no-commissioner-fee assertion.
- `nameplateDeduction: 0` exists in the season document but not the current checked-in `FinanceSeason` type, showing schema drift.

The live rule document must not migrate as the approved 2026 rule snapshot without normalization.

### 8. Owner and franchise identity quality

All 12 owner documents exactly match the current `activeManagers` primary-owner mapping on owner slug, display name, team name, Sleeper user ID, and roster ID. No fake/test owner, placeholder ID, helper identity, staff identity, duplicate roster, or stale Sleeper mapping was found.

Identity quality is therefore strong for a seed, but incomplete for permanent finance:

- owner slugs match canonical IDs but were generated from names rather than linked to an identity schema version;
- there is no canonical `franchiseId`;
- display/team/avatar values are mutable copies;
- there is no source/version explaining the roster mapping.

Use canonical repository identity during migration and retain the live values only as source evidence.

### 9. Co-owner behavior

- Prestigio has one finance row for Ray Long. Jeffrey Hudgins has no separate finance document.
- Shake-N-Bakers has one finance row for Jordan Maslyn. Landon Elliott has no separate finance document.
- No money is duplicated across the co-owners.
- The schema has no co-owner array, financial-primary-owner field, private split, or explicit attribution rule.

The outcome happens to match approved primary financial attribution, but only because the seed used the 12 primary active-manager records. It does not model or enforce the rule.

### 10. Payment and Venmo data

Existing owner rows track only a `paid` boolean and nullable `duesPaidAt`. They do not track:

- actual received amount;
- payment method or Venmo indicator;
- Venmo username, transaction ID, or private note;
- payer or recipient;
- partial/overpayment;
- refund, reversal, or correction.

No sensitive Venmo data was present or exposed. The five paid flags need commissioner corroboration before becoming dues-payment transactions.

### 11. Auditability

The seed has timestamps but no trustworthy audit trail:

- season has `createdAt`/`updatedAt`;
- rules and owners have `updatedAt`;
- no record has `createdBy` or `updatedBy`;
- there are no audit events, immutable transactions, revisions, correction/reversal links, or idempotency keys;
- the old client workflow overwrote the owner summary directly.

Firestore metadata proves when a document changed, not who changed it or why. Current edits overwrite prior truth.

### 12. Security

The deployed `cloud.firestore` release points to ruleset `953808b7-94a5-4f8e-8830-8cda670db40f`, last released January 19, 2026. Its complete rule is a recursive catch-all:

```text
allow read, write: if true;
```

Consequences:

- finance records are publicly readable and publicly writable without authentication;
- they are not commissioner-only and not Admin-SDK-only;
- the checked-in client finance module exposes write/seed helpers, and the former Payouts UI performed client writes;
- no checked-in rules file exists to test or deploy safely;
- provenance of all live finance mutations is therefore unauthenticated.

This is a critical blocker for operational finance. The inventory did not change the rules.

### 13. Production/test classification

| Dataset | Classification | Reason |
|---|---|---|
| `finance_rules/2026` | C — legacy/incomplete | Real policy-shaped seed, but incomplete versus approved policy, schema-drifted, approximate, and unauthenticated. |
| `finance_seasons/2026` | C — legacy/incomplete | Real 2026 structure and pool seed, but only mutable counters and no ledger/reconciliation. |
| Twelve owner summaries | C/Evidence with E — unknown paid-state provenance | All identities are real and exact. Seven remain unchanged seeds; five paid flags appear manually updated, but public writes and no actor prevent production authentication. |
| Awards/payments/expenses/settlements | D — empty | No documents or collections found. |
| Test/fake finance data | None found | No fake names, placeholder documents, duplicate owners, or test collection was discovered. |

The strongest overall classification is **legacy/incomplete production-shaped data**, not proven production truth and not obvious test data.

### 14. Migration recommendation

- Do not migrate any dataset as-is.
- Preserve the rules, season, and owner documents as evidence with original paths and Firestore metadata.
- Build the approved 2026 rule snapshot from commissioner policy, not the live approximate rule document.
- Normalize identity from canonical repository sources; use the live identity matches only as corroboration.
- Convert the five paid flags to proposed dues-payment records only after commissioner confirmation of amount, date, and method.
- Recalculate all balances from future ledger events; do not migrate `netPosition`, aggregate counters, or tags as authoritative totals.
- Record the zero/nonexistent award/payment/expense collections in the migration manifest so absence is explicit.
- After verified migration and commissioner approval, freeze and archive the legacy collections; retire them later rather than deleting them immediately.

### 15. Read-only backup recommendation

Before any rule, schema, migration, or deletion work:

1. Produce a private Admin-SDK JSON evidence export containing every legacy path/document, raw field values, Firestore create/update metadata, collection counts, and explicit absent-collection manifest.
2. Export the deployed ruleset source/release metadata and database metadata alongside it.
3. Add a manifest with UTC capture time, project/database, schema version, document counts, and SHA-256 hashes.
4. Store the encrypted/private artifact in a restricted, versioned bucket outside the public application; keep a second protected copy.
5. Take a managed Firestore export before migration and test restore procedures in an isolated project/database.
6. Consider enabling point-in-time recovery and database delete protection after explicit approval; both are currently disabled.

No export or backup was created in Phase 6.1B because the request authorized inventory but not external writes.

### 16. Remaining commissioner decisions after inventory

1. **Authenticate the five paid flags.** Confirm whether David, JD, Rashad, Ray, and Wade each actually paid $50 for 2026 and whether the stored June 5 timestamps reflect receipt time or merely UI entry time. Recommended default: preserve them as unverified proposals until corroborated.
2. **Classify the legacy dataset.** Decide whether the June 5 seed/paid edits were intended as real 2026 operations, a demonstration, or a test. Recommended default: classify the seed as legacy setup and the five paid changes as potentially useful evidence, not authoritative transactions.
3. **Authorize immediate Firestore-rule hardening.** The live database currently permits every public read and write. Recommended default: make security remediation the first implementation action before any Phase 6.2 operational data work, with emulator tests and a rollback plan.
4. **Choose the private backup destination and retention owner.** Recommended default: a restricted versioned Google Cloud Storage bucket with a second protected copy, plus a redacted hash manifest suitable for the repository.

The first three items were resolved or advanced by the Phase 6.1C authorization and commissioner confirmations below. The June 5 timestamps remain unverified.

## SECURITY HARDENING AND EVIDENCE PRESERVATION

Phase 6.1C status at approval: local security implementation and evidence preservation complete; coordinated compatibility-then-rules deployment approved. No finance record is to be written, deleted, or migrated.

### 1. Pre-change deployed rules

The live `cloud.firestore` release used ruleset `953808b7-94a5-4f8e-8830-8cda670db40f`. Its rule content SHA-256 was `db272114d6bfe169cb11d91114e27d2b90d54a68a2fc3e77be779c1116fb8e48` and its complete access policy was:

```text
match /{document=**} {
  allow read, write: if true;
}
```

Every document was therefore readable and writable without authentication. At the pre-deployment checkpoint, those rules remained live because a rules-only deployment would break production writes before their local server-route replacements reached production. The coordinated deployment record and resulting live state are reported separately after execution.

### 2. Private finance evidence backup

Before editing rules/configuration, a read-only Admin snapshot was created:

```text
/Users/raylong/Coding/river-city-ffl/.firebase/evidence/
  firestore-finance-evidence-2026-08-11T02-11-08-421Z.json
```

Artifact details:

| Property | Value |
|---|---|
| SHA-256 | `949ce2584cb3f433a40cccf302b2c7f97e75d9c382934beb9a8c7f48b00af970` |
| Size | 25,034 bytes |
| Local permissions | `0600` |
| Git handling | Ignored by existing `.firebase/` rule; not staged |
| Finance documents | 1 rules, 1 season, 12 owners |
| Included evidence | Raw fields, Firestore create/update metadata, type schemas, per-document hashes, absent-collection counts, database metadata, deployed rules/release metadata and content |
| Excluded content | Credentials, access tokens, environment secrets |

The file hash was recomputed independently after creation and matched. This is a local evidence copy, not yet an off-machine or managed backup.

### 3. Commissioner-confirmed 2026 dues facts

The commissioner confirmed the following facts after reviewing the inventory:

| Financial owner | Amount | Payment fact provenance | Legacy timestamp |
|---|---:|---|---|
| David Besedich | $50 | `commissioner-confirmed-after-firestore-inventory` | Preserved, unverified |
| JD Dowling | $50 | `commissioner-confirmed-after-firestore-inventory` | Preserved, unverified |
| Rashad Gresham | $50 | `commissioner-confirmed-after-firestore-inventory` | Preserved, unverified |
| Ray Long | $50 | `commissioner-confirmed-after-firestore-inventory` | Preserved, unverified |
| Wade Cameron | $50 | `commissioner-confirmed-after-firestore-inventory` | Preserved, unverified |

The future migration may create five $50 payment facts from these confirmations. It must not use `duesPaidAt` as the receipt time. Until further evidence exists, the payment date should remain unknown and the Firestore timestamp should be retained only as legacy document metadata.

### 4. June 5 dataset classification

The commissioner cannot establish whether the June 5 setup was operational, demonstration, or testing. The correct classification is therefore:

> **Legacy/incomplete production-shaped evidence, with five commissioner-confirmed dues-paid exceptions.**

The whole dataset is neither test data nor authoritative production history. Preserve it, do not migrate it as-is, and do not delete it.

### 5. Repository Firestore usage inventory

| Collection/path group | Current use | Required client access under new rules | Classification |
|---|---|---|---|
| `siteContent` | Homepage recap read | Public read; no client write | Public presentation |
| `rsvps` | Homepage attendee list | Public read; write moved locally to validated `/api/rsvps` Admin route | Public presentation with narrow server mutation |
| `player_stats` | Homepage predictor/player valuation merge | Public read; import remains Admin/script-only | Public presentation |
| `historical_distribution` | Trade Analyzer percentile read | Public read; maintenance writes remain server/secret-protected | Public presentation |
| `ratified_rules` | Public Constitution live amendments | Public read; ratification writes moved locally to protected server service | Public presentation |
| `version_history_updates` | Public Version History additions | Public read; ratification writes moved locally to protected server service | Public presentation |
| `proposals` | Commissioner Legislative Hub | No client access; local GET/create/vote/finalize route uses protected server/Admin access | Commissioner server-only |
| `league_settings/voting_state` | Legislative voting override | No client access; local protected server route | Commissioner server-only; collection currently absent from live root inventory |
| `finance_rules`, `finance_seasons/**` | Legacy 2026 seed/evidence | No client read or write | Protected legacy finance evidence |
| `auction_adp_*`, `auction_value_*` | Protected refresh/config/audit services | None | Authenticated server/Admin-only |
| `auction_draft_runs`, `auction_owner_preferences`, `auction_owner_profiles` | Protected auction workflow | None | Authenticated server/Admin-only |
| `historical_trades`, `normalized_trades` | Historical import/normalization services | None | Server/script-only |
| `trades/**` | Current legacy history API storage path | None | Server-only; absent from the live root inventory |
| `_auction_health` | Admin health probe | None | Server-only; absent from the live root inventory |

`lib/finance/firestoreFinance.ts` and `lib/legislativeLogic.ts` still contain dormant client write helpers, but static import search found no current consumer after the compatibility changes. The deployed deny rules will prevent those helpers from mutating data if accidentally reactivated; they should be retired in a later focused cleanup.

### 6. Checked-in rules architecture

`firestore.rules` is now checked in locally and `firebase.json` references it. The local rules SHA-256 is `7ceb6aead271c98c844259daf76dca4ed44107fcaee5c5a2171fd68d22269671`.

The policy is deny-by-default:

- public read/server-write for `siteContent`, `rsvps`, `player_stats`, `historical_distribution`, `ratified_rules`, and `version_history_updates`;
- explicit client read/write denial for `finance_rules`, `finance_seasons/{season}`, and every descendant;
- recursive denial for every unlisted collection;
- no authenticated-client write exception and no broad convenience rule;
- Admin SDK access remains outside client Firestore rule evaluation.

### 7. Public, authenticated, and server boundaries

```text
public browser
  -> direct read of six explicitly public presentation collections
  -> no direct Firestore writes

public RSVP browser
  -> same-origin JSON API
  -> strict manager allowlist and fixed RSVP shape
  -> Admin SDK write only to rsvps/{approvedManagerId}

commissioner browser
  -> verified secure session cookie
  -> protected /api/commish/proposals endpoint
  -> commissioner authorization + validation
  -> Admin SDK transaction/batch

future finance browser
  -> authenticated finance endpoint
  -> finance capability + validation + idempotency
  -> Admin SDK transaction
  -> operational ledger/audit
```

Authenticated Firebase users receive no direct database write privilege under the local rules. The Legislative Hub continues to require the existing commissioner maintenance capability at both its layout and API boundary.

### 8. Compatibility changes required by hardening

- Homepage RSVP creation moved from client `setDoc` to `POST /api/rsvps`; the existing public real-time RSVP read remains allowed.
- Legislative proposal reads, creation, voting, voting override, finalization, ratification, and version-history writes moved from client Firestore calls to `/api/commish/proposals` and `lib/legislativeServer.ts`.
- Proposal voting now updates both vote sides atomically; finalization uses one Admin batch and derives active proposals from server data rather than trusting the client.
- Auction and historical server services already used Firebase Admin and need no compatibility change.

At the pre-deployment checkpoint, these changes were locally validated but not yet deployed. The required deployment order is application compatibility first, followed by restrictive rules only after production compatibility checks pass.

### 9. Future finance mutation architecture

No finance write endpoint or ledger was built. The established boundary is:

```text
browser
  -> protected commissioner-only server endpoint
  -> revoked-token/session and finance-capability check
  -> strict schema/state/idempotency validation
  -> Firebase Admin transaction
  -> immutable ledger and audit event
```

Direct client finance reads and writes are denied, including authenticated clients.

### 10. Security validation

Completed:

- `npx tsx scripts/firestore-security-rules.test.ts` — passed;
- unauthenticated finance create/update/delete denial verified statically from explicit rules;
- authenticated direct finance writes also resolve to explicit denial because no auth exception exists;
- all six required public-read blocks verified with direct writes denied;
- recursive catch-all denial and absence of catch-all public writes verified;
- explicit finance protection and `firebase.json` rules reference verified;
- client RSVP and Legislative Hub write calls verified removed from active pages;
- Admin SDK server-route boundary verified statically;
- `npx tsc --noEmit --pretty false` — passed;
- focused ESLint — passed;
- `npm run build` — passed, generating 381 static pages.

The repository has no Firestore rules emulator harness and the machine has no Java runtime, so emulator execution was unavailable. The static/config test documents and enforces the intended boundary. Firebase also compiles the rules during deployment.

### 11. PITR, delete protection, and managed backups

Pre-deployment metadata reported PITR and database delete protection disabled. The Admin credential could read database metadata but lacked permission to list backup schedules, so whether a managed schedule already exists remained unknown at that checkpoint.

- Firestore PITR retains minute-granularity versions for up to seven days. It requires billing, has no free tier, adds storage cost, and restored/stale reads incur normal read charges. Official guidance: [PITR overview](https://firebase.google.com/docs/firestore/enterprise/pitr) and [PITR operations](https://firebase.google.com/docs/firestore/use-pitr).
- Delete protection prevents database deletion until explicitly disabled and can be enabled by updating database configuration. It does not replace document recovery. Official guidance: [Manage Firestore databases](https://cloud.google.com/firestore/docs/manage-databases).
- Scheduled backups can run daily or weekly with retention up to 14 weeks; backup storage and restores are billed. Official guidance: [Firestore backups](https://firebase.google.com/docs/firestore/backups) and [Firestore pricing](https://firebase.google.com/docs/firestore/pricing).
- Managed exports also require billing and charge document reads/storage; they are useful for longer-lived archives but are not a replacement for PITR or scheduled backups.

Approved direction: enable delete protection through supported tooling after production verification. PITR is deferred and must remain disabled without separate approval. The proposed managed plan is one daily backup with 14-day retention plus a restore drill; because scheduled backup storage/restores are billable, do not enable it without explicit approval of that cadence and billing commitment.

### 12. Remaining risks

1. The insecure global rule remains a risk until the coordinated rules deployment completes successfully.
2. Deploying rules before the application compatibility layer would break RSVP and Legislative Hub mutations.
3. The evidence backup exists on one local machine and needs a protected off-machine copy.
4. Runtime emulator authorization tests could not run without Java.
5. Dormant client write helpers remain in legacy finance/legislative modules, though the local rules deny them.
6. The public RSVP API intentionally preserves the existing unauthenticated manager-selection behavior. Its write scope is tightly allowlisted, but stronger identity/rate limiting would require a separate product decision.
7. Current managed-backup schedule status is unknown because the available service credential received `403` for schedule listing.

### 13. Commissioner decisions after deployment authorization

Resolved:

- coordinated application-first, rules-second deployment is approved;
- private off-machine evidence belongs in a Google Cloud/Firebase-managed destination tied to River City and never in public Git;
- database delete protection is approved if supported safely;
- PITR is deferred and must not be enabled;
- Venmo is the only current operational payment method; Sleeper Safe and generic provider workflows are excluded.

Still requiring approval:

1. **Managed backup billing/cadence.** Proposed plan: one daily backup with 14-day retention. Do not create the schedule until its paid storage/restore implications are explicitly approved.
2. **Future international payment exception.** Add another payment method only if Jordan later requires it and the commissioner explicitly approves it; the base model should remain extensible without exposing generic provider complexity now.

## PHASE 6.2 — OPERATIONAL FINANCE RULES AND TYPES FOUNDATION

Phase 6.2 converts the approved 2026 policy into a typed, immutable, deterministic foundation without reading or writing Firestore. The authoritative specification is `docs/finance/2026-operational-finance-rules-spec.md`.

### Source audit result

- Constitution §1.3 corroborates a 12-member league; §§11.1–11.2 delegate current financial details to the website and intentionally omit fixed amounts.
- The 2024 legislative archive directly supports the $25 division award, the removal of fourth-place and Toilet Bowl payments, third place at the entry-fee amount, recap-independent weekly awards, and separately split auctioneer food.
- `lib/league-finance.ts` corroborates the entry fee and fixed award amounts but its fixed `$219` champion value is superseded by the approved variable ring formula.
- `lib/finance/paymentHandles.ts` is an older calculation path with fixed champion/custom division logic and is not reused by the Phase 6.2 foundation.
- `lib/managers/activeManagers.ts` and `lib/managers/identityData.ts` corroborate the 12 active franchise IDs and sporting co-owner relationships.
- The commissioner-approved 2026 ruling controls where older/general text differs: Sleeper resolves weekly/division results and tiebreakers, and a ring over $80 cannot reduce champion cash without explicit approval.

### Implemented boundary

`lib/finance/operationalFinanceTypes.ts` defines the season rules, awards, expenses, identity, finality, validation, reconciliation, payment method, public-dues policy, and future migration-input contracts. `lib/finance/operationalFinanceRules.ts` provides the frozen 2026 configuration and pure calculators/validators.

Weekly, division, placement, and championship award eligibility all require the
applicable Sleeper result to be final. The future public boundary permits only
paid/not-paid state, aggregate totals, approved winnings, and approved expenses;
amount owed, payment details, references, timestamps, and commissioner notes stay
private.

The baseline reconciliation is:

```text
60,000 dues
- 14,000 weekly
-  7,500 divisions
-  5,000 third
- 10,000 runner-up
= 23,500 championship allocation
```

Champion cash equals `23,500 - effective approved ring expense`. The default dues-funded ring cap is 8,000 cents. Any excess remains unresolved unless a sufficient commissioner-approved override is supplied.

Financial-owner attribution uses canonical IDs. `prestigio-mundial` maps to `ray-long`, excluding `jeffrey-hudgins` from duplicate finance identity. `shake-n-bakers` maps to `jordan-maslyn`, excluding `landon-elliott` from duplicate finance identity. All 12 active franchises have exactly one mapping.

The five confirmed paid states are represented only as future migration inputs with unknown authoritative payment timestamps. No legacy document was migrated, no finance record was written, and the checked-in/deployed Firestore security boundary was not changed.

### Deferred beyond Phase 6.2

- commissioner finance UI and protected mutation routes;
- operational Firestore ledger and migration;
- Sleeper result acquisition/proposals;
- idempotency and transaction provenance;
- season close/archive;
- any non-Venmo payment exception.
