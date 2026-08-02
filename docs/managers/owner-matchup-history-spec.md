# Owner Matchup History Specification

> **Status after Phase 3B.2:** This file remains the Phase 3A source audit and historical architecture record. `owner-matchup-projection-spec.md` is the authoritative implemented Phase 3B.2 contract for franchise mapping, owner-side projection records, stable keys, APIs, counting safeguards, and validation. Where this earlier document proposes a projection shape, scope, or API, the Phase 3B.2 specification supersedes it.

## 1. Purpose and status

This document is the Phase 3A discovery and architecture specification for River City Owner Matchup History. It does not implement the engine.

The intended dependency flow is:

```text
Reviewed historical matchup sources
  -> canonical franchise matchups
  -> owner-attributed matchup history
  -> factual owner and opponent summaries
  -> later rivalry interpretation
  -> Managers and Rivalry UI
```

The future engine must be framework-free, reusable, and independent of React. It must preserve the approved Phase 1 owner-season and Phase 2 career-summary contracts. It must not infer a matchup, opponent, owner, franchise, score, or result when the source cannot support one.

Phase 3A establishes:

- what matchup data exists;
- what is absent;
- where existing calculations live;
- how a physical franchise matchup differs from an owner attribution;
- how games should be classified;
- what stable keys and types the engine should use; and
- which approvals and data preparation are required before Phase 3B.

This specification concerns River City Fantasy Football only.

## 2. Repository source inventory

### Approved identity and ownership foundation

| File | Relevant input or output | Phase 3 use |
|---|---|---|
| `lib/history/ownerSeasonHistory.ts` | Canonical owner-season identity, franchise, ownership role, co-owners, season participation, coverage, and stable `ownerSeasonKey` | Authoritative owner/franchise attribution boundary for each season |
| `lib/history/ownerCareerSummary.ts` | Placement-based career summaries and null matchup placeholders | Future consumer of approved matchup summaries; not an input for matchup reconstruction |
| `lib/managers/identityData.ts` | Canonical owner profiles, franchises, Sleeper IDs currently attached to profiles, and ownership tenures | Canonical owner and franchise identities |
| `lib/managers/identityTypes.ts` | `OwnerProfile`, `Franchise`, `OwnershipTenure`, `OwnershipRole` | Reuse types and role vocabulary |
| `docs/managers/river-city-managers-v1-spec.md` | Approved product, source-of-truth, division, and co-owner rules | Governing product contract |
| `docs/managers/owner-career-summary-spec.md` | Approved owner-career attribution rules | Governing personal-versus-league-wide attribution contract |

Phase 3 must consume this foundation. It must not create a second owner or franchise model.

### Sleeper league and matchup access

| File | Purpose | Inputs | Outputs | Assessment |
|---|---|---|---|---|
| `lib/sleeper.ts` | Shared Sleeper API helpers and types | Current or supplied league ID and week | League info, users, rosters, weekly matchup rows, winners bracket, losers bracket | Reusable as an API adapter, but its fallback-to-empty behavior cannot distinguish a valid empty response from a network/API failure. A historical importer needs strict error and coverage reporting. |
| `lib/history/canonicalMatchupAcquisition.ts` | Phase 3B.1 strict Sleeper acquisition adapter | Configured league IDs and optional losers-bracket classifications | Validated `CanonicalMatchupBuildInput` | Acquisition is separate from normalization. Network, HTTP, JSON, or payload-shape failure throws and cannot silently create an empty season. |
| `lib/history/canonicalMatchupHistory.ts` | Phase 3B.1 deterministic canonical builder | Supplied `CanonicalMatchupBuildInput` only | Canonical franchise matchups and coverage | Contains no fetching or owner attribution. Accessors require a successful explicit build. |
| `lib/leagueAlgorithm.ts` | Contains `LEAGUE_HISTORY_IDS` for 2018–2026 | Season | Sleeper league ID | Existing Phase 1 season-to-league source. Phase 3 should reuse it rather than adding another list. |
| `app/league-info/rivalries/page.tsx` | Live pairwise head-to-head scan | A hard-coded 2018–2026 league list, two Sleeper user IDs, roster and week endpoints | Pair history, wins, points, closest game, largest margin, current streak, and rivalry label | Useful proof of data availability, but calculations are client/UI-local and classification is unsafe. Replace calculations with the future engine; preserve UI until a later UI phase. |
| `app/matchups/page.tsx` | Current 2026 weekly matchup and bracket presentation | `lib/sleeper.ts` helpers | Grouped weekly cards and bracket display | Current-season presentation only. Its grouping and bracket-label concepts are informative, but they are UI-local and not a history engine. |
| `components/MatchupBoard.tsx` | Older current-week and bracket presentation | `lib/sleeper.ts` helpers | Paired cards and bracket columns | No imports or JSX usage were found. It is legacy/dead-code inventory, not a Phase 3 source. |

### Existing aggregate record and points calculations

| File | Purpose | Inputs | Outputs | Assessment |
|---|---|---|---|---|
| `app/league-info/archives/page.tsx` | Builds archive leaderboards | Commissioner league lookup, Sleeper rosters and users for 2018 onward | Aggregated roster-setting wins, losses, ties, points for, points against, potential points, and seasons | Data-driven but calculated in client UI. Useful as a regular-season aggregate cross-check, not a matchup-level source. It uses its own identity map and does not attribute co-owners. |
| `components/managers/OwnerProfile.tsx` | Shows current division standings | Current 2026 Sleeper roster settings | Current record, points for, and division rank | Current-season presentation only. It is not career matchup history and must remain unchanged in Phase 3. |
| `components/transactions/Treasury.tsx` | Calculates current payouts | Fourteen weekly matchup endpoints, roster settings, and winners bracket | Weekly high scorers and prize assignments | Matchup-adjacent business logic inside UI. It does not produce records or reusable matchup history and should remain separate. |
| `lib/managers/activeManagers.ts` | Manually curated active profiles | Generated/manual manager data | Hard-coded displayed `record` and other profile fields | No provenance or game classification is encoded. Do not use as a matchup source; later compare it with engine output. |
| `lib/managers/retiredManagers.ts` | Manually curated retired profiles | Manual manager data | Some hard-coded displayed `record` values | Incomplete and not matchup-level. Use only as a later conflict check. |
| `lib/stats.ts` | Calculates placement statistics | `lib/manual-history.ts` | Championships, runner-ups, thirds, podiums, and average placement | Its `wins` property means championships, not matchup wins. It is out of scope as a matchup source. |

### Duplicated owner and Sleeper ID maps

| File | Coverage | Risk |
|---|---|---|
| `lib/managers/identityData.ts` | Canonical owner model, but most retired profiles do not carry historical Sleeper IDs | Direct canonical resolution covers only part of 2018–2024 rosters |
| `lib/sleeperIdMap.ts` | Name-to-Sleeper-ID values for active and several retired owners | Unused and not integrated with canonical identity; Landon has his newer ID only |
| `lib/identity/nameResolver.ts` | Builds Sleeper lookup from manager records | Retired records generally lack `sleeperId`, so the lookup is incomplete |
| `lib/constants.ts` | Another manager registry with Sleeper IDs | Duplicates identity fields and is not the approved canonical model |
| `app/league-info/archives/page.tsx` | Local `REAL_NAMES` map | Contains historical IDs absent from canonical profiles |
| `app/league-info/rivalries/page.tsx` | Local active-manager `MANAGER_MAP` | Excludes several historical owners and uses combined display identities |
| `components/transactions/Treasury.tsx` | Local team/user-name aliases | Current finance display mapping, not stable identity |
| `lib/history/managerResolver.ts` | Placeholder trade-team resolver | Returns synthetic league/team IDs and is explicitly not a real owner resolver |

Phase 3B must reconcile historical Sleeper IDs into reviewed season-roster mappings or approved canonical identity data. It must not select one duplicate map silently.

### Persisted data and scripts

- No persisted weekly matchup, schedule, score, winners-bracket, or losers-bracket dataset exists in `data/`.
- No current script imports historical matchups.
- `scripts/importSleeperTrades.ts`, `lib/history/sleeperTradeScraper.ts`, and the auction import scripts prove that season-by-season Sleeper acquisition patterns already exist, but their outputs are transaction/draft data rather than matchup history.
- Auction JSON files contain league IDs but no weekly games.
- `lib/manual-history.ts` contains final standings for 2011–2025, not schedules, weekly scores, matchup IDs, or bracket games.

## 3. Live source verification

The configured Sleeper leagues were checked directly on July 30, 2026 using:

- `/league/{league_id}`;
- `/league/{league_id}/users`;
- `/league/{league_id}/rosters`;
- `/league/{league_id}/matchups/{week}` for weeks 1–18;
- `/league/{league_id}/winners_bracket`; and
- `/league/{league_id}/losers_bracket`.

This verifies current API availability; it is not a persisted or immutable historical snapshot.

For completed seasons:

- 2018–2020 have 13 regular-season weeks and a Week 14 playoff start.
- 2021–2025 have 14 regular-season weeks and a Week 15 playoff start.
- Every regular-season week returned 12 score rows grouped into six two-team numeric matchup IDs.
- Every completed season returned seven completed winners-bracket rows and seven completed losers-bracket rows.
- Playoff scoring weeks returned all 12 roster score rows, but bye or non-paired rows can have no numeric `matchup_id`.
- The API also returns a trailing week after the configured league `leg` with 12 score rows and no matchup IDs: Week 17 for 2018–2020 and Week 18 for 2021–2025. Those rows are not automatically games.
- 2019 and 2020 each contain one zero-score row in the unpaired trailing week. That is not evidence of a completed zero-score matchup.

For 2026:

- the league status is `pre_draft`;
- no weekly matchup rows or scores exist yet;
- both seven-row brackets are seeded or structurally present;
- no bracket row has a winner or loser; and
- bracket placeholders are not completed games.

## 4. Coverage by season

“Direct identity” means the primary roster owner resolves through canonical `identityData` Sleeper IDs. “Legacy-map potential” includes duplicate repository maps that appear to identify historical owners but require review before becoming canonical.

| Season | Source and league ID | Regular season | Championship playoffs | Consolation / Toilet Bowl | Scores and matchup IDs | Owner and franchise resolution | Co-owner evidence | Known gaps | Confidence |
|---:|---|---|---|---|---|---|---|---|---|
| 2011 | `manual-history.ts`; no Sleeper ID | No weekly source | No bracket source | No bracket source | No scores or matchup IDs | No roster data; owner-season identity exists, including Ray as solo Prestigio owner | Ray solo; no shared attribution | Three final-standing identities unresolved; no games can be reconstructed | None for matchups; high for approved ownership boundary |
| 2012 | `manual-history.ts`; no Sleeper ID | No weekly source | No bracket source | No bracket source | No scores or matchup IDs | No roster data; three owner-season franchise assignments remain missing | Ray absent; no Prestigio record | No schedules, scores, brackets, or matchup IDs | None for matchups |
| 2013 | `manual-history.ts`; no Sleeper ID | No weekly source | No bracket source | No bracket source | No scores or matchup IDs | Owner-season identities exist but cannot be joined to games | Ray/Jeffrey shared tenure begins | No schedules, scores, brackets, or matchup IDs | None for matchups; high for approved co-owner boundary |
| 2014 | `manual-history.ts`; no Sleeper ID | No weekly source | No bracket source | No bracket source | No scores or matchup IDs | Owner-season identities exist but cannot be joined to games | Prestigio shared tenure known | No schedules, scores, brackets, or matchup IDs | None for matchups |
| 2015 | `manual-history.ts`; no Sleeper ID | No weekly source | No bracket source | No bracket source | No scores or matchup IDs | Owner-season identities exist but cannot be joined to games | Prestigio shared tenure known | No schedules, scores, brackets, or matchup IDs | None for matchups |
| 2016 | `manual-history.ts`; no Sleeper ID | No weekly source | No bracket source | No bracket source | No scores or matchup IDs | Owner-season identities exist but cannot be joined to games | Prestigio shared tenure known | No schedules, scores, brackets, or matchup IDs | None for matchups |
| 2017 | `manual-history.ts`; no Sleeper ID | No weekly source | No bracket source | No bracket source | No scores or matchup IDs | Owner-season identities exist but cannot be joined to games | Prestigio shared tenure known; Jordan begins independent Shake-N-Bakers tenure | No schedules, scores, brackets, or matchup IDs | None for matchups |
| 2018 | Sleeper `342868033913540608` | Weeks 1–13 complete: 78 paired games | Weeks 14–16 scores; winners bracket 7/7 complete | Losers bracket 7/7 complete | Regular IDs complete; playoff bye rows partly null; Week 17 unpaired after league leg | Discovery found 7/12 direct and 11/12 legacy-map potential; Ray later confirmed roster 5 ID `342885779137216512` as Landon and Special Brownies | Sleeper and tenure support Prestigio; commissioner ruling resolves Special Brownies | Five direct historical ID gaps at discovery time; unpaired trailing week | High raw; attribution resolved by reviewed mapping |
| 2019 | Sleeper `466632190273253376` | Weeks 1–13 complete: 78 paired games | Weeks 14–16 scores; winners bracket 7/7 complete | Losers bracket 7/7 complete | Regular IDs complete; playoff IDs partial; Week 17 unpaired and contains one zero row | 9/12 direct; 12/12 have legacy-map potential; franchise mapping possible after review | Prestigio confirmed | Landon, Patrick, and Billy depend on duplicate historical maps | High raw; medium attribution |
| 2020 | Sleeper `530115541505298432` | Weeks 1–13 complete: 78 paired games | Weeks 14–16 scores; winners bracket 7/7 complete | Losers bracket 7/7 complete | Regular IDs complete; playoff IDs partial; Week 17 unpaired and contains one zero row | 9/12 direct; 12/12 have legacy-map potential | Prestigio confirmed | Landon, Adam, and Billy depend on duplicate historical maps | High raw; medium attribution |
| 2021 | Sleeper `677751457528762368` | Weeks 1–14 complete: 84 paired games | Weeks 15–17 scores; winners bracket 7/7 complete | Losers bracket 7/7 complete | Regular IDs complete; playoff IDs partial; Week 18 unpaired after league leg | 9/12 direct; 12/12 have legacy-map potential | Prestigio confirmed | Landon, Adam, and Billy depend on duplicate historical maps | High raw; medium attribution |
| 2022 | Sleeper `784542934581256192` | Weeks 1–14 complete: 84 paired games | Weeks 15–17 scores; winners bracket 7/7 complete | Losers bracket 7/7 complete | Regular IDs complete; playoff IDs partial; Week 18 unpaired | 10/12 direct; 12/12 have legacy-map potential | Prestigio confirmed | Landon and Billy depend on duplicate historical maps | High raw; medium-high attribution after review |
| 2023 | Sleeper `997510104398315520` | Weeks 1–14 complete: 84 paired games | Weeks 15–17 scores; winners bracket 7/7 complete | Losers bracket 7/7 complete | Regular IDs complete; playoff IDs partial; Week 18 unpaired | 10/12 direct; 12/12 have legacy-map potential | Prestigio confirmed; Aaron’s attachment to Doug’s roster was a draft-helper workaround, not ownership | Landon and Billy need map reconciliation; preserve the raw Doug/Aaron attachment as ignored source evidence | High raw; high Doug-only attribution after primary-roster resolution |
| 2024 | Sleeper `1072545817749331968` | Weeks 1–14 complete: 84 paired games | Weeks 15–17 scores; winners bracket 7/7 complete | Losers bracket 7/7 complete | Regular IDs complete; playoff IDs partial; Week 18 unpaired | 10/12 direct; 12/12 primary owners have legacy-map potential | Prestigio confirmed; Billy is the approved sole owner of his franchise | Landon and Billy need map reconciliation; a reported `NakedBuddha` helper attachment and the account’s identity are unresolved in repository evidence and create no attribution | High raw; medium attribution pending primary-map review |
| 2025 | Sleeper `1199749375539027968` | Weeks 1–14 complete: 84 paired games | Weeks 15–17 scores; winners bracket 7/7 complete | Losers bracket 7/7 complete | Regular IDs complete; playoff IDs partial; Week 18 unpaired | 12/12 primary rosters resolve; 12/12 franchises resolve | Prestigio and Jordan/Landon both supported by approved tenures; Landon’s Sleeper ID exists in duplicate maps but not his canonical profile | Commissioner bracket edits appear through `t1_original`/`t2_original`; use final bracket state | High raw and high approved attribution |
| 2026 | Sleeper `1312149033254416384` | No games yet | Seven seeded/incomplete rows | Seven seeded/incomplete rows | Weeks 1–18 empty; no scores or matchup IDs | 12/12 primary rosters and franchises resolve | Prestigio and Jordan/Landon approved | Pre-draft future rows must not count as games or results | High source-status confidence; no result coverage |

## 5. Existing matchup logic audit

### Rivalry Hub

`app/league-info/rivalries/page.tsx` currently calculates:

- pairwise wins;
- pairwise points for both selected sides;
- total games;
- largest margin;
- closest margin;
- current head-to-head winning streak;
- recent and full meeting lists; and
- a display-only rivalry intensity label.

It is not reusable because acquisition, normalization, calculation, and presentation all occur in a client component.

Important correctness limits:

- Weeks 1–17 are scanned for every season without consulting each league’s playoff start or final leg.
- Regular season, championship playoffs, placement games, and Toilet Bowl games are silently combined.
- Two rows with missing `matchup_id` can compare as `undefined === undefined`, falsely treating unrelated bye or trailing-week rows as opponents.
- A zero score is accepted without a completion check.
- Ties increment total games but are not stored as tie totals.
- The current streak is calculated across the silently mixed game classes.
- Owner and team resolution uses a local hard-coded Sleeper ID map.
- Co-owner attribution depends only on the current Sleeper roster response rather than the approved tenure model.
- No league-wide canonical game identity prevents double-counting.

Recommendation: preserve the page until a later UI phase, then replace its fetching and calculations with owner-matchup and later rivalry-engine outputs. Do not wrap its current calculations as canonical logic.

### Current Matchups page

`app/matchups/page.tsx`:

- groups current weekly rows by numeric `matchup_id`;
- reports missing roster IDs, missing matchup IDs, one-team groups, and overfull groups;
- resolves current display names and roster records;
- presents winners and losers brackets;
- labels championship, third-place, fifth-place, and Toilet Bowl placement rows; and
- uses bracket `r`, `m`, `p`, `w`, `l`, and source-slot fields.

These are useful classification observations. The page does not calculate historical results, opponent records, or streaks. Its local helpers should inform tests but should not become the engine by copy-and-paste.

### League Archives

`app/league-info/archives/page.tsx` sums Sleeper roster settings across seasons:

- wins, losses, and ties;
- points for and against;
- potential points; and
- seasons represented.

This is regular-season aggregate data supplied by Sleeper rosters. It is calculated inside UI, uses a separate identity map, omits co-owner attribution, discovers leagues by name, and cannot distinguish individual opponents or game classes.

Recommendation: preserve it as a later cross-check. The matchup engine should reproduce supported regular-season totals from individual canonical games before the UI changes.

### Current division and finance calculations

- `components/managers/OwnerProfile.tsx` formats only the current roster’s record and points for.
- `components/transactions/Treasury.tsx` identifies weekly high scorers and bracket payout winners.

Neither is a reusable matchup-history implementation. Both should remain untouched by Phase 3B.

### Missing implementations

No reusable implementation currently calculates:

- career owner matchup records;
- classified regular, playoff, third-place, consolation, or Toilet Bowl records;
- longest winning or losing streaks;
- record by canonical opponent;
- record by season from individual games;
- best or worst opponent record;
- canonical owner-versus-owner history;
- co-owner-aware league-wide deduplication; or
- matchup coverage and unresolved-source reporting.

## 6. Canonical data model

The engine should use two related record layers.

### 6.1 Canonical franchise matchup

`CanonicalFranchiseMatchup` represents one real competitive contest exactly once league-wide. Regular-season games normally have one scoring period. A multi-week playoff round is one logical contest with multiple scoring periods.

Conceptual fields:

```ts
export type OwnerMatchupType =
  | "regular"
  | "championship-playoff"
  | "third-place"
  | "placement"
  | "consolation"
  | "toilet-bowl"
  | "bye"
  | "incomplete";

export type OwnerMatchupResult = "win" | "loss" | "tie" | "incomplete";

export type MatchupScoringPeriod = {
  week: number;
  sourceMatchupId: number | null;
  rosterIdA: number;
  rosterIdB: number;
  pointsA: number | null;
  pointsB: number | null;
  isFinal: boolean;
};

export type CanonicalMatchupSide = {
  rosterId: number;
  franchiseId: string | null;
  franchiseName: string | null;
  points: number | null;
};

export type CanonicalFranchiseMatchup = {
  franchiseMatchupKey: string;
  season: number;
  sleeperLeagueId: string | null;
  matchupType: OwnerMatchupType;
  bracketKind: "winners" | "losers" | null;
  round: number | null;
  bracketMatchNumber: number | null;
  placement: number | null;
  isChampionshipGame: boolean;
  weekStart: number;
  weekEnd: number;
  scoringPeriods: MatchupScoringPeriod[];
  sideA: CanonicalMatchupSide;
  sideB: CanonicalMatchupSide;
  isComplete: boolean;
  officialWinningRosterId: number | null;
  officialLosingRosterId: number | null;
  margin: number | null;
  source: OwnerMatchupSource;
  coverage: CanonicalMatchupCoverage;
  notes: string[];
};
```

Sides must be stored in deterministic roster-ID order. Display order is a UI concern.

This canonical layer contains franchise information only. It contains no owner IDs, owner names, ownership roles, co-owner associations, or owner summaries.

### 6.2 Owner-attributed matchup

`OwnerMatchupHistoryRecord` is a directed personal projection derived from one canonical franchise matchup. Create one record for each recognized owner associated with each participating franchise. Do not create a cross-product record for every owner/opponent-owner pair.

The opponent side uses arrays because a franchise can have multiple approved owners:

```ts
export type OwnerMatchupAttributionMethod =
  | "primary-owner"
  | "shared-franchise"
  | "legacy-owner";

export type OwnerMatchupRecordEligibility = {
  careerRecord: boolean;
  regularSeasonRecord: boolean;
  playoffRecord: boolean;
  thirdPlaceRecord: boolean;
  consolationRecord: boolean;
  toiletBowlRecord: boolean;
  rivalryRecord: boolean;
  streaks: boolean;
  points: boolean;
};

export type OwnerMatchupHistoryRecord = {
  matchupKey: string;
  franchiseMatchupKey: string;
  season: number;
  weekStart: number;
  weekEnd: number;
  matchupType: OwnerMatchupType;
  round: number | null;
  isComplete: boolean;

  ownerId: string;
  ownerSlug: string;
  ownerName: string;
  franchiseId: string;
  ownershipRole: OwnershipRole;
  coOwnerIds: string[];

  opponentOwnerIds: string[];
  opponentOwnerSlugs: string[];
  opponentFranchiseId: string | null;

  pointsFor: number | null;
  pointsAgainst: number | null;
  result: OwnerMatchupResult;
  margin: number | null;
  officialAdvancementResult:
    | "advanced"
    | "eliminated"
    | "placed"
    | null;

  attributionMethod: OwnerMatchupAttributionMethod;
  eligibility: OwnerMatchupRecordEligibility;
  source: OwnerMatchupSource;
  coverage: OwnerMatchupRecordCoverage;
  notes: string[];
};
```

Using `opponentOwnerIds` rather than one `opponentOwnerId` prevents duplicate career games while still allowing an owner-versus-owner query to match every approved opponent co-owner.

### 6.3 Source and coverage

The source layer should retain enough evidence to reproduce and audit a result:

```ts
export type OwnerMatchupSource = {
  provider: "sleeper";
  sleeperLeagueId: string;
  weeklyEndpointWeeks: number[];
  bracketKind: "winners" | "losers" | null;
  retrievedAt: string;
  sourceVersion: string;
};

export type CanonicalMatchupCoverage = {
  matchupRows: "resolved" | "missing" | "ambiguous";
  scores: "resolved" | "missing" | "ambiguous";
  classification: "resolved" | "missing" | "ambiguous";
  franchises: "resolved" | "partial" | "missing";
  completion: "resolved" | "ambiguous";
};

export type OwnerMatchupRecordCoverage = {
  owner: "resolved";
  ownership: "resolved" | "ambiguous";
  franchise: "resolved";
  opponents: "resolved" | "partial" | "missing";
  sourceMatchup: "resolved";
};
```

Unpaired, missing-ID, unresolved-roster, and incomplete rows belong in coverage reporting. They must not be converted into fake completed owner matchups.

Raw source snapshots must retain Sleeper `co_owners` and other attached-user fields for audit, but those fields must not be copied into canonical owner associations. Coverage may report ignored or unresolved attachment IDs and their disposition without creating an owner, franchise, or matchup record for them.

## 7. Owner and co-owner attribution

The recommended model is:

1. Build one canonical franchise matchup.
2. Resolve each roster to a canonical franchise for that season.
3. Use Owner Season History to identify all approved owners of that franchise in that season.
4. Derive one owner-attributed record per approved owner on each side.
5. Keep the canonical record as the unit for league-wide totals.

This provides:

- one league game regardless of co-owner count;
- one personal result for every approved owner;
- no duplicate career result within one owner’s summary;
- owner-versus-owner queries through `opponentOwnerIds`; and
- transparent source and attribution metadata.

### Ownership-source precedence

Owner projection must follow this precedence:

1. Approved canonical ownership tenures are authoritative.
2. Commissioner-approved historical corrections override platform metadata.
3. Sleeper primary-owner data may connect a roster to an approved owner.
4. Sleeper `co_owners` or attached-user metadata is evidence only.
5. Sleeper attachment alone never creates a canonical owner association.
6. An unapproved attached user remains ignored or unresolved until Ray confirms genuine ownership.

After resolving the primary roster to a canonical franchise, the engine must obtain the season’s approved owner associations from Owner Season History. It must not union Sleeper `co_owners` into that owner list.

### Draft-helper attachments

Sleeper sometimes attached another user to a roster solely so that person could draft for the actual owner. This platform workaround is not River City ownership.

A temporary draft helper receives:

- no owner-season attribution;
- no franchise or tenure association;
- no matchup record;
- no placement, championship, or podium attribution;
- no career wins, losses, ties, points, streaks, or opponent record; and
- no later rivalry attribution.

The raw attachment remains available only as source evidence. It triggers historical review only when the approved primary roster or franchise cannot otherwise resolve.

### Prestigio

- Ray alone receives 2011 matchups if a future source is approved.
- Prestigio has no 2012 owner-season or matchup attribution.
- Ray and Jeffrey each receive Prestigio matchups beginning in 2013.
- Jeffrey receives no 2011 matchup history.
- One Prestigio physical game remains one canonical franchise matchup.

### Shake-N-Bakers and Special Brownies

- Landon’s Special Brownies games remain Landon’s independent history.
- Jordan receives no Special Brownies games.
- Jordan’s Shake-N-Bakers games before 2025 remain Jordan’s alone.
- Landon receives Shake-N-Bakers games beginning in 2025.
- Landon receives no pre-2025 Shake-N-Bakers games.

### Confirmed and unresolved Sleeper attachments

Sleeper `co_owners` is supporting evidence, not authority over approved ownership tenure.

- **2023 Doug/Aaron:** Doug was the sole historical owner. Aaron was attached only to draft for Doug. Doug receives the complete franchise and matchup history; Aaron receives no 2023 owner-season, franchise, placement, matchup, championship, career, or opponent attribution. No Doug/Aaron co-ownership tenure may be created.
- **Billy’s final season:** Billy remained the sole owner of his franchise. Any temporary draft helper or attached Sleeper account receives no ownership or matchup attribution. A reported `NakedBuddha` attachment and the claim that the account represented “The Oracle” are unresolved because repository evidence does not independently prove the attachment or identity. The account must not be identified as Aaron.

Neither attachment expands the canonical owner list.

## 8. Matchup classification rules

Classification must use league settings, paired weekly rows, and bracket crosswalks. Week number alone is insufficient for postseason subtype.

### 8.1 Regular-season matchup

Required evidence:

- week is before `playoff_week_start`;
- exactly two roster rows share the same numeric `matchup_id`;
- both scores exist; and
- the scoring period is final.

Counts toward recommended career, regular-season, rivalry, streak, and points scopes.

### 8.2 Championship playoff matchup

Required evidence:

- a winners-bracket row identifies the logical contest;
- the bracket row can be joined to the weekly score rows by season, round-derived week, and roster pair; and
- the contest is complete.

Every completed winners-bracket contest that is not third-place or another placement game is a `championship-playoff` matchup. This classification does not mean every record decided the title. `isChampionshipGame` is true only for the completed winners-bracket `p === 1` league title game; semifinal and earlier rounds retain `isChampionshipGame === false`. Counts toward career, playoff, rivalry, streak, and points scopes.

### 8.3 Third-place matchup

A completed winners-bracket row with `p === 3`.

Recommended treatment:

- count in career, third-place, rivalry, streak, and points scopes;
- report separately from the championship-playoff record; and
- never infer a third-place result only from final standings when game data is absent.

### 8.4 Other placement matchup

A completed bracket row such as `p === 5` that determines a placement but not championship advancement.

Recommended treatment:

- report in a separate placement bucket;
- exclude from default career, playoff, rivalry, and streak records; and
- retain scores and facts for explicit all-games queries.

### 8.5 Consolation matchup

A completed game in a configured non-championship consolation bracket that is not a River City loser-advances Toilet Bowl.

Recommended treatment:

- count in consolation record and consolation points only;
- exclude from default career, playoff, rivalry, and streak records; and
- remain queryable as a completed game.

No historical source currently proves a separate River City consolation format apart from the losers bracket. Season configuration must decide this explicitly.

### 8.6 Toilet Bowl or last-place matchup

A completed game in a season explicitly configured as a loser-advances Toilet Bowl. The `p === 1` losers-bracket final is the last-place final.

Important:

- score result is always determined by points for/against;
- bracket advancement is stored separately because the lower-scoring team can advance toward last place;
- Sleeper `w`/`l` bracket semantics must not be relabeled as score win/loss without checking scores; and
- the last-place flag comes from the completed bracket and approved season rules.

Recommended treatment:

- count in Toilet Bowl and consolation scopes;
- exclude from default career, playoff, rivalry, and streak scopes; and
- keep points in a separate Toilet Bowl bucket.

### 8.7 Bye or missing opponent

A bracket bye, one-row matchup group, missing opponent, or unresolved source slot is not a competitive game.

- no win, loss, or tie;
- no points for/against in matchup summaries;
- no rivalry or streak effect; and
- preserve as coverage or bracket-progress metadata.

### 8.8 Tie

For regular season, equal final scores produce a tie.

For playoffs:

- retain `scoreResult: "tie"` when aggregate scores are equal;
- use the official bracket winner only for `officialAdvancementResult`; and
- do not alter the margin from zero.

A tie increments ties and games played. It ends an active win or loss streak. It does not become a win merely because a platform tiebreaker advanced one side.

### 8.9 Zero-score matchup

Zero is a score value, not a completion signal.

- A paired, finalized historical 0–0 contest can be a tie but should carry a review note.
- A finalized zero against a nonzero score can be a valid result.
- Future, abandoned, unpaired, or trailing-week zero rows remain incomplete or anomalous.
- The known 2019 and 2020 trailing zero rows are unpaired and must not count.

### 8.10 Abandoned or incomplete matchup

Any of the following prevents statistical inclusion:

- future scoring period;
- missing score;
- only one side;
- ambiguous or missing pairing;
- incomplete multi-week round;
- bracket row without final participants where bracket evidence is required; or
- current-season game not final.

Incomplete records may be exposed for schedule display but do not affect any record, points total, margin, opponent summary, or streak.

### 8.11 Multi-week playoff round

Represent the logical bracket contest once:

- one canonical bracket key;
- multiple ordered `scoringPeriods`;
- aggregate points for/against;
- one result and one streak event; and
- one owner-attributed record per approved owner.

Do not count each leg as a separate playoff win or loss. Raw legs remain available for audit. Current verified leagues appear single-week, but 2018–2019 do not expose a populated `playoff_round_type`, so their observed bracket/week structure must be tested rather than assumed.

### 8.12 Schedule or stat correction

The most recent reviewed Sleeper snapshot is authoritative for the engine input.

- A correction updates the payload under the same stable source contest key.
- Do not append a second career game for a corrected score or commissioner bracket seed.
- Preserve snapshot retrieval time, source version/checksum, and correction notes.
- `t1_original` and `t2_original` are evidence of commissioner bracket edits; final `t1`/`t2` values define the official contest.

### 8.13 Current 2026 games

As of the audit:

- weekly endpoints are empty;
- bracket rows have no winners or losers; and
- the league is pre-draft.

No 2026 record, score, margin, streak, or rivalry result may be emitted. Seeded bracket structure is schedule metadata only.

## 9. Calculation rules

### Objective matchup-engine facts

The matchup engine or a factual summary helper in the same Phase 3 boundary should calculate:

- completed games, wins, losses, and ties;
- record by eligibility scope;
- regular-season record;
- championship-playoff record;
- third-place, placement, consolation, and Toilet Bowl records;
- points for and against by scope;
- average margin;
- largest win and largest loss;
- current and longest win/loss streaks over eligible games;
- record and points by opponent owner;
- record and points by opponent franchise;
- record by season;
- source and attribution coverage; and
- incomplete or unresolved source counts.

All outputs remain raw values. Formatting such as `10-4`, `.714`, or `won 4 straight` belongs to consumers.

### Approved projection eligibility

- `careerRecord`: regular season + championship playoff;
- `playoffRecord`: championship advancement games and championship final, excluding third/fifth placement;
- `rivalryRecord`: regular season + championship playoff;
- streaks: same games as rivalry record;
- third-place, placement, consolation, and Toilet Bowl: separate records;
- `allCompletedRecord`: optional explicit query across every completed class.

Every owner record carries eligibility booleans so no summary silently changes game definitions.

### Points and margins

- `margin = pointsFor - pointsAgainst` from the owner perspective.
- Canonical absolute margin is presentation-derived; retain side-oriented scores.
- Multi-week playoff points are aggregated once at the logical contest level.
- Points totals must be available by classification rather than silently combined.
- Largest win requires `result === "win"`; largest loss requires `result === "loss"`.

### Streaks

- Sort by season, week start, and stable matchup key.
- Ignore incomplete and ineligible games.
- A tie ends a win or loss streak.
- Recommended career streaks may cross season boundaries; season summaries reset at each season.
- Co-owners receive the same franchise streak event during approved shared tenure.

### Opponent summaries

One owner-attributed record counts once in that owner’s career record even when the opponent franchise has multiple owners. For a specific owner-versus-owner query, the game belongs to each approved opponent owner listed in `opponentOwnerIds`.

League-wide game totals must aggregate canonical franchise matchups only.

## 10. Stable key rules

Stable keys must describe source contest identity, not display names, scores, winners, or array positions.

### Regular season

```text
sleeper:{season}:{leagueId}:regular:w{week}:m{matchupId}
```

The numeric matchup ID is unique only within a week, so season, league, and week are mandatory.

### Bracket contest

```text
sleeper:{season}:{leagueId}:bracket:{winners|losers}:r{round}:m{bracketMatchNumber}
```

This remains stable when commissioner seeding or participants change under the same official bracket slot.

### Owner attribution

```text
{franchiseMatchupKey}:owner:{ownerId}
```

There is one owner key per canonical contest and attributed owner. Opponent owner IDs do not belong in the key because that would create a co-owner cross-product.

Rows lacking enough source identity for either key remain coverage anomalies. Do not manufacture a matchup key from an array index.

## 11. Proposed exported types

Recommended exports from `lib/history/ownerMatchupHistory.ts`:

- `OwnerMatchupType`
- `OwnerMatchupResult`
- `OwnerMatchupAttributionMethod`
- `OwnerMatchupSource`
- `MatchupScoringPeriod`
- `CanonicalMatchupSide`
- `CanonicalFranchiseMatchup`
- `CanonicalMatchupCoverage`
- `OwnerMatchupRecordEligibility`
- `OwnerMatchupHistoryRecord`
- `OwnerMatchupRecordCoverage`
- `OwnerMatchupHistoryFilter`
- `OwnerMatchupRecordSummary`
- `OwnerOpponentMatchupSummary`
- `OwnerSeasonMatchupSummary`
- `OwnerMatchupHistoryCoverage`
- `OwnerMatchupSeasonCoverage`
- source snapshot/input types needed by the deterministic builder

Suggested factual summary shape:

```ts
export type OwnerMatchupRecordSummary = {
  games: number;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  averageMargin: number | null;
  largestWin: OwnerMatchupHistoryRecord | null;
  largestLoss: OwnerMatchupHistoryRecord | null;
  currentStreak: {
    result: "win" | "loss";
    games: number;
  } | null;
  longestWinningStreak: number;
  longestLosingStreak: number;
};
```

Returned records and nested arrays must be cloned or immutable so consumers cannot mutate cached state.

## 12. Proposed public API

Keep the deterministic engine API small:

- `buildOwnerMatchupHistory(input)`
- `getAllCanonicalFranchiseMatchups()`
- `getAllOwnerMatchupHistory()`
- `getOwnerMatchupHistory(ownerIdOrSlug, filter?)`
- `getOwnerMatchupHistoryForSeason(season, filter?)`
- `getOwnerOpponentMatchupHistory(ownerIdOrSlug, opponentIdOrSlug, filter?)`
- `getFranchiseMatchupHistory(franchiseId, filter?)`
- `summarizeOwnerMatchups(recordsOrFilter)`
- `getOwnerOpponentMatchupSummaries(ownerIdOrSlug, filter?)`
- `getOwnerSeasonMatchupSummaries(ownerIdOrSlug, filter?)`
- `getOwnerMatchupHistoryCoverage()`

Acquisition is separate from deterministic functions. Phase 3B.1 implements strict acquisition in `canonicalMatchupAcquisition.ts` and deterministic normalization in `canonicalMatchupHistory.ts`. Acquisition failure throws rather than becoming an empty season. Tests and runtime summaries should consume supplied input, reviewed snapshots, or fixtures rather than hide live-network failure.

## 13. Coverage reporting

`OwnerMatchupHistoryCoverage` should report at minimum:

- seasons requested;
- seasons with and without league IDs;
- source snapshots loaded;
- regular weeks expected and loaded;
- playoff weeks expected and loaded;
- raw matchup rows;
- paired numeric matchup IDs;
- unpaired or missing-ID rows;
- canonical franchise matchups created;
- complete and incomplete matchups;
- matchups by classification;
- roster-season mappings resolved, partial, and missing;
- franchise mappings resolved and missing;
- owner attributions created;
- co-owner attributions created;
- ignored or unresolved Sleeper attachment IDs and dispositions;
- ambiguous bracket-to-week joins;
- zero-score review rows;
- duplicate canonical keys;
- duplicate owner-attribution keys; and
- source warnings and notes by season.

Coverage must distinguish:

- no data exists;
- an endpoint returned a valid empty response;
- acquisition failed;
- source rows exist but cannot be normalized; and
- data exists but the game is not complete.

## 14. Validation requirements

The proposed `scripts/owner-matchup-history.test.ts` should use committed fixtures or reviewed snapshots and verify:

1. Canonical matchup keys are unique and stable across rebuilds.
2. Owner-attribution keys are unique and stable.
3. Each paired regular matchup creates one canonical game, not two roster-row games.
4. Missing or equal undefined matchup IDs never pair unrelated teams.
5. Bracket keys remain stable across participant or score corrections.
6. Multi-week playoff legs aggregate into one logical result.
7. Byes and incomplete games affect coverage but no records or streaks.
8. Final ties remain ties even when a playoff tiebreaker advances one side.
9. Zero-score completion rules do not count future or unpaired rows.
10. Regular, championship-playoff, third-place, placement, consolation, and Toilet Bowl records remain separate.
11. Toilet Bowl score result and loser-advances status are not conflated.
12. 2026 contributes no completed result.
13. Ray alone receives a hypothetical/fixture 2011 Prestigio game.
14. Ray receives no 2012 game.
15. Jeffrey receives no 2011 game and begins shared Prestigio attribution in 2013.
16. One shared Prestigio game remains one league-wide canonical game.
17. Jordan receives no Special Brownies games.
18. Landon receives no pre-2025 Shake-N-Bakers games.
19. Landon begins shared Shake-N-Bakers attribution in 2025.
20. Sleeper `co_owners` and attached-user fields never expand canonical ownership without an approved tenure.
21. Owner career games do not multiply by the number of opponent co-owners.
22. Wins + losses + ties equals completed eligible games for every summary.
23. Points and margins reverse correctly between both franchise sides.
24. Current and longest streak calculations handle ties and classification filters.
25. Returned records cannot mutate cached engine state.
26. Coverage counts reconcile with source rows and generated records.
27. Doug receives the complete 2023 franchise history while Aaron receives no 2023 owner or matchup record.
28. The raw 2023 Aaron attachment remains auditable but creates no statistics.
29. Billy remains the sole owner in his final season; any unresolved `NakedBuddha` or “The Oracle” helper evidence creates no owner record and does not block Billy’s attribution when the primary roster resolves.

Cross-check completed regular-season totals against Sleeper roster settings and the existing League Archives output. Differences must be reported, not adjusted silently.

## 15. Known gaps and risks

### Historical gaps

- 2011–2017 have no weekly matchup source in the repository or configured Sleeper league IDs.
- Final standings cannot reconstruct schedules, scores, opponent records, or streaks.
- The 2018 roster 5 owner ID (`342885779137216512`) is commissioner-confirmed as Landon Elliott's historical Sleeper ID, and the roster maps to Special Brownies.
- Historical team names are not canonical matchup identities.
- Some 2018–2024 retired-owner Sleeper IDs remain distributed across duplicate maps; Landon's current and historical IDs are now approved identity data.

### Attachment evidence and attribution rulings

- Aaron’s 2023 attachment to Doug’s roster is confirmed as a draft-helper workaround. Doug remains the sole owner and Aaron receives no attribution.
- Billy remains the approved sole owner in his final season. The reported `NakedBuddha` helper attachment and “The Oracle” identity are unresolved in repository evidence; neither may create ownership, and neither may be identified as Aaron.
- Landon's current and commissioner-confirmed 2018 historical Sleeper IDs are attached to his single canonical owner profile.

### Source and classification risks

- Live Sleeper history can change after stat or commissioner corrections.
- No versioned matchup snapshots currently exist.
- The shared `sleeperFetch` helper converts failures to empty arrays, which is insufficient for coverage-sensitive importing.
- League IDs are duplicated in `lib/sleeper.ts`, `lib/leagueAlgorithm.ts`, and Rivalry Hub.
- Playoff weekly rows can omit matchup IDs for byes or non-paired roster scores.
- Trailing weeks return unpaired score rows that current Rivalry Hub can falsely count.
- Losers-bracket `w`/`l` values describe bracket progression and must not be assumed to mean higher/lower score in a loser-advances format.
- 2025 bracket rows contain commissioner-edit evidence in original-team fields.
- 2018–2019 lack an explicit populated playoff-round-type value in the audited league response.

### Product risks

- Existing displayed manager records are hard-coded or aggregate roster settings and may use a different definition of “career record.”
- Counting or excluding third-place, placement, consolation, and Toilet Bowl games materially changes career and rivalry records.
- A rivalry interpretation engine must not be built until the factual record and default scopes are approved.

## 16. Deferred rivalry features

The matchup engine supplies facts. A later rivalry engine may interpret them into:

- primary rival;
- rivalry score or intensity;
- closest rivalry;
- most painful opponent;
- favorite victim;
- nemesis;
- upset history;
- rivalry narratives;
- rivalry badges; and
- subjective weighting for recency, playoffs, margins, or championships.

The existing `getIntensityLabel` thresholds are display logic, not an approved rivalry model.

## 17. Recommended Phase 3B implementation plan

### Phase 3B.1 — Canonical franchise matchups (completed)

- Strictly acquire league info, weeks, and brackets without swallowing failures.
- Reuse `LEAGUE_HISTORY_IDS`.
- Implement source parsing, regular pairing, bracket crosswalking, classification, completion, multi-week aggregation, canonical keys, and coverage.
- Add focused fixtures for every classification and source anomaly.
- Produce one physical/logical game per canonical key.
- Keep owner attribution out of canonical records.

### Phase 3B.2 — Owner projection (completed)

- Implemented all 96 commissioner-approved season-roster-to-franchise mappings.
- Recorded Landon's confirmed historical Sleeper ID without creating a second identity.
- Preserve raw attached-user metadata as evidence while excluding it from canonical ownership.
- Implemented deterministic owner-side projection through approved Owner Season History.
- Implemented Ray/Jeffrey, Jordan/Landon, Doug/Aaron, and Billy/helper boundary tests.
- Added immutable raw projection accessors and coverage.
- Deferred records, streaks, opponent summaries, season summaries, Rivalries, and UI.

### Later review

- Report coverage, unresolved mappings, source conflicts, and differences from hard-coded displayed records.
- Do not change Managers, Matchups, Archives, Treasury, or Rivalry UI.
- Do not begin rivalry interpretation until Phase 3B facts are approved.

## 18. Decision status after Phase 3B.2

Approved and implemented:

1. all 96 historical roster mappings, including Landon's 2018 Special Brownies roster;
2. overall and future rivalry eligibility limited to regular and championship-playoff contests;
3. third-place, placement, consolation, and Toilet Bowl as separate scopes;
4. coverage-only handling for byes and incomplete contests; and
5. existing hard-coded profile records remaining comparison-only.

Deferred:

1. whether versioned repository snapshots become mandatory; and
2. whether future career streaks cross season boundaries.
