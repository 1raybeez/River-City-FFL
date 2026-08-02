# Owner Matchup Projection Specification

## 1. Purpose and status

This document is the authoritative Phase 3B.2 specification for River City
Owner Matchup Projection. The reviewed franchise mapping and raw projection
engine are implemented. Career summaries, streaks, rivalry interpretation,
Managers UI, Rivalry UI, and Canonical Matchup History behavior remain out of
scope and unchanged.

The dependency flow is:

```text
strict Sleeper acquisition
  -> reviewed season-roster-to-franchise mapping
  -> immutable canonical franchise matchups
  -> owner-side matchup projections
  -> later factual summaries
  -> later rivalry interpretation and UI
```

Canonical Matchup History remains league truth. One physical or logical contest exists exactly once under one canonical matchup key. Owner projections are derived personal views and must never be used to calculate league-wide game totals.

Commissioner-approved Owner Season History is the only ownership authority. Sleeper primary owners, `co_owners`, attached users, draft helpers, aliases, and current membership cannot independently create historical ownership.

## 2. Sources reviewed

### Implemented history contracts

- `lib/history/canonicalMatchupHistory.ts`
- `lib/history/canonicalMatchupAcquisition.ts`
- `lib/history/ownerSeasonHistory.ts`
- `lib/history/ownerCareerSummary.ts`
- `lib/managers/identityData.ts`
- `lib/managers/identityTypes.ts`

The requested path `lib/history/identityData.ts` does not exist. The approved identity source is `lib/managers/identityData.ts`.

### Governing specifications and rulings

- `docs/managers/canonical-matchup-history-spec.md`
- `docs/managers/owner-matchup-history-spec.md`
- `docs/managers/historical-rulings.md`
- `docs/managers/river-city-managers-v1-spec.md`
- `docs/managers/owner-career-summary-spec.md`

### Compatibility-only consumers

- `app/league-info/rivalries/page.tsx`
- `components/managers/OwnerProfile.tsx`
- `lib/managers/identitySelectors.ts`
- existing active and retired manager records

Compatibility inspection does not authorize changing those consumers.

## 3. Existing contract boundaries

### Canonical Matchup History

`CanonicalFranchiseMatchup` represents a physical or logical contest once. It owns:

- canonical contest identity;
- season, week, bracket, and scoring periods;
- franchise sides;
- scores and score result;
- classification and title-game flag;
- completion state;
- correction version;
- Sleeper source lineage; and
- canonical coverage.

It contains no owner identity or ownership attribution.

### Owner Season History

`OwnerSeasonHistoryRecord` represents one approved owner’s association with one franchise in one season. It owns:

- immutable `ownerSeasonKey`;
- canonical owner and franchise identity;
- ownership role;
- approved co-owners;
- tenure and coverage state; and
- commissioner-approved season participation.

The projection layer must consume these records. It must not rebuild tenure from current franchise fields or Sleeper metadata.

### Owner Career Summary

Phase 2 career summaries retain null matchup-enrichment fields. Phase 3B.2 must not mutate or populate those summaries. A later factual summary phase may consume owner projections and provide reviewed enrichment.

## 4. Franchise-mapping readiness

### Required bridge

Canonical Sleeper score rows identify a season-specific `roster_id`. Owner Season History identifies an approved cross-season `franchiseId`. The repository needs a reviewed bridge:

```text
season + leagueId + rosterId -> canonical franchiseId
```

The recommended mapping record is:

```ts
type ReviewedRosterFranchiseMapping = {
  rosterSeasonKey: string;
  season: number;
  leagueId: string;
  rosterId: number;
  franchiseId: string;
  resolution: "commissioner-approved";
  evidence: string[];
  notes: string[];
};
```

The stable mapping key is:

```text
sleeper:{season}:{leagueId}:roster:{rosterId}
```

Display names and owner names do not belong in the key.

The reviewed mapping should be supplied as `franchiseIdByRosterId` when canonical input is built. Canonical records then retain approved franchise IDs and `coverage.franchises === "mapped"`. The projection layer should not parse the `sleeper-roster:` fallback string or silently infer continuity.

### Implemented mapping

`lib/history/franchiseRosterMappings.ts` contains all 96
commissioner-approved associations for 2018–2025: 12 rosters in each of eight
seasons. The mapping adapter supplies reviewed `franchiseIdByRosterId` values
without mutating acquisition input.

A live read-only validation mapped all 766 completed canonical contests. Zero
completed contests remained unresolved, and all 766 unique contests were
represented by owner projections.

The 14 seeded 2026 bye/incomplete bracket slots also use source-roster identity, but they are not completed games and must not create credited owner projections.

### Identity evidence is not an approved mapping

The Phase 3A audit found the following potential primary-owner identity evidence:

| Season | Direct canonical Sleeper-ID evidence | Legacy-map potential | Reviewed roster-franchise mappings |
|---:|---:|---:|---:|
| 2018 | 7 of 12 | 11 of 12 | 0 of 12 |
| 2019 | 9 of 12 | 12 of 12 | 0 of 12 |
| 2020 | 9 of 12 | 12 of 12 | 0 of 12 |
| 2021 | 9 of 12 | 12 of 12 | 0 of 12 |
| 2022 | 10 of 12 | 12 of 12 | 0 of 12 |
| 2023 | 10 of 12 | 12 of 12 | 0 of 12 |
| 2024 | 10 of 12 | 12 of 12 | 0 of 12 |
| 2025 | 12 of 12 | 12 of 12 | 0 of 12 |

This evidence supported commissioner review but was not ownership authority.
Ray subsequently confirmed that 2018 roster 5 was Landon Elliott's Special
Brownies franchise and that `342885779137216512` is Landon's historical
Sleeper ID. The mapping is now commissioner-approved and the ID is stored on
Landon's existing identity; no second owner or franchise was created.

### Tenure readiness after mapping

Owner Season History is ready to resolve approved owner sets once a canonical franchise side is known:

| Season | Resolved owner-season records | Distinct franchise groups | Missing franchise assignments | Approved shared franchises |
|---:|---:|---:|---:|---|
| 2018–2024, each season | 13 | 12 | 0 | Prestigio Mundial |
| 2025 | 14 | 12 | 0 | Prestigio Mundial; Shake-N-Bakers |

Thus tenure data can resolve all twelve franchise groups for every completed Sleeper season. The blocker is the reviewed roster-to-franchise bridge, not owner tenure.

## 5. Recommended primary record model

### Decision: owner-side projection with opponent owners as a collection

Use model C: one record for one approved owner’s perspective from one canonical franchise side. Store all approved owners of the opposing franchise in a collection.

Do not create:

- an owner-pair cross-product as the primary store;
- one shared-owner group record instead of personal credit; or
- a second physical contest record.

Recommended conceptual shape:

```ts
type OwnerMatchupResult = "win" | "loss" | "tie";
type OwnerMatchupSide = "home" | "away";

type OwnerMatchupEligibility = {
  overallCompetitive: boolean;
  regularSeason: boolean;
  championshipPlayoff: boolean;
  thirdPlace: boolean;
  placement: boolean;
  consolation: boolean;
  toiletBowl: boolean;
  rivalry: boolean;
};

type OwnerMatchupCanonicalLineage = {
  canonicalMatchupKey: string;
  correctionVersion: number;
  sourceProvider: "sleeper";
  sourceVersion: string;
};

type OwnerMatchupOpponent = {
  ownerId: string;
  ownerSeasonKey: string;
  ownershipRole: OwnershipRole;
};

type OwnerMatchupProjectionCoverage = {
  canonicalMatchup: "resolved";
  ownerSeason: "resolved";
  ownerFranchise: "resolved";
  opponentFranchise: "resolved";
  opponentOwners: "resolved";
};

type OwnerMatchupProjection = {
  ownerMatchupKey: string;
  canonicalMatchupKey: string;
  season: number;
  week: number;
  side: OwnerMatchupSide;

  ownerId: string;
  ownerSeasonKey: string;
  ownerFranchiseId: string;
  ownershipRole: OwnershipRole;
  coOwnerIds: string[];

  opponentFranchiseId: string;
  opponentOwners: OwnerMatchupOpponent[];

  result: OwnerMatchupResult;
  pointsFor: number;
  pointsAgainst: number;
  margin: number;

  matchupType: CanonicalMatchupType;
  bracketType: CanonicalBracketType;
  round: number | null;
  bracketPlacement: number | null;
  isChampionshipGame: boolean;

  eligibility: OwnerMatchupEligibility;
  ownershipSource: "owner-season-history";
  canonicalLineage: OwnerMatchupCanonicalLineage;
  coverage: OwnerMatchupProjectionCoverage;
};
```

Owner and franchise display names are intentionally absent. Consumers can join canonical IDs to identity data. This prevents renamed teams or owners from changing projection identity.

`coOwnerIds` contains the other approved owners on the same franchise side and excludes `ownerId`. `opponentOwners` contains structured, stably sorted owner-season references from the opposite side only.

The projection may copy immutable matchup facts needed for owner-oriented queries, but `canonicalMatchupKey` remains the lineage authority.

## 6. Projection algorithm

For each canonical record:

1. Preserve the canonical object unchanged.
2. Exclude `bye` and `incomplete` records from credited owner projections.
3. Require a completed contest with two mapped canonical franchise IDs.
4. Load Owner Season History records for the exact season.
5. Resolve the approved owner set for each exact franchise ID.
6. Require resolved owner ID, owner-season key, ownership coverage, and franchise coverage for every credited owner.
7. Create one owner-side projection for each approved owner on each side.
8. Copy opponent owner IDs from the opposite side only.
9. Derive owner-oriented points, margin, and result from the canonical side.
10. Attach scope eligibility and canonical lineage.
11. Sort by stable projection key.
12. Report unresolved records rather than emitting partial or guessed projections.

Both canonical sides must resolve before credited projections are emitted. If either side lacks reviewed franchise or owner-season resolution, the contest remains canonical but creates unresolved projection coverage only. This prevents a partially resolved game from entering records or head-to-head totals.

## 7. Co-owner behavior

### Credited personal games

Every legitimate co-owner receives one owner-side projection for each completed eligible franchise contest during the approved tenure.

For Prestigio versus Doug in 2023:

- the canonical contest exists once;
- Ray receives one projection;
- Jeffrey receives one projection;
- Doug receives one projection whose `opponentOwners` collection contains Ray and Jeffrey; and
- no owner-pair cross-product is stored.

Ray and Jeffrey therefore each receive the shared Prestigio result in personal career queries without turning one league contest into two physical contests.

### Teammate exclusion

Owners derived from the same canonical side are teammates, never opponents. `opponentOwners` comes exclusively from the opposite canonical side.

Ray-versus-Jeffrey and Jordan-versus-Landon must return no game merely because they shared a franchise. They may appear as opponents only in a different season or contest where approved tenure places them on opposite canonical franchise sides.

### Two co-owned franchises

If two two-owner franchises play:

- one canonical contest remains league truth;
- four owner-side projections are created, one per credited owner;
- each projection stores the two approved opposing owners;
- no eight-record directional owner-pair cross-product is persisted; and
- any league-wide total de-duplicates by canonical key or reads canonical history directly.

## 8. Ownership transitions

Projection always resolves tenure for the matchup season.

### Prestigio

- No pre-2018 matchup source exists for Ray’s 2011 solo season.
- Ray and Jeffrey each receive Prestigio matchup projections for supported seasons beginning in 2018 because both have approved shared tenure.
- Jeffrey never receives a hypothetical 2011 projection.
- No 2012 projection may exist for Ray or Prestigio.

### Shake-N-Bakers and Special Brownies

- Jordan receives Shake-N-Bakers projections before and after 2025.
- Landon receives Special Brownies projections through 2024 when that franchise is mapped.
- Landon begins receiving Shake-N-Bakers projections in 2025.
- Landon receives no pre-2025 Shake-N-Bakers matchup.
- Jordan receives no Special Brownies matchup.
- Jordan and Landon are teammates, not opponents, on 2025 Shake-N-Bakers projections.

### Draft helpers

- Doug is the sole approved owner of his 2023 franchise. Aaron receives no projection.
- Billy is the sole approved owner of his franchise in 2024. Any helper account receives no projection.
- Reported attachment evidence cannot add an owner to Owner Season History.
- No owner ID, tenure, matchup, or opponent association may be created from an attached Sleeper account.

## 9. Owner-versus-owner query semantics

Do not persist a separate owner-versus-owner record layer.

`getOwnerHeadToHead(ownerAId, ownerBId)` should:

1. load owner A’s projections;
2. retain projections whose `opponentOwners` contains owner B;
3. enforce the requested classification filter;
4. return each canonical matchup key at most once; and
5. return owner A’s directional points and result.

Consequences:

- when a solo owner faces a co-owned franchise, that owner has one projection, not one per opponent owner;
- the same contest is discoverable in that owner’s separate relationship with each legitimate opposing co-owner;
- a specific owner-pair query counts the contest once;
- teammate pairs are excluded because same-side owner IDs never enter `opponentOwners`;
- ownership changes are naturally respected by season-level owner sets; and
- Landon can have Special Brownies opponent history before 2025 and shared Shake-N-Bakers teammate history beginning in 2025 without merging franchise identity.

Pairwise relationship totals are not league physical-contest totals. Any cross-rivalry aggregate must de-duplicate canonical keys.

## 10. Counting vocabulary and safeguards

The layer must distinguish:

- **credited owner games:** owner-side projection records counted within one owner’s history;
- **franchise games:** unique canonical keys for a selected canonical franchise;
- **unique physical contests:** canonical matchup records counted league-wide.

For a co-owned franchise game, credited owner games can exceed franchise games. This is correct personal attribution, not additional league contests.

Consumers must not:

- sum all owner projection records to calculate league games;
- infer franchise game totals from the number of credited owners;
- multiply one owner’s game by the number of opposing co-owners; or
- treat the existence of several head-to-head relationships as several physical contests.

League totals always read Canonical Matchup History.

## 11. Classification projection and recommended scopes

All completed competitive classifications project to legitimate owners. Eligibility determines which factual summary includes them.

| Canonical classification | Emit credited projection | Default overall competitive | Regular-season | Championship-playoff | Third-place | Placement | Consolation | Toilet Bowl | Rivalry |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `regular` | Yes | Yes | Yes | No | No | No | No | No | Yes |
| `championship-playoff` | Yes | Yes | No | Yes | No | No | No | No | Yes |
| `third-place` | Yes | No | No | No | Yes | No | No | No | No |
| `placement` | Yes | No | No | No | No | Yes | No | No | No |
| `consolation` | Yes | No | No | No | No | No | Yes | No | No |
| `toilet-bowl` | Yes | No | No | No | No | No | No | Yes | No |
| `bye` | No; coverage only | No | No | No | No | No | No | No | No |
| `incomplete` | No; coverage only | No | No | No | No | No | No | No | No |

These are the approved Phase 3B.2 scopes. Only `regular` and
`championship-playoff` enter the default overall-competitive and future rivalry
scopes. Every other completed classification remains available through its
separate specialized scope.

Additional rules:

- A completed tie emits `result: "tie"` for both sides and counts once in every eligible game scope.
- `isChampionshipGame` is metadata on one `championship-playoff` record; it does not create an additional game.
- Toilet Bowl score result comes from points, not loser-advances bracket semantics.
- Placement, consolation, and Toilet Bowl facts remain queryable even when excluded from default overall and rivalry scopes.
- Bye and incomplete canonical slots never affect wins, losses, ties, points, margins, streaks, opponent totals, or rivalry totals.

## 12. Stable keys

### Owner-side projection

```text
{canonicalMatchupKey}:side:{home|away}:owner:{ownerId}
```

This key is stable across score correction, display-name changes, and opponent co-owner changes. A canonical participant correction retains the canonical key but may legitimately replace derived owner projections under a new reviewed mapping; correction lineage remains visible.

### Directional owner-versus-owner query row

No owner-pair record is persisted. If a consumer needs a stable key for a directional query row:

```text
{ownerMatchupKey}:opponent:{opponentOwnerId}
```

This is a derived view key, not an additional stored matchup.

### Unresolved projection coverage

```text
{canonicalMatchupKey}:side:{home|away}:unresolved
```

One unresolved side record may contain multiple reasons. Do not create keys from display names, aliases, array positions, or helper account IDs.

## 13. Proposed public API

### Raw projection API

Implemented module: `lib/history/ownerMatchupProjection.ts`.

- `buildOwnerMatchupProjections(input)`
- `getAllOwnerMatchupProjections()`
- `getOwnerMatchupProjection(ownerMatchupKey)`
- `getOwnerMatchupHistory(ownerIdOrSlug, filter?)`
- `getOwnerMatchupsForSeason(ownerIdOrSlug, season, filter?)`
- `getOwnerHeadToHead(ownerAIdOrSlug, ownerBIdOrSlug, filter?)`
- `getUnresolvedOwnerMatchupProjections()`
- `getOwnerMatchupProjectionCoverage()`

Recommended build input:

```ts
type OwnerMatchupProjectionBuildInput = {
  canonicalMatchups: readonly CanonicalFranchiseMatchup[];
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[];
};
```

The builder should not fetch Sleeper, rebuild canonical history, or read UI-local manager records.

### Filters

Filters may include:

- season or season range;
- canonical classification;
- eligibility scope;
- franchise ID;
- opponent owner ID;
- opponent franchise ID;
- completed title game only; and
- result.

Filters use raw values and canonical IDs.

### Summary boundary

Do not calculate career records, winning percentage, points totals, streaks, favorite victim, nemesis, most-played opponent, or rivalry interpretation inside the projection builder.

A later factual summary module may consume immutable projections:

```text
ownerMatchupProjection.ts -> ownerMatchupSummary.ts -> later consumers
```

Raw query APIs may return filtered projection records. They must not silently apply an undocumented summary scope.

## 14. Canonical lineage

Every projection must expose:

- exact `canonicalMatchupKey`;
- canonical correction version;
- Sleeper provider and source version;
- exact owner-season key;
- exact canonical owner and franchise IDs; and
- the ownership source label `owner-season-history`.

The canonical record remains retrievable through its existing accessor. Projection records should not deep-copy scoring-period arrays or pretend to own source contest identity.

A corrected canonical score rebuilds the same projection keys with updated facts and correction lineage. It does not append a second owner game.

## 15. Coverage and unresolved-data design

Recommended aggregate coverage:

```ts
type OwnerMatchupProjectionCoverageSummary = {
  seasonsRequested: number[];
  canonicalRecordsRead: number;
  completedCompetitiveCanonicalRecords: number;
  byeCanonicalRecords: number;
  incompleteCanonicalRecords: number;
  mappedCanonicalSides: number;
  unmappedCanonicalSides: number;
  ownerResolvedCanonicalSides: number;
  ownerUnresolvedCanonicalSides: number;
  canonicalRecordsProjected: number;
  canonicalRecordsOmitted: number;
  ownerProjectionRecordsCreated: number;
  uniquePhysicalContestsRepresented: number;
  duplicateOwnerMatchupKeys: string[];
  teammateOpponentViolations: string[];
  unresolvedProjections: OwnerMatchupProjectionIssue[];
  bySeason: OwnerMatchupProjectionSeasonCoverage[];
  byClassification: Record<CanonicalMatchupType, number>;
};
```

Each unresolved issue should include:

- stable unresolved key;
- canonical matchup key;
- season;
- side;
- source franchise ID;
- reason;
- candidate evidence, if any;
- whether the opposite side also failed; and
- notes.

Required reasons include:

- `unreviewed-franchise-mapping`;
- `missing-franchise`;
- `missing-owner-season`;
- `ambiguous-owner-season`;
- `unresolved-owner-identity`;
- `ownership-coverage-incomplete`;
- `canonical-bye`;
- and `canonical-incomplete`.

Coverage reconciliation must prove:

- each projected canonical contest exists once in canonical history;
- every owner projection points to exactly one canonical key;
- unique projected canonical keys never exceed completed eligible canonical keys;
- no unresolved contest contributes statistics;
- no projection key is duplicated; and
- no owner appears as both `ownerId` and an entry in `opponentOwners` for the same record.

Ignored helper metadata belongs in mapping-review evidence or historical rulings, not in owner projection records.

## 16. Determinism and immutability

The implemented builder:

- require explicit canonical and owner-season inputs;
- perform no acquisition;
- sort all inputs and nested owner collections by stable IDs;
- de-duplicate source records only by approved immutable keys;
- reject duplicate canonical keys or report them without double projection;
- never mutate canonical or owner-season inputs;
- replace cache state only after a successful complete build;
- throw from accessors before initialization;
- return deep consumer-safe clones or deeply immutable values; and
- produce byte-for-byte equivalent records for equivalent input.

A correction may change values while stable keys remain constant. An approved ownership correction may intentionally add or remove an owner projection, but it must not change or duplicate the canonical contest.

## 17. Double-counting examples

### Ray and Jeffrey

Prestigio game:

```text
1 canonical contest
2 Prestigio owner-side credits: Ray, Jeffrey
1 opponent-side credit for a solo opponent
```

League games = 1. Ray career games += 1. Jeffrey career games += 1. The solo opponent’s career games += 1.

### Jordan and Landon

For a 2024 Shake-N-Bakers game, Jordan receives one credit and Landon receives none. For a 2025 game, Jordan and Landon each receive one credit. They never receive an opponent record against each other from those games.

Landon’s pre-2025 Special Brownies games remain tied to `special-brownies`; joining Jordan does not rewrite prior projections.

### Doug and Aaron

For a 2023 Doug franchise game, Doug receives one credit. Aaron receives none. A Sleeper draft-helper attachment cannot add Aaron to `opponentOwners`, co-owner lists, coverage owners, or career totals.

### Billy and temporary helpers

For a 2024 Billy franchise game, Billy receives one credit. No temporary helper receives a projection. Unresolved `NakedBuddha` or “The Oracle” evidence remains outside canonical ownership and cannot create an identity.

## 18. Historical limitations

- There is no supported matchup source for 2011–2017.
- Do not reconstruct pre-2018 schedules or scores from final standings.
- Sleeper matchup coverage begins in 2018.
- The reviewed roster-franchise mapping contains 96 commissioner-approved
  associations for 2018–2025.
- The 2018 roster 5 mapping is commissioner-confirmed as Landon Elliott's
  Special Brownies franchise.
- The 2026 bracket contains bye and incomplete placeholders but no completed result.
- Live Sleeper history may change after corrections.
- Versioned source snapshots are deferred.
- Existing hard-coded profile records are comparison data, not projection input.

## 19. Compatibility findings

### Rivalry Hub

The existing Rivalry Hub fetches Sleeper directly, uses a local current-manager map, treats Sleeper `co_owners` as ownership, scans fixed weeks, and can compare missing matchup IDs as equal. It silently combines classifications.

It cannot safely consume the projection design without a later UI phase. A future migration should query owner projections and a separately approved summary/rivalry layer. No current Rivalry Hub logic should become owner-projection source logic.

### Owner Profile

The existing Owner Profile displays manually curated or current-season record fields and a survey-based rival. It does not consume Phase 2 future matchup enrichment.

Phase 3B.2 must not alter this presentation. A later approved factual summary adapter may populate new view-model fields without overwriting subjective survey rivalry content.

## 20. Implemented validation matrix

`scripts/owner-matchup-projection.test.ts` covers:

1. Equivalent input produces deterministic records and stable keys.
2. Returned records and nested arrays cannot mutate cached state.
3. Canonical and owner-season input snapshots remain byte-identical after a build.
4. Every projection key is unique.
5. Every projection resolves to one canonical key.
6. League-wide unique canonical counts do not use projection-record counts.
7. A solo-versus-solo contest creates two owner-side projections.
8. A solo-versus-co-owned contest creates three owner-side projections, not four owner-pair records.
9. Two co-owned franchises create one projection per credited owner without a persisted owner-pair cross-product.
10. Ray and Jeffrey each receive the same supported Prestigio result.
11. Ray and Jeffrey never appear as opponents from a shared side.
12. Jordan alone receives pre-2025 Shake-N-Bakers results.
13. Landon retains pre-2025 Special Brownies results.
14. Landon begins Shake-N-Bakers credit in 2025.
15. Jordan and Landon never appear as opponents from a shared side.
16. Doug receives 2023 credit while Aaron receives none.
17. Billy receives 2024 credit while helper identities receive none.
18. Current or historical Sleeper `co_owners` cannot expand approved owner sets.
19. Ownership changes use the matchup season, not current franchise ownership.
20. Ties reverse correctly and remain ties for both sides.
21. Byes create coverage only and no credited projection.
22. Incomplete games create coverage only and no credited projection.
23. Regular, championship-playoff, third-place, placement, consolation, and Toilet Bowl scopes remain distinct.
24. Only the canonical title game carries `isChampionshipGame`.
25. Toilet Bowl score results do not use loser-advances semantics.
26. Multi-week playoff scoring periods create one projection result per credited owner.
27. Unreviewed franchise sides create unresolved coverage and no partial statistics.
28. Missing owner-season associations create unresolved coverage and no guessed owner.
29. Owner head-to-head returns each canonical key once for the selected pair.
30. Teammate-opponent and duplicate-key violation lists remain empty.
31. Projection coverage reconciles emitted owner credits with unique physical contests.
32. Accessors throw before successful initialization.

## 21. Recommended implementation sequence

Phase 3B.2 was implemented after the mapping and scope decisions were approved.

1. Create and review the 2018–2025 season-roster-to-franchise mapping artifact.
2. Supply reviewed mappings to canonical acquisition input and rebuild canonical records without changing canonical algorithms.
3. Verify all 766 completed canonical contests have mapped franchise sides.
4. Implement the framework-free owner projection builder.
5. Implement unresolved coverage and immutable accessors.
6. Add the focused validation matrix.
7. Cross-check owner credited-game totals against unique canonical contest totals.
8. Report differences from manual profile records without changing UI.
9. Stop for approval before factual summary, Rivalry, or Managers integration.

### Phase 3B.2 live validation

The completed read-only Sleeper validation produced:

| Season | Owner projections | Credited owners | Unique canonical contests |
|---:|---:|---:|---:|
| 2018 | 199 | 13 | 92 |
| 2019 | 199 | 13 | 92 |
| 2020 | 199 | 13 | 92 |
| 2021 | 213 | 13 | 98 |
| 2022 | 212 | 13 | 98 |
| 2023 | 212 | 13 | 98 |
| 2024 | 212 | 13 | 98 |
| 2025 | 228 | 14 | 98 |
| 2026 | 0 | 0 | 0 |

Across all seasons, 766 completed canonical contests were mapped and
represented by 1,674 owner-side projections. Duplicate projection keys,
teammate-opponent violations, helper-account attributions, and unresolved
completed contests were all zero. The 2026 source contributes coverage-only
bye/incomplete slots and no owner statistics.

## 22. Decision status

Approved and implemented:

1. all 96 reviewed roster-season-to-franchise mappings, including Landon's
   commissioner-confirmed 2018 roster 5;
2. model C: one owner-side record with opposing owners stored as a collection;
3. coverage-only handling for byes and incomplete canonical slots;
4. overall and rivalry eligibility limited to `regular` and
   `championship-playoff`;
5. distinct season-specific losers-bracket classifications;
6. owner head-to-head de-duplication by canonical matchup key; and
7. manual profile records remaining comparison-only.

Deferred decisions for later phases:

1. whether career win/loss streaks may cross season boundaries; and
2. when versioned Sleeper snapshots become required input.
