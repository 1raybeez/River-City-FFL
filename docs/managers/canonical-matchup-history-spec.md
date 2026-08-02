# Canonical Franchise Matchup History Specification

## 1. Purpose and phase boundary

This document defines the Phase 3B.1 Canonical Franchise Matchup engine for River City Fantasy Football.

The engine represents league truth at the physical-franchise level:

```text
Sleeper league settings + weekly rows + bracket rows
  -> one canonical record per physical/logical contest
  -> later owner attribution (not implemented in Phase 3B.1)
```

One physical contest equals one canonical matchup. A two-row Sleeper weekly pairing is one game, and a playoff contest spanning multiple scoring periods is one logical game.

Phase 3B.1 does not:

- project owners;
- inspect Sleeper attached users or `co_owners`;
- calculate owner records, summaries, or streaks;
- implement Owner Matchup History;
- implement Rivalries; or
- change the Managers UI.

## 2. Source inputs and acquisition separation

The deterministic engine in `lib/history/canonicalMatchupHistory.ts` accepts only `CanonicalMatchupBuildInput`. It does not import league IDs, call `fetch`, import a runtime Sleeper client, or provide a no-input acquisition path.

Live acquisition is isolated in `lib/history/canonicalMatchupAcquisition.ts`. That adapter:

- reuses `LEAGUE_HISTORY_IDS` from `lib/leagueAlgorithm.ts`;
- requests league settings, weekly rows, winners brackets, and losers brackets from Sleeper;
- validates HTTP status, JSON parsing, and minimum payload shape;
- rejects the complete acquisition on any network, HTTP, JSON, or shape failure; and
- returns raw `CanonicalMatchupBuildInput` without building or mutating canonical history.

A valid HTTP response containing an empty weekly array remains valid empty source data. A failed request throws `CanonicalMatchupAcquisitionError` and cannot silently become an empty season.

Focused canonical build assertions supply in-memory fixtures to the deterministic engine. The acquisition-failure assertion uses a mocked `fetch`. The test suite requires neither internet access nor Firebase configuration.

Each season input contains:

- season and Sleeper league ID;
- playoff week start and final scoring period;
- explicitly completed scoring periods;
- weekly matchup rows keyed by scoring period;
- winners and losers brackets;
- losers-bracket classification (`toilet-bowl` or `consolation`);
- optional round-to-scoring-period mappings for multi-week rounds;
- optional reviewed roster-to-franchise IDs;
- correction version; and
- source version/retrieval metadata.

No versioned source snapshots are introduced in Phase 3B.1.

## 3. Franchise identity boundary

Canonical records contain franchise-side information only.

If `franchiseIdByRosterId` is supplied, the reviewed franchise ID is used. Otherwise the engine emits the deterministic source identity:

```text
sleeper-roster:{season}:{leagueId}:{rosterId}
```

This fallback identifies a franchise side within one Sleeper league season. It does not claim cross-season ownership or franchise continuity. Cross-season franchise review belongs in a mapping input before owner attribution.

No owner ID, owner name, manager name, ownership role, co-owner association, or attached-user value is accepted or emitted.

## 4. Exported record

`CanonicalFranchiseMatchup` contains:

- `matchupKey`;
- `season`;
- `leagueId`;
- `week` (the first scoring period);
- `matchupType`;
- `bracketType`;
- `round`;
- `bracketPlacement`;
- `isChampionshipGame`;
- ordered `scoringPeriods`;
- home and away franchise IDs;
- home and away aggregate scores;
- score-based winner and loser franchise IDs;
- completion state;
- `correctionVersion`;
- source metadata; and
- per-record coverage.

Home and away are deterministic: the lower Sleeper roster ID is home. Sleeper display order is never identity.

Winner and loser are score facts. Equal scores produce neither a winner nor a loser. Sleeper bracket advancement remains source evidence and does not reverse score truth in a loser-advances Toilet Bowl.

Returned records and nested values are cloned so consumers cannot mutate cached engine state.

## 5. Stable keys

Keys are implemented exactly as approved in Phase 3A.

Regular season:

```text
sleeper:{season}:{leagueId}:regular:w{week}:m{matchupId}
```

Bracket:

```text
sleeper:{season}:{leagueId}:bracket:{winners|losers}:r{round}:m{bracketMatchNumber}
```

Keys do not contain scores, participants, winners, display names, array positions, or correction versions. A score or bracket correction updates the same source-contest identity.

Rows without a numeric regular-season matchup ID cannot receive a fabricated key. Bracket rows without both round and match number remain coverage warnings.

## 6. Pairing and deduplication

Regular-season rows are grouped by season, league, week, and numeric `matchup_id`.

- Exactly two rows create one paired contest.
- One row with a numeric ID creates a `bye` coverage record.
- More than two rows are ambiguous and do not create a contest.
- Rows with missing matchup IDs remain unpaired coverage; missing IDs are never compared as equal.
- Postseason weekly rows are not also emitted as regular games.

Bracket rows are keyed by bracket kind, round, and match number. Duplicate source keys are reported and only the first deterministic record is retained. This prevents score-row duplication, repeated bracket slots, and regular/postseason overlap from multiplying a physical contest.

## 7. Completion rules

A regular contest is complete only when:

- exactly two rows are paired;
- both score values exist; and
- the scoring period is explicitly complete.

A bracket contest is complete only when:

- both final participants exist;
- the bracket contains official result metadata (`w` and `l`);
- every required scoring period has both participant scores; and
- every required scoring period is explicitly complete.

Zero is a valid score but never a completion signal by itself. A scoreless paired finalized game can be complete; an unpaired or future zero row cannot.

A bye is never a completed competitive game. An unresolved, future, partially scored, or result-less contest is classified `incomplete`.

For live acquisition, completed historical leagues include periods through the league `leg`. Other league states include only periods before the current `leg`.

## 8. Classification and title-game terminology

Every canonical record has exactly one classification:

- `regular`: completed paired contest before the playoff start;
- `championship-playoff`: any completed winners-bracket advancement game or title game that is not a third-place or other placement game;
- `third-place`: completed winners-bracket row with `p === 3`;
- `placement`: completed winners-bracket row with another non-championship placement;
- `consolation`: completed losers-bracket game in a season configured as ordinary consolation;
- `toilet-bowl`: completed losers-bracket game in a season configured as River City’s loser-advances Toilet Bowl;
- `bye`: one known franchise without a competitive opponent; or
- `incomplete`: a contest with a stable source identity that does not meet completion requirements.

Classifications are not merged. `third-place` and `placement` are not `championship-playoff`; `toilet-bowl` is not `consolation`; and incomplete intended playoff games remain `incomplete`.

Week number alone never assigns a postseason subtype. Bracket kind and placement metadata control postseason classification.

`championship-playoff` does not mean that every such record decided the league championship:

- `isChampionshipGame === true` only for a completed winners-bracket row with `p === 1`;
- semifinals and earlier winners-bracket games have `isChampionshipGame === false`;
- `round` retains the source bracket round;
- `bracketPlacement` retains Sleeper `p` when present;
- third-place games remain `third-place`; and
- losers-bracket games can never receive the championship-game flag.

## 9. Multi-week playoff rounds

`playoffRoundScoringPeriods` may assign multiple ordered weeks to one bracket round. The engine:

- emits one bracket key;
- retains each scoring period;
- aggregates home and away scores once;
- requires every leg to be complete; and
- emits one score result.

Weekly legs are audit evidence, not separate playoff wins.

## 10. Public API

`lib/history/canonicalMatchupHistory.ts` exports:

- `buildCanonicalMatchups(input)`;
- `getAllCanonicalMatchups()`;
- `getCanonicalMatchupsForSeason(season)`;
- `getCanonicalMatchup(matchupKey)`; and
- `getCanonicalCoverage()`.

`buildCanonicalMatchups(input)` is synchronous and deterministic. Input is required. It replaces the in-memory canonical cache only after an explicit caller supplies a complete build input.

Accessors throw before the first successful build. They do not represent an uninitialized engine—or an acquisition failure that prevented initialization—as valid empty history.

`lib/history/canonicalMatchupAcquisition.ts` separately exports:

- `acquireCanonicalMatchupInput(options?)`; and
- `CanonicalMatchupAcquisitionError`.

Acquisition does not call the builder. A caller must explicitly acquire and then build:

```ts
const input = await acquireCanonicalMatchupInput();
const matchups = buildCanonicalMatchups(input);
```

## 11. Coverage contract

Coverage reports:

- requested and loaded seasons;
- seasons without league IDs;
- expected regular weeks and loaded scoring periods;
- raw weekly rows;
- paired regular contests;
- unpaired rows;
- ambiguous regular groups;
- bracket rows;
- canonical, complete, and incomplete totals;
- totals for every classification;
- duplicate canonical keys; and
- source warnings by season.

Per-record coverage reports pairing, scores, completion, classification, and whether franchise IDs came from a reviewed map or the deterministic source-roster fallback.

Coverage does not convert unsupported rows into fabricated games.

## 12. Correction behavior

The latest reviewed source state is authoritative. A correction changes scores, participants, completion, or classification under the same stable key and increments `correctionVersion` when the reviewed source process requires it.

The engine does not append a second physical contest for a correction. Sleeper final `t1` and `t2` define bracket participants; original-team metadata remains source-snapshot evidence outside this normalized record.

## 13. Validation requirements

The focused test must verify:

- exact stable regular and bracket keys;
- deterministic rebuilds;
- key deduplication;
- two score rows becoming one physical contest;
- missing-ID rows never pairing;
- ambiguous groups never becoming games;
- all eight classifications remain distinct;
- winners-bracket playoff games do not all receive the title-game flag;
- exactly one completed title game exists in each completed fixture season;
- third-place and losers-bracket games never receive the title-game flag;
- bye and incomplete behavior;
- bracket rounds and scoring periods;
- score-based winners, losers, and ties;
- source franchise fallback and reviewed mappings;
- immutable accessors;
- reconciled coverage totals; and
- absence of owner or manager information.

Repository validation for Phase 3B.1 is:

```text
npx tsx scripts/canonical-matchup-history.test.ts
npx tsc --noEmit --pretty false
npx eslint lib/history/canonicalMatchupHistory.ts lib/history/canonicalMatchupAcquisition.ts scripts/canonical-matchup-history.test.ts
npm run build
git diff --check
```

## 14. Coverage and remaining gaps

Configured Sleeper matchup source coverage begins in 2018. No weekly source exists in the repository for 2011–2017, so final standings cannot create canonical games.

Known remaining gaps:

- no persisted, versioned Sleeper matchup snapshots;
- reviewed cross-season roster-to-franchise mappings are not yet supplied;
- historical season-by-season confirmation of losers-bracket format remains source-policy work; and
- Owner Matchup History, owner projections, summaries, Rivalries, and UI integration are deliberately deferred.

## 15. Audited live totals

The July 30, 2026 strict live acquisition produced:

- 780 canonical source slots;
- 766 completed physical/logical contests;
- 14 non-completed 2026 bracket slots;
- 4 of those 2026 slots classified as byes;
- 10 classified as incomplete; and
- zero duplicate canonical keys.

The 780 total describes every stable source slot emitted by the engine, including pre-draft bracket structure. The 766 total includes only completed competitive contests. The remaining 14 are seeded 2026 bracket metadata and produce no winner, loser, or record result.

The 40 `championship-playoff` records are five completed winners-bracket contests in each completed Sleeper season from 2018 through 2025. Only eight are title games: exactly one completed `p === 1` winner-bracket game per completed season.

Multi-week playoff legs share one bracket key and aggregate into one canonical contest. They never produce separate win/loss results for each scoring period.
