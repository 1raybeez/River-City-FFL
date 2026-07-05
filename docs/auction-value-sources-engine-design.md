# Auction Value Sources Engine Design

## Goal

Make River City Auction War Room values source-agnostic so `Masterview` becomes generated from imported value sources instead of manually maintained in Excel.

This is design only. No scraping, paid API calls, Firestore writes, UI changes, or Trade Analyzer changes are part of this phase.

## Existing Foundation

Inspected files:

- `lib/auction/types.ts`
- `lib/auction/importTypes.ts`
- `lib/auction/importValidation.ts`
- `lib/auction/advisorContext.ts`
- `data/auction/player-aliases.json`
- `data/auction/processed/player-values-2025.json`
- `scripts/auction-build-masterview-json.ts`
- `scripts/auction-parse-masterview-preview.ts`
- `scripts/auction-match-sleeper-preview.ts`
- `scripts/auction-build-player-values-2025.ts`
- `scripts/auction-inspect-excel.ts`

Current flow:

1. Historical Excel workbooks under `data/auction/imports/*.xlsx` are parsed from `Masterview`.
2. `scripts/auction-build-masterview-json.ts` writes `data/auction/processed/masterview-{season}.json` and a manifest.
3. `scripts/auction-match-sleeper-preview.ts` matches 2025 Masterview rows to Sleeper players using normalized names, position/team, and `data/auction/player-aliases.json`.
4. `scripts/auction-build-player-values-2025.ts` combines Masterview rows plus Sleeper match review into `player-values-2025.json`.
5. `/commish/auction` and the protected advisor context read local processed values.

Key gap:

- The current `siteValues` live inside generated Masterview rows. Future sources should be ingested as independent normalized rows first, then aggregated into a generated Masterview.

## Source-Agnostic Data Model

Add future types in a dedicated file such as `lib/auction/valueSourceTypes.ts`.

### AuctionValueSource

Represents one configured value source or uploaded file.

Fields:

- `id`
- `sourceKey`: stable slug such as `fantasypros`, `rotowire`, `espn`, `fantasy-footballers-udk`, `draft-sharks`, `masterview-excel`, `manual-csv`
- `sourceName`
- `sourceKind`: `excel-masterview`, `csv`, `manual-csv`, `web-export`, `paid-api`
- `seasonYear`
- `scoringFormat`: `standard`, `half-ppr`, `ppr`, `custom`
- `auctionBudget`
- `teamCount`
- `sourceFilename`
- `sourceSheetName`
- `sourceUrl`
- `importedAt`
- `importedBy`
- `adapterVersion`
- `status`: `raw`, `normalized`, `matched`, `review-needed`, `approved`
- `warnings`
- `errors`

### AuctionSourceValueRow

One player value from one source.

Fields:

- `id`
- `sourceId`
- `sourceKey`
- `sourceName`
- `seasonYear`
- `scoringFormat`
- `auctionBudget`
- `teamCount`
- `rowNumber`
- `playerNameFromSource`
- `normalizedPlayerName`
- `matchedSleeperId`
- `matchedSleeperName`
- `position`
- `nflTeam`
- `auctionValue`
- `normalizedAuctionValue`
- `rank`
- `tier`
- `sourceConfidence`
- `matchStatus`: `matched`, `probable`, `ambiguous`, `unmatched`, `ignored`
- `matchMethod`
- `warnings`
- `errors`
- `raw`
- `importedAt`

### AuctionGeneratedMasterviewRow

One generated War Room value row grouped by Sleeper identity.

Fields:

- `seasonYear`
- `sleeperPlayerId`
- `playerName`
- `position`
- `nflTeam`
- `sourceValues`
- `lowValue`
- `highValue`
- `averageValue`
- `medianValue`
- `sourceCount`
- `confidenceScore`
- `spreadWarning`
- `matchStatus`
- `statusColumns`
- `generatedAt`

### AuctionSourceMatchReview

Manual review layer for ambiguous or unmatched source values.

Fields:

- `seasonYear`
- `sourceId`
- `sourceRowId`
- `playerNameFromSource`
- `suggestedSleeperMatches`
- `selectedSleeperId`
- `reviewStatus`: `pending`, `accepted`, `rejected`, `ignored`
- `reviewedAt`
- `reviewedBy`
- `notes`

## Source Adapters

Each adapter should implement the same conceptual contract:

```ts
type AuctionValueSourceAdapter = {
  sourceKey: string;
  parse(input): Promise<{
    source: AuctionValueSource;
    rows: AuctionSourceValueRow[];
    warnings: AuctionImportValidationIssue[];
    errors: AuctionImportValidationIssue[];
  }>;
};
```

Adapters should parse raw files only into normalized source rows. They should not calculate recommendations, mutate UI state, call Firestore, or assume Ray/Jeffrey roster state.

### Excel Masterview Adapter

Purpose:

- Preserve 2018-2025 historical Masterview files as inputs.
- Convert each existing website column in Masterview into separate `AuctionSourceValueRow` records.
- Preserve existing low/high/average/status columns as historical context, not as the primary generated truth.

Notes:

- Reuse the current workbook XML reader from `auction-build-masterview-json.ts`.
- Keep header-driven parsing because the workbooks vary by year.
- Treat `Keeper`, `Taken`, `JAK`, and `Tier` as status metadata, not source values.
- Existing formulas/crossed-out formatting should remain inspection-only unless represented as data columns.

### FantasyPros Adapter

Purpose:

- Best first third-party source because it is a recognizable baseline, likely available as exportable rankings/auction CSV, and maps naturally to player/value/rank columns.

Approach:

- Start with manual CSV/export ingestion, not scraping.
- Require explicit source settings: scoring format, budget, team count, export date.
- Normalize values into River City budget scale if source budget differs.

### Manual CSV Adapter

Purpose:

- Lowest-risk harness for the whole pipeline.
- Lets Ray paste or upload values from any source without source-specific code.

Required columns:

- `sourceName`
- `season`
- `playerName`
- `position`
- `nflTeam`
- `auctionValue`

Optional columns:

- `sleeperPlayerId`
- `rank`
- `tier`
- `scoringFormat`
- `auctionBudget`
- `teamCount`

### Future Web/API Adapter

Purpose:

- Support paid, official, or export-backed sources later, including RotoWire, ESPN, Fantasy Footballers/UDK, and Draft Sharks.

Guardrails:

- No scraping until terms and access are confirmed.
- Secrets stay server-side only.
- Store raw response metadata but do not commit paid/proprietary raw payloads.
- Every API adapter must produce the same normalized source rows as CSV/Excel adapters.

## Player Identity Matching

Sleeper is the player identity source of truth.

Authority order:

1. Sleeper ID first.
2. Alias file second.
3. Manual review file third.
4. Automated normalized-name candidates only after the three authority layers do not resolve a row.

Recommended matching process:

1. If a source row includes `sleeperPlayerId`, validate it against the Sleeper player index.
2. Apply `data/auction/player-aliases.json` to convert known source names to Sleeper search names.
3. Apply a reviewed match override file for accepted prior decisions.
4. Attempt exact normalized name match.
5. Attempt name plus position.
6. Attempt name plus NFL team.
7. Attempt safe punctuation/suffix-insensitive alias matching.
8. Mark remaining rows as `ambiguous` or `unmatched` and write a review file.

Manual alias rules:

- Keep aliases small, explicit, and committed.
- Do not auto-add aliases from suggestions.
- Alias entries should map source name to Sleeper canonical/search name.

Manual review rules:

- Review files should record selected Sleeper ID, rejected candidates, and notes.
- Review decisions should be reused across seasons when player identity is stable.
- Defense/team duplicates need special handling because Sleeper defense IDs can equal team abbreviations.

## Generated Masterview

The generated Masterview should be built from normalized source rows grouped by:

- `seasonYear`
- `scoringFormat`
- `auctionBudget`
- `teamCount`
- `sleeperPlayerId`

For each player:

- `lowValue`: minimum normalized auction value.
- `highValue`: maximum normalized auction value.
- `averageValue`: arithmetic mean.
- `medianValue`: useful because it resists one extreme source.
- `sourceCount`: count of valid source values.
- `confidenceScore`: simple 0-100 score.

Confidence score inputs:

- Sleeper match confidence.
- Source count.
- Source agreement/spread.
- Whether scoring format/budget/team count matches River City.
- Whether value is stale.
- Whether player has ambiguous duplicate rows.

Recommended confidence scoring:

- Start at 100.
- Subtract 35 for unmatched or ambiguous identity.
- Subtract 20 for one-source rows.
- Subtract 15 for high value spread.
- Subtract 10 for mismatched scoring format.
- Subtract 10 for mismatched budget/team count that required normalization.
- Clamp to 0-100.

Generated row warnings:

- `low-source-count`
- `high-source-spread`
- `identity-review-needed`
- `budget-normalized`
- `scoring-format-mismatch`
- `duplicate-sleeper-id`

## First Source To Add

Add the manual CSV adapter first as the pipeline harness, then FantasyPros as the first named third-party source.

Reason:

- Manual CSV proves the source-agnostic model without scraping, paid APIs, or format-specific risk.
- FantasyPros should follow because it is a broad baseline source, likely exportable, and should exercise player/rank/value mapping without needing the historical Masterview spreadsheet.

## Recommended File Structure

Current files can remain in place during migration. New structure should separate raw inputs from generated artifacts:

```text
data/auction/
  player-aliases.json
  value-sources/
    raw/
      2025/
        fantasypros/
        manual-csv/
        masterview-excel/
    normalized/
      2025/
        fantasypros.json
        manual-csv.json
        masterview-excel.json
    generated/
      masterview-2025.json
      player-values-2025.json
      value-source-manifest-2025.json
    match-reviews/
      sleeper-match-review-2025.json
      source-match-review-2025.json
```

Compatibility path:

- Keep `data/auction/processed/player-values-2025.json` until the War Room page is moved to the new generated path.
- Continue writing a generated `player-values-{season}.json` shape compatible with `advisorContext.ts`.

## Commit And Ignore Guidance

Commit:

- Source code adapters and pure helpers.
- Design docs.
- Small curated reference files such as `data/auction/player-aliases.json`.
- Generated JSON that the private War Room imports at build/runtime, if the repo remains private and the data is needed for deploy.
- Match review files when they represent manual decisions.

Ignore or avoid committing:

- `.DS_Store`.
- Paid/proprietary raw exports unless licensing and repo privacy are confirmed.
- API responses containing tokens, account data, or licensing metadata.
- Temporary parser previews.
- Very large raw files if they are not needed for deployment.

## Future Implementation Phases

1. Add value-source types only.
2. Add manual CSV adapter and validation.
3. Add generated source manifest.
4. Add shared Sleeper identity matcher using alias and review files.
5. Convert historical Masterview parser into an adapter.
6. Add FantasyPros CSV/export adapter.
7. Generate new Masterview JSON from normalized source values.
8. Swap War Room imports from current processed JSON to generated Masterview/player-values JSON.
