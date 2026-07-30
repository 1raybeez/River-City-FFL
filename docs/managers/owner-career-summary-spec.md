# Owner Career Summary Specification

## Purpose and status

The Owner Career Summary engine is Phase 2 of Managers v1. It is a framework-free, reusable projection over the approved Owner Season History engine. It provides one normalized career résumé per resolved owner for future Managers, Hall of Fame, Records, Rivalries, Home, and API consumers.

The engine must not:

- import React or page-specific code;
- create another identity or season-history system;
- mutate historical facts;
- return preformatted display strings;
- create an owner from an unresolved historical placeholder; or
- begin matchup, finance, draft, trade, relationship, or UI work.

## Source and identity contract

`lib/history/ownerSeasonHistory.ts` is the only Phase 2 season-result input. Canonical owner metadata comes from `lib/managers/identityData.ts`.

Every consumed owner-season record is identified by its immutable `ownerSeasonKey`. Phase 2 de-duplicates by that key defensively and reports duplicate consumed keys. One summary is created per canonical resolved owner identity, keyed by owner ID and addressable by owner ID or slug.

Unresolved Phase 1 records are excluded from personal summaries and counted in global and per-summary coverage as applicable. No alias, raw manager label, or unresolved row may become a synthetic career owner.

Returned objects and nested arrays are consumer-safe clones. A caller must not be able to mutate cached engine state.

## Exported output contract

The implemented primary type is `OwnerCareerSummary`:

- `summaryId`
- `ownerId`
- `ownerSlug`
- `ownerName`
- `ownerStatus`
- `seasons: OwnerCareerSeasonSummary`
- `placements: OwnerCareerPlacementSummary`
- `latestFranchise: OwnerCareerLatestFranchise | null`
- `franchiseHistory: OwnerCareerFranchiseSummary[]`
- `futureEnrichment: OwnerCareerFutureEnrichment`
- `coverage: OwnerCareerCoverage`
- `notes: string[]`

`latestFranchise` is intentional. Retired owners keep their latest historical franchise even though they have no current franchise.

### Season summary

`OwnerCareerSeasonSummary` contains:

- first season;
- latest season;
- unique seasons represented;
- unique seasons with known placement;
- unique seasons as primary owner;
- unique seasons as co-owner; and
- unique seasons as legacy owner.

### Placement summary

`OwnerCareerPlacementSummary` contains raw numeric values for:

- championships;
- runner-up finishes;
- third-place finishes;
- podiums;
- best finish;
- worst finish;
- average finish; and
- last-place finishes.

Best, worst, and average finish are null when no placement is known.

### Latest franchise and franchise history

`OwnerCareerLatestFranchise` contains the latest resolved franchise ID, canonical name, season, and ownership role.

Each `OwnerCareerFranchiseSummary` contains:

- franchise ID and canonical name;
- first and latest represented seasons;
- unique seasons represented;
- ownership roles used in those records;
- championships;
- runner-up finishes;
- third-place finishes;
- podiums; and
- last-place finishes.

Separate franchises are never merged merely because they share an owner.

### Coverage

Per-owner `OwnerCareerCoverage` reports:

- owner-season records;
- records with and without placement;
- placement coverage as a numeric ratio or null;
- records with a franchise and missing-franchise records;
- unresolved records attributed; and
- source unresolved records excluded.

`OwnerCareerSummaryCoverage` reports:

- summaries created;
- active, retired, and staff counts;
- the declared staff handling policy;
- total source and consumed owner-season records;
- records with and without placement;
- missing-franchise records;
- unresolved historical records;
- owners and IDs with multiple franchises;
- owners and IDs with co-owner seasons;
- duplicate summary IDs; and
- duplicate consumed owner-season keys.

Staff identities without owner-season records use a valid empty summary. Their placement values are zero where they are counts, null where no result can exist, and their franchise history remains empty.

### Deferred enrichment

`OwnerCareerFutureEnrichment` reserves typed, null fields for:

- regular-season record;
- playoff record;
- winning percentage;
- playoff appearances;
- points for;
- points against;
- career winnings;
- net earnings;
- favorite victim;
- nemesis;
- most-played opponent;
- statistical rivalry;
- draft performance; and
- trade performance.

These fields remain null in Phase 2. Their presence is not permission to derive, import, format, or display them.

## Public API

The Phase 2 public API is:

- `buildOwnerCareerSummaries()`
- `getAllOwnerCareerSummaries()`
- `getOwnerCareerSummary(ownerIdOrSlug)`
- `getActiveOwnerCareerSummaries()`
- `getRetiredOwnerCareerSummaries()`
- `getOwnerCareerSummaryCoverage()`

No barrel export is required in Phase 2.

## Calculation rules

1. **One summary per resolved owner.** Unresolved historical records contribute to coverage only.
2. **Unique seasons.** Season totals count unique owner-season records and never count an `ownerSeasonKey` twice. A known placement is not required for `seasonsRepresented`.
3. **Known-placement totals.** `seasonsWithKnownPlacement` includes only seasons with a non-null final placement.
4. **Placement flags.** Championship, runner-up, third-place, and last-place totals use the corresponding Phase 1 flags.
5. **Podiums.** `podiums = championships + runnerUpFinishes + thirdPlaceFinishes`.
6. **Best and worst.** The minimum known placement is best; the maximum known placement is worst.
7. **Average finish.** The arithmetic mean uses known placements only. Missing placement is never treated as zero, last place, or an inferred result.
8. **Last place.** Use Phase 1 `isLastPlace`; do not assume the last-place rank is always 12.
9. **Ownership roles.** Primary, co-owner, and legacy season counts come from Phase 1 tenure roles and count unique seasons.
10. **Latest franchise.** Select the most recent owner-season record with a resolved franchise. A current-season resolved record may be latest even when its placement is unavailable.
11. **Franchise history.** Group by canonical franchise ID, count unique represented seasons, retain all used ownership roles in stable role order, and calculate placement totals within the group.
12. **Raw values.** Do not emit strings such as `148-96`, `.619`, or `4 Championships`.
13. **Honest gaps.** Null and coverage metadata represent data that cannot be supported from Phase 1.

## Co-owner and tenure attribution

Owner career summaries are personal views. Approved co-owners receive the same franchise placement during shared seasons. This can produce two personal championship attributions for one franchise title; league-wide title totals must continue to count the underlying franchise result only once.

### Prestigio

- Ray Long’s 2011 result is his solo, primary-owner Prestigio Mundial result.
- Ray did not participate in 2012.
- Ray and Jeffrey Hudgins share Prestigio results beginning in 2013.
- Jeffrey receives no 2011 result.
- Jeffrey does not become a separate competing franchise.
- Prestigio has no owner-season record in 2012.
- The approved 2011 Prestigio continuity is encoded as a separate primary tenure and does not move the 2013 co-ownership boundary.

### Shake-N-Bakers and Special Brownies

- Jordan Maslyn’s Shake-N-Bakers history before 2025 remains Jordan’s.
- Landon Elliott’s Special Brownies history remains separate and does not enter Jordan’s summary.
- Landon receives Shake-N-Bakers results only beginning with his approved 2025 co-owner tenure.
- Jordan’s pre-2025 accomplishments are not copied to Landon.

Retired owners retain summaries from historical records regardless of current Sleeper membership.

## Phase 2 scope

Phase 2 calculates only placement, season, ownership-role, franchise résumé, notes, and coverage values supported by Owner Season History. It does not change Phase 1 records or Managers presentation.

Regular-season, playoff, scoring, finance, matchup, rivalry, draft, auction, keeper, trade, transaction, award, and record-book enrichment is deferred. Historical team-name reconstruction and season-specific division presentation are also deferred unless and until approved sources and later phases define them.

## Validation contract

`scripts/owner-career-summary.test.ts` must verify:

- unique career-summary owner IDs;
- no duplicate consumed owner-season;
- podium arithmetic;
- averages based only on known placements;
- correct latest-franchise selection;
- separation of franchise histories;
- immutable returned state;
- null deferred placeholders;
- no fake owner from unresolved history;
- honest empty staff handling;
- retired-owner inclusion;
- missing-franchise and missing-placement behavior;
- matching Ray/Jeffrey Prestigio accomplishments for shared seasons;
- no separate competing Jeffrey franchise;
- preservation of Landon’s Special Brownies history;
- Landon’s Shake-N-Bakers start boundary; and
- no transfer of Jordan’s earlier accomplishments to Landon.

The required review commands are:

```text
npx tsx scripts/owner-season-history.test.ts
npx tsx scripts/owner-career-summary.test.ts
npx tsc --noEmit --pretty false
npx eslint lib/history/ownerSeasonHistory.ts lib/history/ownerCareerSummary.ts scripts/owner-season-history.test.ts scripts/owner-career-summary.test.ts
npm run build
git diff --check
```

## Responsibility boundary

Ray/ChatGPT approves product scope, historical facts, manual curation, identity and tenure decisions, and phase progression. Codex implements the approved framework-free contract, uses existing canonical sources, reports conflicts and missing coverage, validates results, and does not infer historical corrections or begin later phases without approval.
