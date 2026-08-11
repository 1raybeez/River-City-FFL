# 2026 Operational Finance Ledger Foundation

## 1. Scope and principles

Phase 6.4 establishes the private operational ledger for 2026 and later. It does
not create a dashboard, public presentation, payment-provider integration, or
season-close workflow.

The governing distinctions are:

```text
Sleeper proposal != money
approved obligation = financial truth
settlement = actual money movement
correction = linked reversal/replacement, never silent mutation
```

All currency uses integer cents. Original obligations, settlements, reversals,
migration records, and audit events are append-only.

## 2. Architecture

```text
Phase 6.3 proposal
  → future commissioner authorization and explicit approval
  → ledger service validation
  → repository transaction
  → immutable obligation + audit + idempotency evidence
  → separate settlements/reversals
  → derived status and totals
```

The domain service in `operationalFinanceLedger.ts` has no Firebase dependency.
`operationalFinanceLedgerMemory.ts` provides atomic offline tests.
`operationalFinanceLedgerFirestore.ts` is the server/Admin implementation. It
buffers transaction writes until every read/validation succeeds, then creates
money, audit, and idempotency documents atomically.

## 3. Firestore paths

The normalized schema is:

```text
operational_finance_seasons/{season}
  obligations/{obligationId}
  settlements/{settlementId}
  reversals/{reversalId}
  audit_events/{eventId}
  reconciliation/{snapshotId}
  migration_records/{migrationId}
  idempotency/{idempotencyKey}
```

The season root contains schema/rules versions, open/reconciling/closed state,
rules snapshot reference, financial-owner mapping version, and source league ID.
2026 is created as `open`; it is not closed by this phase.

Firestore rules explicitly deny direct client reads and writes for the root and
all descendants. Admin SDK access is isolated to server tooling. There is no
browser finance route or client SDK dependency.

## 4. Obligations

An obligation is approved financial truth, not a mutable summary. Supported
categories are exactly:

- dues assessment;
- weekly high score;
- division winner;
- third place;
- runner-up;
- champion;
- championship ring;
- auctioneer food.

Each record preserves amount, funding source, franchise/financial-owner identity
where relevant, rule/provenance references, source reference, actor,
idempotency key, and optional proposal/replacement links.

No fourth-place, lower-bracket, Toilet Bowl, recap forfeiture, rollover,
season-high-score, or commissioner-fee category exists.

## 5. Stable obligation IDs

Examples:

```text
operational-finance-obligation:2026:dues:{franchiseId}
operational-finance-obligation:2026:weekly-high-score:week-{week}
operational-finance-obligation:2026:division-winner:{divisionId}
operational-finance-obligation:2026:third-place
operational-finance-obligation:2026:runner-up
operational-finance-obligation:2026:champion
operational-finance-obligation:2026:championship-ring-expense
```

An approved Phase 6.3 proposal key deterministically becomes an obligation key
by replacing the proposal prefix. Display names never participate in IDs.

## 6. Settlements

Settlements record actual money movement separately from obligations. Supported
directions are incoming dues, outgoing award, outgoing expense, and incoming
separate contribution. Venmo is the only 2026 payment method.

Settlement fields may privately preserve an actual payment timestamp, external
reference, and commissioner note. These are not public in Phase 6.4. Partial
settlement is supported. Active settlement totals may not exceed the referenced
active obligation; reversed obligations cannot receive new settlements.

No Sleeper Safe, PayPal, Zelle, Cash App, generic provider workflow, outstanding
balance document, or mutable paid boolean is added.

## 7. Derived lifecycle

Obligations are immutable approved records. Settlement state is derived as
`unpaid`, `partially-settled`, or `settled` from active settlement amounts.
Dues presentation uses `unpaid`, `partially-paid`, or `paid`.

Correction state is derived from linked reversal records. The original document
is never edited or deleted. Active totals exclude reversed obligations and
reversed settlements.

## 8. Reversals and replacements

`reverseObligation` and `reverseSettlement` create linked reversal records plus
audit events. `replaceObligation` atomically creates an obligation reversal and
a new obligation linked to both the original and reversal.

This supports future Sleeper/stat corrections after approval. Before approval,
Phase 6.3 proposals may simply regenerate. After approval, the ledger requires
explicit review and reversal/replacement semantics.

## 9. Audit events

Every supported mutation creates an append-only audit event in the same
transaction. Event types include season metadata creation, obligation creation,
settlement creation, obligation reversal/replacement, settlement reversal, and
migration recording.

Events preserve actor ID/role, target, time, reason, idempotency key, optional
before/after links, and compact non-secret metadata. They never contain payment
credentials or secrets.

## 10. Actors and authorization

Actor roles are `commissioner` and `system`. Award approval, expense creation,
settlement, reversal, and replacement service functions require a commissioner
actor. The one-time opening migration requires a named system actor.

No public route exists yet. A future route must authenticate the existing
commissioner session before constructing the commissioner actor; arbitrary
client user IDs are not authorization.

## 11. Idempotency

Every mutation accepts a safe stable idempotency key and creates an idempotency
record atomically with its target and audit event. A retry with the same key and
operation returns the existing target. Reuse for a different operation fails.
Stable obligation IDs independently prevent duplicate money records.

The migration-level key is:

```text
migration:2026:opening-dues-ledger
```

Assessment and settlement records also receive deterministic per-record keys.

## 12. Dues assessments

The migration plan creates exactly one $50 assessment for each of the 12
approved competitive franchises: 60,000 cents total. Each uses canonical
franchise and financial-owner IDs, `before-draft` policy, and `dueAt = null`
because no draft timestamp is invented.

Prestigio maps to Ray; Shake-N-Bakers maps to Jordan. Jeffrey and Landon do not
receive duplicate assessments.

## 13. Confirmed-payment migration

Exactly five commissioner-confirmed $50 Venmo settlements are planned:

- David Besedich;
- JD Dowling;
- Rashad Gresham;
- Ray Long;
- Wade Cameron.

Each references its dues obligation. `actualPaidAt` remains `null`; only the
migration recording time is written if/when applied. Provenance is
`commissioner-confirmed-after-firestore-inventory`.

Expected opening state is 25,000 cents collected and 35,000 cents outstanding.
No legacy owner summary or legacy timestamp is migrated.

## 14. Legacy boundary

The migration never reads, edits, or deletes:

```text
finance_rules/2026
finance_seasons/2026
finance_seasons/2026/owners/*
```

Those records remain preserved as non-authoritative evidence. The new ledger is
independent after the approved migration facts are recorded.

## 15. Award and expense approval boundary

`recordApprovedAwardProposal` accepts only a Phase 6.3 proposal in `proposed`
state. It validates category, resolved amount, canonical identity, and the
current Phase 6.2 rule before atomically recording an obligation and audit event.
Pending or unresolved proposals remain outside the ledger.

Championship-ring expenses must pass the approved cap/override validator.
Auctioneer food is separately funded. No 2026 ring or food expense is created by
the opening migration because no actual expense has been approved.

## 16. Derived totals and reconciliation preparation

The deterministic server helpers derive:

- dues assessed, collected, and outstanding;
- approved awards, award settlements, and award outstanding;
- approved expenses, expense settlements, and expense outstanding;
- separately funded contributions;
- dues-funded pool allocated and remaining.

Proposals and legacy summary totals are excluded. Separately funded flows remain
outside the dues-pool equation. A positive preseason pool remainder is expected;
zero remaining is not required until a future season-close review.

## 17. Read boundary

The Admin repository provides private server helpers for season metadata,
individual/all obligations, settlements by obligation, all settlements, audit
events, derived dues status, and derived totals. There are no public client
reads. Calculated balances are not written back as authoritative mutable fields.

## 18. Migration tool and apply boundary

The controlled command is:

```text
npx tsx scripts/migrate-2026-operational-finance.ts
```

It is dry-run by default and performs no writes. It validates the rules version,
12 unique mappings, five settlements, and expected totals before printing the
complete plan, then uses Admin SDK reads to classify production as
`not-migrated`, `already-migrated`, or `conflict`. A completed migration reports
zero records that would be created; partial/conflicting state stops execution.

A later explicitly authorized application would use:

```text
npx tsx scripts/migrate-2026-operational-finance.ts --apply
```

Apply mode additionally refuses any Firebase project other than
`river-city-ffl`, uses the Admin repository transaction, creates audit and
idempotency records, compares legacy evidence fingerprints before and after,
and performs zero deletes or legacy mutations. Phase 6.4 does not run apply
without a separate commissioner authorization.

Future work remains: commissioner UI/routes, public paid/not-paid presentation,
international payment exception if approved, full reconciliation, and season
close/archive.
