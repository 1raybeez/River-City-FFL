# River City post-foundation engine gap audit

Status: discovery only. This document records the repository state on August
2, 2026. It does not reopen the approved identity, season-result, matchup, or
Manager Profile foundations and does not approve new rivalry or financial
rules.

## 1. Scope and architectural constraints

This audit covers only the reusable fact and interpretation layers that remain
after the Managers/history foundation. The following boundaries are mandatory:

- canonical matchup keys count physical contests; owner projections count
  personal credits;
- co-owners may receive separate personal credits without creating another
  physical contest;
- final season results are independent of matchup availability;
- platform placement is independent of a league-recognized historical title;
- a raw historical team name is not a canonical franchise;
- directional opponent facts are not rivalry interpretation;
- a public contact label is not a private contact target; and
- unreconciled payout evidence is not career earnings.

The approved engines are treated as dependencies, not redesign targets. Their
relevant accessors are cited where a remaining feature should consume them.

## 2. Executive finding

The largest remaining problem is not a lack of raw data. It is that League Info
features frequently bypass the approved identity and history layers:

- Rivalry Hub rebuilds weekly head-to-head results in the browser.
- Archives rebuilds owner records from season roster settings and current
  Sleeper account IDs.
- Trophy Room and `/history` use hard-coded or legacy placement ledgers.
- Draft History discovers and shapes drafts in its page component.
- Payouts has a useful typed selector layer, but publicly labels unresolved
  monetary evidence as earnings history.
- trade, keeper, lineup, and owner-image logic exists in several partial forms
  without canonical owner/franchise attribution.
- current division and standings logic is repeated in three places.

The recommended next step is therefore not UI work. It is a small sequence of
fact engines with provenance and coverage, followed by thin page adapters.

## 3. Capability inventory

“Years” means the span the current code attempts or the checked-in evidence
actually covers. It does not certify complete source coverage.

| Capability | Exact implementation and data files | Current public functions | Sources and years | Current consumers | Assessment |
|---|---|---|---|---|---|
| Rivalries | `app/league-info/rivalries/page.tsx`; factual inputs exist in `lib/history/ownerMatchupSummary.ts` and `lib/history/ownerMatchupProjection.ts` | No reusable rivalry function. The page has local `getIntensityLabel` and inline series calculations. Approved reusable facts: `getOwnerOpponentMatchupSummary()`, `getOwnerOpponentMatchupSummaries()`, and `getOwnerHeadToHead()` | Page fetches Sleeper users, rosters, and Weeks 1–17 for hard-coded 2018–2026 league IDs | `/league-info/rivalries`; Manager Overview links to it and shows a curated rival snapshot from approved opponent facts | Legacy/partial. Calculations are page-local, duplicate approved summary facts, and use noncanonical owner attribution. Rivalry interpretation is missing. |
| Head-to-head | `lib/history/ownerMatchupProjection.ts`; `lib/history/ownerMatchupSummary.ts`; `app/league-info/rivalries/page.tsx`; `components/managers/OwnerProfile.tsx`; `docs/managers/opponent-history-ui-spec.md` | `getOwnerHeadToHead()`, `getOwnerMatchupHistory()`, `getOwnerOpponentMatchupSummary()`, `getOwnerOpponentMatchupSummaries()` | Canonical Sleeper matchup history, 2018–2026; season-result-only years remain correctly unavailable for matchup facts | Manager Opponent History; Rivalry Hub does not use these functions | Summary facts are complete and reusable. An ordered, presentation-ready meeting-log accessor and detail route are missing. |
| Franchise / Team Legacy | `lib/managers/identityData.ts`; `lib/managers/identitySelectors.ts`; `lib/history/ownerSeasonHistory.ts`; `lib/history/ownerCareerSummary.ts`; `components/managers/OwnerProfile.tsx` | Identity: `getFranchiseById()`, `getOwnershipTenuresForOwner()`, `getFranchiseStatSummary()`; history: `getOwnerSeasonHistory()`, `getOwnerCareerSummary()` | Approved tenures and season results, 2011–2026; historical team names where sourced | Manager Profile Team Legacy | Partial. Canonical facts exist, but the presentation model is tenure-centric and its `franchiseStatSummaries` are curated duplicates rather than a derived franchise timeline/summary. |
| Awards | `lib/history/historicalSeasonResults.ts`; `lib/history/ownerCareerSummary.ts`; `app/league-info/trophy-room/page.tsx`; `lib/sleeper.ts`; `app/api/history/awards/route.ts`; `components/TrophyRoom.tsx`; `lib/finance/firestoreFinance.ts` | Approved placement accessors; `getLeagueHistoryAwards()` and `getFullLeagueHistory()` return `MANUAL_HISTORY`; Firestore `getFinanceAwards()` | Placement facts 2011–2025; live financial awards 2026; old manual ledger; hard-coded Trophy Room arrays | Trophy Room page/component, history awards API, Payouts | Fragmented. Placement awards already have an approved source. Non-placement awards have current Firestore rows and workbook evidence but no historical awards engine. |
| Records | `lib/history/ownerCareerSummary.ts`; `lib/history/ownerMatchupSummary.ts`; `app/league-info/archives/page.tsx`; `app/history/page.tsx`; `lib/manual-history.ts` | Approved career accessors and canonical Hall of Fame authority | Approved placement 2011–2025 and matchup facts 2018–2026; Archives independently fetches 2018–2026 roster settings | Archives and `/history` | Partial. Owner placement and matchup records already exist, but league record-book categories and lineage do not. |
| Financials / payouts | `data/source/historical/river-city-final-standings-and-payouts.xlsx`; `lib/finance/payoutHistoryData.ts`; `lib/finance/payoutHistoryTypes.ts`; `lib/finance/payoutHistorySelectors.ts`; `lib/finance/firestoreFinance.ts`; `lib/finance/paymentHandles.ts`; `lib/league-finance.ts`; `components/transactions/Treasury.tsx`; `app/league-info/payouts/page.tsx` | Historical selectors including `getAllOwnerFinancialSeasons()`, `getAllTimeOwnerFinancialSummaries()`, `getSeasonFinancialSummary()`, and `validatePayoutHistoryTotals()`; live Firestore getters and seed builders; `calculateWeeklyHighScores()`, `getDivisionWinners()`, `calculatePayout()` | Workbook/typed matrix 2016–2025; live Firestore ledger/rules/awards 2026 | Payouts; legacy Treasury | Partial and currently unsafe for career display. Typed arithmetic reconciles to the copied matrix, not to the conflicting source ledgers. Payouts displays these totals as earnings history. |
| Draft history | `app/league-info/draft/page.tsx`; `lib/sleeper.ts`; `app/api/history/drafts/route.ts`; Sleeper draft endpoints | `getLeagueDrafts()`, `getSleeperLeagueDrafts()`, `getSleeperDraft()`, `getSleeperDraftPicks()`, `findRiverCityAuctionDraft()` | Page attempts 2018–2026; source is Sleeper drafts, users, and picks | Draft History page; history drafts API | Partial. Acquisition helpers are reusable, but stable draft/pick records, canonical franchise attribution, coverage, and accessors are missing. Most shaping and totals occur in the page. |
| Auction purchases | `data/auction/historical-results/manifest.json`; `data/auction/historical-results/sleeper-auction-2021.json` through `-2025.json`; `lib/auction/historicalAuctionResults.ts`; `lib/auction/ownerTendencies.ts`; `lib/auction/sleeperAuctionSync.ts`; `app/commish/auction/AuctionWarRoomClient.tsx`; `app/api/auction/sleeper-snapshot/route.ts`; `lib/auction/purchaseDecisions.ts` | Validation helpers in `historicalAuctionResults.ts`; `calculateOwnerTendencies()`; current snapshot normalization and purchase-layer merge functions; purchase-decision persistence | 960 checked-in Sleeper purchases across 2021–2025, 192 per year; operational Sleeper/manual-local purchases for 2026 | Auction War Room and its APIs | Strong raw normalization but partial history architecture. “Exact” mapping means Sleeper roster/user agreement, not canonical owner/franchise attribution. Owner tendencies group by `pickedByUserId`. No public longitudinal purchase accessor exists. |
| Keeper history | Keeper flags in the 2021–2025 auction files; `lib/auction/sleeperAuctionSync.ts`; `lib/history/keeperCostResolver.ts`; `lib/timeline/keeperEngine.ts`; War Room keeper controls | `resolveKeeperCostForPlayer()` and `computeKeeperValue()`; current auction snapshot normalizers | Checked-in auction rows contain 24 keepers per season for 2021–2025; current Sleeper roster/draft data supports 2026 | Auction War Room; trade valuation helper | Partial. Current cost/value helpers are reusable for their narrow purposes, but there is no canonical longitudinal keeper-event layer or approved owner/franchise projection. |
| Trade history / summaries | `lib/history/tradeHistory.ts`; `lib/history/sleeperTradeScraper.ts`; `lib/history/normalizeTrade.ts`; `lib/history/normalizeAllTrades.ts`; `lib/history/managerResolver.ts`; `lib/history/buildDistribution.ts`; `lib/timeline/tradeHistoryEngine.ts`; `lib/timeline/buildTeamDataFromSleeper.ts`; `app/api/history/trades/route.ts`; `app/api/history/transactions/route.ts`; `app/api/transactions/route.ts`; import/recompute scripts | `saveHistoricalTrade()`, `getHistoricalTradesForYear()`, `scrapeAllHistoricalTrades()`, `normalizeAllHistoricalTrades()`, `fetchHistoricalTradesForLeague()`, `computeTradeHistoryMetrics()`, `buildTradeHistoryForLeague()` | Sleeper transactions intended for 2018–2026; actual Firestore completeness is not asserted by checked-in tests | Team timeline data builder, maintenance/API paths, approved trade-aggression input pipeline | Partial and internally inconsistent. Raw and normalized collections use multiple shapes, manager resolution is a documented temporary stub, and team metrics are roster-ID based. No canonical trade or owner summary API exists. |
| Lineup history | `app/league-info/archives/page.tsx`; Sleeper roster `settings.fpts` and `settings.ppts`; current matchup starters/points types in `lib/sleeper.ts` | No history accessor | Archives attempts 2018–2026. Only season-level actual and potential points are currently consumed. | Archives lineup efficiency leaderboard | Missing as an engine. The page computes season and career efficiency inline with current Sleeper IDs; no canonical owner/franchise attribution or source coverage exists. |
| Current standings / divisions | `app/managers/page.tsx`; `components/managers/OwnerProfile.tsx`; `app/matchups/page.tsx`; `lib/finance/paymentHandles.ts`; `components/transactions/Treasury.tsx`; `lib/sleeper.ts` | Sleeper acquisition helpers; `getDivisionWinners()` | Current 2026 league, rosters, users, matchups, and brackets | Managers landing, Manager Profile Current Division, Matchups, Treasury/finance helpers | Partial and duplicated. Division names, standings, record formatting, points, ranks, and tiebreaks are calculated independently. This is current-state logic, not historical matchup logic. |
| Owner image resolution | `lib/managers/identityData.ts`; `lib/managers/activeManagers.ts`; `lib/managers/retiredManagers.ts`; `lib/managers/staff.ts`; `lib/constants.ts`; `lib/managersData.ts`; `lib/identity/nameResolver.ts`; League Info and Matchups pages | Canonical profile getters expose `OwnerProfile.photo`; no shared image resolver | Curated local photos plus current Sleeper avatar hashes/CDN URLs | Managers/Profile pages use curated photos; Rivalries, Archives, Draft, Matchups, Trophy Room, and Treasury each resolve images separately | Partial/duplicated. Canonical photos exist but are unused by most League pages; fallback order and identity resolution are page-specific. |

### Public API precision notes

The reusable functions behind the condensed table are:

- current finance: `getCurrentFinanceSeason()`, `getFinanceSeason()`,
  `getFinanceOwnerLedger()`, `getFinanceAwards()`, `getFinanceRules()`, the
  three finance seed builders, and the finance write/initialize functions in
  `firestoreFinance.ts`;
- current auction normalization: `normalizeSleeperAuctionPosition()`,
  `getSleeperAuctionSyncPlayerKey()`,
  `normalizeSleeperAuctionSyncSnapshot()`, and
  `mergeSleeperAuctionPurchaseLayers()`;
- auction market analytics, which are not purchase-history accessors:
  `calculateHistoricalPricing()` and `calculateHistoricalPriceComparison()`;
- canonical profile/presentation inputs: `getOwnerProfileById()`,
  `getOwnerProfileBySlug()`, `getOwnerProfileViewModelBySlug()`, and the
  franchise/tenure accessors listed above; and
- historical trade imbalance support: `buildHistoricalImbalanceDistribution()`.

There is no public rivalry interpreter, ordered head-to-head detail accessor,
franchise timeline accessor, canonical draft/purchase/keeper/trade accessor,
lineup summary accessor, current standings builder, league record-book
accessor, reconciled finance accessor, or shared owner-image resolver.

### Existing data that is unused or underused

- Approved `OwnerOpponentMatchupSummary` facts are unused by Rivalry Hub.
- Approved owner-season franchise, historical-name, co-owner, and achievement
  facts are underused by Team Legacy, which still reads tenure cards and
  curated `franchiseStatSummaries`.
- Historical Season Results are unused by Trophy Room and `/history`.
- Approved franchise-roster mappings are unused by Draft History, Archives,
  Rivalry Hub, trade normalization, and lineup calculations.
- The checked-in 2021–2025 auction outcome files are used by War Room owner
  tendencies but not by Draft History or a public longitudinal accessor.
- The Firestore `normalized_trades` output has no Manager or League Info page
  consumer, and its temporary manager IDs prevent safe owner attribution.
- Canonical owner photos are unused by most League Info pages.
- Workbook annual award detail remains evidence-only; the copied
  `Paid_Earnings` matrix is used despite that unresolved evidence.

## 4. Rivalries

### Current calculation path

`app/league-info/rivalries/page.tsx` is the entire current Rivalry Hub engine.
It contains hard-coded league IDs and a hard-coded manager map, fetches rosters
and Weeks 1–17 for every selected season, joins rosters by `owner_id` or
`co_owners`, pairs rows by weekly `matchup_id`, and calculates in React:

- wins, losses, meetings, points for, and points against;
- winning percentage and series leader;
- biggest win and closest win;
- the last five and last meeting;
- current streak and last winner; and
- the subjective intensity label.

The intensity thresholds are local policy: “Blood Feud,” “Heated,”
“Competitive,” and “Cold” depend on meeting count and record gap. They have no
approved backend contract.

### Why this is legacy

- It does not consume `OwnerOpponentMatchupSummary`.
- It treats Ray/Jeffrey as one hard-coded Sleeper selection rather than two
  canonical owner credits.
- It accepts Sleeper `co_owners`, which can incorrectly grant a temporary draft
  helper historical credit.
- It counts weekly rows rather than canonical matchup keys. A multi-week
  playoff contest can therefore appear more than once.
- It does not apply approved matchup eligibility/classification rules and can
  include incomplete rows.
- It states that playoff record is unavailable although the approved summary
  provides championship-playoff and championship-game splits.
- It calculates streaks even though streak analytics are explicitly deferred.

### Remaining factual layer

No second matchup history should be built. A small reusable head-to-head detail
model should compose approved outputs:

- `OwnerOpponentMatchupSummary` for directional totals, splits, points,
  extremes, and first/latest meetings; and
- approved owner matchup projections, selected by canonical key, for a stable
  ordered meeting log.

A suitable file is `lib/history/ownerHeadToHeadDetail.ts`. It should expose an
input-driven builder plus accessors for an owner/opponent pair. Its records
should retain owner perspective, canonical matchup key, season, week/round,
classification, scoring periods, score, result, completion, and source. It
must not calculate rivalry strength.

### Commissioner decisions required

Rivalry interpretation needs a separate future contract. Before it exists,
the commissioner must approve:

- eligible contest scopes;
- minimum meetings;
- the influence, if any, of series closeness, recency, playoff meetings,
  title games, margins, franchise continuity, and active status;
- whether a rival is directional or symmetric;
- deterministic tie-breaks;
- whether a curated primary rival may override a score; and
- whether streaks remain deferred.

The current page thresholds must not be promoted implicitly.

## 5. Head-to-head detail and route ownership

There is no dedicated owner-versus-owner route or reusable detail view model.
The approved summary already supplies the summary layer, and
`getOwnerHeadToHead()` already selects the relevant owner projections. The
missing piece is a stable ordered meeting log, not another record calculator.

The future route should be:

```text
/managers/owners/[owner]/opponents/[opponent]
```

That route matches the approved Opponent History drill-down plan. It should
present the first slug's directional perspective, reject self-pairs, resolve
both slugs through canonical identity, and use the shared detail accessor.
Rivalry Hub may link to the same route and consume the same facts. Any symmetric
rivalry interpretation belongs above this factual route model.

Co-owner behavior follows projection truth: Jeffrey never appears as Ray's
opponent, while a solo opponent can have distinct directional rows against Ray
and Jeffrey for one physical Prestigio contest. The detail log must reconcile
those personal rows by canonical matchup key when reporting league physical
contest counts.

## 6. Franchise history and Team Legacy

### Cause of repeated franchise cards

`TeamLegacy` in `components/managers/OwnerProfile.tsx` concatenates
`profile.currentTenures` and `profile.legacyTenures`, then renders one
`LegacyRow` per `ProfileTenure`. `buildProfileTenure()` in
`lib/managers/identitySelectors.ts` preserves each approved ownership tenure.
The display unit is therefore an ownership tenure, not a canonical franchise
or a consolidated franchise era. Two approved tenures for the same franchise
produce two visually identical franchise cards even when the identity is
correct.

### Existing reusable facts

- `identityData.ts`: canonical franchises, ownership tenures, co-owner sets,
  current roster IDs, league service tenures, and curated franchise summaries.
- `ownerSeasonHistory.ts`: season-specific owner/franchise association,
  ownership role, co-owners, historical team name, final placement, and
  achievement flags.
- `historicalSeasonResults.ts`: source-backed raw labels and platform versus
  historical championship facts.
- `ownerCareerSummary.ts`: owner-oriented franchise participation and
  placement summaries.

The old `franchiseStatSummaries` and `ProfileTenure.statSummary` are useful as
presentation data but duplicate facts now derivable from approved season
results. The older `OwnerProfileViewModel.timeline` assembled in
`identitySelectors.ts` also survives alongside the approved career timeline;
it should not become a second franchise-history source.

### Required engine

Create a future `lib/history/franchiseTimeline.ts` with franchise-centric,
immutable outputs. It should group approved owner-season rows by canonical
franchise while preserving, by season:

- owner credits and ownership roles;
- tenure starts, ends, and co-owner transitions;
- raw historical team names without turning them into franchises;
- platform placements and league-recognized championship flags; and
- source/coverage and unresolved fields.

It can expose franchise timeline, franchise season, and franchise result
summary accessors. It should not derive matchup records from owner credits.
If franchise matchup records are later desired, those must aggregate unique
canonical matchup keys separately.

This engine would feed Manager Profile Team Legacy, a future franchise route,
and a League History franchise timeline without changing the underlying
identity rulings. The commissioner only needs to decide whether a visual “era”
break occurs on every ownership-role change, only on a continuity break, or
also on a historical team-name change. The engine should preserve all events
regardless of that presentation choice.

## 7. Financials and payouts

### Sources and current selectors

There are three materially different sources:

1. `river-city-final-standings-and-payouts.xlsx` is archived evidence. Its
   `Paid_Earnings`, annual payout sheets, and `Sheet20` totals conflict in known
   places.
2. `payoutHistoryData.ts` is a typed copy of the `Paid_Earnings` 2016–2025
   paid/won matrix, with owner aliases and special attribution notes.
3. Firestore `finance_seasons/{year}`, its `owners` and `awards`
   subcollections, and `finance_rules/{year}` are the operational 2026 ledger.

`payoutHistorySelectors.ts` is reusable arithmetic over typed rows. Its
validation proves only that those rows total to the copied workbook-total
table. It does not reconcile the detailed annual awards, cash payments,
rollovers, offsets, food contributions, ring costs, or commissioner rulings.

### Known conflicts and current display risk

The approved import specification records, among other issues:

- stale 2025 `Paid_Earnings` values that omit final placement awards;
- several five-dollar differences between detailed and summary rows;
- conflicting 2022 Brian third-place values and aggregate totals;
- amounts rolled into other pots or settled through entry-fee offsets; and
- non-owner items such as `Damon Food`.

Despite that deferred reconciliation, `app/league-info/payouts/page.tsx`
currently calls `getAllTimeOwnerFinancialSummaries()` and displays “Earnings
History,” including gross won and net earnings. This is an unapproved-total
display. The Manager Profile correctly omits earnings.

The same Payouts component also calculates activity-season counts, combines
the static matrix with the live ledger, calculates live net positions, and
sorts history rows. `components/transactions/Treasury.tsx` and
`lib/finance/paymentHandles.ts` separately calculate weekly prizes, division
winners, placements, and totals from Sleeper. `lib/league-finance.ts` contains
another fixed dues/payout table. These are duplicate policy implementations.

### Exact work before career money can be shown

1. Inventory every 2016–2025 annual award, entry fee, payment, offset,
   rollover, deduction, and non-owner expense with cell provenance.
2. Define typed terms: assessed dues, dues paid, gross award earned, cash paid,
   rolled/withheld amount, adjustment, expense, and net cash position.
3. Resolve every conflicting annual total by commissioner ruling; do not use a
   balancing adjustment without provenance.
4. Define co-owned-franchise payout attribution separately from historical
   ownership credit. Existing workbook attribution to Ray is evidence, not an
   automatic split with Jeffrey.
5. Normalize 2026 Firestore rows to the same contract and lock archived
   seasons.
6. Add coverage and reconciliation tests at award, owner-season, season, and
   all-time levels.
7. Only then expose `historicalFinanceHistory.ts` accessors and allow pages to
   label totals as career payouts or net earnings.

Until then, the workbook and typed matrix must be labeled evidence/unreconciled
and must not supply career earnings.

## 8. Awards and records

### Awards

Placement awards belong to `HistoricalSeasonResults` and its derived owner
season/career layers. Trophy Room duplicates them in three hard-coded arrays:
`CHAMPIONS`, `PODIUMS`, and `LOSERS`. The duplication is already stale: its
2022 champion list omits the approved historical co-champion distinction, and
its 2011 loser conflicts with the approved ten-team result in which Rachel is
tenth and last.

`getLeagueHistoryAwards()` and `getFullLeagueHistory()` in `lib/sleeper.ts`
are misleading names: both return the retired `MANUAL_HISTORY` placement
ledger. The history awards API and `components/TrophyRoom.tsx` consume that
legacy source. They should eventually use approved placement accessors.

Non-placement awards are a separate domain. Firestore has typed current award
rows for weekly high score, division winner, placement, and adjustments; the
workbook contains 2016–2025 payout award evidence. A future
`lib/history/leagueAwardHistory.ts` is justified only after the financial
reconciliation defines which rows are factual awards versus payments. It
should reference canonical owners/franchises and source evidence but must not
recalculate placements already supplied by Historical Season Results.

### Records

`app/league-info/archives/page.tsx` fetches every season using a commissioner
account lookup and derives all-time wins, points, best/worst points seasons,
win percentage, and lineup efficiency in React. It joins by Sleeper `owner_id`
and a hard-coded name map, so account changes split careers and co-owner/helper
rules are bypassed. Its roster-setting win totals also do not declare the same
eligibility scope as Owner Matchup Summary.

The former duplicate all-time stats path has been retired. `/history` now uses
the approved canonical Hall of Fame résumé authority, while owner and franchise
pages use their broader canonical career summaries.

A future `lib/history/leagueRecordBook.ts` should be a registry of factual
record categories whose entries cite an approved source engine and lineage
keys. Placement records should consume Historical Season Results/Owner Career
Summary. Matchup records should consume Owner Matchup Summary and canonical
keys as appropriate. Points and lineup records should wait for their own
normalized layers. Record definitions, minimum-season thresholds, ties, and
whether categories are owner- or franchise-based require commissioner
approval; page-local definitions should not be grandfathered automatically.

## 9. Draft, auction, keeper, trade, and lineup history

### 9.1 Draft history

The Draft History page attempts 2018 through the current year, discovers the
River City league through a commissioner user/name search, fetches the selected
draft, users, and picks, and constructs team columns in React. Local helpers
parse price, total each owner's spend, and build search keys. It does not use
the approved season-roster mappings.

`lib/sleeper.ts` contains useful acquisition primitives, but
`getLeagueDrafts()` actually returns picks from the first draft rather than
draft metadata. The history draft API merely exposes that result.

Required engine: `lib/history/canonicalDraftHistory.ts`, with acquisition kept
separate. It should produce stable draft and pick keys, season/draft metadata,
pick order, player identity as sourced, price/keeper flags where present,
canonical roster-season franchise attribution, owner credits projected from
approved tenure, and explicit coverage. It should support the Draft History
board without embedding search/highlight UI behavior.

### 9.2 Auction purchase history

The checked-in 2021–2025 Sleeper auction files contain 960 normalized rows,
192 per season. Each season reports 24 keepers, no missing prices, no duplicate
pick numbers, and 192 “exact” Sleeper mappings. This is valuable source data,
but `ownerMapping: "exact"` only proves the pick's roster and Sleeper user
agree. It does not prove canonical historical ownership.

`calculateOwnerTendencies()` is a substantial reusable analytics function,
but its own warning says profiles are grouped by `pickedByUserId`. It is
therefore appropriate for the current War Room's operational opponent intel,
not yet a canonical Owner Profile purchase history. The 2018–2025 masterview
and auction-value workbooks are player market/value sources, not proof of
River City purchases; they must not fill the 2018–2020 outcome gap.

Required engine: `lib/history/canonicalAuctionPurchaseHistory.ts`, ideally
built on canonical draft picks. It should validate one purchase per stable
pick/player, preserve price and keeper source, map roster-season to franchise,
project approved owner credits, and distinguish physical purchases from owner
credits. Its first authoritative checked-in span is 2021–2025; 2026 can be
added from the existing Sleeper/manual merge only after persisted manual-local
sales and final Sleeper picks are reconciled.

This engine would improve Draft History, Auction War Room history inputs,
future Manager draft profiles, future franchise pages, and league auction
records. `ownerTendencies.ts` could then accept canonical purchases instead of
raw Sleeper identities without changing its approved formulas.

### 9.3 Keeper history

Keeper facts currently live as flags on auction picks and current sync rows.
`resolveKeeperCostForPlayer()` finds a latest priced transaction and adds the
current keeper increment; `computeKeeperValue()` is a forward-looking value
model. Neither is a historical keeper ledger.

Required engine: `lib/history/canonicalKeeperHistory.ts`, preferably a typed
view over canonical auction purchases rather than another acquisition path.
It should expose keeper event, season, player, franchise, approved owner
credits, keeper price/round, source, and coverage. Acquisition confidence must
distinguish a draft keeper flag from a roster keeper list and from a manually
recorded keeper. The confirmed source span is 2021–2025 plus operational 2026;
earlier coverage remains unknown.

The engine could feed Manager Profiles, franchise timelines, Draft History,
and league keeper history. Keeper surplus, “best keeper,” and performance
analytics remain separate and should be deferred until definitions are
approved.

### 9.4 Trade history and summaries

The repository has useful but incompatible pieces:

- the scraper writes raw Sleeper trades under
  `historical_trades/{year}/trades/{tradeId}`;
- `tradeHistory.ts` reads/writes that collection;
- `normalizeAllTrades.ts` writes another `normalized_trades` collection;
- `normalizeTrade.ts` resolves roster IDs through `managerResolver.ts`, whose
  implementation explicitly returns temporary `leagueId_team_teamId` IDs;
- `tradeHistoryEngine.ts` normalizes player and FAAB movement and derives
  roster-ID metrics; and
- `/api/history/trades` uses a separate `trades/{season}/entries` schema and
  silently converts failed current Sleeper week requests to empty arrays.

`buildTeamDataFromSleeper.ts` asks `buildTradeHistoryForLeague()` for seasons
2018–2025 while passing the 2026 league ID. Because the query filters each
historical collection by that one league ID, it can return no historical rows
even when the season collections are populated. It then calculates current
team metrics by current roster ID. Actual Firestore season coverage is not
validated offline.

Required engine: `lib/history/canonicalTradeHistory.ts`. Acquisition should
return raw completed trade transactions per approved season league ID. The
deterministic builder should create one stable trade event, all participating
franchise sides, player/draft-pick/FAAB movements, canonical roster-season
mapping, approved owner credits, source, and coverage. Multi-team trades must
not be forced into the existing two-side normalizer. A separate
`ownerTradeSummary.ts` may then count personal participation and factual
volume; it must not duplicate or redefine the approved trade-aggression
provenance.

This work would improve transaction history routes, future Manager and
franchise trade histories, current timeline/team data, and any factual trade
record page. Fairness, winner/loser, value-at-the-time, and rivalry effects are
analytics and should remain deferred.

### 9.5 Lineup history

The only historical lineup calculation currently exposed is Archives'
`fpts / ppts` start efficiency, aggregated first by roster season and then by
current Sleeper owner ID. There is no reusable source/coverage model. Sleeper
matchup rows also expose starters and player-level points for supported
seasons, but no checked-in lineup-history builder consumes them.

Required engine: `lib/history/lineupSeasonSummary.ts`. Start with the exact
season-level Sleeper roster facts (actual points and potential points), map
roster-season through the approved franchise mapping, and project owner credit
without multiplying league totals. Define null behavior for zero/absent
potential points and preserve raw values. Weekly lineup decisions should be a
later layer only if complete starters/player-points acquisition is proven.

The commissioner must approve whether “lineup efficiency” is exactly
`fpts / ppts`, how ties/zero potential points work, and whether records are
owner, franchise, or both. Until then, Archives' leaderboard is a legacy page
calculation rather than an approved record.

## 10. Current standings and division data

Current-season division data is sourced from Sleeper and should stay separate
from historical division rules. The reusable gap is a current snapshot, not a
new history engine.

Duplicate implementations exist in:

- `app/managers/page.tsx`: maps active managers by current Sleeper owner ID and
  groups rosters by division;
- `components/managers/OwnerProfile.tsx`: fetches the same league and rosters,
  resolves division name, calculates record/points, and ranks by wins, points,
  then losses;
- `app/matchups/page.tsx`: independently resolves roster/user display,
  records, brackets, and playoff labels; and
- `getDivisionWinners()` / `Treasury.tsx`: independently rank divisions by
  wins and points.

A future `lib/current/currentLeagueSnapshot.ts` should separate acquisition
from an input-driven builder and expose current league, roster, user,
franchise/owner presentation, division membership, record, points, standing,
and source status. The tiebreak order must come from the approved current rules
or explicit Sleeper settings; code-local orders must not silently become
policy. This layer would improve Managers landing, Manager Current Division,
Matchups, Payouts/Treasury, and any home standings card.

## 11. Owner image resolution

Canonical `OwnerProfile.photo` values exist and are already used on Managers
and Manager Profiles. Other pages use separate hard-coded image maps or
Sleeper avatar hashes:

- Rivalry Hub has its own manager/image map.
- Archives has a real-name map and Sleeper avatars.
- Trophy Room hard-codes image paths inside award arrays.
- Draft and Matchups use Sleeper avatars with local fallbacks.
- Treasury maps current Sleeper avatars.
- `lib/constants.ts`, `lib/managersData.ts`, `lib/sleeperIdMap.ts`, and
  `lib/identity/nameResolver.ts` preserve additional legacy identity/image
  paths.

A small `lib/managers/ownerPresentation.ts` resolver is sufficient. Given a
canonical owner ID and optional current Sleeper avatar evidence, it should
return canonical name, profile route, image, alt text, and provenance using a
fixed priority: approved curated photo, permitted Sleeper avatar, then league
fallback. It must use canonical identity aliases rather than introduce another
name map. This would automatically remove duplicated image logic from
Rivalries, Archives, Trophy Room, Draft, Matchups, and finance displays.

## 12. Remaining page-level historical calculations

| Page/component | Calculation still in the presentation layer | Correct future dependency |
|---|---|---|
| `app/league-info/rivalries/page.tsx` | Complete series record, points, extremes, recent meetings, streak, intensity | Approved opponent summary + ordered head-to-head detail; separate approved rivalry interpretation |
| `app/league-info/archives/page.tsx` | Career wins, points, win percentage, best/worst seasons, lineup efficiency | Owner Matchup Summary for eligible records; future record-book and lineup summary engines |
| `app/league-info/trophy-room/page.tsx` | None dynamically, but hard-coded champions/podiums/last-place lists duplicate history | Historical Season Results and Owner Career Summary; future award history for non-placement awards |
| `app/history/page.tsx` | Titles, podiums, average finish, and seasons from canonical History Authority | Historical Season Results / Owner Career Summary |
| `app/league-info/draft/page.tsx` | Draft discovery selection, pick grouping, auction price, spend totals | Canonical Draft History and Canonical Auction Purchase History |
| `app/league-info/payouts/page.tsx` | Static/live financial merge, activity seasons, net position, award tags/defaults, rankings | Reconciled historical finance engine plus current Firestore ledger service |
| `components/transactions/Treasury.tsx` | Weekly/season high score, division winners, placement prizes, dues totals | Current league snapshot + finance award/rules service; historical awards only after reconciliation |
| `components/managers/OwnerProfile.tsx` Current Division | Division resolution, rank, record, points | Current league snapshot |
| `app/managers/page.tsx` | Current roster-to-owner and division grouping | Current league snapshot |
| `app/matchups/page.tsx` | Current matchup grouping, roster display, record formatting, bracket round labels/status | Current league snapshot and current matchup/bracket view model |
| `lib/timeline/buildTeamDataFromSleeper.ts` | Current matchup record/points and roster-ID trade rollups | Current league snapshot + canonical trade summary |

The Manager Profile's approved Career Snapshot, Season History, Opponent
History, Overview, and Career Timeline are not duplicate-calculation targets in
this audit.

## 13. Current dependency map

### Manager routes

| Route | Current dependencies | Remaining gap dependency |
|---|---|---|
| `/managers` | `activeManagers`, `retiredManagers`, `staffManagers`; direct current Sleeper league/users/rosters fetch | `currentLeagueSnapshot` for division grouping and canonical presentation |
| `/managers/owners/[slug]` | Identity selectors; Owner Season History; Owner Career Summary; Owner Career Timeline; historical/profile season loader; Owner Matchup Summary; public profile presentation | `franchiseTimeline` for Team Legacy; `currentLeagueSnapshot` for Current Division; optional canonical draft/keeper/trade summaries in later approved features |

### League Info routes

| Route | Current dependencies | Remaining gap dependency |
|---|---|---|
| `/league-info` | Static navigation data and local imagery | No engine gap; destination descriptions should track factual capabilities |
| `/league-info/analyzer` | `components/TradeAnalyzer` and current trade-evaluation stack | Historical trade engine is not required for current evaluation; future factual context must use canonical trade history |
| `/league-info/archives` | Direct historical Sleeper users/rosters and hard-coded identity map | Approved matchup summaries, `lineupSeasonSummary`, `leagueRecordBook`, owner presentation resolver |
| `/league-info/constitution` | `constitutionData`, Firestore proposal/vote data | Outside this audit; legislative archive already has a separate typed source |
| `/league-info/draft` | Direct Sleeper discovery/draft/users/picks | `canonicalDraftHistory`, `canonicalAuctionPurchaseHistory`, owner presentation resolver |
| `/league-info/payouts` | Typed but unreconciled payout rows/selectors; 2026 Firestore finance ledger/rules/awards; identity photos | Reconciled historical finance engine, league awards, current snapshot for any Sleeper-derived awards |
| `/league-info/resources` | Static resource links | No reusable history-engine gap |
| `/league-info/rivalries` | Direct 2018–2026 Sleeper roster/weekly matchup calculation and hard-coded identities | Approved opponent summary, `ownerHeadToHeadDetail`, later commissioner-approved rivalry interpretation, owner presentation resolver |
| `/league-info/trophy-room` | Hard-coded champions, podiums, last-place lists and images | Historical Season Results, Owner Career Summary, later league award history, owner presentation resolver |

### Related routes that expose the same gaps

| Route | Current dependencies | Relevance |
|---|---|---|
| `/matchups` | Current Sleeper league/users/rosters/matchups/brackets and page-local view models | Primary consumer of `currentLeagueSnapshot` |
| `/history` | Canonical Hall of Fame résumé authority | Approved History/Hall of Fame source |
| `/api/history/awards` | Misnamed `getLeagueHistoryAwards()` returning `MANUAL_HISTORY` | Legacy API contract |
| `/api/history/drafts` | `getAllDrafts()` alias returning first-draft picks | Partial draft API contract |
| `/api/history/trades` | Mixed Firestore schema plus live Sleeper refresh | Requires canonical trade acquisition/history boundary |
| `/api/history/transactions` and `/api/transactions` | Raw one-week Sleeper transactions | Acquisition only, not history |
| `/commish/auction` | Historical auction JSON, owner tendencies, current Sleeper/manual sale merge | Future consumer of canonical purchase/keeper facts; operational sale behavior remains separate |

## 14. Remaining reusable-engine gaps

The likely new engines, in factual-to-interpretive order, are:

1. `lib/history/ownerHeadToHeadDetail.ts` — ordered log composed from approved
   summary/projection facts.
2. `lib/history/franchiseTimeline.ts` — franchise-centric tenures, names, owner
   credits, and result achievements.
3. `lib/history/canonicalDraftHistory.ts` — stable drafts/picks with canonical
   franchise and owner projection.
4. `lib/history/canonicalAuctionPurchaseHistory.ts` — auction purchase view
   over canonical draft facts and reconciled manual/current sources.
5. `lib/history/canonicalKeeperHistory.ts` — keeper events derived from
   canonical purchases.
6. `lib/history/canonicalTradeHistory.ts` — completed trade events with
   canonical sides and coverage.
7. `lib/history/ownerTradeSummary.ts` — factual owner trade participation over
   canonical trades.
8. `lib/history/lineupSeasonSummary.ts` — actual/potential points and approved
   lineup-efficiency facts.
9. `lib/current/currentLeagueSnapshot.ts` — current standings/divisions and
   roster presentation, explicitly outside historical engines.
10. `lib/managers/ownerPresentation.ts` — canonical name/photo/link fallback.
11. `lib/history/leagueRecordBook.ts` — source-declared factual records after
    its dependencies exist.
12. `lib/history/historicalFinanceHistory.ts` and
    `lib/history/leagueAwardHistory.ts` — only after payout reconciliation.
13. A rivalry interpretation engine — only after commissioner scoring rules.

Names are recommendations, not approved contracts.

## 15. Duplicate-calculation risks

Highest risk:

- Rivalry Hub can double-count multi-week playoff contests and misattribute
  helper accounts.
- Archives can split an owner across Sleeper accounts, omit co-owner credits,
  and report a record with an undeclared eligibility scope.
- Payouts can present reconciled-to-matrix arithmetic as authoritative career
  earnings despite unresolved source conflicts.
- Trophy Room and `/history` can contradict approved historical results.
- trade metrics can silently be empty because historical seasons are queried
  with the 2026 league ID.

Medium risk:

- current division winners/ranks can differ because tiebreak logic is repeated;
- auction tendency ownership can follow old Sleeper IDs rather than canonical
  tenure;
- Team Legacy can repeat a franchise and show curated summary values instead
  of derived facts; and
- League pages can show different photos/names for the same canonical owner.

## 16. Recommended build order

1. **Head-to-head detail composition.** Smallest gap; immediately removes the
   Rivalry Hub's duplicate factual calculations without approving rivalry
   scoring.
2. **Current league snapshot and owner presentation resolver.** Removes
   repeated live identity/division logic across high-traffic routes.
3. **Franchise Timeline.** Consolidates Team Legacy and establishes a reusable
   franchise story before new franchise/history pages.
4. **Canonical Draft History, then Auction Purchase and Keeper views.** The
   purchase and keeper layers should share draft keys and attribution.
5. **Canonical Trade History, then Owner Trade Summary.** Replace temporary
   manager resolution and reconcile Firestore schemas before adding profiles.
6. **Lineup Season Summary.** Establish the factual metric before rebuilding
   Archives records.
7. **League Record Book.** Compose approved placement, matchup, draft, trade,
   and lineup facts only after those sources are stable.
8. **Financial reconciliation, Historical Finance, and League Awards.** This
   requires commissioner work and should not block nonfinancial engines.
9. **Rivalry interpretation.** Last, after factual head-to-head detail and
   explicit commissioner rules.

## 17. Exact existing files to reuse

- Owner/opponent facts: `lib/history/ownerMatchupSummary.ts`,
  `lib/history/ownerMatchupProjection.ts`.
- Physical matchup reconciliation: `lib/history/canonicalMatchupHistory.ts`.
- Franchise-season attribution: `lib/history/franchiseRosterMappings.ts`,
  `lib/managers/identityData.ts`, `lib/history/ownerSeasonHistory.ts`.
- Placement/title facts: `lib/history/historicalSeasonResults.ts`,
  `lib/history/ownerCareerSummary.ts`.
- Sleeper acquisition primitives and league IDs: `lib/sleeper.ts` and the
  approved canonical matchup acquisition pattern.
- Draft/auction normalization: `lib/auction/historicalAuctionResults.ts`,
  `lib/auction/sleeperAuctionSync.ts`, and the checked-in 2021–2025 auction
  result files.
- Auction analytics after canonical input: `lib/auction/ownerTendencies.ts`.
- Raw trade evidence: `lib/history/tradeHistory.ts`,
  `lib/history/sleeperTradeScraper.ts`, and Firestore data after coverage
  validation.
- Current finance operations: `lib/finance/firestoreFinance.ts`.
- Historical payout evidence and arithmetic during reconciliation:
  `payoutHistoryData.ts`, `payoutHistoryTypes.ts`, and
  `payoutHistorySelectors.ts`.
- Owner display data: `lib/managers/identityData.ts` and the public profile
  presentation boundary.

## 18. Pages improved automatically by each engine

| Engine | Automatic consumers after thin adapters |
|---|---|
| Owner Head-to-Head Detail | Rivalry Hub; future owner/opponent route; optional Matchups historical links |
| Franchise Timeline | Manager Team Legacy; future franchise pages; League History/Trophy context |
| Current League Snapshot | Managers landing; Manager Current Division; Matchups; Payouts/Treasury current awards; home standings |
| Owner Presentation | Rivalries; Archives; Draft; Matchups; Trophy Room; Payouts/Treasury |
| Canonical Draft History | Draft History; history draft API; future owner/franchise draft views |
| Canonical Auction Purchases | Draft History spend summaries; War Room historical inputs; Manager draft profiles; auction records |
| Canonical Keeper History | Draft History; War Room history; Manager/franchise keeper history |
| Canonical Trade History | history trade API; team timeline; future Manager/franchise transaction logs |
| Owner Trade Summary | Manager profiles; Archives/record book; factual trade activity contexts |
| Lineup Season Summary | Archives; Manager season detail; league record book |
| League Record Book | Archives; Trophy Room record panels; League History |
| Reconciled Historical Finance | Payouts; future approved Manager financial summaries |
| League Award History | Payouts award history; Trophy Room; future Manager award lists |
| Rivalry Interpretation | Rivalry Hub and curated rival selection only after approval |

## 19. Commissioner decisions needed before implementation

Decisions that block or shape engines:

- Rivalry eligibility, score/rank factors, thresholds, directionality,
  tie-breaks, curated overrides, and streak policy.
- Franchise-era display boundaries; the underlying canonical continuity does
  not need to change.
- Record-book category definitions, minimum samples, tie display, and whether
  each record belongs to owners, franchises, or both.
- Lineup-efficiency formula and zero/missing-source handling.
- Historical finance reconciliation for every conflicting amount and the
  meaning of paid, won, rolled, offset, expense, and net.
- Financial attribution for co-owned franchises.
- Historical non-placement award taxonomy, including whether any unresolved
  workbook label becomes an award category. `LB Winner` remains unresolved.
- Whether incomplete/manual-local 2026 auction decisions become archival
  purchase facts only after Sleeper reconciliation.

Decisions not needed:

- approved identity, ownership tenure, helper-account, co-owner, placement,
  co-championship, canonical matchup, and opponent-summary rulings remain in
  force.

## 20. Features that should remain deferred

- Rivalry scoring, badges, and ranking until commissioner criteria are
  approved.
- Streak analytics.
- Trade winner/loser, fairness, historical value-at-the-time, and trade impact
  analytics.
- Keeper surplus and “best keeper” rankings.
- Weekly lineup-decision history until complete source coverage is proven.
- Career payouts/net earnings until reconciliation is complete.
- Payout-derived awards until award-versus-payment semantics are resolved.
- Cross-domain composite rankings, owner grades, predictive analytics, and
  automatic narrative generation.
- Any identity, franchise, or ownership record inferred solely from Sleeper
  helper/attached-account metadata.

This order keeps the remaining work additive: factual event layers first,
owner/franchise projections second, record or rivalry interpretation last.
