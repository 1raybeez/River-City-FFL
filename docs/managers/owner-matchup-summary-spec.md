# Owner Matchup Summary Specification

## 1. Purpose and status

This document is the authoritative Phase 3C implementation specification for
River City Owner Matchup Summary. The summary engine is implemented in
`lib/history/ownerMatchupSummary.ts`. Phase 3C does not populate Phase 2
enrichment fields, modify Managers or Rivalry UI, interpret rivalries, or
change canonical matchup or owner projection behavior.

The dependency boundary is:

```text
Canonical Matchup History
  -> Owner Matchup Projection
  -> Owner Matchup Summary
  -> later adapters and factual presentation
  -> later Rivalry interpretation
```

Canonical Matchup History remains the only source of league physical-contest
truth. Owner Matchup Projection remains the only source of personal owner-game
credits. Owner Matchup Summary is a deterministic aggregation of those credits;
it must never reconstruct games, resolve owners, or become a competing matchup
ledger.

## 2. Sources reviewed

### Authoritative implementation contracts

- `lib/history/canonicalMatchupHistory.ts`
- `lib/history/franchiseRosterMappings.ts`
- `lib/history/ownerMatchupProjection.ts`
- `lib/history/ownerSeasonHistory.ts`
- `lib/history/ownerCareerSummary.ts`
- `lib/managers/identityData.ts`

### Governing specifications and rulings

- `docs/managers/canonical-matchup-history-spec.md`
- `docs/managers/franchise-roster-mapping-audit.md`
- `docs/managers/owner-matchup-projection-spec.md`
- `docs/managers/owner-matchup-history-spec.md`
- `docs/managers/historical-rulings.md`
- `docs/managers/river-city-managers-v1-spec.md`

### Compatibility-only consumers

- `components/managers/OwnerProfile.tsx`
- `app/league-info/rivalries/page.tsx`
- `lib/managers/identitySelectors.ts`

The current Owner Profile reads current Sleeper roster settings for current
division presentation and displays manually curated franchise/profile facts. It
does not consume Phase 3B projections.

The current Rivalry Hub fetches Sleeper directly, resolves owners through a
local user map, treats `co_owners` as ownership evidence, scans fixed weeks,
calculates totals in React, and can conflate game classes. Its totals are not
approved summary input. It is useful only for later compatibility and display
analysis.

## 3. Source-of-truth boundaries

### Canonical Matchup History owns

- one physical or logical contest per `canonicalMatchupKey`;
- canonical franchises, scores, classification, completion, title-game status,
  scoring periods, correction version, and source lineage; and
- league-wide physical-contest totals.

### Owner Matchup Projection owns

- one personal owner-side credit per approved owner and canonical franchise
  side;
- `ownerMatchupKey`, `ownerSeasonKey`, owner and franchise identity;
- opponent owners as a structured collection;
- owner-oriented score, result, margin, classification eligibility, and
  canonical lineage; and
- unresolved owner-projection coverage.

### Owner Season History supplies coverage context only

Owner Season History may enumerate:

- canonical owners;
- approved participation seasons;
- ownership role and franchise for a season; and
- seasons before matchup-source coverage.

It must not supply wins, losses, ties, points, opponents, or games to Phase 3C.

### Owner Matchup Summary owns

- deterministic arithmetic over supplied projection records;
- career-, season-, classification-, title-game-, and directional
  opponent-level factual aggregates;
- stable references back to consumed projections and canonical keys; and
- reconciliation and no-source coverage.

It does not own raw games, ownership resolution, league game counts, narrative
labels, subjective rivalry meaning, or UI formatting.

## 4. Discovery decisions

### 4.1 Record architecture

Use three separate immutable record types:

1. `OwnerCareerMatchupSummary`
2. `OwnerSeasonMatchupSummary`
3. `OwnerOpponentMatchupSummary`

Do not nest complete season and opponent records inside the career record.
Career summaries should contain stable season/opponent summary-key references.

This design is preferred because:

- each record has one clear aggregation grain;
- season and opponent queries do not require cloning a large career object;
- a corrected season can be rebuilt and compared independently;
- opponent summaries can have their own directional de-duplication rules;
- career totals cannot accidentally be derived from opponent rows;
- nested duplication and cache invalidation are reduced; and
- stable keys remain independent of display names and array order.

### 4.2 Summary population

Create one career summary for every canonical owner profile so Phase 2 and
future adapters have a stable join target. Owners with approved tenure only in
2011–2017 receive honest no-source coverage rather than a false zero-game
historical conclusion.

Staff profiles with no competitive owner-season receive an empty,
`not-applicable` matchup summary. They must not be converted into competitors.

Create:

- one season summary for every resolved owner-season record, including
  no-source seasons;
- no season summary for an unresolved source label posing as an owner; and
- one opponent summary only for a directional owner pair supported by at least
  one projection.

### 4.3 Statistical input

All record arithmetic uses supplied `OwnerMatchupProjection` records only.
`OwnerSeasonHistoryRecord` and canonical owner profiles determine summary
population and coverage labels, not statistics.

### 4.4 Opponent record storage

Build opponent summaries as separate directional records. Do not store them as
nested primary data in career summaries, and do not persist an owner-pair
cross-product at projection level.

Directional means:

```text
Ray -> Doug
```

and:

```text
Doug -> Ray
```

are separate summary perspectives. Each reverses points, margin, and result
through its own source owner projections.

## 5. Proposed build input

```ts
type OwnerMatchupSummaryBuildInput = {
  projections: readonly OwnerMatchupProjection[];
  ownerSeasonRecords: readonly OwnerSeasonHistoryRecord[];
  ownerProfiles: readonly Pick<OwnerProfile, "id" | "slug" | "status">[];
  projectionCoverage: OwnerMatchupProjectionCoverage;
};
```

Requirements:

- the builder performs no Sleeper acquisition;
- it does not invoke or rebuild canonical matchups;
- it does not invoke or rebuild owner projections;
- it does not read UI-local manager maps;
- all dependencies are supplied explicitly;
- input arrays and nested input objects remain byte-identical after a build;
  and
- a projection coverage failure cannot be presented as valid empty summary
  history.

`projectionCoverage` is required so an empty projection array can be
distinguished from an initialized season with no completed games and from a
failed or incomplete upstream build.

## 6. Stable summary keys

Recommended keys:

```text
owner-matchup-summary:career:{ownerId}
owner-matchup-summary:season:{season}:owner:{ownerId}
owner-matchup-summary:opponent:{ownerId}:vs:{opponentOwnerId}
```

Rules:

- use canonical owner IDs only;
- do not use names, usernames, franchise display names, array positions, or
  current roster IDs;
- career and opponent keys do not change when a team name changes;
- a season key does not depend on the franchise, because one canonical owner
  should have one summary for the season;
- if future approved history allows one owner to own two franchises in one
  season, the season summary still aggregates that owner once and exposes both
  franchise IDs in sorted lineage; and
- duplicate source keys are reported, never silently counted twice.

## 7. Common record calculation

Use one shared immutable calculation structure in career, season, opponent, and
classification splits:

```ts
type OwnerMatchupRecord = Readonly<{
  games: number;
  wins: number;
  losses: number;
  ties: number;
  winningPercentage: number | null;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
}>;
```

### 7.1 Games and results

For the selected projection set:

```text
games = unique ownerMatchupKey count
wins = result === "win"
losses = result === "loss"
ties = result === "tie"
games = wins + losses + ties
```

One owner projection can enter one career summary and one season summary. A
duplicate `ownerMatchupKey` is a coverage error and is not double-counted.

### 7.2 Winning percentage

Use:

```text
(wins + 0.5 × ties) / games
```

When `games === 0`, `winningPercentage` is `null`, not `0`, `0.5`, or `1`.
Zero would make unavailable or unplayed history look like a losing record.

Store the unrounded numeric ratio. Percentage formatting and decimal precision
belong to consumers.

### 7.3 Points

Use the raw numeric `pointsFor` and `pointsAgainst` from projections.

- Do not round each game or the stored totals for presentation.
- Sort projections by stable key before accumulation.
- Use one deterministic summation implementation for every summary grain.
- A compensated summation method may reduce floating-point accumulation error
  without changing source precision.
- `pointDifferential = pointsFor - pointsAgainst`.
- Validate that the differential reconciles with the deterministic sum of
  projection margins.

Do not substitute roster-setting aggregates or recalculate scores from weekly
Sleeper rows.

### 7.4 Empty records

An empty scope returns:

```ts
{
  games: 0,
  wins: 0,
  losses: 0,
  ties: 0,
  winningPercentage: null,
  pointsFor: 0,
  pointsAgainst: 0,
  pointDifferential: 0,
}
```

Coverage determines whether the empty record means no source, no completed
games, no games in that class, or not applicable.

## 8. Classification splits

Each career, season, and opponent summary uses:

```ts
type OwnerMatchupRecordSplits = Readonly<{
  overall: OwnerMatchupRecord;
  regularSeason: OwnerMatchupRecord;
  championshipPlayoff: OwnerMatchupRecord;
  championshipGames: OwnerMatchupRecord;
  thirdPlace: OwnerMatchupRecord;
  placement: OwnerMatchupRecord;
  consolation: OwnerMatchupRecord;
  toiletBowl: OwnerMatchupRecord;
}>;
```

Exact membership:

| Split | Included projections |
|---|---|
| `overall` | `eligibility.overallCompetitive === true`; currently `regular` and `championship-playoff` only |
| `regularSeason` | `matchupType === "regular"` |
| `championshipPlayoff` | `matchupType === "championship-playoff"` |
| `championshipGames` | `matchupType === "championship-playoff"` and `isChampionshipGame === true` |
| `thirdPlace` | `matchupType === "third-place"` |
| `placement` | `matchupType === "placement"` |
| `consolation` | `matchupType === "consolation"` |
| `toiletBowl` | `matchupType === "toilet-bowl"` |

`championshipGames` is an intentional subset of
`championshipPlayoff`. It must not be added to the playoff total a second time.

Bye and incomplete canonical records emit no projection and therefore enter no
record split.

An optional diagnostic `allCompleted` record may be computed internally for
coverage, but it should not be exposed as the default career record or added to
the public model without approval.

## 9. Owner career summary

Recommended conceptual model:

```ts
type OwnerCareerMatchupSummary = Readonly<{
  summaryKey: string;
  summaryType: "career";
  ownerId: string;
  ownerSlug: string;
  ownerStatus: OwnerProfileStatus;
  records: OwnerMatchupRecordSplits;
  firstMatchup: OwnerMatchupReference | null;
  latestMatchup: OwnerMatchupReference | null;
  firstMatchupSeason: number | null;
  latestMatchupSeason: number | null;
  approvedParticipationSeasons: readonly number[];
  seasonsWithMatchupData: readonly number[];
  seasonsWithoutMatchupSource: readonly number[];
  seasonsWithSourceButNoCompletedGames: readonly number[];
  seasonSummaryKeys: readonly string[];
  opponentSummaryKeys: readonly string[];
  streaks: null;
  lineage: OwnerMatchupSummaryLineage;
  coverage: OwnerCareerMatchupCoverage;
}>;
```

### Career behavior

- `records.overall` is the approved default career record.
- It includes regular and championship-playoff projections only.
- Unqualified career points for, points against, and differential mean the
  values in `records.overall`; specialized points remain in their own splits.
- Specialized splits remain available without changing the default.
- Each unique owner projection enters its owner’s career aggregate exactly
  once per applicable split.
- Points and results do not multiply when the opponent has co-owners.
- First and latest matchup are selected by season, week, then
  `canonicalMatchupKey`.
- `firstMatchupSeason` and `latestMatchupSeason` are `null` when the owner has
  no projections.
- `seasonsWithMatchupData` includes a season when at least one projection
  exists for the owner.
- `seasonsWithoutMatchupSource` is derived from approved owner-season
  participation before configured matchup-source coverage.
- `seasonsWithSourceButNoCompletedGames` includes an initialized source season
  such as pre-draft 2026 when the owner has approved tenure but no projection.

Career totals must be calculated from the owner’s projection set. They must not
sum season summary objects or opponent summary objects, though coverage must
prove those records reconcile.

## 10. Owner season summary

Recommended conceptual model:

```ts
type OwnerSeasonMatchupSummary = Readonly<{
  summaryKey: string;
  summaryType: "season";
  ownerId: string;
  season: number;
  ownerSeasonKeys: readonly string[];
  franchiseIds: readonly string[];
  ownershipRoles: readonly OwnershipRole[];
  records: OwnerMatchupRecordSplits;
  firstMatchup: OwnerMatchupReference | null;
  latestMatchup: OwnerMatchupReference | null;
  opponentOwnerIds: readonly string[];
  streaks: null;
  lineage: OwnerMatchupSummaryLineage;
  coverage: OwnerSeasonMatchupCoverage;
}>;
```

### Season behavior

- Create one record per resolved canonical owner-season.
- Do not create a fake owner summary for an unresolved placement label.
- Aggregate all supplied projections matching owner and season.
- Preserve sorted unique `ownerSeasonKey`, franchise, and role lineage.
- For normal history, one record points to one `ownerSeasonKey`.
- Do not infer games from final placement or roster-setting wins/losses.
- A pre-2018 owner-season has an empty record and
  `coverage.sourceAvailability === "unavailable-no-source"`.
- A source-enabled but unfinished season has an empty record and
  `coverage.sourceAvailability === "available-no-completed-games"`.
- A season with one or more projections uses
  `coverage.sourceAvailability === "available"`.
- A missing upstream build is an error, not an empty season summary.

Career-to-season reconciliation is based on projection keys, not on rounded
totals:

```text
career projection keys
  = union of that owner's season-summary projection keys
```

The union must contain no duplicate key and no omitted key.

## 11. Owner opponent summary

Recommended conceptual model:

```ts
type OwnerOpponentMatchupSummary = Readonly<{
  summaryKey: string;
  summaryType: "opponent";
  ownerId: string;
  opponentOwnerId: string;
  meetings: number;
  records: OwnerMatchupRecordSplits;
  firstMeeting: OwnerMatchupReference;
  latestMeeting: OwnerMatchupReference;
  seasons: readonly number[];
  canonicalMatchupKeys: readonly string[];
  ownerMatchupKeys: readonly string[];
  franchiseIds: readonly string[];
  opponentFranchiseIds: readonly string[];
  coOwnerContext: OwnerOpponentCoOwnerContext;
  factualExtremes: OwnerOpponentFactualExtremes;
  streaks: null;
  lineage: OwnerMatchupSummaryLineage;
  coverage: OwnerOpponentMatchupCoverage;
}>;
```

### 11.1 Directional construction

For each owner projection:

1. read its structured `opponentOwners`;
2. reject any opponent that is the owner or one of the projection’s teammate
   owners;
3. add the projection once to each legitimate directional
   `(ownerId, opponentOwnerId)` bucket;
4. de-duplicate each bucket by `canonicalMatchupKey`;
5. report a duplicate within a bucket rather than counting it again; and
6. calculate the bucket from the owner’s directional score/result.

No Cartesian owner-pair records are created upstream. A pair summary is a
derived index over existing owner projections.

### 11.2 Co-owned opponent example

When a solo owner faces Prestigio:

- the physical contest exists once in Canonical Matchup History;
- the solo owner has one owner projection;
- that projection enters the solo owner’s career total once;
- it enters the solo owner’s directional summary against Ray once;
- it enters the solo owner’s directional summary against Jeffrey once;
- Ray has one personal projection against the solo owner;
- Jeffrey has one personal projection against the solo owner; and
- Ray and Jeffrey receive no opponent summary against one another.

The sum of all opponent-summary meetings can therefore exceed career games.
This is expected relationship indexing, not extra games.

### 11.3 Opponent facts in Phase 3C

The following are objective summary facts and belong in Phase 3C:

- directional meetings;
- wins, losses, ties, and weighted winning percentage;
- points for, points against, and differential;
- classification splits;
- playoff and title-game meetings;
- first and latest meeting;
- seasons represented;
- sorted unique canonical matchup keys;
- closest meeting by absolute margin;
- largest win; and
- largest loss.

Deterministic tie-breaking for closest/largest facts uses season, week, then
`canonicalMatchupKey`.

- Closest meeting is the projection with the smallest absolute margin.
- Largest win is the winning projection with the greatest positive margin.
- Largest loss is the losing projection with the greatest absolute negative
  margin.
- A missing qualifying win or loss produces `null`, not a manufactured
  zero-margin reference.

The following do not belong in Phase 3C:

- rivalry labels or intensity;
- primary-rival selection;
- favorite-victim, nemesis, or most-painful-opponent labels;
- narrative copy;
- subjective recency or playoff weights;
- badge thresholds; and
- UI formatting.

Those are later Rivalry interpretation concerns.

### 11.4 Co-owner context

Recommended context fields:

```ts
type OwnerOpponentCoOwnerContext = Readonly<{
  meetingsWhereOwnerHadTeammates: number;
  meetingsWhereOpponentHadTeammates: number;
  teammateOwnerIdsEncountered: readonly string[];
  otherOpponentOwnerIdsEncountered: readonly string[];
}>;
```

These fields describe context only. They do not change meetings, points, or
results.

## 12. Preventing aggregate inflation

Use the following hard boundaries:

1. Career totals read owner projections directly.
2. Season totals read owner projections directly by owner and season.
3. Opponent totals read owner projections directly by owner and opponent.
4. Career totals never sum opponent summary rows.
5. League totals never read any owner summary.
6. League totals always read canonical matchup keys from Canonical Matchup
   History.
7. Projection-derived unique canonical-key counts are reconciliation metrics
   only, not an independent league game total.
8. Every directional opponent bucket de-duplicates by canonical key.
9. Every owner career/season bucket de-duplicates by owner matchup key.
10. Coverage reports any key consumed zero times or more than once at the
    expected grain.

## 13. Co-owner counting behavior

### Personal career and season credit

Each legitimate co-owner projection counts as:

- one game played for that owner;
- one win, loss, or tie;
- the full franchise-side points for and against; and
- one result in every applicable classification split.

Do not divide points, wins, or games by the number of co-owners. The projection
is a personal attribution of the shared franchise result, not fractional
ownership accounting.

### Prestigio

- Ray and Jeffrey each receive one personal credit per supported shared game.
- Their career and season records can contain the same canonical keys.
- They never appear in each other’s opponent summary while sharing Prestigio.
- A league-wide count still reads each canonical key once.

### Shake-N-Bakers

- Jordan alone receives pre-2025 Shake-N-Bakers credits.
- Landon retains Special Brownies credits through 2024.
- Jordan and Landon remain opponents in supported pre-2025 meetings between
  their independent franchises.
- Jordan and Landon each receive Shake-N-Bakers credits beginning in 2025.
- They are teammates, not opponents, in shared seasons.
- Joining in 2025 does not rewrite Landon’s earlier franchise history.

### Helpers

- Aaron receives no Doug statistics in 2023.
- Billy’s temporary helper receives no 2024 statistics.
- Helper or attachment IDs cannot create career, season, opponent, coverage
  owner, or co-owner context records.

## 14. Seasons without matchup source

The repository has approved participation/placement history beginning in 2011,
but supported matchup source begins in 2018.

For 2011–2017:

- create season summaries for resolved approved owner-seasons;
- set all matchup record splits to empty;
- set winning percentages to `null`;
- set `sourceAvailability` to `unavailable-no-source`;
- include the seasons in `approvedParticipationSeasons`;
- include them in `seasonsWithoutMatchupSource`;
- do not call the empty record an 0-0 historical performance;
- do not reconstruct games from placement, record strings, or current UI data;
  and
- do not let these seasons reduce a matchup winning percentage.

The career summary’s `firstMatchupSeason` is the first season with an actual
projection, not the owner’s first league season.

For 2026 pre-draft byes/incomplete placeholders:

- source acquisition exists;
- no completed projection exists;
- `sourceAvailability` is `available-no-completed-games`;
- no statistics are emitted; and
- the season is distinct from the no-source 2011–2017 period.

## 15. Source coverage states

Recommended vocabulary:

```ts
type OwnerMatchupSourceAvailability =
  | "available"
  | "available-no-completed-games"
  | "unavailable-no-source"
  | "not-applicable";
```

Do not use `"available"` merely because an owner has tenure. It requires
successful upstream source/projection coverage for that season.

The absence of projections is valid only when upstream coverage proves why.

## 16. Matchup references and lineage

Recommended reference:

```ts
type OwnerMatchupReference = Readonly<{
  ownerMatchupKey: string;
  canonicalMatchupKey: string;
  season: number;
  week: number;
  matchupType: CanonicalMatchupType;
  isChampionshipGame: boolean;
  result: OwnerMatchupResult;
  pointsFor: number;
  pointsAgainst: number;
  margin: number;
}>;
```

Recommended lineage:

```ts
type OwnerMatchupSummaryLineage = Readonly<{
  ownerMatchupKeys: readonly string[];
  canonicalMatchupKeys: readonly string[];
  ownerSeasonKeys: readonly string[];
  correctionVersions: readonly number[];
  sourceVersions: readonly string[];
  source: "owner-matchup-projection";
}>;
```

Arrays are unique and stably sorted. Lineage permits exact reconciliation and
does not transfer source-of-truth ownership to the summary.

## 17. Streaks

Streaks are outside Phase 3C.

> Deferred to future analytics layer.

The summary engine must not calculate current, longest, winning, losing,
unbeaten, season-bounded, career-continuous, postseason, or opponent streaks.
It must not define tie behavior for streak calculations.

Record types may reserve:

```ts
streaks: null;
```

This placeholder must remain `null` and must not trigger hidden calculation.
Future streak requirements, scopes, season-boundary behavior, and tie rules
require a separate approved analytics phase.

## 18. Public API

Implemented module:

```text
lib/history/ownerMatchupSummary.ts
```

Build API:

```ts
buildOwnerMatchupSummaries(input)
```

Career accessors:

```ts
getAllOwnerCareerMatchupSummaries()
getOwnerCareerMatchupSummary(ownerIdOrSlug)
```

Season accessors:

```ts
getOwnerSeasonMatchupSummary(ownerIdOrSlug, season)
getOwnerSeasonMatchupSummaries(ownerIdOrSlug)
```

Opponent accessors:

```ts
getOwnerOpponentMatchupSummary(ownerIdOrSlug, opponentOwnerIdOrSlug)
getOwnerOpponentMatchupSummaries(ownerIdOrSlug)
```

Coverage accessor:

```ts
getOwnerMatchupSummaryCoverage()
```

API boundaries:

- `ownerMatchupProjection.ts` continues to expose raw owner-game facts;
- `ownerMatchupSummary.ts` exposes factual aggregates only;
- Phase 2 `ownerCareerSummary.ts` remains unchanged until a later approved
  adapter/integration task;
- a future Rivalry module may consume opponent summaries but cannot overwrite
  them or become their source; and
- UI consumers must not fetch Sleeper to recalculate these facts after a future
  migration.

Accessors throw before a successful build. A failed build leaves the previous
valid cache unchanged.

## 19. Determinism and immutability

The builder must:

1. accept explicit input only;
2. perform no acquisition or hidden projection build;
3. detect and report duplicate `ownerMatchupKey` values, then exclude duplicate
   rows from aggregation;
4. sort projections by stable key before every grouping and calculation;
5. normalize owner lookup only through canonical ID/slug inputs;
6. sort all output records by summary key;
7. sort and de-duplicate nested ID/key arrays;
8. use deterministic tie-breakers for first/latest/extreme references;
9. create cache state only after a complete successful build;
10. deeply freeze stored records or return deeply frozen consumer-safe clones;
11. never mutate projection, owner-season, profile, or coverage input; and
12. produce byte-for-byte equivalent output for equivalent input.

A projection correction may update points or result while retaining stable
summary keys. An approved ownership correction may add or remove personal
summary lineage but must not alter canonical contest identity.

## 20. Coverage design

Recommended aggregate coverage:

```ts
type OwnerMatchupSummaryCoverage = Readonly<{
  sourceProjectionRecords: number;
  uniqueSourceProjectionKeys: number;
  duplicateSourceProjectionKeys: readonly string[];
  careerSummariesCreated: number;
  seasonSummariesCreated: number;
  opponentSummariesCreated: number;
  careerProjectionConsumptions: number;
  seasonProjectionConsumptions: number;
  expectedOpponentRelationshipConsumptions: number;
  actualOpponentRelationshipConsumptions: number;
  projectionKeysMissingFromCareerSummaries: readonly string[];
  projectionKeysRepeatedInCareerSummaries: readonly string[];
  projectionKeysMissingFromSeasonSummaries: readonly string[];
  projectionKeysRepeatedInSeasonSummaries: readonly string[];
  careerSeasonReconciliationFailures: readonly string[];
  careerProjectionReconciliationFailures: readonly string[];
  classificationReconciliationFailures: readonly string[];
  titleGameSubsetViolations: readonly string[];
  opponentPairDuplicateCanonicalKeys: readonly string[];
  teammateOpponentSummaryViolations: readonly string[];
  unknownOwnerSummaryIds: readonly string[];
  helperAccountSummaryViolations: readonly string[];
  noSourceOwnerSeasons: number;
  sourceAvailableNoGameOwnerSeasons: number;
  byOwner: readonly OwnerMatchupSummaryOwnerCoverage[];
  bySeason: readonly OwnerMatchupSummarySeasonCoverage[];
  byClassification: Readonly<Record<CanonicalMatchupType, number>>;
}>;
```

### Required reconciliation proofs

#### Career consumption

Every unique source projection is consumed exactly once by the matching owner
career summary:

```text
unique projection keys
  = disjoint union of career-summary projection keys
```

#### Season consumption

Every unique source projection is consumed exactly once by the matching owner
and season summary:

```text
unique projection keys
  = disjoint union of season-summary projection keys
```

#### Career-to-season

For every owner and every split:

- games, wins, losses, and ties match;
- raw points for and against match;
- projection-key unions match; and
- percentage is recalculated from reconciled counts, not summed.

#### Classification

Every projection enters exactly one primary classification split. Title games
also enter the championship-game subset. Overall includes a projection if and
only if its upstream `overallCompetitive` eligibility is true.

#### Opponent relationships

Expected directional relationship consumptions equal:

```text
sum of projection.opponentOwners.length
```

Each `(ownerId, opponentOwnerId)` bucket contains every canonical key at most
once. This relationship consumption count is intentionally not required to
equal career projection count.

#### Physical contests

Coverage may report unique canonical keys observed through projections only as
an upstream reconciliation value. It must label that value
`projectionCanonicalKeysObserved`, not `leaguePhysicalContests`.

League physical-contest totals always come from Canonical Matchup History.

#### No-source history

Coverage reports resolved owner-seasons before 2018 as
`unavailable-no-source`, not as missing projections, zero-game proof, or build
failure.

## 21. Validation matrix

`scripts/owner-matchup-summary.test.ts` verifies:

1. Equivalent input produces byte-for-byte deterministic summaries.
2. Career, season, and opponent summary keys remain stable.
3. Returned records and all nested arrays/objects are immutable.
4. Projection, owner-season, profile, and coverage inputs remain unchanged.
5. Accessors throw before successful initialization.
6. A failed build does not replace a previously valid cache.
7. Every unique projection enters exactly one career summary.
8. Every unique projection enters exactly one season summary.
9. Duplicate source projection keys are reported and not double-counted.
10. Career totals reconcile to season totals by owner and split.
11. Career totals reconcile directly to projection totals by owner.
12. Games always equal wins + losses + ties.
13. Regular and championship-playoff enter overall.
14. Third-place, placement, consolation, and Toilet Bowl do not enter overall.
15. Each specialized classification remains independently queryable.
16. Championship games are a subset of championship-playoff.
17. A non-title winners-bracket game never enters championship-game totals.
18. Ties count once and use `(wins + 0.5 × ties) / games`.
19. Zero-game winning percentage is `null`.
20. Raw points reconcile exactly to projection points without display rounding.
21. Point differential reconciles to points for minus points against.
22. Ray and Jeffrey each receive supported shared Prestigio credit.
23. Ray and Jeffrey never receive opponent summaries against one another while
    co-owning Prestigio.
24. A solo owner facing Prestigio receives one career game.
25. That solo owner receives one directional meeting against Ray and one
    directional meeting against Jeffrey.
26. Each directional opponent pair contains a canonical key at most once.
27. Jordan alone receives pre-2025 Shake-N-Bakers summaries.
28. Jordan and Landon both receive 2025 Shake-N-Bakers summaries.
29. Jordan and Landon are not opponents from their shared 2025 side.
30. Landon retains pre-2025 Special Brownies summaries.
31. Aaron receives no Doug-derived career, season, opponent, or context record.
32. Billy’s helper receives no summary or context record.
33. Multi-week playoff contests summarize once per credited owner.
34. First/latest/extreme tie-breakers are deterministic.
35. 2011–2017 owner-seasons are labeled `unavailable-no-source`.
36. No-source seasons do not change career records or percentages.
37. 2026 bye/incomplete placeholders add no statistics.
38. Source-available empty seasons differ from no-source seasons.
39. Opponent relationship consumptions reconcile to structured opponent-owner
    collections.
40. Career totals never derive from opponent-summary row counts.
41. Unique canonical keys observed through projections are not labeled league
    physical-contest totals.
42. Any reserved streak field remains `null`.
43. No summary build performs a streak calculation.

## 22. Relationship to Phase 2 Owner Career Summary

`lib/history/ownerCareerSummary.ts` currently owns placement-based career facts
and intentionally null future-enrichment fields.

Phase 3C should not mutate that engine or write matchup values into its cache.
Recommended later integration:

```text
OwnerCareerSummary
  + OwnerCareerMatchupSummary
  -> approved owner-profile view model adapter
```

This preserves independent source lineage:

- placement facts remain sourced from Owner Season History/manual history;
- matchup facts remain sourced from Owner Matchup Projection; and
- UI formatting remains outside both engines.

Any future adapter must report disagreement with manually displayed records
rather than silently overwrite them.

## 23. Relationship to Rivalries

Phase 3C supplies objective directional opponent facts. A later Rivalry engine
may consume them to calculate or interpret:

- rivalry selection;
- rivalry intensity;
- recency or playoff weighting;
- favorite-victim, nemesis, or painful-loss labels;
- narratives and badges; and
- presentation-specific comparisons.

The Rivalry engine must not:

- fetch Sleeper to rebuild head-to-head history;
- use helper or platform attachment metadata as ownership;
- change summary records;
- add excluded classifications to the approved default scope;
- sum opponent relationships as league physical contests; or
- treat a label as a factual source.

Closest matchup and largest win/loss are factual Phase 3C outputs. Calling one
“most painful,” applying a rivalry score, or selecting a primary rival remains
interpretation.

No Rivalry implementation or UI migration is part of Phase 3C implementation.

## 24. Answers to the discovery questions

1. **Record meaning:** use three separate record types: career, owner-season,
   and directional owner-opponent.
2. **Summary versus Rivalry:** deterministic records, points, meetings,
   classification splits, first/latest, and factual extremes belong here;
   weights, labels, selection, narratives, and badges belong later.
3. **Opponent storage:** separate directional records with career references,
   not nested complete records.
4. **Co-owned owner credit:** each approved co-owner receives one full personal
   game/result/points credit.
5. **Facing co-owners:** one career game for the solo owner and one directional
   relationship meeting against each legitimate opposing co-owner.
6. **Inflation prevention:** career and season totals consume projections
   directly; pair records de-duplicate canonical keys; league totals remain
   canonical-only.
7. **Points:** use raw projection decimals without presentation rounding.
8. **Winning percentage:** `(wins + 0.5 × ties) / games`; `null` for zero
   games.
9. **2011–2017:** represent approved participation with
   `unavailable-no-source`, never inferred 0-0 history.
10. **Season coverage fields:** expose first/latest matchup season, seasons with
    projections, no-source seasons, and source-available no-game seasons.
11. **Streak layer:** excluded from Phase 3C. Deferred to future analytics
    layer.
12. **Streak boundary:** not defined in Phase 3C.
13. **Tie streaks:** not defined in Phase 3C.
14. **Postseason streaks:** not calculated in Phase 3C.
15. **Title games:** store a separate subset record within championship
    playoffs.
16. **Opponent facts:** meetings, records, points, dates/seasons,
    playoff/title counts, closest, and largest margins belong here; streaks are
    deferred and rivalry interpretation does not.
17. **Determinism/immutability:** explicit input, stable ordering, atomic cache
    replacement, deep freezing/cloning, stable keys, and no input mutation.
18. **Coverage:** exact career/season projection consumption, classification
    reconciliation, pair de-duplication, co-owner/helper checks, upstream
    coverage, and no-source season reporting.

## 25. Approved commissioner decisions

Phase 3C approval established:

1. the three separate summary record types;
2. one career summary per canonical owner profile, including empty
   `not-applicable` staff summaries;
3. one season summary per resolved owner-season, including explicit 2011–2017
   no-source rows;
4. `null` winning percentage for zero-game scopes;
5. raw unrounded projection-point accumulation;
6. factual closest/largest meeting references in opponent summaries;
7. keeping Phase 2 career summaries unchanged until a later adapter task; and
8. keeping streak analytics, rivalry interpretation, and UI work deferred.

## 26. Implementation status

The immutable summary engine, explicit-input builder, common record
calculation, career/season/opponent summaries, coverage reconciliation,
consumer-safe accessors, and focused offline fixture suite are implemented.
Phase 2 integration, Rivalries, streak analytics, and Managers UI changes
remain deferred.
