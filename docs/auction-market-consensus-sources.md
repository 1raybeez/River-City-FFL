# Auction Market Consensus Sources

## Goal

River City Auction War Room should generate a Masterview-style consensus from source values, with Sleeper as the player identity source of truth. Historical Masterview sheets should become validation/reference inputs, not the manually maintained source of truth.

## Recommended Source Order

1. Manual CSV
   - Safest immediate adapter.
   - No scraping, credentials, paid APIs, or runtime network dependency.
   - Best way to test the source-agnostic normalization and consensus pipeline.

2. FantasyPros
   - First official/API/export candidate to inspect.
   - Prioritize clean exports or documented access that supports auction values and custom league settings.
   - Do not scrape protected pages or bypass subscription/login controls.
   - Inspection finding: this repo already has a FantasyPros session-token route for Trade Analyzer player projections, but no FantasyPros auction-value importer.
   - Recommendation: use FantasyPros auction values through a user-provided CSV/export first. Do not build against FantasyPros private/session endpoints for the Market Consensus pipeline yet.

3. FantasyNerds
   - First free source to inspect for an official/API path.
   - Confirm auction dollar support, custom settings support, limits, and terms before building an adapter.
   - Inspection finding: the public auction page exposes a limited static HTML table with value, player, position, team, min, and max. FantasyNerds also documents an auction API endpoint, but production API data requires an API key/package; the `TEST` key is sample-only.
   - Recommendation: use as an official API candidate only after explicit API access is reviewed. Treat free HTML as inspection/reference only, not a production scraping source.

4. RotoWire
   - Strong paid/subscription alternate if auction values are available through an allowed export or licensed data path.

5. Draft Sharks
   - Strong paid/subscription alternate if a clean export exists.

6. Footballguys
   - Strong paid/subscription alternate if auction values can be exported or accessed through an official tool.

7. ESPN
   - Secondary candidate unless a clean export or documented API path exists.
   - Avoid brittle page parsing and any protected league data.

8. Historical Masterview
   - Baseline/reference only.
   - Useful for validating generated consensus output and parser compatibility across 2018-2025.

## Safety Rules

- Do not scrape paid or protected pages.
- Do not bypass logins, paywalls, bot controls, or access restrictions.
- Do not store credentials in code.
- Do not add paid API calls until access terms and required secrets are explicitly reviewed.
- Prefer official exports, documented APIs, or manually provided CSV files.
- Keep Firestore out of this pipeline until normalized files are reviewed locally.

## FantasyNerds Inspection

Public page:

- URL: `https://www.fantasynerds.com/nfl/auction?budget=200&format=std&teams=12`
- Static HTML includes a limited visible auction-value table.
- Visible fields: value, player, position, team, min, max.
- The free page shows a premium prompt after the visible rows, so it should not be treated as a complete source.

Documented API:

- URL pattern: `https://api.fantasynerds.com/v1/nfl/auction?apikey=...&teams=...&budget=...&format=...`
- Supports auction values, team count, budget, and scoring format parameters.
- API documentation says the `TEST` key can return sample data without a paid package, while live data depends on package access.

Recommendation:

- Do not scrape protected or premium content.
- Do not add credentials until there is an explicit API implementation phase.
- If FantasyNerds becomes a production source, use the official API with an environment-managed key and reviewed terms.
- Until then, keep Manual CSV as the safe immediate source and use FantasyNerds only for inspection/reference.

## FantasyPros Inspection

Repo findings:

- Existing FantasyPros usage is limited to `app/api/fantasypros/player/route.ts`.
- That route reads `FANTASYPROS_SESSION` from `.env.local` and sends it as an `fptoken` cookie to `https://partners.fantasypros.com/api/v1/nfl/players`.
- The existing route is used by Trade Analyzer valuation code for player projection-style fields, not auction dollar values.
- No current auction script reads FantasyPros values.
- No current source-values adapter uses FantasyPros.
- `.env.local` contains a `FANTASYPROS_SESSION` variable name. The value must stay local and should not be reused in new scripts without explicit approval.

Public page findings:

- FantasyPros has a public NFL Dollar Value Calculator page at `https://www.fantasypros.com/nfl/auction-values/calculator.php`.
- The inspected HTML exposes the page shell/title and a Salary Cap Value FAQ link, but did not expose a complete static auction-value table suitable for safe parsing.
- The public rankings page exposes general consensus ranking controls, but not a documented auction-value CSV/API contract from the static HTML inspection.

Available data paths:

- User-provided CSV/export: safest immediate path. Ray can export values from FantasyPros manually when permitted by the product, then place them into a local source-import folder for normalization.
- Official API: not available in this repo for auction values. The existing partners endpoint is credentialed and currently only used for player data/projections.
- CSV/export download: plausible if FantasyPros provides a permitted export from its auction/cheat-sheet tools, but the exact export shape should be confirmed manually before coding a dedicated adapter.
- Existing paid session workflow: not recommended for the Market Consensus pipeline yet. It would broaden use of a credentialed FantasyPros session beyond the existing Trade Analyzer route.

Expected FantasyPros export fields:

- player name
- position
- NFL team
- auction dollar value
- rank or overall rank if available
- tier if available
- scoring format or league settings if included
- source filename/export timestamp from local import metadata

Risks:

- FantasyPros auction values may be subscription, login, or product-license controlled.
- Private/session endpoints may not be stable or permitted for this use.
- Scraping the calculator page would be brittle and may cross access/terms boundaries.
- FantasyPros names may differ from Sleeper names, so the normal Sleeper ID plus alias plus review-file flow is still required.
- Custom league settings, budget, team count, scoring format, and value methodology may not be visible in a flat export unless captured in metadata.

Recommendation:

- Build FantasyPros as a local CSV/export adapter first, not as a network adapter.
- Store raw user-provided files under a FantasyPros-specific source-import folder in a later implementation phase.
- Normalize those rows into the existing source-agnostic value model with `sourceKey: "fantasypros"`.
- Match to Sleeper IDs with the existing alias and review workflow.
- Do not reuse `FANTASYPROS_SESSION` for auction values unless a later phase explicitly confirms the endpoint, access rights, payload shape, and server-only handling.

## Consensus Output

The Market Consensus layer should group normalized source rows by Sleeper player ID when available. If a Sleeper ID is unavailable, use normalized player name plus position as a temporary review key.

Generated per-player fields should include:

- low
- high
- average
- median
- source count
- confidence score
- disagreement score
- best available value gap
- source coverage warnings

## Next Implementation Recommendation

Keep Manual CSV as the first working adapter. For FantasyPros, implement a local CSV/export adapter only after Ray confirms a permitted export path and sample file shape. Do not reuse the existing FantasyPros session route for auction values without a separate implementation phase.
