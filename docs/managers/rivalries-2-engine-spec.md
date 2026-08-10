# Rivalries 2.0 Engine Specification

Status: Phase 5.4A engine implemented. Rivalry Hub migration, Manager Profile
integration, curated league data, franchise rivalries, streak analytics, and a
separate Rivalry detail route remain unimplemented.

## 1. Scope and reviewed sources

The implemented Rivalry Engine sits above the approved factual chain:

```text
Canonical Matchup History
  -> Owner Matchup Projection
  -> Owner Matchup Summary
  -> Owner Head-to-Head Detail
  -> Rivalry Engine
```

The discovery reviewed these factual sources:

- `lib/history/canonicalMatchupHistory.ts`
- `lib/history/ownerMatchupProjection.ts`
- `lib/history/ownerMatchupSummary.ts`
- `lib/history/ownerHeadToHeadDetail.ts`
- `lib/managers/ownerHeadToHeadLoader.ts`
- `components/managers/OwnerHeadToHeadPage.tsx`
- `app/managers/owners/[owner]/opponents/[opponent]/page.tsx`

It reviewed these current rivalry and profile consumers:

- `app/league-info/rivalries/page.tsx`
- `app/managers/owners/[owner]/page.tsx`
- `components/managers/OwnerProfile.tsx`
- `lib/managers/identityData.ts`
- `lib/managers/identityTypes.ts`
- `lib/managers/identitySelectors.ts`
- `lib/managers/activeManagers.ts`
- `lib/managers/retiredManagers.ts`
- `lib/managers/staff.ts`

It also reviewed the approved boundaries documented in:

- `docs/managers/owner-head-to-head-detail-spec.md`
- `docs/managers/owner-matchup-summary-spec.md`
- `docs/managers/post-foundation-engine-gap-audit.md`
- `docs/managers/historical-rulings.md`
- `docs/managers/river-city-managers-v1-spec.md`

No separate reusable rivalry helper or Rivalry Hub client component exists.
The client page is the current Hub, its acquisition layer, and its calculation
layer.

Phase 5.4A adds:

- `lib/history/rivalryHistory.ts`
- `scripts/rivalries-2.test.ts`

## 2. Rivalry definition

A River City owner rivalry is a commissioner-recognized or evidence-supported
relationship between two canonical owners whose competitive history has
meaning beyond the mere existence of meetings. Meeting count alone does not
establish a rivalry.

The recommended model is **calculated ranking with separately stored
commissioner-recognized metadata**. It is a hybrid, but it must preserve two
independent answers:

1. what the supported factual history and approved formula rank highly; and
2. what the league recognizes as a rivalry.

Curated recognition may force inclusion or presentation priority. It must not
rewrite records, margins, classifications, coverage, or the calculated score.
This is safer than a hidden manual score override and more useful than either a
fully calculated or fully curated system.

The engine must distinguish:

- **factual source values**, copied by reference from approved summaries and
  meeting detail;
- **derived dimensions**, calculated deterministically from those facts;
- **interpretive ranking**, controlled by an approved, versioned policy; and
- **curated recognition**, stored with explicit provenance.

The commissioner-approved v1 methodology is implemented under the explicit
version `rivalry-score-v1`. It produces a transparent league-relative score,
not a subjective rivalry name or narrative label.

## 3. Factual source contract

### Facts already available

`OwnerOpponentMatchupSummary` supplies directional facts for a supported pair:

- all completed meetings;
- the approved overall competitive record, limited to `regular` and
  `championship-playoff`;
- wins, losses, ties, winning percentage, points for, points against, and point
  differential;
- regular-season, championship-playoff, championship-game, third-place,
  placement, consolation, and Toilet Bowl record splits;
- first and latest meeting references;
- seasons with meetings;
- canonical matchup keys and owner matchup keys;
- owner and opponent franchise IDs;
- co-owner context;
- closest meeting, largest directional victory, and largest directional
  defeat; and
- source lineage and reconciliation coverage.

`OwnerHeadToHeadDetail` adds:

- every supported completed directional meeting;
- season, week, round, bracket type, and classification;
- exact owner/opponent scores and point differential;
- title-game status;
- owner and opponent franchise context for that meeting;
- owner teammates and legitimate opposing co-owners;
- ordered scoring periods for multi-week playoffs;
- deterministic newest-first and chronological ordering; and
- pair coverage, unsupported overlap seasons, and source-enabled seasons with
  no completed pair meeting.

The approved projection and canonical layers supply lineage and safeguards,
not an alternative rivalry calculation. One physical contest is identified by
one canonical matchup key. Personal co-owner credits do not create additional
physical contests.

### Facts not currently supplied as approved rivalry inputs

The current foundation does not provide:

- current or longest streaks;
- a league-approved close-game threshold;
- close-game count or percentage;
- a league-approved recency window or decay function;
- a league-approved rivalry score, tier, threshold, or label;
- upset strength, expected result, roster strength, or betting context;
- title-path impact beyond the factual playoff/title-game classification;
- structured notable-event, rivalry-name, or rivalry-story data;
- owner-submission versus commissioner-recognition provenance for every current
  `survey.rivalOwnerId` value;
- a franchise-versus-franchise rivalry summary;
- transaction, trade, draft, lineup, or off-field rivalry evidence; or
- evidence that an unsupported pre-2018 pair was or was not a rivalry.

Average absolute margin, seasons with meetings, span, recent-window counts, and
other aggregates can be derived from approved meeting detail, but they become
Rivalry Engine outputs only after their definitions and scopes are approved.

## 4. Pair model and perspective

Rivalry identity should be one undirected canonical owner pair:

```text
rivalry:{lexically-lower-canonical-owner-id}:{lexically-higher-canonical-owner-id}
```

The stored `ownerIds` tuple must use the same deterministic lexical ordering.
Names, slugs, Sleeper IDs, team names, current franchises, score, and ranking
must never affect the key.

The engine should consume both directional facts only to reconcile them. It
should choose the ordered first owner as `ownerA` and preserve two explicit
perspectives:

- `ownerARecord`, points, differential, and directional extremes; and
- `ownerBRecord`, points, differential, and directional extremes.

Shared pair facts include unique canonical meeting keys, total meetings,
classification counts, seasons, coverage, and absolute margins. The reverse
direction must not create a second rivalry. Records, points, margins, and
results must invert exactly between perspectives.

Cross-rivalry Hub totals must never sum owner-pair credits and call the result a
physical league-contest count. If that number is needed, it must be de-duplicated
by canonical matchup key.

## 5. Approved rivalry dimensions

| Dimension | Nature | Ranking recommendation | Double-counting risk |
| --- | --- | --- | --- |
| Frequency | Competitive and all-completed meeting counts are factual; seasons with meetings is derivable | V1 component: 25%, using competitive meetings | Meetings and longevity remain correlated, so each has a bounded normalized contribution |
| Competitiveness | Series balance is derived from the approved winning percentage | V1 component: 30% | Point differential and average margin are excluded from the score |
| Closeness | Absolute margins and closest meeting are factual; average absolute margin is derivable | Browse-only factual context | A close-game threshold is unapproved and excluded from v1 |
| Postseason significance | Playoff and title-game meetings/results are factual | V1 component: 20%, with the approved title-game premium | The title-game subset receives exactly one additional unit and no other duplicate premium |
| Recency | Latest competitive meeting season is factual | V1 component: 15%, league-season rank only | No wall-clock decay or recent-window frequency is added |
| Longevity | Distinct competitive-meeting seasons is derivable | V1 component: 10% | First-to-last span is excluded so inactive gaps add no strength |
| Dominance | Record imbalance, point differential, and largest win/loss are factual or derivable | Browse-only; no positive v1 contribution | One-sided history already lowers competitiveness |
| Historical significance | Title games and repeated playoff meetings are factual proxies; named league events and narrative importance are not | Title-path facts enter postseason only; narrative significance requires curation | No second historical-significance score exists |
| Curated league rivalry | Recognition, name, story, and importance are subjective metadata | May control inclusion/feature priority, not factual score | A manual score bonus can hide whether recognition or history produced the rank |

### Dimension-specific guidance

**Frequency.** V1 uses competitive meetings. All completed meetings and
secondary counts remain separately queryable factual context.

**Competitiveness.** Use a symmetric series-balance measure. Directional
winning percentage by itself changes perspective; its distance from `.500`
does not. Ties must remain part of the approved winning-percentage formula.

**Closeness.** V1 exposes average absolute all-completed margin and approved
directional extremes as context only. It defines no close-game threshold.

**Postseason significance.** Store playoff meetings and title-game meetings
separately. `isChampionshipGame` is a subset flag, not a separate physical
contest. Third-place, placement, consolation, and Toilet Bowl remain separate
secondary scopes.

**Recency.** V1 uses the latest competitive meeting season and rank-normalizes
it among eligible pairs. It has no rolling window or decay curve.

**Longevity.** Prefer seasons with meetings over raw first-to-latest span. A
ten-year span with two meetings is not equivalent to ten seasons of meetings.

**Dominance.** A one-sided series can be historically important, but dominance
is not the same as competitiveness. It receives no separate positive v1 score;
one-sided records naturally reduce competitiveness.

**Historical significance.** Repeated playoff and title meetings can be
measured. A Damar Hamlin ruling, league incident, nickname, or story needs
curated metadata; season-result recognition cannot be inferred from a matchup
score alone.

**Curated rivalry.** Current owner profile `rivalOwnerId`, `rivalName`, and
`rivalImage` are directional survey/profile fields. Active-profile data appears
in the generated manager survey source; Jeffrey's value is explicitly curated.
The public types do not record who submitted or approved every rivalry value,
when it was approved, reciprocity, a story, or a recognition level. These
fields are useful migration evidence but must not automatically become
`isCommissionerRecognized`.

Current migration evidence is:

| Profile | Stored rival selection |
| --- | --- |
| Ray | Wade |
| JD | Tommy |
| Jordan | Dave |
| Tommy | Dave |
| Stan | Rashad |
| Wade | Tommy |
| Doug | Dave |
| Travis | Ray |
| Rashad | Tommy |
| Brian | Tommy |
| Aaron | Stan |
| Dave | Tommy |
| Jeffrey | Wade, explicitly commissioner-curated in `identityData.ts` |
| Damon (staff) | Tommy, but no competitive owner rivalry applies |

Retired manager source records currently have no rival selection. The table is
not a recognition list: most values have no typed provenance, many are not
reciprocal, and staff/profile content is not matchup evidence.

## 6. Scoring-model options

### Weighted 0–100 score

Easy to rank and explain if every component is normalized first. It is highly
sensitive to unapproved weights and can create false precision.

### Percentile-based score

Controls differing numeric scales and compares pairs to the league population.
It changes when new seasons or pairs enter the population, making historical
scores less stable and small-sample interpretation harder.

### Tier system

Easy to communicate, but thresholds are still subjective and boundary effects
can make nearly identical pairs appear different.

### No single score

Most faithful during discovery. It supports factual Hub categories but cannot
produce one deterministic “top rivalry” without a separate selection rule.

### Hybrid score plus dimensions

Best eventual product model: retain raw and normalized dimensions for
explanation, and use a versioned score only for ordering. Curated recognition
remains a separate field and presentation lane.

### Recommendation

Phase 5.4A implements the approved hybrid model as `rivalry-score-v1`. A pair
is calculated-ranking eligible only with at least four competitive meetings
across at least two distinct competitive-meeting seasons. `regular` and
`championship-playoff` are the only competitive classifications. Secondary
classifications remain factual context and cannot satisfy eligibility.

The score uses exactly five components:

```text
calculatedScore =
  (competitiveness * 0.30 * 100)
  + (normalizedFrequency * 0.25 * 100)
  + (normalizedPostseasonSignificance * 0.20 * 100)
  + (normalizedRecency * 0.15 * 100)
  + (normalizedLongevity * 0.10 * 100)
```

The weights total `1.0`. The output retains each raw input, normalized value,
weight, and 0–100 weighted contribution. An ineligible pair keeps raw factual
inputs but receives `null` normalized components, score, and rank.

Competitiveness is already normalized directly from the approved competitive
winning percentage:

```text
1 - (abs(competitiveWinningPercentage - 0.5) * 2)
```

Frequency uses competitive meeting count. Postseason significance uses
`championshipPlayoffMeetings + championshipGameMeetings`, intentionally giving
an ordinary winners-bracket game one unit and a title game two units. Recency
uses latest competitive meeting season, never wall-clock time. Longevity uses
the number of distinct competitive-meeting seasons, never first-to-last span.

Frequency, postseason significance, recency, and longevity use deterministic
eligible-population midrank percentiles. Raw values sort ascending. Equal raw
values share the average of their occupied zero-based positions divided by
`population size - 1`; display names never break a normalization tie. A single
positive value or an all-equal positive population normalizes to `1`. An
all-zero population normalizes to `0`, and a zero raw value never receives a
positive percentile contribution. Percentile dimensions may change as the
eligible population changes because v1 is explicitly league-relative.
Because tied raw values share their occupied midrank, the live normalized
maximum may be below `1.0` when multiple rivalry records share the highest raw
value; this is expected rather than a normalization defect.

Do not include both a quantity and its mathematical duplicate. In particular:

- title games receive exactly the explicit approved extra postseason unit and
  no additional historical-significance contribution;
- record balance, point differential, and average margin should not each carry
  full independent competitiveness weight; and
- meetings, seasons with meetings, and span should not each carry full
  independent frequency weight.

The approved calculated rank order is score descending, competitive meetings
descending, championship-playoff meetings descending, latest competitive
meeting season descending, then canonical rivalry key ascending. Null-score
records never enter calculated ranking.

## 7. Curated recognition model

Implemented optional metadata:

```ts
type RivalryCuratedMetadata = Readonly<{
  isRecognized: boolean;
  recognitionSource: "commissioner" | "owner-a" | "owner-b" | "mutual" | null;
  rivalryName: string | null;
  rivalryStory: string | null;
  rivalryStartSeason: number | null;
  displayPriority: number | null;
  notes: readonly string[];
}>;
```

The builder accepts curated metadata as a separate optional input. Phase 5.4A
does not add any league recognition records. Existing Manager Profile primary
rival fields are not engine input and are therefore not silently promoted.
Future reviewed recognition data should live in a typed module rather than a
React page. In `owner-a` and `owner-b`, the letter refers to canonical owner-ID
sort order in the undirected pair.

Curated recognition may:

- force inclusion in a Commissioner-Recognized Hub section;
- provide a name and factual/approved story;
- influence featured-card selection through explicit `displayPriority`; and
- remain visible when calculated rank is unavailable because of source
  coverage.

`getRecognizedRivalries()` orders higher numeric `displayPriority` first, then
uses the canonical rivalry key as its deterministic tie-break.

It should not:

- alter factual Head-to-Head values;
- alter the calculated score;
- create meetings;
- treat unsupported history as zero;
- manufacture reciprocity from a directional owner survey answer; or
- silently promote a pair in calculated ranking.

If the product needs one combined display order, commissioner-recognized and
calculated lists should be visibly labeled and merged by a presentation
adapter, not by corrupting the engine score.

## 8. Co-owner and franchise rules

- Current or former teammates never receive rivalry meetings for contests in
  which they represented the same franchise.
- Co-ownership does not collapse distinct canonical owners.
- Ray/Wade and Jeffrey/Wade are separate owner rivalries, even when one
  Prestigio physical contest supplies legitimate personal credits to both Ray
  and Jeffrey.
- Ray/Jeffrey is not an owner rivalry and receives no meeting from shared
  Prestigio seasons.
- Jordan/Landon may retain a historical owner relationship from seasons when
  they opposed each other. Shared Shake-N-Bakers ownership beginning in 2025
  adds no teammate rivalry meetings.
- A present co-owner relationship does not erase valid earlier opposing
  history.
- Helper and attached-user metadata never creates an owner rivalry.
- Franchise-versus-franchise rivalry is a different future model. Prestigio
  versus Wade's franchise must not be substituted for Ray/Wade or
  Jeffrey/Wade in this owner engine.

## 9. Coverage and confidence

The Rivalry Engine carries both directional Head-to-Head coverage states
forward without reducing them to a boolean. Implemented interpretation
metadata includes:

```ts
type RivalryCoverage = Readonly<{
  headToHeadStates: readonly [OwnerHeadToHeadCoverageState, OwnerHeadToHeadCoverageState];
  scope:
    | "full-supported-coverage"
    | "supported-era-only"
    | "supported-no-completed-meetings"
    | "unavailable-source";
  rankingRepresentsSupportedEraOnly: boolean;
  approvedOverlapSeasons: readonly number[];
  supportedOverlapSeasons: readonly number[];
  unsupportedOverlapSeasons: readonly number[];
  sourceEnabledNoMeetingSeasons: readonly number[];
}>;
```

This is a coverage qualification, not a probabilistic confidence score.

- Pre-2018-only relationships remain `unavailable-source`; they are not
  classified as “not rivals.”
- Partial-career pairs may be ranked when they have at least four competitive
  meetings across at least two distinct supported seasons. Their coverage is
  `supported-era-only`, and `rankingRepresentsSupportedEraOnly` is true.
- Active or retired status does not by itself prove or disprove rivalry. Both
  may be eligible when supported meetings exist.
- Valid overlapping owners with no completed supported meeting receive
  `available-no-completed-pair-meetings` and no score.
- Pairs with no approved tenure overlap or noncompetitive profiles are not
  applicable.
- Curated recognition may be displayed with unavailable coverage, but factual
  metrics and a calculated score remain unavailable.
- Acquisition or initialization failure must throw; it is never a coverage
  state or a valid empty rivalry set.

Full and supported-era coverage use the same approved eligibility threshold.
Unavailable-source and zero-completed-meeting records remain unranked.

## 10. Streak recommendation

Streaks should remain **deferred to a future analytics layer**.

They are not needed to establish Rivalries 2.0's pair model, factual
reconciliation, dimensions, or curated recognition. Current summary fields are
intentionally `null`, and the legacy Hub's browser-calculated current streak is
not approved. A later streak layer would need explicit decisions for ties,
eligible classifications, chronological ordering, multi-week contests,
season boundaries, and playoff-only variants. Rivalry records may reserve a
nullable analytics reference, but Phase 5.4 must not calculate it.

## 11. Legacy Rivalry Hub audit

`app/league-info/rivalries/page.tsx` is a single client component containing
hard-coded acquisition, identity, factual arithmetic, subjective logic, and
presentation.

| Current behavior | Classification | Migration treatment |
| --- | --- | --- |
| Hard-coded 2018–2026 league IDs and direct roster/Week 1–17 fetches | Unsafe legacy acquisition | Remove after migration; use the existing strict server acquisition/initialization path outside the Rivalry builder |
| Hard-coded Sleeper-ID `MANAGER_MAP` | Hard-coded content and unsafe identity | Replace with canonical owner identity/presentation selectors |
| Ray and Jeffrey combined as `Ray & Jeffrey` | Incorrect owner model | Replace with separate canonical owner pairs |
| `owner_id` or Sleeper `co_owners` roster resolution | Unsafe helper/co-owner attribution | Replace with approved owner projection/detail facts |
| Weekly `matchup_id` equality | Unsafe legacy calculation | Replace with canonical matchup keys; current check can match missing IDs and duplicate multi-week playoffs |
| Meeting count and all-time record | Duplicated approved fact, currently unsafe | Use `OwnerOpponentMatchupSummary.records.overall` and `meetings` with explicit scopes |
| Wins bar and series leader | Presentation derived from duplicated record | Present approved pair perspectives |
| Points and average points per game | Duplicated facts plus page arithmetic | Use approved points; any average belongs in the future engine/presentation contract |
| Biggest blowout | Unsafe ambiguous calculation | Use directional largest win/loss or define a symmetric largest-margin fact explicitly |
| Closest shave | Duplicated approved extreme, currently unsafe | Use the approved closest-meeting reference |
| Last meeting and last-five list | Duplicated ordered factual display | Use approved newest-first Head-to-Head meetings |
| Current streak | Deferred, unsafe analytics | Remove until a future streak layer is approved |
| `Blood Feud`, `Heated`, `Competitive`, `Cold` | Subjective unapproved thresholds | Remove; do not migrate thresholds into the engine |
| Playoff record unavailable | Incorrect hard-coded content | Use approved championship-playoff and championship-game splits |
| Full matchup history and modal | Reusable product concept, unsafe data path | Link to or reuse the approved Head-to-Head route/detail presentation |
| Featured rivalries | Not implemented | Build later from calculated and recognized lanes after policy approval |
| Same-owner selection | Not explicitly prevented | Canonical pair resolver must reject self-pairs |
| Empty “no matchups found” statement | Coverage-unsafe | Use explicit pair coverage; unsupported history is not proof of no relationship |

Additional defects in the legacy record path:

- it mixes regular, winners-bracket, third-place, placement, consolation, and
  Toilet Bowl meetings;
- it does not verify canonical completion;
- ties increase the meeting count but are absent from the displayed win record;
- it has no canonical lineage or correction version;
- it can attribute Aaron or another attached helper as an owner; and
- its year/week/roster display keys are not stable history keys.

No current threshold, label, streak, or local aggregate should be reused as
the Rivalry Engine contract.

## 12. Manager Profile integration model

The current Overview's “Primary Rival” is chosen from directional
`survey.rivalOwnerId` metadata and displays factual
`OwnerOpponentMatchupSummary` values when that pair exists. This is a valid
separation of curated identity and factual display, but its provenance is not
strong enough to call every value commissioner-recognized.

Recommended future behavior:

- preserve a curated/recognized primary rival when explicitly approved;
- allow multiple recognized rivalries in the engine;
- separately expose the top calculated rivalry when scoring is approved;
- if curated and calculated selections match, show one card with both labels;
- if they differ, label them separately as “Recognized Rival” and “Top
  Calculated Rivalry”; and
- never replace a curated value silently because a score changes.

The profile should eventually consume a serialized Rivalry presentation model.
React must not select the rival, calculate a score, reconcile perspectives, or
interpret coverage. No profile change is part of this phase.

## 13. Future Rivalry Hub product model

The Hub should support multiple factual and interpretive lenses rather than a
single score-only leaderboard:

- Featured Rivalries — explicit commissioner-recognized priority plus approved
  presentation selection;
- Commissioner-Recognized Rivalries — curated recognition regardless of score;
- Most Competitive — approved balance/closeness dimensions;
- Most Played — competitive meeting count;
- Most Postseason Meetings — championship-playoff count;
- Championship Rivalries — title-game meetings, explicitly a playoff subset;
- Recently Active — approved recent window;
- Most One-Sided — dominance dimension, clearly not “best rivalry”; and
- Longest-Running — seasons-met or approved longevity measure.

Every section must show coverage limitations and deterministic ordering. Hub
filters should use canonical owners, not Sleeper accounts. Retired owners may
appear where historically supported; noncompetitive staff and helpers do not.

## 14. Detail-route recommendation

Use the existing factual route:

```text
/managers/owners/[owner]/opponents/[opponent]
```

for meeting records and the detailed factual series. Rivalry Hub cards should
link there initially. Do not create a second rivalry detail route during the
first Rivalries 2.0 implementation.

If the league later approves enough curated narrative or analytics to justify
a distinct experience, a rivalry route may wrap or link to the same factual
Head-to-Head data without copying it. Until then, option C—no separate rivalry
detail route—is the cleanest model.

## 15. Implemented public types and APIs

`lib/history/rivalryHistory.ts` exports immutable types including:

```ts
type RivalryDimensionScores = Readonly<{
  competitiveness: RivalryDimensionScore;
  frequency: RivalryDimensionScore;
  postseasonSignificance: RivalryDimensionScore;
  recency: RivalryDimensionScore;
  longevity: RivalryDimensionScore;
}>;

type RivalrySummary = Readonly<{
  rivalryKey: string;
  ownerIds: readonly [string, string];
  directionalRelationships: readonly [RivalryDirectionalReference, RivalryDirectionalReference];
  eligibility: RivalryEligibility;
  calculatedScore: number | null;
  calculatedRank: number | null;
  rawDimensionInputs: RivalryRawDimensionInputs;
  dimensions: RivalryDimensionScores;
  factual: RivalryFactualContext;
  coverage: RivalryCoverage;
  curated: RivalryCuratedMetadata | null;
  methodologyVersion: "rivalry-score-v1";
  streaks: null;
}>;
```

Directional references retain approved relationship and opponent-summary keys
plus factual extreme references. The engine validates records and meeting
perspectives but does not build another matchup record or meeting log.

Implemented APIs:

```ts
buildRivalries(input)
getAllRivalries()
getRivalry(ownerA, ownerB)
getRivalriesForOwner(ownerIdOrSlug)
getTopRivalries(filter?)
getRecognizedRivalries()
getRivalryCoverage(ownerA, ownerB)
getRivalryScoreMethodology()
getRivalryBuildCoverage()
```

`buildRivalries(input)` is deterministic, acquisition-free, offline testable,
and supplied approved Head-to-Head details and meetings plus separately typed
curated metadata. Accessors use an initialized immutable cache, throw before
initialization, return immutable clones, and preserve the prior valid cache
after a failed rebuild.

Factual APIs remain in Owner Matchup Summary and Owner Head-to-Head Detail.
Rivalry APIs expose pair normalization, approved derived dimensions,
interpretation, recognition, and coverage. They must not become an alternate
meeting-log or record engine.

## 16. Validation strategy and implementation

`scripts/rivalries-2.test.ts` uses supplied in-memory fixtures and proves:

1. pair keys are deterministic and use sorted canonical owner IDs;
2. Ray/Wade and Wade/Ray produce one rivalry record;
3. both directional factual records reconcile and invert correctly;
4. unique pair meeting counts reconcile to canonical matchup keys;
5. reverse duplicates and duplicate meeting keys are rejected;
6. Ray/Jeffrey produces no teammate rivalry;
7. Ray/Wade and Jeffrey/Wade remain separate personal pairs;
8. shared physical Prestigio contests do not inflate physical league totals;
9. Jordan/Landon includes opposing seasons only through 2024;
10. shared Shake-N-Bakers ownership from 2025 emits no rivalry meeting;
11. Landon's Special Brownies franchise context is preserved;
12. Aaron and Billy's temporary helpers receive no rivalry record;
13. pre-2018 unsupported history creates no fabricated score or negative
    rivalry conclusion;
14. partial coverage remains visible in ranking output;
15. byes and incomplete contests never enter a dimension;
16. multi-week playoffs remain one canonical meeting;
17. championship games remain a subset of championship-playoff meetings;
18. secondary classifications remain separate from default competitive scope;
19. raw dimensions and score are deterministic for a fixed policy version;
20. scale normalization prevents raw meeting counts from dominating simply
    because their numeric range is larger;
21. curated recognition can force inclusion without changing factual values or
    calculated score;
22. source inputs and outputs remain immutable;
23. failed rebuild preserves the prior valid cache; and
24. accessors throw before initialization.

It additionally verifies the four-meeting/two-season eligibility threshold,
the exact five weights and weighted sum, deterministic midrank ties,
title-game postseason premium, null-score ranking exclusion, supported-era
coverage, retired-owner eligibility, legacy-profile non-promotion, no streak
or franchise-rivalry calculation, and upstream input immutability.

Regression tests for Canonical Matchup History, Owner Matchup Projection,
Owner Matchup Summary, and Owner Head-to-Head Detail remain mandatory.

## 17. Special-case findings

### Ray Long / Wade Cameron

This is the current curated profile selection for Ray. Approved factual data
supports 12 all-completed directional meetings in the existing profile/detail
path; the competitive record and all-meeting count must remain separately
labeled. The pair is valid scoring evidence, not proof by itself that the
league recognizes it as the top rivalry.

### Jeffrey Hudgins / Wade Cameron

This is a separate canonical owner relationship from Ray/Wade. Jeffrey's
profile value is commissioner-curated, and supported Prestigio seasons provide
Jeffrey's own directional credits. The pair must not be merged into a single
“Ray & Jeffrey” identity.

### Ray Long / Jeffrey Hudgins

The pair is `not-applicable` as an opponent rivalry. They share Prestigio from
2013 onward, Jeffrey receives no 2011 credit, and no teammate contest becomes
a rivalry meeting.

### Jordan Maslyn / Landon Elliott

Their supported opponent meetings end in 2024. Co-ownership of Shake-N-Bakers
beginning in 2025 adds no meetings, but it does not erase their earlier
owner-versus-owner history.

### Landon Elliott / historical opponents

Landon's earlier Special Brownies meetings remain his personal historical
relationships and retain Special Brownies franchise context. His 2025 move to
shared Shake-N-Bakers ownership neither transfers those meetings to Jordan nor
creates a franchise successor relationship. Rivalry significance for any
specific Landon pair still requires calculated evidence or curation.

### Tommy Moore / David Besedich

Their separate 2022 platform placements and shared league-recognized
co-championship are season-result facts. A Head-to-Head title-game meeting, if
present in approved detail, is factual rivalry input; the co-champion ruling
must not rewrite that meeting result or automatically declare a rivalry.

### Retired owners

Retirement does not invalidate supported historical opponent facts. Retired
pairs may be ranked in historical Hub sections if they meet the approved
minimum evidence and coverage rules. Whether active status affects recency or
featured placement is a separate product decision.

### Pre-2018-only and partial-coverage pairs

Pre-2018-only overlap is `unavailable-source` and cannot support a calculated
rank. A recognized rivalry may still be shown with that limitation. Partial
career pairs may be measured only for the supported era and must carry an
explicit caveat when compared with fully supported pairs.

## 18. Implementation status and remaining sequence

Completed in Phase 5.4A:

1. `lib/history/rivalryHistory.ts` implements the approved acquisition-free,
   deterministic interpretation layer.
2. One undirected record is built from two reconciled directional factual
   relationships.
3. V1 eligibility, raw inputs, normalization, weighted contributions, score,
   rank, coverage, and optional recognition metadata are explicit and
   immutable.
4. `scripts/rivalries-2.test.ts` covers the approved policy and integrity
   requirements entirely offline.

Deferred sequence:

1. Audit and approve current `survey.rivalOwnerId` values as owner-submitted,
   commissioner-recognized, or profile-only; do not infer provenance.
2. Create a typed curated-rivalry data module only after those approvals.
3. Add a server-only initializer/loader that reuses the approved matchup
   initialization path and serializes presentation data.
4. Migrate factual Rivalry Hub content away from direct Sleeper acquisition and
   local identity maps; link detailed receipts to the existing Head-to-Head
   route.
5. Add separately labeled calculated and commissioner-recognized Hub sections.
6. Update the Manager Profile rival snapshot only after selection and
   provenance behavior is approved.
7. Defer a narrative rivalry detail route and all streak analytics until they
    have independent approved contracts.

## 19. Remaining commissioner decisions

No decision remains for the Phase 5.4A score engine. Future integration still
requires approval of:

1. the provenance and recognition status of each current Manager Profile
   `survey.rivalOwnerId` value;
2. the first actual engine-level recognized rivalry records, names, stories,
   start seasons, and display priorities;
3. whether owners may have multiple recognized rivalries in Hub presentation;
4. how calculated and recognized sections are arranged in the future Hub;
5. whether the Manager Profile shows recognized, top-calculated, or both when
   they differ; and
6. whether a later franchise-rivalry product should be commissioned as a
   separate engine.

Streaks remain deferred to a future analytics layer. They are not a pending
Phase 5.4A engine decision.
