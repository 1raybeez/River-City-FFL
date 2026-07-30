# Manager Profile Opponent History UI Specification

## 1. Purpose and status

This document originated as the Phase 4.3A presentation specification and now
records the approved contract implemented by the Manager Profile **Opponent
History** section. The document does not change a history engine, add
analytics, calculate rivalry meaning, or modify an existing Rivalry or
Matchups page.

Opponent-row facts must come exclusively from
`OwnerOpponentMatchupSummary`. The section must not fetch Sleeper,
rebuild matchups, scan weeks, infer ownership, or reuse calculations from the
existing Rivalry Hub.

## 2. Sources reviewed

### Authoritative source

- `OwnerOpponentMatchupSummary` and its supporting immutable types in
  `lib/history/ownerMatchupSummary.ts`
- `docs/managers/owner-matchup-summary-spec.md`

### Presentation and compatibility references only

- `components/managers/OwnerProfile.tsx`
- `app/managers/owners/[slug]/page.tsx`
- `app/league-info/rivalries/page.tsx`
- `app/matchups/page.tsx`

The existing Rivalry Hub performs live Sleeper scans, owner mapping,
head-to-head arithmetic, streak calculations, and subjective intensity
labeling. None of those calculations or labels may be reused.

The Matchups page supplies useful responsive card, table, loading, and empty
state patterns, but it is not an opponent-history source.

## 3. Data and responsibility boundary

Each rendered opponent row consumes one directional
`OwnerOpponentMatchupSummary`:

```text
profile owner -> opponent owner
```

The row may read:

- `opponentOwnerId`;
- `meetings`;
- `records.overall`;
- `records.championshipPlayoff`;
- `records.championshipGames`;
- `firstMeeting`;
- `latestMeeting`;
- `franchiseIds` and `opponentFranchiseIds`;
- `coOwnerContext`;
- `factualExtremes`;
- `canonicalMatchupKeys`; and
- row-level duplicate coverage.

Owner name, slug, photo, and current display identity may be joined from the
canonical Manager identity catalog. Identity display is not a statistical
source.

The presentation layer may format supplied values, choose responsive
visibility, and apply an approved stable sort. It must not calculate records,
winning percentage, points, classifications, ownership, matchup eligibility,
streaks, rivalry strength, or physical-contest totals.

## 4. Placement in Manager Profile

Place Opponent History in the existing main column:

```text
Team Legacy
Season History
Opponent History
Current Division
```

This location gives the section enough horizontal space for a table and keeps
the Career Snapshot sidebar unchanged. Use the existing `SectionShell`,
border, background, typography, spacing, and dark-mode language.

Do not place the table in the 420px sidebar.

## 5. Recommended desktop table

### 5.1 Columns

Use these columns:

| Column | Source and display |
|---|---|
| Opponent | Canonical owner identity joined by `opponentOwnerId`; show photo, name, and optional factual badges |
| Overall Record | `records.overall`, formatted W-L or W-L-T |
| Win % | `records.overall.winningPercentage`; display an em dash only if the supplied value is `null` |
| Meetings | `meetings` |
| Points For / Against | Combine `records.overall.pointsFor` and `records.overall.pointsAgainst` in one cell |
| Point Differential | `records.overall.pointDifferential`, with presentation-only sign formatting |
| First Meeting | `firstMeeting.season`; week may appear as secondary text |
| Latest Meeting | `latestMeeting.season`; week may appear as secondary text |

This keeps all suggested information while combining Points For and Points
Against to reduce width. Do not remove Meetings: it is the clearest measure of
sample size and is not interchangeable with a winning percentage.

Do not add current franchise record, average points, streak, closest margin,
largest win, largest loss, recent form, or rivalry score to the default table.
The factual extremes are better suited to a future pair drill-down.

### 5.2 Width behavior

At wide desktop sizes, render a semantic table. The table may use a practical
minimum width inside a contained horizontal scroller when the main column
cannot fit all columns. It must not make the whole page scroll horizontally.

Recommended responsive priority:

1. Opponent
2. Overall Record
3. Meetings
4. Win %
5. Point Differential
6. Latest Meeting
7. Points For / Against
8. First Meeting

At intermediate widths, hide or combine the lowest-priority columns before
introducing an internal scrollbar.

## 6. Default sorting

Recommended default:

```text
meetings descending
then latestMeeting season descending
then latestMeeting week descending
then opponent display name ascending
then opponentOwnerId ascending
```

Rationale:

- Meetings-first answers the most common factual question: who has this owner
  faced most often?
- Recency is a stable and useful tie-breaker.
- Name and canonical ID produce deterministic final ordering.
- Winning-percentage sorting overemphasizes small samples.
- Alphabetical sorting is predictable but less informative as the default.
- Latest-meeting sorting is useful as an optional view but hides the depth of
  long-running series.

If the commissioner prefers another default later, expose it as a
presentation configuration choice. Do not encode commissioner preference into
the history engine.

Future optional sort controls:

- Most meetings
- Opponent A-Z
- Highest winning percentage
- Most recent meeting

When winning percentage is selected, use the supplied
`records.overall.winningPercentage`; do not recalculate it.

## 7. Championship and playoff indicators

Show compact factual indicators without adding table columns:

- **Playoff Opponent** when
  `records.championshipPlayoff.games > 0`.
- **Championship Opponent** when
  `records.championshipGames.games > 0`.

The accessible label should include the supplied count, for example:

```text
Playoff opponent, 3 meetings
Championship opponent, 1 title-game meeting
```

Do not show a generic **Championship Wins** badge in the table. It can be
mistaken for franchise championships. A future drill-down may show the exact
`records.championshipGames` record, including title-game wins, with explicit
wording.

Third-place, placement, consolation, and Toilet Bowl facts remain outside the
default opponent table. They can be separate factual scopes in a future
drill-down; they must never be merged into the overall record.

## 8. Co-owner presentation

### 8.1 Ray and Jeffrey

Jeffrey must not appear as an opponent on Ray's profile, and Ray must not
appear as an opponent on Jeffrey's profile. The summary engine already omits
teammates from directional opponent summaries. The UI must render the supplied
rows and must not manufacture a missing Ray/Jeffrey row.

### 8.2 Prestigio opponents

Shared Prestigio history remains personal owner credit:

- Ray's profile contains one directional row per legitimate opponent owner
  supported by Ray's projections.
- Jeffrey's profile contains the corresponding directional rows supported by
  Jeffrey's projections.
- Each Ray/opponent or Jeffrey/opponent row de-duplicates its own meetings by
  canonical matchup key.
- The UI must not divide wins, points, or meetings between Ray and Jeffrey.

When a solo owner faces Prestigio:

- the solo owner's career total contains one game for the physical contest;
- the solo owner's Opponent History contains a directional row against Ray;
- it also contains a directional row against Jeffrey; and
- those relationship rows must not be summed to claim two career games.

When the opposing franchise itself has co-owners, a profile can similarly
have one directional owner row for each legitimate opposing owner. Display
owner identities, not a synthetic combined owner. If useful, a short section
note may say:

> Shared-franchise matchups are credited separately to each approved owner.

Do not expose teammate IDs as opponent rows. `coOwnerContext` may support
subtle factual context such as “shared-franchise meeting,” but it must not
change the record or meeting count.

## 9. Coverage messaging

### 9.1 Contract limitation

`OwnerOpponentMatchupSummary` records exist only for directional pairs with at
least one supported projection. Their row coverage contains projection and
canonical-key reconciliation, not `sourceAvailability`.

Therefore:

```text
an empty OwnerOpponentMatchupSummary array
does not distinguish
unavailable-no-source
from
available-no-completed-games
```

The UI must not infer either state from an empty array.

### 9.2 Recommended section-state input

Opponent rows must remain exclusively sourced from
`OwnerOpponentMatchupSummary[]`. For the section-level empty state, use the
already-loaded, approved `OwnerCareerMatchupSummary.coverage.sourceAvailability`
as a read-only status input. This adds no calculation and does not supply any
row statistic.

If Phase 4.3 implementation is required to accept literally only the opponent
array and no approved coverage status, it must use the neutral empty state in
section 10. It cannot truthfully render the two distinct coverage messages.

### 9.3 Messages

For `unavailable-no-source`:

**Title:** Opponent history unavailable

**Copy:** Matchup-level source data is unavailable for this owner's represented
seasons. No opponent records have been inferred.

For `available-no-completed-games`:

**Title:** No completed opponent matchups

**Copy:** Matchup source coverage is available, but no completed games have
been recorded.

For mixed careers with supported opponent rows and earlier no-source seasons,
show one quiet section note:

> Opponent history begins with supported matchup coverage in 2018. Earlier
> owner-seasons are excluded.

Never display 0-0 opponent rows for a no-source season or owner.

## 10. Empty states

Use the existing Manager Profile dashed-border empty-state visual language.

### No supported rows with neutral coverage

**Title:** No opponent history available

**Copy:** No supported directional opponent records are available for this
owner.

This is the only safe empty state when source availability is not supplied.

### Not applicable

For a staff/noncompetitive profile:

**Title:** Opponent history not applicable

**Copy:** This profile has no competitive owner matchup history.

### Data failure

Acquisition or summary initialization failure is not a valid empty state. Let
the existing server error boundary handle it and log the failure. Do not turn
it into “no opponents.”

### Row integrity failure

If a supplied row reports duplicate canonical matchup keys, do not silently
alter its totals in React. The implementation should report the condition
through existing diagnostics and avoid presenting the row as fully verified.
No client-side repair is allowed.

## 11. Mobile and tablet layout

Do not squeeze eight desktop columns into a phone viewport. Below the desktop
table breakpoint, use one compact card per opponent.

Recommended card order:

1. opponent photo and name;
2. factual badges;
3. overall record, meetings, and winning percentage as the primary three
   metrics;
4. Points For / Against and point differential;
5. first and latest meeting;
6. optional future “View history” affordance.

Use the existing rounded border, subtle background, two-column metric grid,
uppercase labels, and dark-mode styles from Manager Profile.

On tablet, use either the cards in a two-column grid or the desktop table with
lower-priority columns hidden. Prefer cards if the table would require page-
level horizontal scrolling.

Desktop table and mobile cards may both exist in the document only when CSS
ensures the hidden version is removed from the accessibility tree.

## 12. Future drill-down compatibility

The recommended design supports:

```text
/managers/owners/[owner]/opponents/[opponent]
```

Use canonical owner slugs in the URL and resolve them to owner IDs before
calling:

```ts
getOwnerOpponentMatchupSummary(ownerIdOrSlug, opponentOwnerIdOrSlug)
```

The summary's directional key remains the data identity:

```text
owner-matchup-summary:opponent:{ownerId}:vs:{opponentOwnerId}
```

The route is directional. Reversing owner and opponent loads the other
owner's perspective.

Design the Opponent cell now as an optional navigation target:

- before the route exists, render normal opponent identity content;
- after the route exists, wrap the name/card with a standard focusable link;
- do not link to the legacy Rivalry Hub as a substitute; and
- do not make a nonfunctional row look clickable.

The future drill-down can present supplied classification splits, canonical
meeting keys, first/latest references, factual extremes, and co-owner context
without changing the list layout.

## 13. Factual badge recommendations

### Recommended

- **Winning** when the supplied overall wins exceed supplied overall
  losses.
- **Losing** when supplied overall losses exceed supplied overall wins.
- **Even** when supplied overall wins and losses are equal.
- **Playoff Opponent** when the supplied playoff split has meetings.
- **Championship Opponent** when the supplied championship-game split has
  meetings.

These labels describe the supplied directional record only. They do not imply
rivalry strength. Show a Winning, Losing, or Even series badge only when the
supplied overall record has at least one game; a specialized-scope-only row
must not be labeled Even merely because its overall wins and losses are both
zero.

### Conditional or deferred

**Most Played** is factual but requires comparison across every row and an
approved tie rule. If added later, all opponents tied for the maximum supplied
`meetings` value should receive it. Prefer selecting this badge in a
presentation adapter rather than calculating it independently in multiple
React components.

Do not add:

- rival, primary rival, nemesis, favorite victim, heated, cold, blood feud, or
  similar interpretive labels;
- streak badges;
- recency-weighted badges;
- “dominant” or “owned” labels; or
- any score derived from multiple summary fields.

Limit default rows/cards to one series-result badge plus applicable playoff
and championship indicators to prevent badge clutter.

## 14. Accessibility requirements

- Use a semantic `<table>`, `<caption>`, `<thead>`, `<tbody>`, and
  `<th scope="col">` on desktop.
- The caption should identify the profile owner and clarify that records are
  directional.
- If sort controls are added, use buttons with clear accessible names and
  `aria-sort` on the active column.
- Do not communicate winning, losing, playoff, championship, or coverage state
  by color or icon alone; retain visible text.
- Mark decorative icons and photos appropriately; opponent photos need useful
  alt text or an empty alt when the adjacent name provides the same content.
- Preserve visible keyboard focus for future opponent links.
- Make the entire mobile card link keyboard-accessible only after a real route
  exists.
- Do not rely on hover tooltips for playoff counts; include counts in
  accessible text.
- Read W-L-T values with an accessible label such as “8 wins, 5 losses,
  1 tie” while retaining the compact visual value.
- Give abbreviated headers accessible names, especially Win %, PF, PA, and
  Diff.
- Ensure the internal desktop scroller is keyboard reachable when content
  overflows.
- Maintain sufficient contrast in light and dark themes and respect the
  current Manager Profile text hierarchy.

## 15. Recommended Phase 4.3 implementation contract

The presentation component should receive:

```ts
type OpponentHistoryProps = {
  profileOwner: Pick<OwnerProfile, "id" | "slug" | "fullName">;
  opponents: readonly OwnerOpponentMatchupSummary[];
  sourceAvailability?: OwnerMatchupSourceAvailability;
  hasEarlierNoSourceSeasons?: boolean;
};
```

Rules:

- `opponents` is the only source of row statistics.
- `sourceAvailability` is optional section-level coverage from the already
  loaded career summary; it supplies no opponent facts.
- `hasEarlierNoSourceSeasons` is optional existing career coverage
  presentation state; it must not be recalculated from opponent rows.
- canonical identity data supplies names, slugs, and photos only.
- sorting and badge presentation should be implemented once and covered by
  focused presentation tests.

If the approved implementation scope rejects the two optional coverage props,
use only the neutral empty state and omit mixed-history messaging.

## 16. Decisions and answers

1. **Layout:** use an eight-column desktop table, combining Points For and
   Points Against; use cards on mobile.
2. **Sorting:** meetings descending, then latest meeting, name, and canonical
   ID. Commissioner preference may later override presentation configuration.
3. **Championship indicators:** show factual playoff and championship-opponent
   indicators; defer a championship-wins badge from the list.
4. **Co-owners:** Jeffrey never appears as Ray's opponent. Shared-franchise
   opponents remain separate canonical owner rows exactly as supplied.
5. **Coverage:** use approved career coverage only for section-level empty
   messaging; do not infer source status from an empty opponent array.
6. **Empty states:** distinguish unavailable source, no completed games,
   noncompetitive profiles, neutral unknown coverage, and actual failures.
7. **Mobile:** replace the wide table with compact opponent cards.
8. **Drill-down:** reserve canonical owner-slug routes without making rows
   prematurely clickable.
9. **Badges:** use only factual series-result, playoff, and championship
   indicators; treat Most Played as conditional and tie-aware.
10. **Accessibility:** use semantic table/card structures, text alongside
    color, clear sort state, useful accessible record labels, and keyboard-
    safe future links.

## 17. Explicit non-goals

Phase 4.3 does not:

- change any history engine or summary type;
- create a head-to-head route;
- modify Rivalries or Matchups;
- calculate streaks;
- calculate analytics;
- infer missing history;
- assign a primary rival; or
- commit or push repository changes.
