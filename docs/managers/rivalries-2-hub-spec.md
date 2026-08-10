# Rivalries 2.0 Hub Product Specification

Status: Phase 5.4B product-discovery deliverable. The Rivalries 2.0 Hub, its
presentation loader, Manager Profile integration, and recognized-rivalry
metadata remain unimplemented.

## 1. Scope and architecture boundary

The future Hub is a presentation of the approved factual and interpretive
chain, not a new calculation engine:

```text
Canonical Matchup History
  -> Owner Matchup Projection
  -> Owner Matchup Summary
  -> Owner Head-to-Head Detail
  -> Rivalries 2.0 Engine
  -> server-only Rivalry Hub presentation loader
  -> Rivalry Hub React presentation
```

The product must preserve these boundaries:

- one canonical matchup key represents one physical contest;
- co-owners receive separate owner credits without creating extra physical
  contests;
- `regular` and `championship-playoff` are the only competitive-scope
  classifications;
- third-place, placement, consolation, and Toilet Bowl meetings remain
  separate factual classifications;
- `championship-playoff` includes winners-bracket playoff games, while
  `isChampionshipGame` identifies only a title-deciding game;
- supported factual opponent history is distinct from rivalry interpretation;
- calculated rank is distinct from curated recognition;
- unsupported pre-Sleeper history must not be presented as a zero, a loss, or
  proof that two owners never met; and
- streak analytics remain null and are deferred to a future analytics layer.

This phase does not change the Rivalry Engine, Head-to-Head engine or route,
history or matchup engines, Manager Profiles, navigation, or the current Hub.
It creates no rivalry records and approves no recognition metadata.

### Product goals

- Make the league's highest-ranked supported rivalries visible immediately.
- Let users explore the same approved facts through distinct, understandable
  category lenses without creating competing score formulas.
- Make every score explainable through its five approved components.
- Preserve retired-owner history and clearly label partial source coverage.
- Move users naturally into the existing factual Head-to-Head detail route.
- Keep calculated ranking and future curated recognition visibly separate.
- Deliver a compact, fast, accessible experience at 1440px and 390px.

## 2. Files reviewed

Current Hub:

- `app/league-info/rivalries/page.tsx`

Approved Rivalry Engine and methodology:

- `lib/history/rivalryHistory.ts`
- `docs/managers/rivalries-2-engine-spec.md`

Approved Head-to-Head presentation and route:

- `lib/history/ownerHeadToHeadDetail.ts`
- `lib/managers/ownerHeadToHeadLoader.ts`
- `components/managers/OwnerHeadToHeadPage.tsx`
- `app/managers/owners/[owner]/opponents/[opponent]/page.tsx`
- `docs/managers/owner-head-to-head-detail-spec.md`

Shared initialization and Manager Profile compatibility:

- `lib/managers/ownerMatchupSummaryLoader.ts`
- `components/managers/OwnerProfile.tsx`
- `app/managers/owners/[owner]/page.tsx`
- `lib/managers/identityData.ts`
- `lib/managers/identitySelectors.ts`

The approved Rivalry Engine currently contains 250 undirected owner-pair
records: 82 are calculated-ranking eligible, 168 are unranked, 38 eligible
records have supported-era-only coverage, and zero are recognized.

## 3. Current Hub audit

The current page is a client-side Sleeper scanner rather than a consumer of the
approved engines. It hard-codes league IDs and an incomplete Sleeper-user map,
then fetches every season and week after the user selects two entries. Its
local calculations do not apply the canonical completion, bracket,
classification, multi-week aggregation, ownership-tenure, or helper-account
rules.

| Current element | Decision | Product treatment |
| --- | --- | --- |
| Sticky back navigation and Hub label | Preserve concept | Keep the route context and existing visual language; use the site's established navigation shell when implementation begins. |
| Swords icon and face-off identity imagery | Preserve concept | Reuse on ranked cards with canonical owner identity and approved photos. Do not use Sleeper IDs as identity. |
| Large centered hero | Redesign | Retain a concise title and description, but reduce vertical space so ranked content is visible near the fold. |
| Two large owner selectors and `VS` control | Redesign | Replace the mandatory pair scanner with an optional single-owner filter. Pair selection belongs on the factual Head-to-Head route, not as the Hub's entry gate. |
| Blank initial state until two owners are selected | Remove | The Hub must open with populated Top Rivalries and a category explorer. |
| Hard-coded league history and manager map | Remove | Use approved server acquisition, canonical owner identity, and engine outputs. |
| Browser-side Sleeper requests | Remove | Acquisition and engine initialization remain server-side and shared. |
| Loading spinner for a new full-history scan | Replace | Use the route's normal server loading/error boundary. Client filters must use already serialized compact data. |
| Red/blue win-share bar | Redesign | A compact series record may remain, but it must not be confused with the five-component rivalry score. |
| Wins, average points, and total meetings | Replace data | Use approved directional summary facts. Detailed points belong primarily on Head-to-Head. |
| `Blood Feud`, `Heated`, `Competitive`, and `Cold` intensity labels | Remove | These thresholds are unapproved subjective calculations and are not Rivalry Engine outputs. |
| Series leader | Preserve concept, replace data | Present a factual competitive record from a stated canonical perspective. |
| Current streak | Remove and defer | No streaks may be calculated. Deferred to future analytics layer. |
| Last meeting winner | Redesign | Latest supported season is useful on compact cards; the full latest-meeting result remains on Head-to-Head. |
| Biggest blowout and `Closest Shave` | Redesign | Use the approved largest/closest references only in an expanded factual disclosure or link to Head-to-Head. Avoid the legacy label. |
| `Playoff record unavailable` | Replace | Show separate approved championship-playoff and championship-game counts. |
| Recent Heat / last-five strip | Remove | It is a legacy client calculation and an incomplete duplicate of the Head-to-Head meeting log. |
| Full-history accordion | Remove | Link to the approved Head-to-Head route, which already owns ordered meetings and filters. |
| Match detail modal | Remove | Do not duplicate the Head-to-Head detail experience in the Hub. |
| Black, white, red, borders, uppercase labels, and circular portraits | Preserve visual language | Reuse without assigning good/bad meaning through color alone. |
| Client-side scan failure message | Replace | Server acquisition failures must surface as failures and must never appear as a valid empty Hub. |

The current page contains no separate reusable Hub component and no approved
featured-rivalry cards. Its useful assets are the face-off visual idea, concise
series comparison, clear route identity, and recognizable River City styling.
Its calculations and identity map must not survive the migration.

## 4. Recommended information architecture

The Hub should have two levels rather than seven fully expanded sections.

1. **Top Rivalries** is the stable lead section. It displays the top three
   calculated, eligible rivalries for the selected owner/status scope.
2. **Explore Rivalries** displays one selected category at a time:
   - Most Competitive
   - Most Played
   - Championship Rivalries
   - Biggest Series Leads
   - Recently Active
   - Recognized Rivalries

Top Rivalries should remain visible because it answers the page's primary
question. The other views are alternate factual lenses, not competing main
rankings. Showing only one explorer category at a time keeps the page short
and gives each category a clear explanation.

On desktop, use a compact tab list for explorer categories. On mobile, use a
labelled native `select` so all categories remain reachable without horizontal
page overflow. Do not render every category's card list into the visible page
at once.

## 5. Default experience and controls

The default Hub experience should be:

- owner filter: **All League**;
- owner-status scope: **All Owners**;
- Top Rivalries: three cards;
- explorer category: **Most Competitive**; and
- explorer result count: five cards initially.

`All Owners` is preferable to an `All-Time` label because the underlying
matchup source begins in 2018. It includes active and historical canonical
owners but does not imply complete pre-Sleeper matchup coverage. The alternate
scope is `Active Owners`.

Each category should initially show five cards and offer a progressive `Show
more` action when additional results exist. Top Rivalries remains limited to
three because it is the editorial lead, not the full ranking table.

The controls should be ordered:

1. owner filter;
2. All Owners / Active Owners scope;
3. explorer category; and
4. optional Show more.

Changing owner or status scope filters already ranked and ordered server
presentation data. React must not recompute scores or rerank ties.

## 6. Top Rivalries

Top Rivalries uses `getTopRivalries()` and includes calculated-ranking-eligible
pairs only. The engine's existing rank and deterministic tie-break order remain
authoritative.

Each top card should show:

- calculated rank, formatted as `#1`;
- calculated score rounded to one decimal for display;
- both canonical owners with approved photos and names;
- concise current-or-most-recent team context when available;
- competitive series record with its perspective named;
- competitive meeting count;
- latest competitive meeting season;
- factual championship-playoff and championship-game indicators when nonzero;
- a supported-era badge when coverage is partial; and
- `View Head-to-Head`.

Display both rank and score. Rank gives immediate league context; score helps
compare nearby cards. One decimal is sufficient. If two exact scores display
the same rounded value, preserve the engine's unique deterministic ranking and
explain in the method disclosure that approved tie-breaks resolve equal or
equally displayed scores. Do not invent shared ranks.

### Why this ranks here

Every top card should have an accessible `Why this ranks here` disclosure. It
must show the five approved components:

- Competitiveness — 30%
- Frequency — 25%
- Postseason Significance — 20%
- Recency — 15%
- Longevity — 10%

Use five labelled horizontal mini-bars. Each bar displays its normalized value
as a whole percentage and its fixed weight in text. The disclosure may also
show the approved raw input in plain language, such as meeting count, playoff
count, latest season, or span.

Do not use a radar chart: it is difficult to compare, poor at small sizes, and
harder to make accessible. Do not use a red-to-yellow-to-green gradient: the
dimensions are contributors, not good/bad ratings. Do not use one segmented
composition bar as the only explanation because it hides the difference
between normalization and weighting.

## 7. Most Competitive

Most Competitive must use only the 82 calculated-ranking-eligible pairs. The
minimum remains four competitive meetings across at least two seasons. A
one-game 1-0 or 0-1 series is never eligible for this list.

Order by:

1. approved competitiveness normalized value, descending;
2. competitive meetings, descending;
3. competitive seasons, descending;
4. latest competitive season, descending; and
5. canonical rivalry key, ascending.

The card should emphasize series record, winning percentage or series balance,
and competitive meeting count. It may still show the overall calculated rank,
but must label the category as a competitiveness lens rather than a second
definition of the overall rivalry score.

## 8. Most Played

Most Played should use competitive meetings as its primary count. This keeps
the category aligned with the approved rivalry scope: regular season plus
championship playoff. Show all completed meetings as a smaller secondary fact
when it differs, so third-place, placement, consolation, and Toilet Bowl
history is preserved without changing the competitive ranking.

Use calculated-ranking-eligible pairs for the default category leaderboard.
Unranked and coverage-only pairs remain discoverable through an owner filter
and explicit coverage states, but should not displace evidence-supported
relationships in a league leaderboard.

Order by:

1. competitive meetings, descending;
2. competitive seasons, descending;
3. latest competitive season, descending;
4. calculated score, descending; and
5. canonical rivalry key, ascending.

## 9. Championship Rivalries

Championship Rivalries is a factual category and may include any supported pair
with at least one championship-playoff meeting, even when the pair does not
meet the calculated rivalry eligibility minimum. The card must distinguish:

- **Title Games**: meetings where `isChampionshipGame` is true; and
- **Championship Playoff**: all winners-bracket playoff meetings, including
  earlier rounds and the title game.

Title-game meetings should be the primary ordering signal because they are the
most specific championship event. Order by:

1. championship-game meetings, descending;
2. championship-playoff meetings, descending;
3. latest competitive season, descending;
4. competitive meetings, descending; and
5. canonical rivalry key, ascending.

The UI must never call every championship-playoff meeting a championship game.
A pair may therefore show `1 Title Game · 3 Championship Playoff Meetings`.

## 10. Biggest Series Leads

Use **Biggest Series Leads** rather than `Most Dominant`. It describes a factual
series state without assigning a permanent quality judgment to an owner.

Use the approved directional competitive record to identify the leader and the
absolute difference between competitive wins and losses. The server
presentation layer may select the canonical `ownerA` perspective and format
the inverted owner relationship; React must not calculate the difference.
Eligibility remains the same four-meeting/two-season minimum used for
calculated ranking.

Order by:

1. absolute competitive win/loss lead, descending;
2. absolute distance of competitive winning percentage from .500, descending;
3. competitive meetings, descending;
4. latest competitive season, descending; and
5. canonical rivalry key, ascending.

Ties do not inflate a series lead. They remain visible in the displayed record.
This category does not add a dominance component to the approved rivalry score.

## 11. Recently Active

Recently Active must not introduce decay, a rolling window, or a new score.
Use the approved latest competitive meeting season already represented by the
Rivalry Engine's recency input.

Use calculated-ranking-eligible pairs and order by:

1. latest competitive meeting season, descending;
2. calculated score, descending;
3. competitive meetings, descending; and
4. canonical rivalry key, ascending.

This definition is deterministic and transparent. It describes recently active
supported rivalries; it does not claim that recent rivalries are more
important than older ones.

## 12. Recognized Rivalries

Recognized Rivalries remains a visible, selectable category even while the
approved count is zero. Its initial empty state should say:

> No rivalries have been formally recognized yet. Calculated rankings remain
> available while recognition records are curated separately.

Do not seed examples from current Manager Profile `rivalOwnerId` fields. Those
fields are profile-selected identity metadata with unresolved provenance, not
approved engine recognition records.

When records are later approved, show provenance as:

| Engine source | Presentation label |
| --- | --- |
| `commissioner` | Commissioner recognized |
| `owner-a` | Recognized by [resolved owner A name] |
| `owner-b` | Recognized by [resolved owner B name] |
| `mutual` | Mutually recognized |

Recognized cards may also show an approved rivalry name or note when present.
Recognition can include or prioritize a pair, but it must not overwrite the
calculated score, factual record, coverage, or rank. A recognized but unranked
pair must be labelled `Recognized · Not calculated-ranking eligible` rather
than assigned a score.

## 13. Owner and status filtering

The optional owner selector should contain `All League` plus separate canonical
owners. It uses `getRivalriesForOwner()` through the server presentation layer.
Ray and Jeffrey must remain separate selectable owners and separate rivalry
perspectives. Co-ownership of Prestigio must never collapse their identities or
create a Ray-versus-Jeffrey rivalry.

Owner choices should use canonical ID, slug, name, status, approved photo, and
current-or-most-recent franchise context. Sleeper co-owner or helper metadata
must not create an option.

The status control should default to `All Owners` and offer `Active Owners`.
Historical and retired owners remain valid rivalry participants. Active-only
means both owners have active status, matching the approved engine filter. It
must not modify recency, eligibility, recognition, or score.

Filtering behavior:

- Top Rivalries becomes that owner's highest calculated rivalries when an
  owner is selected.
- Explorer categories preserve their approved server order and retain only
  matching cards.
- Recognized Rivalries shows only recognition records involving that owner.
- If no pair qualifies for the selected category, show a scoped empty state;
  do not silently fall back to unrelated league results.

## 14. Card states and Head-to-Head boundary

### Compact card

The compact card is the default list unit. It contains identity, the
category's primary fact, concise series context, coverage when material, and a
Head-to-Head link. It should not contain a meeting log.

### Expanded card

An optional in-place disclosure may show:

- the five score-component mini-bars;
- regular versus championship-playoff meeting counts;
- all-completed versus competitive meeting counts;
- calculated eligibility or recognition provenance;
- supported-era coverage text; and
- approved closest/largest meeting references as concise links or labels.

### Head-to-Head detail

The existing route owns:

- points for and against;
- full directional record breakdowns;
- first and latest meeting cards;
- closest meeting, largest win, and largest loss cards;
- complete ordered meeting history;
- classification filters;
- multi-week scoring-period detail; and
- per-meeting franchise and co-owner context.

The Hub CTA should be **View Head-to-Head**. Its route direction must always use
the Rivalry Engine's deterministic `ownerA`, then `ownerB`:

```text
/managers/owners/[ownerA-slug]/opponents/[ownerB-slug]
```

The compact series record must say `Record from [owner A name]'s perspective`
or use an unambiguous sentence such as `[name] leads 7-4-1`. Do not place an
unlabelled directional `7-4-1` between two owners.

## 15. Coverage and empty states

Coverage language must be concise and never imply missing games are losses.

| State | Hub treatment |
| --- | --- |
| Full supported history | No badge required on compact cards; disclose `Supported matchup history available for the full approved tenure overlap.` |
| Supported-era-only | Badge `Supported era`; detail `Calculated from available Sleeper matchup history beginning in 2018. Earlier matchup-level history is unavailable.` |
| Insufficient meetings | `Not ranked · [count] of 4 required competitive meetings.` |
| Insufficient seasons | `Not ranked · [count] of 2 required competitive seasons.` |
| Supported, no completed pair meetings | `No completed meetings in the supported source-enabled seasons.` |
| Unavailable source | `Pre-Sleeper matchup source unavailable. No matchup record is inferred.` |
| No approved tenure overlap | `No approved seasons in which both owners participated.` |
| Not applicable | Do not create a rivalry card; explain only when a direct owner selection produces this state. |

Global acquisition or build failure is an error state, not an empty state. The
Hub must not render `No rivalries` after a failed Sleeper request.

Other empty states:

- filtered owner/category: `No [category] entries meet the approved criteria
  for [owner] in this scope.`
- active-only: `No active-owner pairs meet the approved criteria in this
  category.`
- Recognized: use the explicit uncurated-state wording in section 12.

## 16. Score method and explanatory copy

The Hub should include a short `How rankings work` disclosure near Top
Rivalries:

> Calculated rivalry scores combine competitiveness, frequency, postseason
> significance, recency, and longevity across supported matchup history.
> Regular-season and championship-playoff meetings define the competitive
> record. Secondary placement and Toilet Bowl meetings remain factual context
> and do not affect the score. Recognition is curated separately.

The disclosure should also state:

- minimum eligibility is four competitive meetings in two seasons;
- dimensions are normalized against the eligible league population;
- ranks may change when that eligible population changes;
- supported-era scores do not claim complete pre-2018 matchup history;
- title games receive their approved postseason treatment within the engine;
- no streak data is calculated; and
- methodology version is `rivalry-score-v1`.

Avoid decimal clutter. Use one decimal for the overall score, whole percentages
for component bars, and integer counts for meetings and seasons. Exact raw
scores remain in the engine and need not be printed in the UI.

## 17. Presentation model and server data flow

Implementation should introduce a small server-only presentation adapter, for
example:

```text
lib/managers/rivalryHubLoader.ts
```

Recommended serialized types:

```ts
type RivalryHubPresentation = Readonly<{
  methodology: RivalryMethodologyPresentation;
  ownerOptions: readonly RivalryOwnerOptionPresentation[];
  cardsByKey: Readonly<Record<string, RivalryCardPresentation>>;
  topRivalryKeys: readonly string[];
  categories: readonly RivalryCategoryPresentation[];
  recognizedEmptyMessage: string | null;
}>;

type RivalryCategoryPresentation = Readonly<{
  id:
    | "most-competitive"
    | "most-played"
    | "championship"
    | "biggest-series-leads"
    | "recently-active"
    | "recognized";
  label: string;
  description: string;
  orderedRivalryKeys: readonly string[];
}>;

type RivalryCardPresentation = Readonly<{
  rivalryKey: string;
  ownerA: RivalryOwnerPresentation;
  ownerB: RivalryOwnerPresentation;
  headToHeadHref: string;
  rankLabel: string | null;
  scoreLabel: string | null;
  seriesLabel: string | null;
  seriesPerspectiveLabel: string | null;
  competitiveMeetingsLabel: string;
  allCompletedMeetingsLabel: string | null;
  latestSeasonLabel: string | null;
  championshipPlayoffLabel: string | null;
  championshipGameLabel: string | null;
  coverage: RivalryCoveragePresentation;
  eligibilityLabel: string | null;
  recognition: RivalryRecognitionPresentation | null;
  scoreComponents: readonly RivalryScoreComponentPresentation[];
}>;
```

The exact names may adapt during implementation, but the boundary must remain:
the server resolves engine records, identity, route direction, labels,
eligibility, coverage, category order, and score components; React renders
those approved values and applies interaction state only.

React may:

- select an owner, status scope, or category;
- preserve the server-provided order while filtering by serialized owner and
  status membership;
- expand a card disclosure;
- reveal more already ordered cards; and
- format responsive layout.

React must not:

- calculate a matchup record or margin;
- classify a meeting;
- count physical contests or owner credits;
- determine eligibility;
- normalize or weight score components;
- rank or tie-break rivalries;
- infer recognition;
- infer coverage; or
- build a Head-to-Head route from noncanonical identity.

## 18. Initialization, performance, and failure handling

`lib/managers/ownerMatchupSummaryLoader.ts` currently supplies the shared
server-only acquisition path. Its module-level initialization promise acquires
Sleeper input once per server process, then builds canonical matchups, owner
projections, owner summaries, and Head-to-Head detail. The future Hub loader
should extend or compose that approved initialization path; it must not start a
second browser or server acquisition chain.

Recommended implementation behavior:

1. await the shared initialization promise;
2. build Rivalry Engine output once from the already built Head-to-Head data;
3. cache the successful Rivalry build/presentation promise at the server
   module boundary;
4. preserve the existing failure semantics so acquisition failure rejects;
5. serialize only compact card facts, owner options, category key order, and
   method copy; and
6. keep the 1,818-meeting log out of the Hub payload.

The approved Rivalry population is only 250 compact records. Serializing a
deduplicated `cardsByKey` map plus ordered category-key arrays is preferable to
duplicating the same cards in every category. Filtering a preordered array by
owner or status preserves server-approved order without client reranking.

Only the selected explorer category should render. Expanded explanation content
may be present in compact serialized form, but full meeting records remain
lazy by navigation to Head-to-Head. A failed acquisition or Rivalry build must
surface through an error boundary and must not overwrite or masquerade as a
valid empty result.

## 19. Desktop and mobile layout

### Desktop at approximately 1440px

- Use the existing constrained League Info content width.
- Keep the hero concise.
- Place owner and status controls in one responsive control row.
- Display the top three cards in a three-column grid.
- Render the explorer category controls immediately below Top Rivalries.
- Display five explorer cards in a compact two-column grid, with the highest
  result spanning or leading the grid only if this does not imply a separate
  score.
- Keep score explanations inside card disclosures rather than permanently
  expanding page height.

### Mobile at approximately 390px

- Use a single-column card stack.
- Use labelled native selects for owner and category.
- Use a compact two-option control for All Owners / Active Owners; allow it to
  wrap within the viewport.
- Keep both owner portraits visible at reduced size without overlapping names.
- Stack category facts below identities instead of compressing them into a
  table.
- Make the full card or a clearly visible control lead to Head-to-Head, but do
  not nest interactive controls inside an outer link.
- Keep `Why this ranks here` collapsed by default.
- Ensure long names, team names, labels, and coverage copy wrap rather than
  introducing horizontal page overflow.

The mobile order remains Top Rivalries, category selector, selected category,
then method disclosure. It must not become seven consecutive carousels or
horizontal tables.

## 20. Accessibility and tone

Accessibility requirements:

- use one `h1`, then logical `h2` category and method headings;
- if desktop category controls use tabs, implement complete `tablist`, `tab`,
  and `tabpanel` keyboard behavior, including arrow-key movement and managed
  focus; use a labelled native select on mobile;
- use native labels for owner/category selects and a fieldset or correctly
  pressed buttons for owner-status scope;
- provide visible focus styles consistent with the current red accent;
- use meaningful owner-photo alt text and decorative treatment for duplicate
  iconography;
- expose score-component names and values as text, not color alone;
- use native `details`/`summary` or a button with `aria-expanded` and
  `aria-controls` for explanations;
- do not make hover the only way to read methodology or coverage details;
- give Head-to-Head links names such as `View Ray Long vs Wade head-to-head`;
- announce Show more count changes without unexpectedly moving focus; and
- retain sufficient contrast in light and dark themes.

Tone should be competitive, factual, concise, and recognizably River City.
Approved words include `Top Rivalries`, `Most Competitive`, `Most Played`,
`Championship Rivalries`, `Biggest Series Leads`, and `Recently Active`.
Do not generate labels such as `heated`, `cold`, `blood feud`, `nemesis`,
`owns`, or `revenge` from scores. Rivalry names, stories, trash talk, and
emotional language require explicitly curated content with provenance.

## 21. Future Manager Profile compatibility

The future Manager Profile rivalry presentation should keep curated and
calculated lanes visibly distinct:

| State | Profile treatment |
| --- | --- |
| Recognized rivalry is also top calculated | One combined card with separate `Recognized` provenance and `#N calculated` facts. |
| Recognized rivalry differs from top calculated | Two concise entries: Recognized Rivalry first, Top Calculated Rivalry second. |
| No recognized rivalry, calculated result exists | Show Top Calculated Rivalry only. |
| Neither exists | Omit the card or show a concise factual empty state when the section is otherwise required. |

The current profile-selected rival may remain as existing profile content until
its provenance is reviewed. It must not be promoted into
`RivalryCuratedMetadata` or labelled recognized automatically.

This structure supports multiple future recognized rivalries without changing
the Hub card model. It also lets Manager Profiles link to the same deterministic
Head-to-Head route and consume the same compact card presentation.

## 22. Explicit product decisions

1. **What is the default first experience?** All League, All Owners, three Top
   Rivalries, and the Most Competitive explorer category.
2. **Tabs or sections?** One permanent Top Rivalries section plus one tabbed
   explorer on desktop and a native category selector on mobile.
3. **How many cards initially?** Three Top Rivalries and five cards in the
   selected explorer category.
4. **Show rank, score, or both?** Both: integer rank and score rounded to one
   decimal.
5. **How is the score explained?** An expandable five-mini-bar composition with
   component name, normalized whole percentage, fixed weight, and concise raw
   fact.
6. **What counts as Most Competitive?** Only calculated-ranking-eligible pairs,
   ordered by the approved competitiveness component; never a one-game series.
7. **What count drives Most Played?** Competitive meetings; all completed
   meetings appears secondarily when different.
8. **How are championship rivalries ordered?** Title-game meetings first, then
   all championship-playoff meetings, with the two counts explicitly separate.
9. **What replaces Most Dominant?** Biggest Series Leads, using the approved
   competitive record and a server-produced win/loss lead.
10. **How is Recently Active defined?** Latest approved competitive meeting
    season, then approved score; no new decay or rolling window.
11. **Should Recognized stay visible with zero records?** Yes, as an enabled
    category with an honest uncurated empty state.
12. **Should an owner filter exist?** Yes. It selects a single canonical owner;
    Ray and Jeffrey remain separate.
13. **Should retired owners appear?** Yes by default under All Owners. Active
    Owners is an alternate filter, not a score rule.
14. **How does a card reach detail?** A deterministic `View Head-to-Head` link
    using owner A then owner B canonical slugs. Full meeting detail is not
    duplicated in the Hub.
15. **How should Manager Profiles evolve?** Preserve separate recognized and
    calculated facts using the four states in section 21; never auto-promote
    legacy profile selections.

## 23. Current-to-future replacement plan

### Preserve as concepts

- Rivalry Hub route and League Info context;
- face-off owner imagery;
- strong River City black/white/red visual language;
- concise series comparison;
- expandable `receipts` concept, limited to approved factual references; and
- responsive card-based presentation.

### Replace with approved data

- owner identity and photos;
- series record and meeting counts;
- playoff and title-game context;
- closest/largest meeting references;
- team/franchise context;
- supported-history coverage; and
- every ranked or category ordering.

### Remove

- hard-coded league IDs and Sleeper identity map;
- direct browser acquisition;
- raw Sleeper `co_owners` attribution;
- local history scanning and calculations;
- intensity tiers;
- current-streak calculation;
- Recent Heat;
- full meeting-history accordion;
- match modal; and
- `Playoff record unavailable` placeholder.

### Defer

- streak analytics;
- rivalry stories, names, and trash talk;
- owner submissions and approval workflow;
- first recognized-rivalry metadata records;
- franchise-versus-franchise rivalries;
- separate rivalry detail routes;
- cross-era pre-2018 matchup reconstruction; and
- any formula revision beyond `rivalry-score-v1`.

## 24. Recommended implementation sequence

1. Add the server-only Rivalry Hub presentation loader and immutable serialized
   types.
2. Compose Rivalry Engine initialization with the existing shared server
   matchup initialization; add no new acquisition path.
3. Add presentation-layer tests for ordering, category membership, route
   direction, coverage wording, owner/status filters, and zero recognized
   records.
4. Replace the current client-side scanner with the server-fed Hub shell.
5. Implement Top Rivalries and the single-category explorer.
6. Add compact/expanded card states and Head-to-Head links.
7. Verify 1440px desktop, 390px mobile, keyboard behavior, screen-reader names,
   dark mode, and failure/empty states.
8. Integrate Manager Profiles only in a separately approved phase after
   recognized-rivalry provenance decisions.

## 25. Decisions required before implementation

The core Hub can be implemented from this specification without reopening the
approved score formula. Commissioner input is still required before any of the
following ships:

1. actual recognized rivalry records;
2. provenance for every recognition record;
3. any approved rivalry name, story, note, or display priority;
4. whether current Manager Profile `rivalOwnerId` values should remain
   profile-only, become owner submissions, or be replaced;
5. whether the initial five-card explorer should eventually paginate, show ten,
   or reveal all after `Show more`; and
6. whether a future recognized-rivalry submission workflow is commissioner-only
   or supports owner/mutual confirmation.

None of these decisions blocks a calculated, factual, zero-recognition Hub.
