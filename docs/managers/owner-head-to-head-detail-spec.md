# Owner Head-to-Head Detail Specification

## 1. Purpose and status

This document is the approved Phase 5.3A contract for the factual Owner
Head-to-Head Detail engine and its future route. Phase 5.3A implements only
the deterministic engine and offline tests. The route, UI, and rivalry
interpretation remain unimplemented.

The approved dependency order is:

```text
Canonical Matchup History
  -> Owner Matchup Projection
  -> Owner Matchup Summary
  -> Owner Head-to-Head Detail
  -> /managers/owners/[owner]/opponents/[opponent]
  -> future Rivalries 2.0
```

The new layer answers which completed physical contests support one
directional owner/opponent relationship. It must compose approved outputs,
preserve their lineage, and prove reconciliation. It must not become another
record calculator.

## 2. Existing data inventory

| File | Existing facts and APIs | Coverage | Phase 5.3 assessment |
|---|---|---|---|
| `lib/history/canonicalMatchupHistory.ts` | One physical contest per `matchupKey`; season, league, week, classification, bracket, round, title-game flag, aggregated scoring periods, franchises, scores, completion, correction version, source, coverage; canonical accessors | Sleeper 2018–2026; completed games through 2025 and source-enabled incomplete slots in 2026 | Authoritative physical-contest and source-lineage input. No owner attribution. |
| `lib/history/franchiseRosterMappings.ts` | 96 commissioner-approved roster-season mappings and mapping coverage | 2018–2025 | Upstream attribution input only. The detail layer does not remap rosters. |
| `lib/history/ownerMatchupProjection.ts` | `OwnerMatchupProjection`; `getOwnerMatchupHistory()`; `getOwnerHeadToHead()`; projection and coverage accessors | Supported canonical games beginning in 2018 | Already contains the complete directional owner-game facts needed for a meeting. `getOwnerHeadToHead()` de-duplicates by canonical key, but does not join the approved aggregate, pair coverage, canonical scoring periods, or route identity. |
| `lib/history/ownerMatchupSummary.ts` | Career, season, and directional opponent summaries; record splits; first/latest references; factual extremes; lineage; coverage | Approved owner projections beginning in 2018; explicit earlier no-source and 2026 no-completed-game coverage | Authoritative aggregate. The new detail layer must embed or reference it, not reproduce its arithmetic. |
| `lib/history/ownerSeasonHistory.ts` | Approved owner participation, canonical franchise, role, co-owners, and season coverage | 2011–2026 | Coverage and valid-overlap context only. It must not generate meetings. |
| `lib/managers/identityData.ts` and `identitySelectors.ts` | Canonical IDs, canonical slugs, names, statuses, photos, profiles, and profile routes | All approved profiles | Route and display identity. Names and slugs are never data keys. The current selector resolves exact canonical slugs; no general route-alias registry exists. |
| `lib/managers/ownerMatchupSummaryLoader.ts` | Strict server initialization of acquisition, canonical matchups, projections, and summaries; profile summary loaders | Live supported Sleeper seasons | Appropriate acquisition boundary to share or extend. A future detail loader must not independently hide or convert acquisition failure into empty history. |
| `components/managers/OwnerProfile.tsx` | Approved selectable Opponent History sourced from `OwnerOpponentMatchupSummary[]` | Current profile routes | Future link source. It formats and orders supplied summaries; it is not a meeting source. |
| `app/league-info/rivalries/page.tsx` | Client-side direct Sleeper scan and local head-to-head calculations | Hard-coded 2018–2026 | Legacy compatibility reference only. It is not approved input. |
| `app/matchups/page.tsx` | Current-season matchup and bracket presentation | Current season | Presentation reference only; not historical head-to-head truth. |

There is currently no owner/opponent detail route. The approved full-data
summary validation most recently reported 296 directional opponent summaries;
future route generation must derive its parameters from the live initialized
summary output rather than hard-code that count.

## 3. Source-of-truth boundaries

### Canonical Matchup History owns

- physical contest identity;
- aggregated multi-week contest structure;
- classification and title-game status;
- franchise scores and completion;
- correction and source metadata; and
- league physical-contest counts.

### Owner Matchup Projection owns

- one personal owner-side credit;
- owner and opponent franchise identity;
- teammate and opposing owner sets;
- directional score, result, and margin;
- ownership role and owner-season lineage; and
- classification eligibility.

### Owner Matchup Summary owns

- meetings and every record split;
- wins, losses, ties, winning percentage, points, and differential;
- first and latest meeting;
- closest meeting, largest victory, and largest defeat;
- co-owner context; and
- aggregate lineage and reconciliation.

### Owner Head-to-Head Detail should own

- an immutable directional relationship wrapper around the existing opponent
  summary;
- one immutable meeting view per summary-supported canonical key;
- deterministic newest-first and chronological meeting order;
- reference-based notable-meeting flags;
- pair-level coverage and reconciliation failures; and
- route-ready canonical owner/opponent identifiers.

It must not own acquisition, owner resolution from Sleeper metadata, record
arithmetic, rivalry scoring, streaks, or physical league totals.

## 4. Implemented meeting model

One meeting represents one directional owner relationship to one completed
physical canonical contest:

```ts
type OwnerHeadToHeadClassification = Exclude<
  CanonicalMatchupType,
  "bye" | "incomplete"
>;

type OwnerHeadToHeadMeeting = Readonly<{
  meetingKey: string;
  relationshipKey: string;
  ownerMatchupKey: string;
  canonicalMatchupKey: string;
  opponentSummaryKey: string;

  season: number;
  leagueId: string;
  week: number;
  classification: OwnerHeadToHeadClassification;
  bracketType: CanonicalBracketType;
  round: number | null;
  bracketPlacement: number | null;
  scoringPeriods: readonly Readonly<{
    week: number;
    sourceMatchupId: number | null;
    ownerScore: number;
    opponentScore: number;
    isComplete: true;
  }>[];
  isChampionshipGame: boolean;

  ownerId: string;
  opponentOwnerId: string;
  ownerSeasonKey: string;
  ownerFranchiseId: string;
  opponentFranchiseId: string;
  ownerRole: OwnershipRole;
  ownerTeammates: readonly string[];
  opponentOwners: readonly OwnerMatchupOpponent[];

  ownerScore: number;
  opponentScore: number;
  pointDifferential: number;
  result: OwnerMatchupResult;
  winnerOwnerIds: readonly string[];
  loserOwnerIds: readonly string[];

  notable: Readonly<{
    isClosestMeeting: boolean;
    isLargestWin: boolean;
    isLargestLoss: boolean;
  }>;

  source: Readonly<{
    projectionSource: "owner-matchup-projection";
    canonicalSource: CanonicalMatchupSource;
    correctionVersion: number;
  }>;
}>;
```

Field rules:

- `classification`, round, franchises, aggregate scores, scoring periods, and
  canonical source metadata come from the matching canonical record.
- Owner perspective, owner/opponent IDs, roles, teammate/opponent sets,
  result, and margin come from the matching owner projection.
- `pointDifferential` is the projection's stored `margin`; the detail layer
  does not recompute a different margin.
- Directional scoring periods reverse canonical home/away values when the
  owner projection is the away side. They are preserved only when both period
  scores are complete.
- `winnerOwnerIds` and `loserOwnerIds` are the approved owners on the winning
  and losing franchise sides. Both arrays are empty for a tie.
- The directional result follows canonical platform matchup truth. A separate
  season-level ruling such as the 2022 historical co-championship does not
  rewrite a canonical game score or manufacture a head-to-head tie.
- Byes, incomplete records, unresolved mappings, and failed owner projections
  never produce a meeting.
- One multi-week playoff contest produces one meeting containing multiple
  scoring periods, not one meeting per week.

The meeting does not store display names, profile photos, rivalry labels,
current franchise names, or calculated presentation strings.

## 5. Directional relationship model

The aggregate is a small composition record:

```ts
type OwnerHeadToHeadDetail = Readonly<{
  relationshipKey: string;
  ownerId: string;
  opponentOwnerId: string;
  opponentSummaryKey: string | null;
  summary: OwnerOpponentMatchupSummary | null;
  meetingKeysNewestFirst: readonly string[];
  meetingKeysChronological: readonly string[];
  coverage: OwnerHeadToHeadCoverage;
}>;
```

An immutable copy of the approved summary is embedded for supported meeting
relationships. A coverage-only detail uses `null` for both summary fields; it
must not fabricate a zero-game aggregate. This lets a
consumer read the authoritative aggregate and meeting references from one
record without recalculating totals. Meeting objects remain separately
addressable to avoid duplicating complete logs inside every accessor result.

The reverse relationship is a separate detail:

```text
Ray -> Wade
Wade -> Ray
```

Both may point to the same physical canonical keys, but scores, result,
margin, winner perspective, summary key, relationship key, and meeting keys
are directional.

## 6. Physical contest versus owner relationship

For a solo franchise facing co-owned Prestigio:

- Canonical Matchup History contains one physical contest.
- The solo owner has one personal owner projection.
- That projection supports one directional meeting against Ray and one
  directional meeting against Jeffrey.
- Ray has one directional meeting against the solo owner.
- Jeffrey has one directional meeting against the solo owner.
- Ray and Jeffrey have no meeting against one another.

Therefore:

```text
directional meeting records != physical league contests
```

The detail layer may report unique canonical keys observed within its own
records as reconciliation only. It must never label that value a league
physical-contest total. League totals always come from Canonical Matchup
History.

## 7. Co-owner and helper-account rules

### Prestigio Mundial

- Ray receives supported Prestigio meetings from 2018 onward and his approved
  historical owner coverage remains separate.
- Jeffrey's directional meeting history begins only with supported seasons
  inside his approved 2013-and-later tenure.
- Ray and Jeffrey are excluded from each other's opponent buckets because
  they are teammates on the same canonical side.
- Jeffrey receives no 2011 meeting or relationship attribution.

### Shake-N-Bakers and Special Brownies

- Jordan and Landon remain legitimate opponents for supported meetings before
  2025 while they own independent canonical franchises.
- Landon's pre-2025 meetings retain Special Brownies as his franchise.
- Beginning in 2025, Jordan and Landon are teammates on Shake-N-Bakers; shared
  games produce personal credits for both but no meetings against each other.
- Joining Shake-N-Bakers does not rewrite Landon's earlier meetings.

### Temporary helpers

- Approved canonical owner-season tenure is the only attribution source.
- Aaron receives no meeting derived from helping Doug draft in 2023.
- Billy's temporary helper receives no 2024 meeting, opponent relationship,
  or coverage identity.
- Sleeper `co_owners`, attached users, usernames, and numeric IDs never create
  a meeting or route parameter by themselves.

## 8. Summary reconciliation contract

The builder should begin with each supplied `OwnerOpponentMatchupSummary`,
then select only projections that satisfy all of these conditions:

1. `projection.ownerId === summary.ownerId`;
2. `projection.canonicalMatchupKey` belongs to the summary's canonical keys;
3. `projection.ownerMatchupKey` belongs to the summary lineage;
4. `projection.opponentOwners` contains `summary.opponentOwnerId`;
5. the opponent is neither the owner nor a teammate; and
6. exactly one matching canonical record exists and is complete.

The resulting meeting set must contain each canonical key exactly once.

Every current opponent-summary fact can be reconstructed from meeting fields:

| Summary fact | Reconciliation from meetings |
|---|---|
| `meetings` | All unique meeting canonical keys, across every completed classification |
| wins/losses/ties | Directional `result` within each requested split |
| points for/against/differential | Stored directional scores and margins within each requested split |
| winning percentage | Reconstructable from wins/losses/ties, but remains owned by the supplied summary |
| regular/playoff/secondary splits | `classification` plus `isChampionshipGame` |
| first/latest | Chronological first and last meeting using approved deterministic ordering |
| closest/largest | Exact canonical and owner-projection references identify the chosen meeting |
| franchise sets | Unique owner and opponent franchise IDs |
| co-owner context | Teammate IDs and full approved opposing-owner sets |
| lineage | Projection, canonical, owner-season, correction-version, and source-version references |

Reconstructability is a validation requirement, not permission to replace the
summary. The detail output carries the existing summary unchanged. A mismatch
must fail the build or appear as an explicit reconciliation failure; it must
never be silently corrected by the new layer.

Floating-point reconciliation must use the same deterministic method as the
summary test contract or compare the supplied lineage-derived values exactly.
Presentation rounding must never enter reconciliation.

## 9. Classification behavior

Use the existing canonical vocabulary without aliases in stored records:

- `regular`
- `championship-playoff`
- `third-place`
- `placement`
- `toilet-bowl`
- `consolation`

`isChampionshipGame` is true only for the actual title game and remains a
subset of `championship-playoff`. It is not a new primary classification.

The future route should distinguish two totals:

1. **Competitive series:** `summary.records.overall`, containing only regular
   and championship-playoff games. Use `records.overall.games` as the displayed
   competitive-meeting count.
2. **All completed meetings:** `summary.meetings`, which also includes
   third-place, placement, Toilet Bowl, and consolation meetings.

This distinction is necessary because `summary.meetings` and
`summary.records.overall.games` can differ. The primary record, winning
percentage, points, and differential must all come from `records.overall`.
Secondary classes receive separate factual counts and filters and are never
silently merged into the primary record.

The existing factual extremes and first/latest references are selected from
all completed directional meetings, not only the overall-eligible subset.
The route must label them accordingly unless a future approved summary adds
scope-specific extremes.

## 10. Deterministic ordering

Default newest-first ordering:

1. season descending;
2. canonical week descending;
3. playoff round descending, with `null` ordered after a numeric round for an
   otherwise identical season/week;
4. canonical matchup key ascending; and
5. directional meeting key ascending as a defensive final tie-break.

Chronological ordering:

1. season ascending;
2. canonical week ascending;
3. playoff round ascending, with `null` ordered before a numeric round;
4. canonical matchup key ascending; and
5. directional meeting key ascending.

Ordering never uses owner names, team names, formatted week labels, scores, or
array insertion order. Multi-week contests sort by their one canonical contest
week and remain one record.

## 11. Closest and largest reference behavior

Use reference-based annotation rather than recalculation.

For each meeting, compare its `ownerMatchupKey` and `canonicalMatchupKey` to:

- `summary.factualExtremes.closestMeeting`;
- `summary.factualExtremes.largestVictory`; and
- `summary.factualExtremes.largestDefeat`.

The resulting booleans are factual navigation/display flags. The detail layer
must not rerun margin ranking, choose a different tie-break, or create a
generic “biggest blowout” that loses directional win/loss meaning. A missing
summary reference produces no flag.

## 12. Coverage model

Implemented pair coverage:

```ts
type OwnerHeadToHeadCoverage = Readonly<{
  state:
    | "available"
    | "available-no-completed-pair-meetings"
    | "partial-career-coverage"
    | "unavailable-source"
    | "no-approved-tenure-overlap"
    | "not-applicable";
  ownerId: string;
  opponentOwnerId: string;
  isPartialCareerCoverage: boolean;
  approvedOverlapSeasons: readonly number[];
  supportedOverlapSeasons: readonly number[];
  unsupportedOverlapSeasons: readonly number[];
  sourceEnabledNoMeetingSeasons: readonly number[];
  meetingsExpected: number;
  meetingsBuilt: number;
  uniqueCanonicalMeetings: number;
  duplicateMeetingKeys: readonly string[];
  duplicateCanonicalMatchupKeys: readonly string[];
  missingProjectionKeys: readonly string[];
  missingCanonicalMatchupKeys: readonly string[];
  summaryReconciliationFailures: readonly string[];
}>;
```

Coverage rules:

- `available` requires an approved opponent summary and reconciled meetings.
- `available-no-completed-pair-meetings` means the owners have at least one
  source-enabled overlapping participation season but no supported completed
  meeting in those seasons.
- `unavailable-source` means the relevant approved overlap is confined to
  seasons without matchup source.
- `not-applicable` covers self-pairs and noncompetitive staff identities.
- `isPartialCareerCoverage` is true when supported detail exists while one or
  both owners also have approved overlapping participation before matchup
  source coverage.
- `no-approved-tenure-overlap` means approved owner-season participation never
  overlaps. It is not a claim about an unapproved relationship.
- `partial-career-coverage` and `isPartialCareerCoverage` preserve the fact
  that a supported relationship also has approved overlap before matchup
  source coverage.

“No historical opponent relationship” should not be a stored conclusion when
pre-2018 evidence is unavailable. UI copy should say “No supported completed
meeting is available” or “Matchup source is unavailable for the overlapping
seasons,” depending on coverage.

Acquisition or initialization failure is an exception, not a coverage state.
It must never become a valid empty pair.

## 13. Stable keys

Recommended keys:

```text
owner-head-to-head:{ownerId}:vs:{opponentOwnerId}

owner-head-to-head-meeting:{ownerId}:vs:{opponentOwnerId}:matchup:{canonicalMatchupKey}
```

Rules:

- use canonical owner IDs and the canonical matchup key;
- never use names, slugs, Sleeper IDs, roster IDs, scores, week labels, or
  array indexes;
- the reverse directional relationship receives a separate relationship key
  and separate meeting keys;
- correction versions and score corrections do not change keys;
- a valid co-owner relationship can create multiple directional meeting keys
  backed by one canonical key; and
- duplicate keys are reported and excluded from valid output.

## 14. Implemented build input and public APIs

Deterministic input:

```ts
type OwnerHeadToHeadDetailBuildInput = Readonly<{
  canonicalMatchups: readonly CanonicalFranchiseMatchup[];
  projections: readonly OwnerMatchupProjection[];
  opponentSummaries: readonly OwnerOpponentMatchupSummary[];
  careerSummaries: readonly OwnerCareerMatchupSummary[];
  seasonSummaries: readonly OwnerSeasonMatchupSummary[];
  ownerProfiles: readonly Pick<OwnerProfile, "id" | "slug" | "status">[];
  projectionCoverage: OwnerMatchupProjectionCoverage;
}>;
```

The builder performs no Sleeper acquisition and invokes none of the upstream
builders. Career/season summaries and projection coverage exist only to
produce honest pair coverage; they never supply meeting statistics.

Public APIs:

```ts
buildOwnerHeadToHeadDetails(input)

getAllOwnerHeadToHeadDetails()
getOwnerHeadToHeadDetail(ownerIdOrSlug, opponentOwnerIdOrSlug)
getOwnerHeadToHeadMeetings(ownerIdOrSlug, opponentOwnerIdOrSlug, options?)
getOwnerHeadToHeadMeeting(meetingKey)
getOwnerHeadToHeadCoverage(ownerIdOrSlug, opponentOwnerIdOrSlug)
getOwnerHeadToHeadBuildCoverage()
getOwnerHeadToHeadMeetingsChronological(ownerIdOrSlug, opponentOwnerIdOrSlug, filter?)
getAllSupportedDirectionalHeadToHeadPairs()
```

The meeting accessor accepts one factual filter:

```ts
type OwnerHeadToHeadFilter =
  | "all"
  | "competitive"
  | "regular"
  | "championship-playoff"
  | "third-place"
  | "placement"
  | "toilet-bowl"
  | "consolation"
  | "championship-game";
```

Accessors should resolve canonical ID or canonical slug through the supplied
profile index, return immutable clones, throw before initialization, and
preserve the previous valid cache after a failed rebuild.

## 15. Route architecture

Approved route shape:

```text
/managers/owners/[owner]/opponents/[opponent]
```

Recommendations:

- Both path segments are canonical owner slugs.
- Resolve each slug to a canonical owner ID before calling the detail APIs.
- The first slug owns the directional perspective.
- Reversing the slugs loads the reverse detail and reverses directional scores
  and results.
- Generate static parameters from actual `OwnerOpponentMatchupSummary`
  directional pairs only. Do not generate an owner cross-product.
- The most recently approved full dataset would therefore generate 296
  directional pair routes, but the implementation must derive the live count.
- Invalid owner or opponent slugs return `notFound()`.
- `owner === opponent` returns `notFound()` and is never generated.
- Staff/noncompetitive pairs and valid pairs with zero supported meetings are
  not pre-generated or linked from Opponent History.
- If a valid zero-meeting URL is requested, render the factual coverage state
  rather than a fabricated 0-0 series or an unconditional “never played.”
- If route aliases are introduced later, resolve them server-side and issue a
  permanent redirect to both canonical slugs. The current identity catalog has
  no general owner-route alias registry, so Phase 5.3 should not invent one.
- Opponent History rows should become normal focusable links only after the
  route exists; they must never link to the legacy Rivalry Hub as a substitute.

A server-only loader should initialize or reuse the existing strict canonical,
projection, and summary acquisition path, then initialize the deterministic
detail builder. It must not perform a second silent direct Sleeper scan. A
shared one-time initialization boundary is preferable to parallel duplicate
acquisition.

## 16. Proposed page hierarchy

The future page should tell a factual series story in this order:

1. **Hero** — canonical owner identity, “vs,” canonical opponent identity,
   links back to both Manager Profiles, and an explicit supported-coverage
   range.
2. **Competitive Series Summary** — approved overall record, winning
   percentage, competitive meetings, points for, points against, and point
   differential from `summary.records.overall`.
3. **Series Context** — all completed meetings, first/latest meeting,
   regular-season count, championship-playoff count, title-game count, and
   separately labeled secondary classifications.
4. **Notable Meetings** — the referenced closest meeting, largest victory,
   and largest defeat. Missing references produce no empty fake card.
5. **Meeting History** — newest-first by default with accessible season and
   classification filters; each row shows season/week or round, franchise
   context, classification, score, result, and factual flags.
6. **Coverage Note** — pre-2018 exclusion, partial coverage, or no-completed
   meeting explanation when applicable.

On mobile, use stacked meeting cards or a compact semantic list. On desktop,
the same data may use a contained table. Filtering is presentation state over
supplied meeting records; it must not alter the authoritative summary.

Future lineup, transaction, trade, and rivalry analytics hooks may be designed
as later sections, but no placeholder should imply that those facts currently
exist.

## 17. Head-to-Head versus Rivalries 2.0

Head-to-Head is factual and may contain:

- approved directional summary facts;
- exact completed meetings;
- classifications and title-game status;
- scores, results, margins, and canonical lineage;
- first/latest and summary-referenced factual extremes;
- co-owner context; and
- explicit source coverage.

Rivalries 2.0 may later interpret those facts through separately approved
rules for:

- rivalry intensity or ranking;
- competitiveness;
- frequency and recency weighting;
- streaks and tie behavior;
- upset significance;
- playoff or championship importance;
- title impact;
- curated overrides; and
- symmetric versus directional rivalry identity.

No rivalry score, heat label, favorite-victim/nemesis label, streak, or
narrative ranking belongs in the Phase 5.3 factual engine or route.

## 18. Legacy duplication to retire later

`app/league-info/rivalries/page.tsx` currently duplicates or bypasses approved
logic in the following ways:

- fetches every roster and weeks 1–17 directly in React for hard-coded league
  IDs;
- resolves identity through a local Sleeper-ID map;
- combines Ray and Jeffrey into one display identity;
- treats Sleeper `co_owners` as ownership evidence, creating helper-account
  attribution risk;
- groups weekly rows directly instead of using canonical matchup keys;
- can treat two missing `matchup_id` values as equal;
- lacks canonical completion checks;
- can count a multi-week playoff contest once per scoring week;
- mixes regular season, winners bracket, placement, consolation, and Toilet
  Bowl games into one unlabeled series;
- does not store ties even though ties increase its game count;
- calculates points, record, averages, closest game, and largest margin in the
  component;
- calculates unapproved current streaks;
- assigns unapproved `Blood Feud`, `Heated`, `Competitive`, and `Cold`
  intensity labels;
- reports “Playoff record unavailable” despite approved playoff summaries;
  and
- uses year/week/roster display keys instead of canonical lineage.

The future factual route can replace the legacy page's record, scores,
meeting log, classifications, first/latest, and notable-game facts. The legacy
Rivalry Hub should not be modified during Phase 5.3 discovery or detail-engine
implementation. Its subjective labels and streaks remain deferred until a
Rivalries 2.0 contract is approved.

`app/matchups/page.tsx` remains a current-season page and should not be retired
by this work.

## 19. Special-case validation contract

The future focused test must prove:

1. Ray/Jeffrey produces no detail, meeting, or generated route in either
   direction.
2. Ray/Wade detail contains exactly the same canonical keys and directional
   aggregate as the existing Ray/Wade opponent summary.
3. Jeffrey/Wade exists independently for supported shared Prestigio seasons.
4. One solo-opponent/Prestigio physical contest may support separate Ray and
   Jeffrey directional relationships without increasing physical league
   counts.
5. Jordan/Landon contains supported independent-franchise meetings before
   2025 only.
6. No 2025-or-later shared Shake-N-Bakers contest enters Jordan/Landon detail.
7. Landon's pre-2025 meetings retain Special Brownies.
8. Aaron receives no Doug-derived 2023 meeting or opponent route from the
   draft-helper attachment.
9. Billy's temporary helper receives no 2024 meeting or opponent route from
   the temporary attachment.
10. No pre-2018 meeting is fabricated.
11. 2026 can report source-enabled/no-completed-meetings without a 0-0 series.
12. Multi-week playoff scoring periods create one meeting.
13. Byes and incomplete contests create no meetings.
14. Championship games remain a subset of championship-playoff.
15. Third-place, placement, Toilet Bowl, and consolation remain independently
    queryable and excluded from the overall record.
16. Every opponent summary reconciles exactly to its meeting set.
17. Every detail key and meeting key is unique, stable, deterministic, and
    immutable.
18. Reverse directional details share canonical keys but correctly reverse
    scores, margins, results, winners, and losers.

Existing approved tests already establish the underlying co-owner, helper,
classification, and summary behavior. The Phase 5.3 test should validate
composition and reconciliation without copying those engines' internal
calculations into production code.

## 20. Implementation status and sequence

Completed in Phase 5.3A:

1. `lib/history/ownerHeadToHeadDetail.ts` is an offline, input-driven,
   acquisition-free immutable composition builder.
2. `scripts/owner-head-to-head-detail.test.ts` covers keys, ordering, canonical
   joins, exact summary reconciliation, coverage, co-owners, helpers,
   multi-week games, filtering, deterministic rebuilds, immutability, and
   failed-cache preservation.

Deferred sequence:

1. Add a server loader that reuses a shared strict matchup initialization path
   and exposes canonical owner/opponent route data. Acquisition remains
   separate from the builder.
2. Implement `/managers/owners/[owner]/opponents/[opponent]` with static params
   from actual directional summaries and coverage-aware fallback behavior.
3. Link existing Manager Profile Opponent History rows to the new canonical
   route without changing their calculations.
4. Validate all existing canonical, projection, summary, Manager Profile, and
   build contracts.
5. In a later separately approved phase, migrate factual Rivalry Hub content
   to this layer before designing Rivalries 2.0.

## 21. Approved commissioner decisions

Phase 5.3A applies these approved decisions:

1. **Primary meeting label:** “Competitive meetings” means
   `records.overall.games` and “All completed meetings” for `summary.meetings`.
2. **Default meeting log:** all completed classifications, newest-first.
3. **Valid zero-meeting relationships:** expose a coverage-aware factual
   empty page for a manually requested valid pair rather than returning 404.
4. **Notable meeting scope:** retain the current summary's all-classification
   closest/largest references and label that scope explicitly.
5. **Future static route scope:** generate both directional routes only for
   pairs with an existing opponent summary.
6. **Scoring-period detail:** retain directional scoring-period
   facts in the engine while initially showing them only for multi-week
   contests.

No new decision is required for canonical identity, approved ownership tenure,
co-owner attribution, helper exclusion, canonical classifications, title-game
status, summary formulas, or pre-2018 source limits. Rivalry intensity,
streaks, weights, rankings, and curated overrides remain future Rivalries 2.0
decisions.

## 22. Explicit non-goals

Phase 5.3 must not:

- change any approved matchup or Franchise History engine;
- infer pre-2018 games;
- calculate a second opponent summary;
- merge secondary classifications into the overall record;
- count owner relationship rows as league physical contests;
- create helper identities or routes;
- add streaks or rivalry scoring;
- add lineup, transaction, or trade analysis;
- redesign Manager Profiles, Rivalries, or Matchups; or
- invent owner slug aliases.
