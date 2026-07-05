# Auction Production Refresh Design

## Scope

Design the production version of the River City Auction War Room value refresh workflow.

This is documentation only. No API routes, UI, Firestore writes, Storage writes, parser changes, OpenAI calls, or Trade Analyzer changes are included.

## Current Local Baseline

Local refresh works like this:

1. Ray places CSV exports in `data/auction/source-imports/exports/`.
2. `npm run auction:update-values` scans files matching `{source}-{season}.csv`.
3. `scripts/auction-import-source-export.ts` parses each source export and writes normalized source rows to `data/auction/source-values/`.
4. `scripts/auction-generate-masterview-from-sources.ts` reads all source-value JSON files and writes `data/auction/generated/masterview-2026.json` plus `masterview-manifest.json`.
5. `npm run auction:quality-report` writes `docs/auction-consensus-quality-report-2026.md`.

Current quality snapshot:

- FantasyPros: 338 matched, 0 unmatched.
- Lineup Experts: 240 matched, 2 unmatched.
- RotoWire: 707 matched, 11 unmatched.
- Total matched source rows: 1285.
- Total unmatched source rows: 13.
- Generated 2026 Masterview rows: 753.
- Import errors: 0.
- Warning labels: 502, currently expected review signals rather than blockers.

Important local limitation:

- The generator reads all `data/auction/source-values/*.json`.
- If a CSV is removed but its old normalized source-value JSON remains, that stale source can still affect the generated Masterview.
- Production should not use a shared mutable folder as the source of truth. Each refresh run must have an explicit source manifest.

## Existing App Patterns Inspected

Private auction access:

- `app/commish/auction/page.tsx` is already a server-side auth gate.
- It calls `requireAuctionAccess()` and redirects denied users to `/commish/auction/login`.
- `lib/auth/auctionAccess.ts` verifies a Firebase Admin session cookie, requires `email_verified`, and checks `AUCTION_ALLOWED_EMAILS`.
- `app/api/auction/sleeper-snapshot/route.ts` and `app/api/auction/advisor-chat/route.ts` already protect private auction APIs with `requireAuctionAccess()`.

Existing maintenance pattern:

- `app/commish/maintenance/page.tsx` is a client-side maintenance runner.
- Existing maintenance APIs use `SCRAPER_SECRET_KEY` for older trade/history operations.
- That pattern is useful as a UI precedent, but it is lower quality than the auction session allowlist for Ray/Jeffrey private tools.

Firebase setup:

- `lib/firebaseAdmin.ts` currently exports `firestore` and `adminAuth`.
- It does not yet export a Firebase Storage bucket helper.
- `lib/firebase.ts` already includes `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` in client config.

Recommendation:

- Use the existing Auction War Room Firebase session allowlist for production value refresh.
- Do not build the new workflow around `SCRAPER_SECRET_KEY`.
- Add Firebase Admin Storage support later through `lib/firebaseAdmin.ts`.

## Why Local Repo Writes Are Not Suitable In Production

The current local flow writes JSON files under `data/auction/`. That is fine for development review, but it should not be the deployed source of truth because:

- Deployed serverless filesystems may be read-only, ephemeral, or isolated per instance.
- Writes to the deployed filesystem do not update the git repo or future builds.
- Multiple deployed instances would not share a local `data/auction` folder.
- Runtime-generated JSON imported into client bundles can leak private or stale data.
- File writes have weak auditability and no simple rollback pointer.
- Removed source files can leave stale generated artifacts behind unless every folder is cleaned perfectly.
- Uploading production CSVs into the repo would require terminal access or code changes, which Ray explicitly wants to avoid.

Production should use durable object storage for raw uploads and Firestore for normalized, generated, quality, and audit records.

## Recommended Production Architecture

Use immutable refresh runs.

Each refresh run owns:

- the uploaded raw CSV files used for that run,
- the normalized source values created from those exact files,
- the generated Masterview candidate,
- the quality report,
- quality gate results,
- an audit trail.

Publishing should be a small atomic pointer update from the old active run to the new active run. Old runs remain available for rollback.

High-level flow:

1. Ray opens a private auction maintenance screen.
2. Ray uploads or replaces `fantasypros-2026.csv`, `rotowire-2026.csv`, and `lineupexperts-2026.csv`.
3. A protected refresh API creates a new `runId`.
4. The API stores raw CSVs in Firebase Storage under that run.
5. The API parses and normalizes only the files listed in that run manifest.
6. The API writes normalized source values and match review summaries to Firestore under the run.
7. The API generates a candidate Masterview from only that run's normalized rows.
8. The API writes a quality report and quality gate results.
9. The UI shows row counts, unmatched rows, warnings, coverage changes, and gate status.
10. Ray publishes the candidate if acceptable.
11. Publishing atomically updates the active value run pointer.
12. War Room reads the latest active Firestore values in production.

## Firebase Storage Layout

Use run-scoped immutable paths:

```text
auction/{season}/refresh-runs/{runId}/raw/{source}-{season}.csv
auction/{season}/refresh-runs/{runId}/reports/quality-report.md
auction/{season}/refresh-runs/{runId}/reports/import-summary.json
```

Optional convenience copies:

```text
auction/{season}/latest-uploads/{source}-{season}.csv
```

The run-scoped raw files should be the source of truth. Convenience `latest-uploads` paths are only staging aids and should never be used by the generator without being copied or pinned into a run manifest.

Store these Storage metadata fields when possible:

- `season`
- `source`
- `runId`
- `uploadedBy`
- `uploadedAt`
- `originalFilename`
- `contentHash`
- `adapterVersion`

## Firestore Structure

Recommended top-level structure:

```text
auctionSeasons/{season}
auctionSeasons/{season}/valueRefreshRuns/{runId}
auctionSeasons/{season}/valueRefreshRuns/{runId}/sourceValueChunks/{chunkId}
auctionSeasons/{season}/valueRefreshRuns/{runId}/matchReviewChunks/{chunkId}
auctionSeasons/{season}/valueRefreshRuns/{runId}/generatedValueChunks/{chunkId}
auctionSeasons/{season}/valueRefreshRuns/{runId}/qualityReports/{reportId}
auctionSeasons/{season}/auditLog/{entryId}
```

`auctionSeasons/{season}`:

```ts
{
  season: 2026,
  leagueName: "River City FFL",
  activeValueRunId: string | null,
  previousActiveValueRunId: string | null,
  activeValueGeneratedAt: string | null,
  updatedAt: string,
  updatedBy: string
}
```

`valueRefreshRuns/{runId}`:

```ts
{
  runId: string,
  season: 2026,
  status:
    | "created"
    | "uploaded"
    | "importing"
    | "quality-review"
    | "ready"
    | "published"
    | "failed"
    | "rolled-back",
  createdAt: string,
  createdByEmail: string,
  updatedAt: string,
  completedAt: string | null,
  publishedAt: string | null,
  publishedByEmail: string | null,
  previousActiveRunId: string | null,
  requiredSources: string[],
  enabledSources: string[],
  sourceManifest: Array<{
    source: string,
    season: number,
    storagePath: string,
    originalFilename: string,
    contentHash: string,
    adapterVersion: string,
    uploadedAt: string,
    uploadedByEmail: string,
    rowCount: number | null,
    matchedRowCount: number | null,
    unmatchedRowCount: number | null,
    warningCount: number | null,
    errorCount: number | null
  }>,
  generatedSummary: {
    playerCount: number,
    sourceValueCount: number,
    skippedSourceValueCount: number,
    warningLabelCount: number
  },
  qualityGateStatus: "pass" | "review" | "fail",
  qualityGateResults: QualityGateResult[],
  failureMessage: string | null
}
```

Chunked documents are recommended for bulk data because one Firestore document has a size limit. The War Room usually needs all active player values, so chunked reads are simpler and cheaper than hundreds of individual document reads.

`generatedValueChunks/{chunkId}`:

```ts
{
  chunkId: string,
  runId: string,
  season: 2026,
  offset: number,
  count: number,
  rows: GeneratedMasterviewRow[],
  createdAt: string
}
```

If later per-player updates or queries matter, add `generatedValues/{playerKey}` docs. For the current War Room, chunked generated rows are the safer MVP.

## Audit Log Format

Every production refresh action should write an audit entry.

```ts
{
  id: string,
  season: 2026,
  runId: string | null,
  action:
    | "source-uploaded"
    | "refresh-created"
    | "source-imported"
    | "masterview-generated"
    | "quality-report-generated"
    | "refresh-published"
    | "refresh-rolled-back"
    | "refresh-failed",
  actorEmail: string,
  actorUid: string | null,
  createdAt: string,
  source: string | null,
  storagePath: string | null,
  storageGeneration: string | null,
  previousActiveRunId: string | null,
  nextActiveRunId: string | null,
  summary: Record<string, unknown>,
  reason: string | null,
  requestId: string | null
}
```

Audit entries should be append-only.

## Protected API Routes Needed Later

All routes should call `requireAuctionAccess()`.

Recommended routes:

- `GET /api/auction/value-refresh`
  - Lists recent refresh runs and the current active run summary.

- `POST /api/auction/value-refresh/upload`
  - Accepts one CSV upload for an allowed source and season.
  - Validates filename, source, season, content type, and max size.
  - Stores the file in Firebase Storage.
  - Writes an audit entry.

- `POST /api/auction/value-refresh`
  - Creates a refresh run from explicitly selected uploaded files.
  - Parses and normalizes source rows.
  - Generates candidate Masterview.
  - Generates quality report and gate results.
  - Writes all run artifacts to Firestore and Storage.

- `GET /api/auction/value-refresh/{runId}`
  - Returns run status, source summaries, generated summary, quality gates, and quality report preview.

- `POST /api/auction/value-refresh/{runId}/publish`
  - Publishes a ready run by atomically updating `auctionSeasons/{season}.activeValueRunId`.
  - Requires pass or explicit review override for non-failing gates.

- `POST /api/auction/value-refresh/rollback`
  - Moves the active pointer back to a previous published run.
  - Requires a reason.

- `GET /api/auction/values/latest?season=2026`
  - Optional protected route if client fetch is needed.
  - Prefer server-side Firestore reads in the protected page where possible.

## Commissioner Upload UI

Best location:

- Add a private maintenance view under `/commish/auction/maintenance`, or add an Auction Values section to the existing `/commish/maintenance` page after that page is moved to the same Firebase session protection.

Recommended UX:

1. Show active value run, generated time, source count, and quality status.
2. Show upload slots for required sources:
   - FantasyPros
   - RotoWire
   - Lineup Experts
3. Validate the displayed filename pattern before upload:
   - `fantasypros-2026.csv`
   - `rotowire-2026.csv`
   - `lineupexperts-2026.csv`
4. After upload, show file size, uploaded time, uploader, and status.
5. Button: `Refresh Auction Values`.
6. Show import summary and quality report.
7. Button: `Publish Values` only when the candidate is ready.
8. Button: `Rollback` on previously published runs.

Avoid running a refresh automatically when a file is uploaded. A separate explicit refresh button keeps the workflow reviewable.

## Quality Gates

Use three levels:

- `pass`: safe to publish.
- `review`: publish allowed with explicit confirmation and audit reason.
- `fail`: publish blocked until fixed.

Recommended fail gates:

- Any parser/import errors.
- Missing required source unless the source was explicitly disabled for the run with a reason.
- No generated Masterview rows.
- Generated player count drops by more than 20 percent from the active run.
- Source value count drops by more than 25 percent from the active run.
- Any unmatched source row with normalized auction value >= 10.
- Required schema columns missing from a CSV.

Recommended review gates:

- Unmatched source rows with normalized auction value from 5 to 9.
- Any `identity-review-needed` generated row with average value >= 5.
- Any `high-source-spread` row with average value >= 10.
- Source coverage drops by more than 10 percent but less than the fail threshold.
- A top 100 player has only one source.
- A source has zero matched rows.

Recommended informational warnings:

- Low-source-count for deep players, K, and DEF.
- High spread on $0 to $4 players.
- K/DEF coverage variation across sources.
- Unmatched $0 rows.

The current 502 warning labels are not blockers because they are mostly low-source-count review signals. Production should still surface them clearly and gate the small number of meaningful unmatched or identity-review rows.

## Stale Source Prevention

Production must not generate from "whatever source JSON exists."

Instead:

- Every refresh run has an explicit `enabledSources` list.
- Every source row stores the `runId`.
- The generator reads only normalized rows for the current `runId`.
- Removed CSVs do not carry forward automatically.
- Disabled sources must be listed in the run manifest with `disabled: true` and a reason.
- Publish records the exact source manifest used.

This solves the local stale source-value problem directly.

## Rollback Behavior

Rollback should never delete data.

Publishing a run:

- validates gates,
- writes an audit entry,
- updates `auctionSeasons/{season}.previousActiveValueRunId`,
- updates `auctionSeasons/{season}.activeValueRunId`.

Rolling back:

- requires an allowed user and reason,
- verifies the target run exists and has been published before,
- updates the same active pointer,
- writes an audit entry,
- leaves the failed or superseded run available for inspection.

The War Room should read by active pointer, so rollback is immediate without rewriting player values.

## War Room Value Selection

Development:

- Continue using local generated JSON by default.
- `data/auction/generated/masterview-2026.json` remains useful for local review and test fixtures.

Production:

- Read the active generated values from Firestore.
- Do not import local generated JSON into the production client bundle as the source of truth.
- Load values server-side after `requireAuctionAccess()` and pass the minimal player values into the client.

Recommended helper later:

```text
lib/auction/valueRepository.ts
```

Responsibilities:

- `getAuctionPlayerValues(season)`
- `getActiveAuctionValueRun(season)`
- `getLocalGeneratedValues(season)` for development only
- `getFirestoreGeneratedValues(season)` for production

Recommended selection rule:

- If `AUCTION_VALUES_SOURCE=firestore`, use Firestore.
- If `AUCTION_VALUES_SOURCE=local`, use local JSON.
- If unset, use Firestore in production and local JSON in development.

## Env Vars Needed Later

Existing env vars already relevant:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `AUCTION_ALLOWED_EMAILS`
- `AUCTION_SESSION_COOKIE_NAME`
- `AUCTION_SESSION_MAX_AGE_DAYS`

Recommended new env vars:

- `FIREBASE_STORAGE_BUCKET`
  - Server-side bucket name for Firebase Admin Storage.
  - Can match `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, but keeping a server env avoids relying on public config in server code.

- `AUCTION_VALUES_SOURCE`
  - `local` or `firestore`.

- `AUCTION_REFRESH_REQUIRED_SOURCES`
  - Default: `fantasypros,rotowire,lineupexperts`.

- `AUCTION_REFRESH_ALLOWED_SOURCES`
  - Default: `fantasypros,rotowire,lineupexperts,manual-csv,historical-masterview`.

- `AUCTION_REFRESH_MAX_UPLOAD_MB`
  - Default: `5`.

- `AUCTION_REFRESH_REVIEW_VALUE_THRESHOLD`
  - Default: `5`.

- `AUCTION_REFRESH_FAIL_UNMATCHED_VALUE_THRESHOLD`
  - Default: `10`.

No paid-source credentials should be added for this production CSV workflow.

## Exact Files To Create Or Change Later

Server and data access:

- `lib/firebaseAdmin.ts`
  - Add Firebase Storage bucket export.

- `lib/auction/valueRefreshTypes.ts`
  - Shared production refresh, manifest, gate, audit, and report types.

- `lib/auction/valueRefreshRepository.ts`
  - Firestore and Storage read/write helpers.

- `lib/auction/valueRefreshService.ts`
  - Orchestrates upload metadata, imports, generated Masterview, quality report, gates, and publish.

- `lib/auction/valueRepository.ts`
  - War Room value read abstraction for local development vs Firestore production.

Parser extraction:

- `scripts/auction-import-source-export.ts`
  - Extract reusable parsing and matching functions into `lib/auction/sourceImportService.ts` or adapter modules.

- `scripts/auction-generate-masterview-from-sources.ts`
  - Extract generation logic into a pure helper usable by both CLI and API.

- `scripts/auction-consensus-quality-report.ts`
  - Extract quality analysis into a pure helper usable by both CLI and API.

API routes:

- `app/api/auction/value-refresh/route.ts`
- `app/api/auction/value-refresh/upload/route.ts`
- `app/api/auction/value-refresh/[runId]/route.ts`
- `app/api/auction/value-refresh/[runId]/publish/route.ts`
- `app/api/auction/value-refresh/rollback/route.ts`
- Optional: `app/api/auction/values/latest/route.ts`

UI:

- `app/commish/auction/maintenance/page.tsx`
  - Recommended new private maintenance UI.

- Or `app/commish/maintenance/page.tsx`
  - Only if the page is first migrated from scraper-key protection to Firebase session protection for auction refresh actions.

- `app/commish/auction/page.tsx`
  - Later: load Firestore active values server-side in production.

- `app/commish/auction/AuctionWarRoomClient.tsx`
  - Later: accept values/source label from server props instead of importing local JSON directly.

## Recommended Rollout Phases

1. Extract local script logic into reusable pure/server helpers.
2. Add Firestore and Storage repository types and helpers.
3. Add protected upload and refresh APIs using `requireAuctionAccess()`.
4. Add private auction maintenance UI.
5. Add quality gate report display and publish/rollback actions.
6. Update War Room value loading to use Firestore in production and local JSON in development.
7. Add audit log viewer for recent refresh runs.

## Recommendation

Proceed with production refresh design using Firebase Storage plus Firestore, not deployed repo writes.

The safest MVP is:

- Raw CSV uploads in Firebase Storage, pinned to immutable refresh runs.
- Normalized source values, generated Masterview chunks, manifest, quality report, and audit log in Firestore.
- Protected APIs using `requireAuctionAccess()`.
- A publish pointer on `auctionSeasons/{season}` for instant activation and rollback.
- A Firestore-first production value repository with local JSON fallback for development.

This preserves the working local importer/generator model while removing the production risks around mutable files, stale source-values, and terminal-only maintenance.
