# 2026 Operational Finance Rules Specification

Status: Phase 6.2 rules/types foundation implemented; no persistence, proposal acquisition, or commissioner UI.

Schema version: `2026.1`

## 1. Authority and evidence hierarchy

The 2026 operational configuration is season-specific. Evidence was reviewed in this order:

1. later explicit commissioner-approved 2026 decisions;
2. ratified legislative history;
3. Constitution statements and authority boundaries;
4. current repository league configuration as corroboration.

The Constitution establishes a 12-member league in §1.3 and makes the website the financial source of truth in §§11.1–11.2, while intentionally omitting fixed financial amounts. It therefore does not independently establish the 2026 dollar values.

The 2024 legislative archive provides direct supporting evidence for:

- `2024-fourth-third-place-payouts`: remove fourth place and set third place to the entry fee, passed 12–0;
- `2024-division-winner-payout`: $25 per division winner, passed 9–3;
- `2024-high-score-regardless-recap`: weekly high score paid regardless of recap, passed 11–1;
- `2024-remove-toilet-bowl-payment`: remove the Toilet Bowl payment, passed 12–0;
- `2024-auctioneer-dinner-split`: owners separately split auctioneer food/drinks, passed 12–0.

`lib/league-finance.ts` corroborates the $50 entry fee, $10 weekly award, $25 division award, $100 runner-up, and $50 third-place amounts. Its fixed `$219` champion value is not authoritative for 2026 because current policy makes champion cash depend on the actual approved ring cost.

`lib/finance/paymentHandles.ts` contains an older Sleeper calculation path with a fixed champion amount and locally reproduced division ordering. It is preserved but deliberately not imported into this foundation: future award proposals must use official Sleeper-final outcomes and the new season configuration instead.

The Constitution's generic standings tiebreak order is preserved as evidence, but the later commissioner-approved 2026 finance ruling controls award resolution: Sleeper's official weekly winner and division standings/tiebreakers are authoritative. River City does not independently recalculate those outcomes.

## 2. Authoritative 2026 rule table

| Rule | 2026 policy | Primary provenance |
|---|---|---|
| Competitive franchises | 12 | Commissioner approval; Constitution §1.3; active franchise configuration |
| Entry fee | 5,000 cents per franchise | Commissioner approval; current finance configuration |
| Base dues pool | 60,000 cents | Deterministic `12 × 5,000` |
| Commissioner fee | 0 cents | Commissioner approval |
| Weekly high score | 1,000 cents, Weeks 1–14 | Commissioner approval; current finance configuration; 2024 recap ruling |
| Weekly resolution | Sleeper official winner/tiebreaker; no custom tiebreak | Commissioner approval |
| Divisions | 3 awards at 2,500 cents | Commissioner approval; 2024 division ruling |
| Division resolution | Sleeper official standings/tiebreakers | Commissioner approval |
| Third place | 5,000 cents | Commissioner approval; 2024 placement ruling |
| Runner-up | 10,000 cents | Commissioner approval; current finance configuration |
| Fourth place | No award | 2024 placement ruling; commissioner approval |
| Lower bracket / Toilet Bowl | No financial award | 2024 Toilet Bowl ruling; commissioner approval |
| Season-high score | No award | Commissioner approval |
| Championship allocation | 23,500 cents shared by champion cash and approved ring | Commissioner approval; deterministic remainder |
| Default ring cap | 8,000 cents from dues | Commissioner approval |
| Auctioneer food | Separately funded; optional by season | 2024 dinner ruling; commissioner approval |
| Trophy nameplate | No expense going forward | Commissioner approval |
| Dues deadline | Before the configured draft event | Commissioner approval; repository draft configuration |
| Payment method | Venmo only | Commissioner approval |
| Dues assessment identity | One per competitive franchise | Commissioner approval |

Every major rule stores structured rule provenance with `sourceType`, `sourceRef`, optional `effectiveSeason`/`approvedAt`, and notes. Unknown approval dates are not invented. Future transaction provenance is intentionally a separate concern and is not represented by rule provenance.

## 3. Payout and reconciliation formula

All calculations use integer cents:

```text
dues pool                 12 × 5,000 = 60,000
weekly allocation        14 × 1,000 = 14,000
division allocation       3 × 2,500 =  7,500
third place               1 × 5,000 =  5,000
runner-up                1 × 10,000 = 10,000
championship allocation                 23,500
                                         ------
total                                    60,000
```

Separately funded expenses do not enter or reduce this equation.

## 4. Championship and ring formula

The championship allocation is not a fixed champion payout:

```text
approved cap = default 8,000 cents or an explicit commissioner override
effective ring expense = min(actual approved ring cost, approved cap)
champion cash = 23,500 - effective ring expense
```

Examples:

| Approved ring cost | Approved override | Ring charged to dues | Champion cash | State |
|---:|---:|---:|---:|---|
| 1,600 | None | 1,600 | 21,900 | Resolved |
| 4,000 | None | 4,000 | 19,500 | Resolved |
| 8,000 | None | 8,000 | 15,500 | Resolved |
| 8,600 | None | Unresolved | Unresolved | 600-cent exception requires approval |
| 8,600 | 8,600 | 8,600 | 14,900 | Resolved by explicit override |

An over-cap cost never silently reduces champion cash. An override must be at least the default cap and sufficient to cover the amount being charged to the championship allocation.

## 5. Weekly eligibility and finality

- Eligible weeks are exactly 1 through 14 for 2026.
- Each finalized week has one $10 award.
- Sleeper determines the official winner and applies its own tiebreaker.
- No River City custom tiebreaker exists.
- No season-high-score award exists.
- A recap is not required.
- No forfeiture or rollover rule exists for 2026.
- In-progress and provisional results are modeled as pre-final states; only `sleeper-final` is safe for future commissioner approval.

These settings belong to the 2026 season configuration, not permanent future policy.

## 6. Division and placement policy

Sleeper's official division standings and tiebreakers resolve three $25 division awards. River City does not independently reproduce division standings.

Placement awards are exactly:

- third place: $50;
- runner-up: $100.

There is no fourth-place, Loser Bracket, or Toilet Bowl financial payout.
Weekly, division, placement, and championship results become award-eligible only
after Sleeper marks the applicable result final. Phase 6.2 does not acquire live
Sleeper data.

## 7. Expense funding policy

Only two operational expense categories are modeled:

- championship ring — dues-funded within its approved cap;
- auctioneer food — separately funded and not required every season.

Auctioneer food is not owner winnings, a commissioner fee, or a deduction from the $600 pool. Nameplates and commissioner fees are absent.

## 8. Dues and payment policy

There is one $50 assessment per competitive franchise. Dues are due before the draft. The actual timestamp will be resolved later from the approved draft event; Phase 6.2 does not invent a calendar deadline.

Venmo is the only supported operational payment method for 2026. Venmo remains external while River City is the canonical financial ledger. The type can be extended later, but no Sleeper Safe, PayPal, Cash App, Zelle, generic provider workflow, or international payment workflow is implemented. Any future Jordan exception requires explicit commissioner approval.

Sleeper Safe exists as an external payment feature, but no public API integration is assumed and it is not part of the River City workflow.

## 9. Canonical financial-owner attribution

Financial ownership is separate from sporting/co-owner identity. The rules map each of the 12 canonical franchise IDs to exactly one canonical financial owner ID.

| Franchise ID | 2026 financial owner ID | Sporting co-owner excluded from duplicate finance identity |
|---|---|---|
| `prestigio-mundial` | `ray-long` | `jeffrey-hudgins` |
| `the-art-of-war` | `jd-dowling` | — |
| `shake-n-bakers` | `jordan-maslyn` | `landon-elliott` |
| `the-shepherd` | `tommy-moore` | — |
| `tax-season` | `stan-schoppe` | — |
| `the-wildcard` | `wade-cameron` | — |
| `hall-pass` | `doug-fordham` | — |
| `kissed-by-a-freckle` | `travis-miller` | — |
| `the-gresham-empire` | `rashad-gresham` | — |
| `buckeye-nation` | `brian-stevens` | — |
| `hawkins-heroes` | `aaron-hawkins` | — |
| `the-bearded-one` | `david-besedich` | — |

Jeffrey and Landon keep their full sporting identities elsewhere. Their private reimbursement or winnings arrangements do not create a second assessment, duplicate award, or automatic 50/50 ledger split.

## 10. Public/private finance boundary

Future members may see each financial owner's `paid`/`not-paid` state, aggregate
dues totals, approved winnings, and approved expenses.

The following remain private:

- amount owed per person;
- payment handle or Venmo username;
- transaction reference;
- payment timestamp;
- commissioner notes.

No Venmo handle is included in the rules foundation.

## 11. Deterministic calculators

`lib/finance/operationalFinanceRules.ts` exports pure helpers for:

- expected dues pool;
- weekly allocation;
- division allocation;
- fixed placement allocation;
- championship allocation;
- total allocation;
- ring validation;
- champion payout;
- full season-rule validation.

They accept read-only inputs, do not mutate them, return integer cents, and freeze structured outputs. The authoritative season configuration and nested objects are frozen at runtime.

## 12. Validation expectations

Validation enforces the approved franchise count, amounts, weeks, award counts, finality source, absence of extra placement awards, default ring cap, Venmo method, before-draft deadline, zero commissioner fee, separately funded non-ring expenses, unique franchise mappings, and exact $600 reconciliation.

Ring validation additionally rejects negative/non-integer values, insufficient overrides, and unapproved over-cap expenses.

## 13. Firestore boundary

Phase 6.2 performs no Firestore reads or writes. Future persistence must follow:

```text
browser
  → protected commissioner server route
  → authentication and authorization
  → schema/state/idempotency validation
  → Firebase Admin SDK transaction
  → operational finance ledger and audit event
```

Never:

```text
browser → direct Firestore finance write
```

The deployed rules continue to deny direct access to `finance_rules` and `finance_seasons/**`.

## 14. Legacy migration boundary

No legacy document is migrated or treated as authoritative operational state in this phase. Existing `finance_rules/2026`, `finance_seasons/2026`, and owner descendants remain evidence only.

The following commissioner-confirmed paid facts are preserved as immutable future migration inputs:

- `david-besedich` — $50 paid;
- `jd-dowling` — $50 paid;
- `rashad-gresham` — $50 paid;
- `ray-long` — $50 paid;
- `wade-cameron` — $50 paid.

Each input has `authoritativePaidAt: null`, `legacyTimestampAuthoritative: false`, and `migrationStatus: future-input-only`.

## 15. Known future decisions

Before operational settlement, the commissioner must still resolve:

1. actual approved ring cost;
2. any explicit ring funding cap override if cost exceeds $80;
3. the approved draft event timestamp used to resolve the dues deadline;
4. whether Jordan ever needs a separately approved international payment exception.

Firestore ledger schema, idempotency keys, transaction provenance, Sleeper acquisition, commissioner workflows, and season close/archive belong to later phases.

## 16. Implementation status

Implemented in Phase 6.2:

- immutable operational-finance types;
- authoritative frozen 2026 season configuration;
- structured rule provenance;
- canonical financial-owner mappings;
- pure payout and reconciliation calculators;
- ring exception validation;
- public/private field policy;
- future-only legacy paid inputs;
- focused deterministic test coverage.

Not implemented:

- Firestore persistence or migration;
- Sleeper polling/proposal engine;
- commissioner finance UI;
- payment-service integration;
- changes to historical Financial History, Manager Profiles, Payouts, Rivalries, Head-to-Head, or matchup engines.
