# River City Auction Draft Assistant Analysis

Scope: private River City FFL planning for Ray and Jeffrey only. This is not a
public league feature. No data was imported, no parser was built, no Firestore
writes were made, no API routes were added, and no UI was changed.

Inspection source: `data/auction/imports/*.xlsx`, covering 2018 through 2025.
The read-only inspector looked at workbook sheet metadata, row headers, sample
rows, formulas, merged cells, hidden-sheet state, conditional formatting blocks,
and font strikethrough styles.

## Executive Recommendation

Use `Masterview` as the only first-pass import source for auction values. It is
present in every workbook, always visible, always uses row 1 as the header, and
contains player name, NFL team, position, bye week, site value columns, average
value, and variation.

Do not treat `Players We Want` as importable source data. It is a planning sheet
with formulas, duplicate header labels, merged regions in later years, and
strikethrough formatting in 2023-2025.

Use `Team Bye List` as a simple utility source if needed. It is present in every
workbook and appears to be a two-column team to bye-week lookup.

Use `Keepers` only when present and non-empty. It is absent in 2018, present but
empty in 2020, and useful in 2019 plus 2021-2025.

Use `Names_List` / `Player Name` only as alias seed data, not as canonical
identity. Canonical player identity should be Sleeper player ID.

## Workbook Findings

### 2018

- Sheets: `ESPN`, `Scout.com`, `FantasyPro`, `RotoWire`, `Masterview`, `Players We Want`, `Team Bye List`, `Names_List`.
- Hidden sheets: none.
- `Masterview`: exists, header row 1.
- `Masterview` columns: `Name`, `Team`, `Position`, `Bye Week`, `ESPN`, `Scout`, `FantasyPro`, `RotoWire`, `Avg Going Rate`, `Variation`.
- Sample rows: Todd Gurley LAR RB avg 27; Le'Veon Bell PIT RB avg 26.5; David Johnson ARI RB avg 25.25.
- Formulas: 2466 in `Masterview`, mostly source-sheet `VLOOKUP`, `Average`, and max-min variation.
- Merged cells: none in `Masterview`.
- Crossed-out players: no strikethrough styles detected.
- Keeper/taken status: no explicit `Keeper` or `Taken` column in `Masterview`; no `Keepers` sheet.
- Other relevant sheets: `Team Bye List` is a simple team/bye lookup; `Names_List` maps source-site name lists across `Scout`, `ESPN`, and `Rotowire`; `Players We Want` is planning-only.

### 2019

- Sheets: `ESPN`, `FFToolbox`, `Scout.com`, `FantasyPro`, `RotoWire`, `Masterview`, `Players We Want`, `Team Bye List`, `Keepers`.
- Hidden sheets: none.
- `Masterview`: exists, header row 1.
- `Masterview` columns: `Name`, `Keeper`, `Team`, `Position`, `Bye Week`, `ESPN`, `FFToolbox`, `FantasyPro`, `RotoWire`, `Avg Going Rate`, `Variation`.
- Sample rows: Saquon Barkley NYG RB keeper No avg 65; Ezekiel Elliott DAL RB keeper Yes avg 52.75; Patrick Mahomes KC QB keeper Yes avg 52.75.
- Formulas: 3867 in `Masterview`.
- Merged cells: none in `Masterview`.
- Crossed-out players: no strikethrough styles detected.
- Keeper/taken status: `Keeper` appears as explicit data in `Masterview`; `Keepers` sheet has `Name`, `Pos`, `Value`.

### 2020

- Sheets: `ESPN`, `FantasyPro`, `Ultimate Draft Kit`, `FFToolbox`, `Masterview`, `Players We Want`, `Team Bye List`, `Keepers`, `Player Name`.
- Hidden sheets: none.
- `Masterview`: exists, header row 1.
- `Masterview` columns: `Name`, `Keeper`, `Team`, `Pos`, `Bye Week`, `ESPN`, `UDK`, `FantasyPro`, `FFToolbox`, `Avg Going Rate`, `Variation`.
- Sample rows: Christian McCaffrey CAR RB keeper Yes avg 59.5; Ezekiel Elliott DAL RB keeper Yes avg 51.75; Saquon Barkley NYG RB keeper Yes avg 49.75.
- Formulas: 5047 in `Masterview`.
- Merged cells: none in `Masterview`.
- Crossed-out players: no strikethrough styles detected.
- Keeper/taken status: `Keeper` appears as explicit data in `Masterview`; `Keepers` sheet exists but is empty.
- Other relevant sheets: `Player Name` has `Name`, `Team`, `Pos`, `Bye Week`.

### 2021

- Sheets: `ESPN`, `FantasyPro`, `FFToolbox`, `Rotowire`, `Ultimate Draft Kit`, `Masterview`, `Players We Want`, `Team Bye List`, `Keepers`, `Player Name`.
- Hidden sheets: none.
- `Masterview`: exists, header row 1.
- `Masterview` columns: `Name`, `JAK`, `Tier`, `Team`, `Pos`, `Bye Week`, `ESPN`, `UDK`, `Rotowire`, `FantasyPro`, `FFToolbox`, `Avg Going Rate`, `Variation`.
- Sample rows: Christian McCaffrey CAR RB tier 1 avg 71.2; Dalvin Cook MIN RB tier 1 avg 64.2; Alvin Kamara NO RB tier 1 avg 57.2.
- Formulas: 6878 in `Masterview`.
- Merged cells: none in `Masterview`; `Players We Want` has one merged region.
- Crossed-out players: no strikethrough styles detected.
- Keeper/taken status: no explicit `Keeper` or `Taken` column in `Masterview`; `JAK` is a custom flag and needs manual interpretation. `Keepers` sheet has `Name`, `Pos`, `Value`.

### 2022

- Sheets: `ESPN`, `FantasyPro`, `FFToolbox`, `Rotowire`, `Ultimate Draft Kit`, `Sleeper`, `Masterview`, `Players We Want`, `Team Bye List`, `Keepers`, `Player Name`.
- Hidden sheets: none.
- `Masterview`: exists, header row 1.
- `Masterview` columns: `Name`, `JAK`, `Tier`, `Team`, `Pos`, `Bye Week`, `Sleeper`, `ESPN`, `UDK`, `Rotowire`, `FantasyPro`, `FFToolbox`, `Avg Going Rate`, `Variation`.
- Sample rows: Jonathan Taylor IND RB tier 1 avg 72.5; Cooper Kupp LAR WR tier 1 avg 57.83333333; Justin Jefferson MIN WR tier 1 avg 58.16666667.
- Formulas: 7527 in `Masterview`.
- Merged cells: none in `Masterview`; `Players We Want` has one merged region.
- Crossed-out players: no strikethrough styles detected.
- Keeper/taken status: no explicit `Keeper` or `Taken` column in `Masterview`; `JAK` is a custom flag and needs manual interpretation. `Keepers` sheet has `Name`, `Pos`, `Value`.
- Note: `Player Name` appears useful as an alias source, but sample columns look swapped in this workbook, so it must be validated before use.

### 2023

- Sheets: `ESPN`, `FantasyPro`, `FFToolbox`, `Rotowire`, `Ultimate Draft Kit`, `Masterview`, `Players We Want`, `Team Bye List`, `Keepers`, `Player Name`.
- Hidden sheets: none.
- `Masterview`: exists, header row 1.
- `Masterview` columns: `Name`, `Taken`, `Team`, `Pos`, `Bye Week`, `ESPN`, `UDK`, `Rotowire`, `FantasyPro`, `FFToolbox`, `Avg Going Rate`, `Variation`.
- Sample rows: Justin Jefferson MIN WR taken Yes avg 56.6; Ja'Marr Chase CIN WR taken Yes avg 51.8; Travis Kelce KC TE taken Yes avg 47.8.
- Formulas: 6446 in `Masterview`.
- Merged cells: none in `Masterview`; `Players We Want` has one merged region.
- Crossed-out players: `Players We Want` has 32 strikethrough cells; `Masterview` has none.
- Keeper/taken status: `Taken` appears as explicit data in `Masterview`; `Keepers` sheet has `Name`, `Pos`, `Value`.

### 2024

- Sheets: `FantasyPro`, `Sleeper`, `FFToolbox`, `Rotowire`, `Ultimate Draft Kit`, `Masterview`, `Players We Want`, `Team Bye List`, `Keepers`, `Player Name`.
- Hidden sheets: none.
- `Masterview`: exists, header row 1.
- `Masterview` columns: `Name`, `Taken`, `Team`, `Pos`, `Bye Week`, `UDK`, `Rotowire`, `FantasyPro`, `FFToolbox`, `Sleeper`, `Avg Going Rate`, `Variation`.
- Sample rows: Christian McCaffrey SF RB taken Yes avg 74; Tyreek Hill MIA WR taken Yes avg 67.25; CeeDee Lamb DAL WR taken Yes avg 66.75.
- Formulas: 4177 in `Masterview`.
- Merged cells: none in `Masterview`; `Players We Want` has five merged regions.
- Crossed-out players: `Players We Want` has 32 strikethrough cells; `Masterview` has none.
- Keeper/taken status: `Taken` appears as explicit data in `Masterview`; `Keepers` sheet has `Name`, `Pos`, `Value`.

### 2025

- Sheets: `FantasyPro`, `Rotowire`, `Sleeper`, `Ultimate Draft Kit`, `FFToolbox`, `Masterview`, `Players We Want`, `Team Bye List`, `Keepers`, `Player Name`.
- Hidden sheets: none.
- `Masterview`: exists, header row 1.
- `Masterview` columns: `Name`, `Taken`, `Team`, `Pos`, `Bye Week`, `UDK`, `Rotowire`, `FantasyPro`, `FFToolbox`, `Sleeper`, `Avg Going Rate`, `Variation`.
- Sample rows: Ja'Marr Chase CIN WR taken Yes avg 75.75; Saquon Barkley PHI RB taken Yes avg 73.75; Bijan Robinson ATL RB taken Yes avg 70.5.
- Formulas: 4387 in `Masterview`.
- Merged cells: none in `Masterview`; `Players We Want` has five merged regions.
- Crossed-out players: `Players We Want` has 123 strikethrough cells; `Masterview` has none.
- Keeper/taken status: `Taken` appears as explicit data in `Masterview`; `Keepers` sheet has `Name`, `Pos`, `Value`, `Avg Value`.

## Special Sheet Findings

`Team Bye List` is present in every workbook. It is effectively `Team`, `Bye Week`
with 33 non-empty rows. Sample from 2025: `ARI` -> `8`, `ATL` -> `5`. It has no
formulas, merged cells, or strikethrough styles.

`Players We Want` is present every year, but it is not safe as a canonical import
source. It mixes target planning, keeper price, max bid, amount/budget math, and
sometimes duplicate `Name` columns. It has formulas in every year, merged regions
in 2021-2025, and strikethrough styles in 2023-2025.

`Names_List` appears in 2018 and has source-site name columns: `Scout`, `ESPN`,
`Rotowire`. `Player Name` appears in 2020-2025 and usually has `Name`, `Team`,
`Pos`, with `Bye Week` also present in 2020. These are good alias hints, not
canonical identity.

`Keepers` is useful but inconsistent. It is absent in 2018, present and populated
in 2019 and 2021-2025, and present but empty in 2020. It generally has `Name`,
`Pos`, `Value`; 2025 also has `Avg Value`.

## Safely Parseable

- `Masterview` value rows by season, using header names instead of column letters.
- Player display name, NFL team, position, bye week, source-site values, average
  going rate, and variation from `Masterview`.
- Low and high values derived from numeric source-site columns.
- Explicit `Keeper` values in 2019-2020.
- Explicit `Taken` values in 2023-2025.
- `Keepers` rows when the sheet is present and non-empty.
- `Team Bye List` as team to bye-week lookup.
- `Names_List` / `Player Name` as alias seed data only.
- Cached formula results from the workbook XML, with validation against derived
  source values.

## Needs Manual Entry Or Review

- Ray/Jeffrey private target, fade, ignore, and notes.
- Whether 2021-2022 `JAK` means target, taken, keeper, or another private flag.
- Whether 2023-2025 `Taken` means drafted, keeper, ignored, or already selected
  in a planning workflow.
- `Players We Want` content. It can inspire future target import, but should not
  be automatically trusted because layout and formatting carry meaning.
- Strikethrough status. It is detectable in 2023-2025 `Players We Want`, but not
  present in `Masterview` and not consistent across years.
- Ambiguous player identity matches, especially old team abbreviations, suffixes,
  apostrophes, and players with similar names.

## One Parser Feasibility

One parser can support all years if it is schema-driven. It should not be a
hard-coded column-letter parser.

Recommended approach:

1. Open the requested year workbook.
2. Find `Masterview` by normalized sheet name.
3. Require header row 1 and map columns by normalized header labels.
4. Recognize synonyms: `Position`/`Pos`, `RotoWire`/`Rotowire`, `UDK`/`Ultimate Draft Kit`, `Keeper`/`Taken`.
5. Treat all numeric columns between identity/status fields and `Avg Going Rate`
   as site value sources, excluding `Bye Week`, `Tier`, and custom flags.
6. Import cached values, then recompute low/high/average/variation as validation.
7. Attach every row to a Sleeper player ID using a match pipeline.
8. Produce a review queue for uncertain matches or unsupported status columns.

This supports every inspected workbook, but the status interpretation must stay
year-aware.

## Long-Term Data Model

These are design-level entities, not implementation changes.

### Imported Site Values

`AuctionValueImportManifest`

- `season`
- `sourceFilename`
- `importedByUserId`
- `importedAt`
- `sheetName`
- `headerRow`
- `rowCount`
- `sourceColumns`
- `warnings`
- `status`

`AuctionPlayerValue`

- `season`
- `sleeperPlayerId`
- `displayName`
- `nflTeam`
- `position`
- `byeWeek`
- `sourceValues`: array of `{ sourceName, value, rawValue }`
- `lowValue`
- `highValue`
- `averageValue`
- `variation`
- `sourceRowNumber`
- `matchConfidence`

### Normalized Player Identity

`AuctionPlayerIdentity`

- `sleeperPlayerId`
- `canonicalName`
- `position`
- `currentTeam`
- `seasonTeams`
- `status`

`AuctionPlayerAlias`

- `alias`
- `normalizedAlias`
- `sleeperPlayerId`
- `sourceName`
- `season`
- `confidence`
- `confirmedByUserId`
- `confirmedAt`

The alias table should be built from site tabs, `Names_List`, `Player Name`, and
Sleeper player data. Manual cleanup should be limited to confirming ambiguous
matches, not editing source spreadsheets.

### Ray/Jeffrey Private Tags And Notes

`AuctionPlayerPreference`

- `season`
- `sleeperPlayerId`
- `tags`: `target`, `fade`, `ignore`, `keeper`, `drafted`, `watch`
- `priority`
- `maxBidOverride`
- `notes`
- `updatedByUserId`
- `updatedAt`

Notes and tags should be private to the draft assistant allowlist.

### Live Draft Status

`AuctionLiveDraftState`

- `season`
- `sleeperDraftId`
- `syncSource`
- `lastSyncedAt`
- `status`
- `budgetByRosterId`
- `rosterNeedsByRosterId`

`AuctionDraftEvent`

- `season`
- `sleeperDraftId`
- `eventId`
- `sleeperPlayerId`
- `nominatedByRosterId`
- `purchasedByRosterId`
- `amount`
- `timestamp`
- `sourcePayloadHash`

Use Sleeper read-only draft endpoints only after verifying endpoint availability
and auction fields. Do not use live sync as the source of truth until it has been
compared against actual River City draft behavior.

### Bid Recommendations

`AuctionBidRecommendation`

- `season`
- `sleeperPlayerId`
- `baseAverageValue`
- `lowValue`
- `highValue`
- `inflationFactor`
- `rosterNeedAdjustment`
- `budgetConstraint`
- `byeWeekAdjustment`
- `targetFadeAdjustment`
- `historicalBehaviorAdjustment`
- `recommendedMaxBid`
- `explanation`
- `calculatedAt`

The recommendation can be computed on read. Persist snapshots only if Ray and
Jeffrey want auditability during the draft.

### Private Access

`AuctionAssistantAccess`

- `email`
- `provider`: `google`
- `role`: `owner` or `coOwner`
- `enabled`
- `createdAt`
- `lastLoginAt`

Preferred access model:

- Google/Gmail login.
- Server-side route protection with an explicit allowlist for Ray and Jeffrey.
- Firestore rules that enforce the same email or UID allowlist when data storage
  is added.
- No public navigation link unless there is already a commish/private nav pattern.
- No client-only hiding as the primary protection.

## Main Risks And Unknowns

- Exact Gmail addresses for Ray and Jeffrey are needed before access control can
  be implemented.
- Sleeper read-only auction draft fields must be verified before live sync design
  is finalized.
- `JAK` in 2021-2022 needs human interpretation.
- `Taken` in 2023-2025 appears as data, but its workflow meaning needs
  confirmation.
- Workbook formula caches may be stale; future parser should validate cached
  averages against source columns.
- Site value sources change by year, so source columns should be stored as data,
  not as fixed TypeScript fields.
- Name matching should be conservative and reviewable, especially for historical
  seasons and old NFL teams.
