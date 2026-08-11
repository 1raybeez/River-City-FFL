# 2026 Operational Finance Proposal Engine

## 1. Status and scope

Phase 6.3 adds a deterministic, read-only award proposal layer. It answers:

> What financial awards does the current Sleeper state support proposing right now?

The result is evidence for commissioner review, not an approved transaction. The
engine cannot approve, pay, settle, or persist anything. Dues are outside this
engine. The 2016–2025 Financial History Engine is unchanged.

The approved Phase 6.2 configuration in
`lib/finance/operationalFinanceRules.ts` remains the only rules source. Phase 6.3
does not recalculate or replace those rules.

## 2. Engine and acquisition boundary

The implementation has two boundaries:

```text
Sleeper read-only endpoints
  → operationalFinanceSleeperAdapter.ts
  → normalized compact facts
  → buildOperationalFinanceProposals(input)
  → immutable proposal set
```

`lib/finance/operationalFinanceProposals.ts` is the pure core. It performs no
HTTP acquisition, reads no global mutable state, and has no Firebase, Firestore,
Sleeper client, XLSX, UI, or persistence dependency.

`lib/finance/operationalFinanceSleeperAdapter.ts` is the read-only acquisition
boundary. It uses the configured 2026 league ID and these public Sleeper
endpoints:

- `/state/nfl`;
- `/league/{leagueId}`;
- `/league/{leagueId}/users`;
- `/league/{leagueId}/rosters`;
- `/league/{leagueId}/matchups/{week}` for started scoring weeks through Week 14;
- `/league/{leagueId}/winners_bracket`;
- `/league/{leagueId}/losers_bracket`, inspected only for coverage and never for a payout.

Acquisition rejects network, HTTP, JSON-shape, and canonical roster-ID failures.
It never falls back to invented data. It performs no Firestore access.

## 3. Proposal input and types

`OperationalFinanceProposalInput` supplies:

- approved season rules;
- season and Sleeper league ID;
- current scoring week and normalized league state;
- canonical roster-to-franchise mappings;
- weekly result/finality facts;
- division descriptors and any authoritative Sleeper-preserving order;
- third-place and championship bracket facts;
- optional explicit approved ring cost and cap override;
- an optional source snapshot timestamp.

The core returns `OperationalFinanceProposalSet`, containing immutable
`OperationalFinanceProposal` rows, `OperationalFinanceProposalIssue` rows, and
aggregate `OperationalFinanceProposalCoverage`.

Supported categories are exactly:

- `weekly-high-score`;
- `division-winner`;
- `third-place`;
- `runner-up`;
- `champion`;
- `championship-ring-expense`.

No fourth-place, lower-bracket, Toilet Bowl, season-high-score,
recap-forfeiture, rollover, or dues proposal type exists.

## 4. Proposal states and amounts

Proposal state is one of `not-eligible`, `pending-finality`, `proposed`, or
`unresolved`. There is no `approved`, `paid`, or `settled` state.

Coverage is one of:

- `available`;
- `pending-finality`;
- `unresolved-sleeper-tie`;
- `unresolved-identity`;
- `pending-ring-cost`;
- `ring-cap-override-required`;
- `not-yet-applicable`;
- `source-unavailable`.

Only `proposed` rows carry an `amountCents`. Pending, unresolved, and
not-yet-applicable rows use `null`; they are never represented as zero-dollar
winnings.

## 5. Stable proposal keys

Keys contain canonical categories and source IDs, never display names:

```text
operational-finance-proposal:2026:weekly-high-score:week-{week}
operational-finance-proposal:2026:division-winner:{divisionId}
operational-finance-proposal:2026:third-place
operational-finance-proposal:2026:runner-up
operational-finance-proposal:2026:champion
operational-finance-proposal:2026:championship-ring-expense
```

The builder detects duplicate source slots, records an issue, and de-duplicates
the returned set by stable key. Identical input therefore produces identical
keys, amounts, proposals, issues, and ordering.

## 6. Weekly algorithm

Only approved Weeks 1–14 are considered. Week 15 and later cannot create a
weekly proposal.

For each eligible week:

1. A future/not-started week is `not-yet-applicable`.
2. A current or otherwise unfinished week is `pending-finality`.
3. An elapsed week with incomplete source rows is `source-unavailable`.
4. A safely final week with one unique highest Sleeper-published score proposes
   one $10 award.
5. If normalized Sleeper facts provide an official winner, that supplied result
   is honored; the core never recomputes or overrides it.
6. If the published top score is tied and Sleeper supplies no unique
   league-wide weekly winner, the slot is `unresolved-sleeper-tie`. A later
   commissioner workflow may confirm only the winner displayed by Sleeper.

There is no River City custom tiebreak, recap, forfeiture, rollover, or
season-high-score calculation. The $10 is never split, and bench points,
standings, seed, roster ID, alphabetical order, or any other River City fallback
cannot resolve the tie.

## 7. Weekly finality algorithm

The adapter follows the repository's existing conservative completed-period
pattern: a regular scoring week is final only when the league scoring leg has
advanced beyond it (or the league is complete) and all 12 distinct roster score
rows are present. The current leg remains in progress.

This is a proposal-finality signal, not transaction approval. Sleeper can still
apply later stat corrections. Before future commissioner approval, a proposal
may be regenerated from newer Sleeper facts and replace the prior provisional
output because no financial obligation is official. After future commissioner
approval, a changed Sleeper result must never silently rewrite the obligation;
it requires explicit review and later reversal/replacement semantics where
appropriate. Phase 6.3 implements neither approval persistence nor a correction
ledger.

## 8. Division algorithm

Three division slots are expected, keyed by Sleeper division ID. The builder
uses only a supplied final ordering that is documented as preserving Sleeper's
ordering. The first roster in that ordering receives the $25 proposal.

The public Sleeper endpoints used here expose roster division assignments and
standings fields, but not an authoritative final division-order endpoint. The
adapter therefore does not sort by wins, points, head-to-head, or any custom
tiebreak. When the regular season is final but no approved Sleeper-preserving
ordering is available, the division slot is unresolved with
`source-unavailable` coverage. A later commissioner workflow may confirm only
the winner displayed by Sleeper.

## 9. Placement algorithm

The engine uses the Sleeper winners bracket only:

- the winner of the dedicated `p = 3` match receives the $50 third-place proposal;
- the loser of the final `p = 1` match receives the $100 runner-up proposal;
- the winner of the final `p = 1` match identifies the champion.

Both `w` and `l` must be present before a bracket result is Sleeper-final.
Regular-season seed, roster ordering, prior-season results, and standings data
are never used to infer placement. Missing or duplicate `p = 1`/`p = 3`
classification remains unresolved and requires later commissioner confirmation
of Sleeper's displayed result.

The losers bracket is not a financial source. No lower-bracket or Toilet Bowl
proposal is emitted.

## 10. Champion and ring interaction

The championship allocation remains 23,500 cents. Champion cash is not a fixed
21,900 cents:

```text
champion cash = 23,500 - effective approved ring expense
```

- Before a final champion: `pending-finality` or `not-yet-applicable`.
- Final champion without an explicit approved ring cost: `pending-ring-cost`.
- Approved cost at or below 8,000 cents: champion cash is proposed using the
  Phase 6.2 calculator.
- Cost above 8,000 cents without a sufficient explicit approved override:
  `ring-cap-override-required` and no amount proposal.
- Cost above 8,000 cents with a sufficient approved cap override: champion cash
  uses the validated effective ring expense.

The ring is a separate `championship-ring-expense` proposal only when an actual
approved cost is supplied. It is dues-funded, has no owner recipient, and is not
cash winnings. When resolved, champion cash plus ring expense always equals
23,500 cents.

## 11. Canonical financial-owner attribution

The adapter derives current roster-to-franchise facts from the canonical active
manager roster and franchise records. It then requires exact correspondence
with Sleeper's current roster IDs. The core resolves each award through the
Phase 6.2 `financialOwnerMappings`.

Consequences for 2026:

- Prestigio Mundial proposals route to `ray-long`, never a duplicate Jeffrey proposal;
- Shake-N-Bakers proposals route to `jordan-maslyn`, never a duplicate Landon proposal;
- helper/staff IDs cannot receive awards because they are absent from approved
  financial-owner mappings;
- missing, duplicate, or unknown identity mappings become
  `unresolved-identity`; the builder does not guess.

Sporting/co-owner identity remains unchanged elsewhere.

## 12. Source facts and provenance

Each slot retains a stable source reference, rule reference, finality evidence,
and compact facts sufficient to explain the result. Depending on category these
include league ID, week, matchup or bracket match ID, division ID, roster ID,
published points/order, canonical franchise ID, and ring input.

Raw Sleeper payloads, user display names, payment data, and unrelated roster
details are not copied into proposals.

## 13. Determinism and immutability

The core adds no clock value. `createdFromSnapshotAt` is populated only from the
supplied input timestamp. It clones/final-freezes proposal facts, notes,
proposals, issues, coverage, and the proposal set. It does not mutate its input.

A repeated build over byte-equivalent normalized input returns an equivalent
proposal set. Stable keys are suitable for a later idempotent persistence layer,
but Phase 6.3 itself has no persistence.

## 14. Live snapshot behavior

The live script is:

```text
npx tsx scripts/operational-finance-proposals-live.ts
```

It acquires one read-only snapshot, builds proposals offline, and prints only
acquisition metadata, aggregate coverage, issues, and any proposed rows. It
does not print full raw Sleeper payloads and does not write files or Firestore.

Preseason behavior is intentionally quiet: weekly, division, placement, and
championship slots remain `not-yet-applicable`; no award is manufactured.

## 15. Known Sleeper limitations

1. Sleeper's public matchup response publishes scores but no authoritative
   league-wide weekly-high-score tiebreak result. Exact top-score ties therefore
   require a later explicit commissioner resolution unless another authoritative
   Sleeper fact becomes available.
2. The public league/roster response exposes division assignments and record
   fields but not an authoritative final division ordering. Phase 6.3 will not
   recreate River City/Sleeper tiebreak mathematics.
3. Advancing beyond a scoring leg is conservative evidence of completion, not a
   guarantee against later NFL stat corrections.
4. Bracket placement depends on Sleeper's `p`, `w`, and `l` fields. Missing or
   nonstandard placement classification remains unresolved.

## 16. Future ledger boundary

Any later ledger integration must remain server-only and must separately add:

- commissioner authentication and authorization;
- proposal review and explicit approval;
- immutable source snapshot/version tracking;
- correction and supersession semantics;
- idempotent transactional writes and audit events;
- payment and settlement state.

None of those behaviors is present in Phase 6.3. In particular, rebuilding a
proposal set does not mutate, approve, pay, settle, or migrate any record.
