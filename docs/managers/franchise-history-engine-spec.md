# River City Franchise History Engine — Phase 5.1 Discovery

## 1. Purpose and scope

The Franchise History Engine will describe the history of one canonical River
City franchise independently from the personal career of any owner. It will be
the factual history layer for Manager Profile Team Legacy, future franchise
pages, League History, Trophy Room, Records, Rivalries, and selected Homepage
features.

This discovery does not implement the engine or change existing presentation.
It preserves these approved boundaries:

- one physical franchise-season result is not multiplied by co-owner credit;
- one physical canonical matchup is not multiplied by owner projections;
- final season results and matchup history remain separate source domains;
- platform placement and league-recognized historical championships remain
  separate facts;
- raw historical team names do not create canonical franchises;
- owner history and franchise history remain separate views; and
- payout and earnings data remain outside this engine while reconciliation is
  deferred.

## 2. Current data inventory

| Existing file | Franchise-history role | Coverage / limitation |
|---|---|---|
| `lib/managers/identityTypes.ts` | Canonical identity, tenure, role, status, and legacy summary contracts | Current-state identity; no franchise-season or name-era type |
| `lib/managers/identityData.ts` | Canonical owners/franchises, individual tenures, co-owner rules, current roster IDs | 27 franchises and 30 owner tenures; curated franchise stats are legacy duplicates |
| `lib/managers/activeManagers.ts` | Current active-manager/team source used to construct identity | Presentation-oriented manager records, not historical franchise results |
| `lib/managers/retiredManagers.ts` | Retired-owner/team source used to construct identity | Presentation-oriented manager records, not a franchise timeline |
| `lib/managers/staff.ts` | Noncompetitive staff identities | Staff creates no franchise history without approved ownership tenure |
| `lib/history/historicalSeasonResults.ts` | One physical final result per participating franchise-season | 2011–2025; no matchup detail |
| `lib/history/ownerSeasonHistory.ts` | Approved season-specific owner, role, franchise, and co-owner projection | 2011–2026; co-owner rows must be folded back to one physical franchise season |
| `lib/history/ownerCareerSummary.ts` | Personal career and owner-oriented franchise groups | Reconciliation only; shared owner credits cannot be summed as physical facts |
| `lib/history/canonicalMatchupHistory.ts` | One physical/logical franchise contest and classification | 2018–2026 source slots; no owner attribution |
| `lib/history/franchiseRosterMappings.ts` | Reviewed Sleeper roster-to-franchise identity | 2018–2025, 12 mappings per season |
| `lib/history/ownerMatchupProjection.ts` | Personal owner-side credits from canonical contests | Reconciliation only for franchise totals |
| `lib/history/ownerMatchupSummary.ts` | Personal career, season, and opponent aggregates | Reconciliation only for franchise totals |
| `lib/managers/identitySelectors.ts` | Current Manager Profile tenure and legacy presentation model | One presentation row per tenure; attaches curated duplicate stats |
| `lib/managers/ownerCareerTimeline.ts` | Approved owner milestone presentation model | Owner story only; not a franchise event source |
| `app/managers/owners/[slug]/page.tsx` | Server composition for Manager Profiles | Future Team Legacy consumer, not a calculation source |
| `components/managers/OwnerProfile.tsx` | Current Team Legacy rendering | Tenure-centric and partly hard-coded |

### 2.1 Canonical identity and tenure

`lib/managers/identityData.ts` and `lib/managers/identityTypes.ts` currently
provide:

- 27 canonical `Franchise` records: 12 active and 15 retired;
- immutable-looking IDs and slugs derived from the approved canonical team
  identity;
- the current canonical display name and status;
- current Sleeper roster IDs where available;
- current active, primary, and co-owner IDs;
- legacy-owner IDs;
- 30 individual `OwnershipTenure` records;
- owner profiles and current/legacy franchise associations; and
- curated `FranchiseStatSummary` records used by Team Legacy.

The current `FranchiseStatus` vocabulary is only `active | retired`. There is
no canonical dormant status, predecessor/successor relation, historical-name
collection, or franchise-season collection in the identity model.

`OwnershipTenure` represents one person's relationship to a franchise. It is
not one consolidated ownership era for the franchise. The approved
season-specific result layer can resolve some seasons that fall outside the
literal generated tenure dates. Examples include the approved 2012 Special
Brownies, I'm Your Huckleberry, and Team Darren mappings. A franchise engine
must therefore consume the resolved `OwnerSeasonHistoryRecord` view and use
the individual tenure rows as lineage and validation; it must not discard an
approved season result merely because a generated tenure boundary is narrower.

Current public identity functions relevant to the engine are:

- `getOwnerProfileById()`;
- `getFranchiseById()`;
- `getOwnershipTenuresForOwner()`; and
- `getFranchiseStatSummary()`.

There is no franchise-oriented ownership-tenure accessor today. The future
builder can receive the complete approved tenure collection or a new factual
selector can expose tenures by franchise without adding rules.

### 2.2 Historical season results

`lib/history/historicalSeasonResults.ts` is the authoritative physical
placement source. It supplies:

- 178 physical season results for 2011–2025;
- 10 placements in 2011 and 12 in every season from 2012–2025;
- 192 owner credits after approved co-owner projection;
- 27 resolved canonical franchise IDs represented across the history;
- one unresolved franchise result, JD Dowling's fifth-place 2011 result;
- 43 results without a source-backed historical team name;
- exact raw owner/team labels where available;
- platform and historical championship flags;
- result, workbook sheet, cell, and checksum lineage; and
- season-result and matchup-source coverage.

Its public API is:

- `getAllHistoricalSeasonResults()`;
- `getHistoricalSeasonResultsForSeason()`;
- `getHistoricalSeasonResult()`;
- `getHistoricalSeasonResultsForOwner()`; and
- `getHistoricalSeasonResultsCoverage()`.

The XLSX workbook remains archived evidence and must never be parsed by this
engine during production.

### 2.3 Owner season and career views

`lib/history/ownerSeasonHistory.ts` projects each physical season result to
approved owners. It provides season-specific franchise identity, role,
primary/co-owner flags, co-owner identities, raw historical team name,
placement and championship flags, coverage, and source lineage. It also emits
current 2026 owner-season rows without fabricating final placements.

Its relevant API is:

- `getAllOwnerSeasonHistory()`;
- `getOwnerSeasonHistory()`;
- `getOwnerSeasonHistoryForSeason()`;
- `getUnresolvedOwnerSeasonHistory()`; and
- `getOwnerSeasonHistoryCoverageSummary()`.

`lib/history/ownerCareerSummary.ts` aggregates those rows for a person's
career and exposes owner-oriented franchise groups. It is useful for
reconciliation, but its counts cannot be summed into franchise totals because
shared seasons intentionally appear once for each approved co-owner.

### 2.4 Physical matchup facts

`lib/history/canonicalMatchupHistory.ts` owns one record per physical/logical
contest. It contains no owner IDs. Multi-week playoff scoring periods are
already aggregated into one canonical matchup. Its approved fixture coverage
contains 780 canonical source slots and 766 completed physical contests for
2018–2026; the other 14 are incomplete/bye 2026 slots and produce no result.

Relevant public functions are:

- `buildCanonicalMatchups()`;
- `getAllCanonicalMatchups()`;
- `getCanonicalMatchupsForSeason()`;
- `getCanonicalMatchup()`; and
- `getCanonicalCoverage()`.

Acquisition remains separate in
`lib/history/canonicalMatchupAcquisition.ts`. The deterministic canonical
builder accepts supplied input; acquisition failures throw and cannot become
an apparently valid empty season.

`lib/history/franchiseRosterMappings.ts` supplies 96 commissioner-approved
roster-to-franchise mappings, 12 per season for 2018–2025, with no duplicate
or unknown mappings. Its relevant API is:

- `getFranchiseMapping()`;
- `getAllFranchiseRosterMappings()`;
- `getFranchiseMappingCoverage()`; and
- `applyFranchiseRosterMappings()`.

The 2026 canonical source currently has no reviewed mapping set. Because its
remaining slots are incomplete, this does not create a completed franchise
record, but coverage must continue to report the distinction rather than
assuming roster-slot continuity.

### 2.5 Owner matchup views

`lib/history/ownerMatchupProjection.ts` and
`lib/history/ownerMatchupSummary.ts` project physical contests to personal
owner credit. They are authoritative for owner careers, seasons, and
directional opponent facts. They are not a valid source for franchise matchup
counts because a co-owned side creates more than one owner projection.

The Franchise History Engine may reconcile canonical matchup keys against
these engines, but franchise record arithmetic must begin with unique
`CanonicalFranchiseMatchup.matchupKey` values.

### 2.6 Current Team Legacy behavior

`components/managers/OwnerProfile.tsx` builds Team Legacy by concatenating
`profile.currentTenures` and `profile.legacyTenures`, then rendering one
`LegacyRow` per tenure. `lib/managers/identitySelectors.ts` attaches the same
curated franchise stat summary to qualifying tenures.

The current display therefore has two structural problems that the future
engine should replace:

1. the display unit is an individual ownership tenure rather than a canonical
   franchise, so separate tenures can produce repeated franchise cards; and
2. titles, podiums, best finish, and Toilet Bowl values come from manually
   curated manager data through `franchiseStatSummaries`, even when approved
   season facts now exist elsewhere.

The following are presentation helpers, not future history sources:

- `getStatLabel()`;
- `getSharedStatCopy()`;
- `getTenureFallbackCopy()`;
- `LegacyRow`; and
- the older `OwnerProfileViewModel.timeline` composition.

`lib/managers/ownerCareerTimeline.ts` is an owner milestone view. It must not
be repurposed as a franchise timeline or used to infer franchise facts.

## 3. Recommended immutable record architecture

All six proposed record families are useful because they answer different
queries and have different cardinality. They should remain separate immutable
types, with a convenience `FranchiseHistory` aggregate that references them.
The aggregate is not a seventh source of calculations.

### A. `FranchiseCareerSummary`

One record per canonical franchise. Recommended fields:

```ts
type FranchiseCareerSummary = Readonly<{
  summaryKey: string;
  summaryType: "career";
  franchiseId: string;
  franchiseSlug: string;
  currentDisplayName: string;
  status: "active" | "dormant" | "retired";
  seasonsActive: readonly number[];
  firstSeason: number | null;
  latestSeason: number | null;
  currentOwnerIds: readonly string[];
  formerOwnerIds: readonly string[];
  resultSummary: FranchisePlacementSummary;
  matchupSummary: FranchiseMatchupRecordSplits;
  firstMatchupSeason: number | null;
  latestMatchupSeason: number | null;
  seasonSummaryKeys: readonly string[];
  ownershipEraKeys: readonly string[];
  nameEraKeys: readonly string[];
  timelineEventKeys: readonly string[];
  lineage: FranchiseHistoryLineage;
  coverage: FranchiseCareerCoverage;
}>;
```

`seasonsActive` counts unique franchise-season evidence, never owner credits
or every year inside a broad tenure range. `averageFinish` uses only seasons
with a final placement and is the arithmetic mean of the actual finishing
positions. The raw value should be retained; presentation rounding belongs to
consumers. The 10-team 2011 finish is not normalized into a synthetic 12-team
rank.

Placement totals should include platform championships, historical
championships, runner-up finishes, third-place finishes, podiums, last-place
finishes, best finish, worst finish, and average finish. Platform and
historical title counts must remain distinct.

### B. `FranchiseSeasonSummary`

One canonical franchise-season state. Participating rows represent one
physical franchise result; explicitly approved inactive gaps and current
no-result seasons may exist as coverage-only states. This is the core record
from which the career summary and factual timeline derive.

```ts
type FranchiseSeasonSummary = Readonly<{
  franchiseSeasonKey: string;
  franchiseId: string;
  season: number;
  status: "active" | "dormant" | "retired";
  ownerIds: readonly string[];
  primaryOwnerIds: readonly string[];
  coOwnerIds: readonly string[];
  ownershipRoles: readonly FranchiseSeasonOwnerRole[];
  historicalName: string | null;
  seasonResultKey: string | null;
  finalPlacement: number | null;
  teamCount: 10 | 12 | null;
  isPlatformChampion: boolean;
  isPlatformRunnerUp: boolean;
  isHistoricalChampion: boolean;
  historicalChampionshipType: "sole" | "co-champion" | null;
  isThirdPlace: boolean;
  isPodium: boolean;
  isLastPlace: boolean;
  championshipNote: string | null;
  matchupRecords: FranchiseMatchupRecordSplits;
  canonicalMatchupKeys: readonly string[];
  source: FranchiseSeasonSource;
  coverage: FranchiseSeasonCoverage;
}>;
```

Only a source-backed season result may populate placement fields. A current
season without a final result may still have a season summary, but its result
coverage is `not-yet-available` and all placement fields remain null/false.
Pre-Sleeper seasons retain season results while matchup coverage is
`unavailable-no-source`.

An explicitly inactive season such as Prestigio in 2012 may be represented as
a coverage/timeline fact, but it must not count as a result season or active
season. Generic absent seasons should not be manufactured merely to fill a
range.

### C. `FranchiseOwnershipEra`

One contiguous run of seasons with the same approved owner set and
season-specific roles.

```ts
type FranchiseOwnershipEra = Readonly<{
  franchiseEraKey: string;
  franchiseId: string;
  startSeason: number;
  endSeason: number | null;
  ownerIds: readonly string[];
  primaryOwnerIds: readonly string[];
  coOwnerIds: readonly string[];
  ownershipType: "solo" | "co-owned";
  isCurrent: boolean;
  ownerTenureIds: readonly string[];
  franchiseSeasonKeys: readonly string[];
  source: "owner-season-history-and-identity-tenure";
  notes: readonly string[];
}>;
```

The builder should create a season-level owner snapshot from resolved Owner
Season History, deduplicate co-owner projections by owner ID, validate it
against the physical result's `ownerIds`, and group only consecutive seasons
with an identical sorted owner/role signature. A participation gap breaks an
era. Individual tenure rows remain lineage; they are not copied one-for-one
into franchise eras.

The current `legacy-owner` role describes how a retired person's tenure is
presented. For historical primary/co-owner classification, the engine should
also preserve `isPrimaryOwner` and `isCoOwner` from Owner Season History so a
retired solo owner is not mistaken for a co-owner.

### D. `FranchiseNameEra`

One contiguous run of source-backed seasons using the same observed
historical team label.

```ts
type FranchiseNameEra = Readonly<{
  franchiseNameEraKey: string;
  franchiseId: string;
  historicalName: string;
  startSeason: number;
  endSeason: number;
  franchiseSeasonKeys: readonly string[];
  sourceResultKeys: readonly string[];
  timelineVisibility: "primary" | "complete-history-only";
  source: "historical-season-results";
  confidence: "source-observed-commissioner-mapped";
  notes: readonly string[];
}>;
```

Grouping may normalize whitespace and case for comparison, but must preserve
the exact source label for display. It must not silently correct spelling,
punctuation, or semantic name changes. A typo such as `Specail Brownies` and a
one-season temporary name remain source-observed name eras within the same
canonical franchise. A missing source name breaks an era rather than filling
it from the current canonical display name.

### E. `FranchiseTimelineEvent`

Factual events derived from season, ownership-era, name-era, and explicit
identity relationships:

```ts
type FranchiseTimelineEventType =
  | "founded"
  | "rebranded"
  | "ownership-change"
  | "co-owner-joined"
  | "co-owner-left"
  | "inactive"
  | "returned"
  | "platform-champion"
  | "historical-co-champion"
  | "runner-up"
  | "third-place"
  | "podium"
  | "last-place"
  | "retired"
  | "successor-established";
```

The complete season table carries every annual placement. The timeline should
not emit a generic event for every annual finish. Achievement events,
ownership/name changes, inactive/return boundaries, founding, retirement, and
explicit successor rulings are appropriate milestones. Consumers may filter
event types without recalculating facts.

### F. `FranchiseHistoryCoverage`

Coverage is a first-class build output, not UI prose. It should include:

- canonical franchises requested and summarized;
- physical season results read and consumed;
- franchise-season summaries created;
- duplicate franchise-season and source-result keys;
- results with unresolved franchise identity;
- mapped and unresolved owner sets;
- missing historical names;
- ownership-era gaps or overlapping configurations;
- seasons with placement data but no matchup source;
- source-enabled seasons with zero completed matchups;
- completed canonical matchups read and consumed;
- duplicate canonical matchup consumptions;
- canonical sides without approved franchise IDs;
- current seasons without final results; and
- lineage/correction versions represented.

Coverage must preserve the difference between missing season results and
missing matchup sources. Neither condition may manufacture zero records or
zero placements.

### Convenience aggregate

```ts
type FranchiseHistory = Readonly<{
  franchiseId: string;
  career: FranchiseCareerSummary;
  seasons: readonly FranchiseSeasonSummary[];
  ownershipEras: readonly FranchiseOwnershipEra[];
  nameEras: readonly FranchiseNameEra[];
  timeline: readonly FranchiseTimelineEvent[];
}>;
```

This shape makes one franchise page query inexpensive while retaining direct
accessors for narrower consumers. Summary records should contain keys and
small factual aggregates, not duplicate full child records.

## 4. Rebrand and continuity rules

1. **Canonical ID controls continuity.** Source rows already mapped to the
   same `franchiseId` remain the same franchise even when the raw team name
   changes.
2. **Raw names never create identity.** Historical labels are evidence for a
   name era only.
3. **A true replacement needs an approved identity ruling.** A new Sleeper
   owner, roster ID, or team name is insufficient by itself.
4. **Roster-slot reuse is not succession.** The 2018–2025 roster mapping is
   season-specific and must not be extended to another season by numeric slot.
5. **Returning owner is not enough.** A returning owner uses an old franchise
   only when canonical identity/tenure data says the franchise continued.
6. **Ownership transfer does not decide continuity.** An explicit canonical
   franchise ruling is required when the entire owner set changes.
7. **A co-owner joining is an ownership-era boundary, not a replacement.**
8. **Temporary helpers are ignored.** Sleeper attached users never create a
   franchise, era, owner credit, or succession link.

## 5. Ownership-era behavior

- A franchise season has one owner configuration even when it grants multiple
  personal owner credits.
- Sorted owner IDs and role assignments make era construction deterministic.
- An owner-set or role change starts a new era.
- An approved inactive gap ends the prior era; a later return starts another.
- Retirement of the current franchise ends an era but does not erase its
  history.
- A person's move to another franchise does not move the old franchise's
  accomplishments with that person.

This produces the required outcomes:

- Prestigio: Ray solo in 2011, inactive in 2012, Ray/Jeffrey co-owned from
  2013 onward;
- Shake-N-Bakers: Jordan primary through 2024, then Jordan primary with Landon
  as co-owner beginning in 2025; and
- Special Brownies: Landon's separate solo franchise history through 2024,
  becoming dormant independently when he joins Shake-N-Bakers.

## 6. Historical-name behavior

The current canonical display name belongs on the career summary. The exact
source-backed label belongs on the franchise-season and name-era records.
Neither should overwrite the other.

- `I'm Your Huckleberry` remains a historical name of
  `kissed-by-a-freckle`.
- `Team Darren` remains a historical name of `team-kusaj`.
- `Specail Brownies` remains preserved as source evidence but does not create
  another franchise.
- Temporary fantasy team names are legitimate one-season name facts, not
  proof of a replacement franchise.
- Seasons without a raw name remain `not-available`; the canonical current
  name is not backfilled as historical evidence.

## 7. Dormant, retired, return, and successor rules

The approved Franchise History status vocabulary is:

- `active`: currently competing;
- `dormant`: not currently competing, while continuity remains available for
  a future return; and
- `retired`: explicitly concluded with no expected continuation.

Season-level `inactive` and `return` events are emitted when participation
evidence and canonical continuity establish a real gap, as with Prestigio in
2012. Absence from one season does not automatically change a franchise's
current career status.

Special Brownies is commissioner-classified as dormant beginning after 2024.
This Franchise History classification overrides the generic retired-manager
identity fallback without changing Landon's ownership tenure or merging the
franchise into Shake-N-Bakers.

No predecessor/successor links are currently approved. The future model may
accept explicit relations such as:

```ts
type FranchiseSuccession = Readonly<{
  relationshipKey: string;
  predecessorFranchiseId: string;
  successorFranchiseId: string;
  effectiveSeason: number;
  source: "commissioner-approved";
  notes: readonly string[];
}>;
```

The engine must never generate this relationship from roster reuse, owner
replacement, or a matching display name.

## 8. Franchise result rules

Each `HistoricalSeasonResult` is consumed at most once by its resolved
franchise. Owner IDs describe attribution but do not multiply the result.

- `seasonsActive`: unique seasons with approved participation evidence;
- championships: maintain separate platform and historical counts;
- runner-up/third/podium/last: consume source flags once;
- best/worst: minimum and maximum known final placement;
- average: sum of known final placements divided by their count; and
- unknown/current results: excluded rather than treated as zero.

The 2022 ruling yields one historical championship for Tommy's franchise and
one for Dave's franchise while preserving Tommy first and Dave second. It
does not merge their franchises, rewrite platform standings, or create an
extra podium.

## 9. Franchise matchup-counting rules

Franchise matchup summaries must aggregate `CanonicalFranchiseMatchup`
directly and never sum `OwnerMatchupProjection` or `OwnerMatchupSummary` rows.

For one franchise:

1. select completed canonical contests where the canonical franchise appears
   on exactly one side;
2. deduplicate by `matchupKey` before aggregation;
3. determine win/loss/tie and points from that franchise's physical side;
4. preserve raw points without presentation rounding;
5. aggregate a multi-week playoff matchup once because Canonical Matchup
   History already combines its scoring periods; and
6. emit no statistics from byes or incomplete slots.

Use the already-approved factual scopes:

- overall: `regular` plus `championship-playoff`;
- regular season: `regular`;
- championship playoff: every completed winners-bracket contest;
- championship game: the `isChampionshipGame` subset only;
- third-place, placement, consolation, and Toilet Bowl: distinct record
  splits, excluded from overall; and
- bye/incomplete: coverage only.

Across the league, canonical matchup keys remain the physical-contest count.
Across franchise summaries, the same contest normally appears once for each
of its two participating franchises, which is side attribution rather than a
second physical contest. Ray and Jeffrey do not create two Prestigio matchup
records. Jordan and Landon do not create two Shake-N-Bakers records.

## 10. Stable key design

No key depends on a display name, raw historical name, owner label, or Sleeper
roster number.

| Record | Deterministic key |
|---|---|
| Career summary | `franchise-career:{franchiseId}` |
| Season summary | `franchise-season:{season}:{franchiseId}` |
| Ownership era | `franchise-ownership-era:{franchiseId}:{startSeason}` |
| Name era | `franchise-name-era:{franchiseId}:{startSeason}` |
| Timeline event | `franchise-event:{franchiseId}:{season}:{eventType}:{sourceKey}` |
| Unresolved result | `unresolved-franchise-history:{historicalSeasonResultKey}` |
| Explicit succession | `franchise-succession:{predecessorId}:{successorId}:{effectiveSeason}` |

There may be at most one ownership configuration and one observed result name
per franchise-season under the approved source model, making start season a
stable era discriminator. Corrections should carry a separate correction or
lineage version; they must not mutate keys merely because display copy changes.

JD's 2011 result remains an unresolved-history record keyed from its physical
season-result key. It must not receive a guessed `franchiseId` or appear in The
Art of War's franchise totals.

## 11. Public API and build boundary

Recommended core API:

```ts
buildFranchiseHistories(input: FranchiseHistoryBuildInput): FranchiseHistoryBuildResult

getAllFranchiseHistories(): readonly FranchiseHistory[]
getFranchiseHistory(franchiseId: string): FranchiseHistory | null
getFranchiseCareerSummary(franchiseId: string): FranchiseCareerSummary | null
getFranchiseSeasonHistory(franchiseId: string, season: number): FranchiseSeasonSummary | null
getFranchiseSeasons(franchiseId: string): readonly FranchiseSeasonSummary[]
getFranchiseOwnershipEras(franchiseId: string): readonly FranchiseOwnershipEra[]
getFranchiseNameEras(franchiseId: string): readonly FranchiseNameEra[]
getFranchiseTimeline(franchiseId: string): readonly FranchiseTimelineEvent[]
getUnresolvedFranchiseHistory(): readonly UnresolvedFranchiseHistory[]
getFranchiseHistoryCoverage(): FranchiseHistoryCoverage
```

The core builder should be synchronous, deterministic, framework-free, and
input-driven. Recommended input is the already-built collection of canonical
franchises, ownership tenures, historical season results, owner-season
records, and canonical matchups. It must not fetch Sleeper or parse XLSX.

A separate server composition/loader may:

1. acquire canonical matchup input;
2. apply reviewed franchise-roster mappings;
3. build canonical matchups;
4. read approved typed identity and season facts; and
5. call the deterministic franchise builder.

Acquisition failure must throw. It must not initialize the franchise engine
with a valid-looking empty matchup history. Accessors should require an
initialized build result, return frozen/cloned immutable values, and never
trigger network acquisition. A successful deterministic rebuild may replace
the in-memory cache atomically.

Presentation helpers—labels, badges, colors, timeline filtering, and layout—
belong outside this public factual API.

## 12. Query, cache, and duplication implications

- Career queries are O(1) after indexing by `franchiseId`.
- Season queries use a `{season}:{franchiseId}` index.
- Era and timeline queries use ordered arrays indexed by franchise.
- Child records remain canonical; career summaries reference their stable
  keys instead of embedding copies.
- Build-time sets enforce one consumption of each season-result key and each
  canonical matchup key per franchise perspective.
- Owner Career Summary and Owner Matchup Summary remain independent personal
  products. The new engine may reconcile against them but does not compose its
  physical totals from them.
- Franchise record aggregation should use a small generic record accumulator
  shared with existing matchup-summary math if that helper can be extracted
  without changing approved owner-summary behavior. Eligibility and physical
  inputs remain franchise-specific; copying the owner-summary implementation
  or consuming co-owner projections is not acceptable.
- Current identity objects remain the source for canonical names and current
  status. Historical results remain the source for annual labels and finishes.

## 13. Special-case validation

### Prestigio Mundial

- One canonical franchise: `prestigio-mundial`.
- 2011: Ray is the solo/primary owner; one eighth-place physical result.
- 2012: approved inactive gap; no physical result and no owner-season credit.
- 2013 onward: Ray and Jeffrey are co-owners.
- Shared seasons create one franchise result and one franchise matchup side,
  even though both owners receive personal credit.

### Shake-N-Bakers

- One canonical franchise: `shake-n-bakers`.
- Jordan's pre-2025 results remain part of the franchise history and Jordan's
  personal history.
- Landon joins in 2025, creating a new ownership era without creating a new
  franchise.
- Landon receives personal owner credit only from 2025 onward.

### Special Brownies

- Separate canonical franchise: `special-brownies`.
- Landon's approved physical results run from 2012 through 2024.
- It does not merge with Shake-N-Bakers and its achievements do not transfer
  into Landon's new franchise.
- Franchise History marks it dormant after 2024. No successor is approved.

### Travis and Darren historical labels

- `I'm Your Huckleberry` maps to `kissed-by-a-freckle` as a historical name.
- `Team Darren` maps to `team-kusaj` as a historical name.
- Neither raw label creates a second franchise.

### JD 2011

- Owner and fifth-place finish are resolved.
- Franchise is unresolved.
- The result remains in unresolved coverage and is excluded from every
  franchise's aggregates until a commissioner ruling exists.

### Tommy and Dave in 2022

- Tommy's franchise: platform first and historical champion.
- Dave's franchise: platform second, platform runner-up, and historical
  co-champion.
- Two franchises remain distinct; no combined franchise or rewritten tie is
  created.

## 14. Duplicate logic to retire later

After the engine and its validations are approved, later UI work should
replace—not immediately delete—the following duplicate paths:

- `franchiseStatSummaries` and `franchiseStatSummariesByFranchiseId` in
  `lib/managers/identityData.ts`;
- `ProfileTenure.statSummary` attachment and franchise-stat lookup in
  `lib/managers/identitySelectors.ts`;
- Team Legacy's tenure-per-card grouping;
- `getStatLabel()`, `getSharedStatCopy()`, and hard-coded franchise-specific
  copy in `components/managers/OwnerProfile.tsx`; and
- manually curated title, podium, best-finish, and Toilet Bowl presentation
  where the new engine has an approved factual equivalent.

Toilet Bowl history is not yet fully normalized from Historical Season
Results. Existing curated Toilet Bowl values must not be silently promoted
into the new engine. They remain legacy presentation data until a separate
approved factual source exists.

## 15. Implementation status and remaining plan

Implemented in Phase 5.1:

1. immutable types, deterministic input contract, stable keys, clone/freeze
   behavior, cache-safe accessors, and coverage in
   `lib/history/franchiseHistory.ts`;
2. physical franchise-season rows composed from Historical Season Results and
   deduplicated Owner Season History ownership context;
3. ownership eras, complete name eras, and primary-timeline name visibility;
4. physical canonical matchup aggregation and reconciliation;
5. career summaries and factual franchise timeline events; and
6. focused offline tests for keys, source reconciliation, special cases,
   immutability, deterministic rebuilds, and cache preservation.

Still deferred:

1. a reusable server loader for production consumers;
2. Team Legacy integration;
3. future franchise pages and League History consumers; and
4. Records, Trophy Room, Rivalries, and Homepage adapters.

## 16. Future UI consumers

| Consumer | Franchise facts it should consume later |
|---|---|
| Manager Profile Team Legacy | franchise career, ownership eras, selected milestones, owner relationship context |
| Franchise page | full career, season table, ownership/name eras, matchup splits, timeline |
| League History | franchise participation, title/podium chronology, founding/retirement/return events |
| Trophy Room | source-backed platform and historical championships |
| Records | factual franchise placement and physical matchup aggregates |
| Rivalries | physical franchise identity/history only; owner rivalry interpretation remains separate |
| Homepage | small approved franchise milestones or current identity summaries |

No consumer should infer ownership, count co-owner projections as physical
events, or rebuild placement/matchup arithmetic.

## 17. Validation plan

Focused tests should prove:

- deterministic rebuilds and immutable results;
- unique career, season, era, name-era, event, and unresolved keys;
- all 178 historical result keys are consumed once or explicitly unresolved;
- JD 2011 is the only currently unresolved franchise result;
- 2011 has 10 physical results and later completed seasons have 12;
- co-owner seasons create one physical franchise-season summary;
- owner credits reconcile without affecting physical totals;
- Prestigio's two ownership eras and 2012 inactive gap;
- Shake-N-Bakers' 2025 ownership transition;
- Special Brownies remains separate through 2024;
- Travis and Darren historical names do not create franchises;
- 2022 platform and historical championship facts remain separate;
- each completed canonical matchup is represented once physically and at most
  once per participating franchise perspective;
- owner projection counts are never used as franchise game counts;
- multi-week playoffs count once;
- byes/incomplete contests emit no franchise record statistics;
- pre-2018 matchup coverage remains unavailable rather than 0–0;
- current seasons without final results retain null placement coverage; and
- acquisition failure cannot initialize an empty valid history.

## 18. Approved commissioner decisions

- Ownership eras break when owner sets or roles change, after an inactive
  gap/return, or after an explicit identity ruling. Names, roster IDs, helpers,
  spelling, and temporary nicknames do not break ownership eras.
- Complete Name History preserves every sourced label. The primary timeline
  includes only sustained names or explicitly approved meaningful names.
- Franchise History supports active, dormant, and retired status. Special
  Brownies is dormant after 2024.
- No successor/predecessor relationship exists without an explicit
  commissioner ruling. Special Brownies is not a predecessor of
  Shake-N-Bakers.
- The default matchup résumé contains overall, regular,
  championship-playoff, and championship-game records. Third-place,
  placement, consolation, and Toilet Bowl records remain secondary and never
  enter overall.

No commissioner decision remains before factual-engine validation. Future UI
copy, event selection, and layout remain deferred to the Team Legacy phase.

## 19. Phase 5.1 validation status

The focused offline suite validates deterministic rebuilding, immutable
outputs, cache preservation after failure, pre-initialization accessor errors,
stable-key uniqueness, physical result reconciliation, matchup classification
scope, and every approved special case.

A live read-only build through the existing separated Sleeper acquisition and
reviewed franchise-roster mappings produced:

- 27 franchise career summaries;
- 193 franchise-season summaries, including explicit inactive and current
  no-result coverage rows;
- 30 ownership eras;
- 110 complete historical-name eras, 11 of which qualify automatically for
  primary-timeline consideration because they are sustained;
- 120 factual timeline events;
- 780 canonical source slots;
- all 766 completed physical contests consumed exactly once;
- 1,532 franchise-side consumptions, exactly two per completed contest;
- zero unresolved matchup sides;
- one unresolved physical season result, JD's approved 2011 result;
- zero duplicate stable keys; and
- zero reconciliation failures.

Team Legacy and every other UI consumer remain unmodified and unimplemented.
