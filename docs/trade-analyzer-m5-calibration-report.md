# River City Trade Analyzer M5/M6 Calibration Report

Status: local review fixture only. Fairness output is not enabled in the production Analyzer.

## Model

- Model: `river-city-fairness-v2.0`
- Baseline formula: recovered River City adjusted talent, keeper surplus, FAAB, and roster-slot treatment.
- Value basis: FantasyCalc-compatible historical fixture values with River City keeper-cost candidate data.
- Calibration: `river-city-trades-2019-2025-v1`
- Historical reference: completed Sleeper trades from 2019–2025, weeks 1–18; exact commissioner reversals excluded from the recommended approved dataset.
- Reference percentiles: p25 23.33, p50 45.34, p75 84.74, p90 125.28.
- Read-only calibration preview: 4,985 transactions read; 168 completed trades; 162 approved candidates; 6 reversal candidates.
- Recommended fully covered approved dataset: 27 trades, covering 301 of 632 player assets (47.63% overall asset coverage).
- Rebuilt read-only preview: p05 7.55, p10 13.73, p25 23.33, p50 45.34, p75 84.74, p90 125.28, p95 157.25.
- Rebuilt p25/p50/p75/p90 values match the recovered reference exactly: absolute and percentage difference are 0.00.

## Known fixtures

| Trade | Gap | Score | Reference result |
| --- | ---: | ---: | --- |
| James Cook for Drake London | 0.76 | 100 | Balanced / not veto-level |
| Deebo Samuel for James Cook + Dallas Goedert | 155.98 | 10 | Extreme imbalance / reversed reference |
| Lamar Jackson + Brian Thomas + Tetairoa McMillan + Ashton Jeanty for Travis Etienne + Nico Collins + Jaxson Dart + Colston Loveland | 78.16 | 70 | Meaningful advantage, not veto-level |

## Coverage and activation gate

The current M1–M4 server adapter provides published five-source auction consensus, but it does not yet provide an approved production keeper-cost field to the Analyzer. The M5/M6 foundation therefore requires complete value and keeper-cost coverage and returns no score for missing inputs. No production historical distribution was read or written by this foundation, and no fairness result is connected to the current UI or API.

The M6 read-only rebuild inspected 4,985 historical transactions, found 168 completed trades, 162 approved candidates, and 6 reversal candidates. The recommended calibration set contains 27 fully covered approved trades. This is a reproducible local validation, not production activation.

The recovered archaeology brief records this Deebo fixture as approximately 154.48. Re-running the exact recovered formula produces 155.98 because the receiving side pays the 1.5 roster-slot tax while the opposite side does not. The model preserves the recovered code-level behavior; this 1.50-point documentation discrepancy requires commissioner confirmation before activation.

Additional read-only calibration observations from the approved candidate set:

| Season / week | Read-only trade ID | Gap | Covered assets | Total assets | Status |
| --- | --- | ---: | ---: | ---: | --- |
| 2024 / 5 | 1147232650323673088 | 257.88 | 2 | 4 | approved candidate |
| 2024 / 8 | 1156966031769030656 | 254.70 | 2 | 3 | approved candidate |
| 2023 / 9 | 1025783501863403520 | 201.02 | 6 | 8 | approved candidate |
| 2020 / 4 | 617093396330262528 | 193.78 | 2 | 4 | approved candidate |
| 2023 / 9 | 1027322033039921152 | 189.39 | 6 | 8 | approved candidate |

These observations are calibration evidence only; they are not published model results.

## M6 source-resolution findings

### Fairness value source

The checked-in FantasyCalc-compatible candidate uses direct Sleeper-ID matching and records the required configuration: Dynasty, 1QB, 12 teams, Half PPR, and no TE premium. Its value scale is compatible with the historical candidate used for the rebuilt calibration because both use the same FantasyCalc-compatible `totalValueScore` field and source configuration. Current values need not equal historical values. The candidate remains review-only: it includes provider/import metadata and is not an approved production snapshot or active Analyzer source.

The approved future boundary is a minimal server-owned value snapshot containing only player ID, model value, source, source configuration, generated/imported time, season, and model-value version. Five-source auction consensus remains separate factual auction context and is not a fairness value.

### Keeper-cost source inventory

| Source | Classification | Finding |
| --- | --- | --- |
| Historical candidate keeper-cost fields used by the read-only rebuild | HISTORICAL ONLY | Supports reproducibility of the recovered calibration, not current Analyzer authority. |
| `keeper-costs-2026.candidate.json` from Sleeper draft/waiver events | APPROVED FOR MODEL CANDIDATE ONLY | Server-generated local candidate; source rule is highest 2025 acquisition price plus 10; not promoted or written to Firestore. |
| `auction_war_rooms/{warRoomId}/live/2026` keeper state | PRIVATE | Franchise-scoped War Room state; cannot be used by a public/current Analyzer fairness path as-is. |
| `/api/auction/keepers` | PRIVATE | War Room-authenticated read/write endpoint; not a public model source. |
| `player_stats` import path | UNSUITABLE FOR M6 AUTHORITY | Existing importer converts null/absent keeper cost to `0`, which cannot distinguish known zero from missing. |
| `lib/timeline/keeperEngine.ts` and demo fixtures | UNSUITABLE | Presentation/timeline or fixture inputs, not an approved source of league keeper facts. |

No approved current keeper-cost source is available for activation. Keeper cost can only be used later through a minimal server-owned contract containing franchise, player, cost, season, provenance, and availability; surrounding targets, caps, notes, preferred entries, and strategy fields must never cross that boundary.

### Non-keeper semantics and coverage

The recovered historical code path used `keeperCost ?? 0`, and the candidate snapshot stores `0` for rows without a verified keeper cost. The source does not prove that every such zero means “known non-keeper”; therefore M6 separates `KNOWN_ZERO`, `KNOWN_VALUE`, and `MISSING`. A missing cost is unavailable and is never converted to zero by the M5/M6 evaluator. The historical rebuild’s 301 covered assets out of 632 (47.63%) reflects the combined requirement for a positive model value and a usable keeper-cost field; the available summary does not provide a defensible decomposition into value-only versus keeper-only misses, so no stronger attribution is claimed.

## M6 pre-M7 activation decision

The formula and historical calibration are reproducible, but current keeper-cost authority is still private/candidate-only and the existing importer’s null-to-zero behavior is unsafe for activation. Decision: **D — KEEPER SOURCE NOT SAFE/RELIABLE ENOUGH**.

Next phase: approve a server-owned, reviewed keeper-cost snapshot contract and explicit non-keeper semantics, then rerun the same read-only calibration/coverage checks before any Analyzer connection. The active M1–M4 factual Analyzer remains unchanged.

## M7 keeper authority review

### Current source inventory and authority

The read-only 2026 Sleeper preview returned 12 rosters and a `pre_draft` auction draft. Its draft-pick metadata contains an explicit `is_keeper` flag and numeric `metadata.amount` for 16 keeper picks. This is the strongest current league-fact source found and is technically suitable for a server-only adapter. Current roster membership provides the population from which explicitly non-keeper players can be represented; no browser-provided keeper fields are trusted.

| Source | Fields | Classification | Safe model use |
| --- | --- | --- | --- |
| Sleeper 2026 draft picks | `roster_id`, `player_id`, `is_keeper`, `metadata.amount`, draft status | AUTHORITATIVE CURRENT FACT CANDIDATE | Server-only keeper fact source; explicit cost for 16 current keepers. |
| Sleeper 2026 rosters | roster ID and player IDs | AUTHORITATIVE CURRENT FACT CANDIDATE | Server-side population for explicit non-keeper rows. |
| War Room live state / `/api/auction/keepers` | private franchise keepers and nullable costs | PRIVATE | Never a public fallback; may not override Sleeper authority merely because it has a cost. |
| `keeper-costs-2026.candidate.json` | derived 2025 acquisition events and projected 2026 costs | APPROVED CANDIDATE ONLY | Historical/candidate support, not current authority. |
| `player_stats` importer | value plus keeper cost, null collapsed to zero | UNSUITABLE | Cannot distinguish missing from known zero. |
| timeline engine/demo data | manually supplied keeper inputs | UNSUITABLE | Not a league-authoritative source. |

### Explicit keeper state model

The M7 adapter defines:

- `KEEPER` + `KNOWN_VALUE`: explicit keeper with a finite positive cost.
- `KEEPER` + `KNOWN_ZERO`: explicit keeper with a legitimate zero cost.
- `NON_KEEPER` + `NOT_APPLICABLE`: explicit rostered player not marked as a keeper.
- `UNKNOWN` + `MISSING`: keeper status or cost cannot be established.

The adapter output contains only season, franchise, player, status, cost state, cost, source, source version, and generated time. It excludes all War Room strategy and private metadata.

### 2026 coverage preview

The preview found 191 current rostered players: 16 `KEEPER / KNOWN_VALUE`, 0 `KEEPER / KNOWN_ZERO`, 175 `NON_KEEPER / NOT_APPLICABLE`, and 0 `UNKNOWN / MISSING` based on the current Sleeper draft metadata. This is a read-only snapshot and not a production write.

| Franchise | Rostered | Known-value keepers | Non-keepers | Unknown |
| --- | ---: | ---: | ---: | ---: |
| Prestigio Mundial | 14 | 2 | 12 | 0 |
| The Art of War | 13 | 2 | 11 | 0 |
| The Shake-N-Bakers | 17 | 0 | 17 | 0 |
| The Shepherd | 16 | 2 | 14 | 0 |
| Tax Season | 16 | 2 | 14 | 0 |
| The Wildcard | 16 | 1 | 15 | 0 |
| Hall Pass | 17 | 0 | 17 | 0 |
| Kissed by a Freckle | 16 | 0 | 16 | 0 |
| The Gresham Empire | 16 | 2 | 14 | 0 |
| Buckeye Nation | 18 | 2 | 16 | 0 |
| Hawkins Heroes | 16 | 2 | 14 | 0 |
| The Bearded One | 16 | 1 | 15 | 0 |

If non-keepers are approved as zero-cost assets, all 191 rows are technically modelable for keeper input. If non-keepers should contribute no keeper-surplus component, the current evaluator needs a separately approved treatment. Typical 1-for-1 and 2-for-1 scoreability therefore remains unresolved until that rule is chosen; no current trade scoreability is claimed.

### M7 decision

The Sleeper source is technically safe to isolate server-side, but the repository does not prove whether a non-keeper should be modeled as a zero-cost asset or excluded from the keeper-surplus component. Decision: **B — KEEPER SOURCE TECHNICALLY SAFE BUT COMMISSIONER RULE DECISION REQUIRED**.

No fairness coefficients, calibration thresholds, active Analyzer code, public API, or production data changed.

## M8 acquisition-cost architecture

### Separate concepts

Fairness `modelValue` remains the FantasyCalc-compatible Dynasty / 1QB / 12-team / Half-PPR / no-TE-premium signal used for package talent. `acquisitionCost` is a separate factual River City cost basis: keeper cost before the draft, finalized auction price after the draft, or a future rule-defined free-agent cost. An auction price never replaces or rewrites model value.

The existing M5 arithmetic is preserved under the broader acquisition-cost meaning:

- surplus = model value − acquisition cost;
- positive surplus × 1.1;
- zero/negative surplus × 0.7;
- surplus delta weight 0.6;
- trade FAAB remains separate and neutral by default;
- roster tax remains unchanged at `max(received − sent, 0) × 1.5`.

### Authority findings

`lib/auction/sleeperAuctionSync.ts` already normalizes official Sleeper draft picks into keeper rows and completed purchase rows. Its source contains player ID, roster ID, keeper flag, auction amount, pick number, and source. After the auction is finalized, Sleeper’s completed draft result is the preferred purchase authority. The authenticated `/api/auction/sleeper-snapshot` route is an operational reader of that source, not a new fairness endpoint.

War Room `auction_purchase_decisions` records contain manual and Sleeper purchase rows plus private-at-capture fields. They are best classified as an operational mirror/fallback for War Room workflows, not the primary fairness authority when an official finalized Sleeper result exists. Private strategy fields must not enter the acquisition snapshot.

### Minimal acquisition snapshot

The M8 contract contains only:

`season`, `franchiseId`, `playerId`, `acquisitionType`, `acquisitionCost`, `costState`, `source`, `sourceVersion`, and `generatedAt`.

Acquisition types are `KEEPER`, `AUCTION`, `FREE_AGENT`, and `UNKNOWN`. Cost states distinguish `KNOWN`, `KNOWN_ZERO`, `NOT_APPLICABLE`, `PENDING_AUCTION`, and `MISSING`.

### Timing and coverage

Before the auction, the 16 current keepers have explicit Sleeper keeper costs. Non-keepers are not assigned permanent zero costs; their status is pending future auction acquisition. The current draft is `pre_draft`, so no completed auction purchase coverage is claimed.

After the auction, the intended flow is: finalized Sleeper draft → canonical franchise mapping → keeper and winning auction prices → roster reconciliation → validated server-owned acquisition snapshot. Expected coverage is effectively all drafted/keeper roster players when every finalized pick has a player, roster, and amount. Known exceptions are missing Sleeper amounts, unresolved roster mappings, duplicate/orphan acquisitions, and any later free-agent player without an approved league cost rule.

The free-agent acquisition-cost rule is not documented in the repository and remains a later commissioner decision. It does not block post-draft activation for players whose keeper or auction costs are resolved.

### Acquisition regression evidence

An inflated example with model value `5` and auction cost `11` retains model value `5`, cost `11`, and negative surplus. An underpriced example with model value `30` and auction cost `12` retains model value `30`, cost `12`, and positive surplus. These tests prove auction price is cost context, not model value.

Fairness remains unavailable when acquisition data or model values are incomplete, while the factual M1–M4 Analyzer remains usable. Planned activation is after the 2026 auction only, once the draft is complete, costs are finalized, the snapshot reconciles, model values are refreshed, calibration and fixtures pass, privacy/auth checks pass, and the commissioner approves activation.

## Neutral presentation

If activated after review, the model should use `Very Balanced`, `Balanced`, `Noticeable Advantage`, `Significant Advantage`, and `Extreme Imbalance`. The result must remain explicitly modeled, not an objective determination of fairness.

## M9 fairness plus five-source market intelligence

M9 adds a disconnected, server-owned-contract-ready supporting layer. It keeps four signals separate: FantasyCalc-compatible dynasty model value; actual River City acquisition cost; published five-source auction consensus; and published five-source ADP consensus.

The canonical published readers are `readPublishedMasterviewFromFirestore()` and `readPublishedAdpConsensusFromFirestore()`. Their safe rows provide `GeneratedMasterviewRow.averageValue` and `AuctionAdpConsensusRow.consensusOverallAdp`/`medianOverallAdp`. The approved five sources for both registries are FantasyPros, RotoWire, Lineup Experts, Draft Sharks, and Fantasy Footballers. No second pipeline or War Room state is used.

For each package, auction context is the sum of known published auction consensus values, with explicit complete/partial/unavailable coverage and a complete-player count. ADP is not summed as package value: the layer reports median ADP and best (lowest) ADP, plus coverage/counts. Lower ADP means an earlier expected selection. Missing context remains missing.

Signal agreement is deterministic and never changes the calibrated fairness score. When the model package is not tied, two or more available signals agreeing with it and no opposing signal produce `STRONG_AGREEMENT`; one agreeing signal and no opposing signal produces `MODERATE_AGREEMENT`; at least one agreeing and one opposing signal produces `MIXED`; ties, no model edge, or no usable signals produce `INSUFFICIENT_DATA`.

Structured reasoning is factual for each package ID. Core factors can identify higher model talent or acquisition surplus. Market factors can identify stronger auction context, an earlier ADP asset, or market disagreement. No roster-need, rebuild, contender, subjective, or narrative claims are generated.

Core model and calibration coverage remain independent from auction and ADP coverage. Complete core fairness can remain available with partial market context. The M5–M8 model, thresholds, neutral labels, and `River City Model Edge` terminology are unchanged. Inflated prices preserve model value separately from acquisition cost and can produce negative surplus; underpriced acquisitions preserve positive surplus.

The contracts use package arrays and package IDs rather than an internal two-team algorithm, so a future N-team comparison can compare arbitrary package collections. That future phase still needs multi-package UI and serializer review. Hypothetical/random trades remain inactive; any future boundary must resolve player identity, model values, acquisition costs, and market rows server-side rather than trusting client-submitted values.

The public serializer uses explicit allow-list construction for additive coverage, package, agreement, and reasoning fields. No strategy, finance, notes, target, UID, email, War Room, or private narrative data is included. The active M1–M4 Analyzer/API/UI remains disconnected, with no production write or deployment in M9.

### M9A agreement finalization

The calibrated River City Model Edge is the reference result, not a fifth vote. Supporting evidence is classified independently as `AGREES`, `OPPOSES`, `NEUTRAL`, or `UNAVAILABLE`. The supporting signals are adjusted model talent, acquisition surplus, complete auction-consensus package context, and one complete package-level ADP signal.

Auction direction requires complete coverage for every package and compares total published auction consensus using a $0.01 tolerance. Partial or unavailable auction context remains factual context but produces no vote. ADP direction requires complete coverage for every package and compares package median ADP, with lower ADP favored and a $0.01 tie tolerance. Best ADP remains explanatory context and never creates a second ADP vote.

Agreement states are: `STRONG_AGREEMENT` for at least three agreeing signals and zero opposing signals; `MODERATE_AGREEMENT` for exactly two agreeing signals and zero opposing signals; `LIMITED_AGREEMENT` for exactly one agreeing signal and zero opposing signals; `MIXED` for at least one agreeing and one opposing signal; and `INSUFFICIENT_DATA` for a tied/unavailable model edge or zero usable directional evidence. Neutral and unavailable signals do not count as agreement or opposition, and one unavailable signal does not make an otherwise supported result insufficient.

Core model factors and supporting market intelligence remain separate. Both package IDs can receive factual reasoning factors when their own talent, surplus, auction, or ADP context supports one. The package-array contract remains suitable for future N-team comparisons, although multi-package UI and activation boundaries remain future work.

## M10 multi-team and Trade Sandbox foundation

M10 adds a disconnected internal contract for two through four canonical River City participants. Each participant has a unique participant ID, canonical franchise ID, outgoing package, and explicit destination per asset. Incoming packages are derived from those routes; no destination is inferred as “the other team.” Duplicate franchises, duplicate players, invalid destinations, self-destinations, unknown players, and malformed requests are rejected. The four-team ceiling is an initial contract limit based on the practical River City/Sleeper trade shape; it is not an activation of N-team UI.

`LEAGUE_TRADE` is the proposed-real-trade mode. Every outgoing player must be server-known and currently rostered by its source franchise, and every destination must be another participating franchise. Browser ownership claims and browser valuation fields are not trusted. `SANDBOX` intentionally skips current-ownership validation so members can route supported NFL players hypothetically, but it still requires server-owned player identity and market context. Sandbox reset remains a future client-only state reset with no persistence or server write.

The foundation returns per-participant sends, receives, current-versus-hypothetical roster context, positional before/after counts, auction consensus totals/coverage, median and best ADP/coverage, and an explanation container. ADP is never summed. Market context remains factual and does not create active fairness output.

The generalized model summary calculates a net result per participant, using the preserved talent, acquisition-surplus, FAAB, and roster-tax formula, then reports the N-team max/min global gap and highest-net participant without winner/loser language. It does not apply historical fairness scoring. M9 signal agreement remains disconnected; a future N-team signal result should report a leading participant, neutral/tie, or unavailable for each signal.

Sandbox acquisition cost remains unresolved by design. A hypothetical destination must not receive a fabricated acquisition cost. The recommended future rule is commissioner decision C: preserve any known current-owner acquisition cost as asset provenance, but keep fairness unavailable or omit the surplus component for hypothetical assets until an explicit Sandbox cost treatment is approved. The current foundation therefore permits routing/market context while refusing model output when required costs are missing.

### Historical multi-team audit

The read-only Sleeper audit of completed 2019–2025 trades found 164 two-franchise trades, 4 three-franchise trades, and 0 four-or-more-franchise trades. The existing calibration preview represents trades with `teamNetValues[]`, per-team components, explicit destinations, and a max/min gap, so the multi-team records are present in the source audit. However, the approved `river-city-trades-2019-2025-v1` calibration was selected from the fully covered dataset and was not separately validated as a multi-team calibration. Three-team sample size is insufficient for a distinct calibration curve; future work should retain the current two-team calibration unchanged and conduct a separate multi-team calibration audit before activation.

The recovered active Analyzer history contains no random/try-any-trade implementation to restore. M10 therefore does not recreate random behavior. A future pure helper may select only server-known player identities and franchise IDs; it must never randomize values, costs, ADP, auction context, or fairness output.

The active M1–M4 API, UI, and `/league-info/analyzer` remain unchanged. No production data, fairness activation, multi-team UI, Sandbox UI, or deployment is included. Recommended activation sequence: finalize post-draft acquisition facts, decide hypothetical acquisition-cost semantics, audit multi-team calibration, then separately approve server/API/UI integration.

### M10A approved policy decisions

Sandbox-known costs use the explicit `CURRENT_RIVER_CITY_COST_BASIS` provenance label. A known cost remains attached to the asset’s factual River City acquisition history when the asset is hypothetically routed elsewhere; it never becomes a hypothetical recipient purchase price. Unknown or pending cost remains unavailable: no zero, auction-consensus substitution, ADP substitution, or fabricated surplus is permitted. Routing, identity, positional context, auction context, and ADP context may still be shown factually.

The approved historical calibration `river-city-trades-2019-2025-v1` applies to exactly two participants. Two-participant model summaries may return the existing historical score and band. Three- and four-participant summaries return every participant result, `modelSpread`, and `Largest River City Model Edge` participant, but historical fairness score and neutral fairness labels are explicitly unavailable/uncalibrated. The 3+ sample remains insufficient for a separate curve: 4 completed three-team trades and 0 completed four-plus-team trades.

N-team signal intelligence is represented as a leading participant, tie, or unavailable for model talent, acquisition surplus, auction consensus, and ADP. It does not force the two-team `AGREES`/`OPPOSES` language onto N-team output. The participant bound remains 2–4. Any future random mode may select only public identities, package membership, destinations, and franchises; values, costs, auction data, ADP, and fairness results remain server authoritative.
