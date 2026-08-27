# Sandbox Market Fairness Calibration — 2026

Status: offline calibration only. No production integration or data mutation.

## Input universe

The published 2026 masterview contains `averageValue`, the current server-owned Auction-consensus dollar value, plus five source rows for the tested players. The published ADP consensus contains `medianOverallAdp`, `sourceCount`, spread, confidence, and warning fields. There is no canonical combined Auction-dollar/ADP-rank value.

Therefore this calibration treats `averageValue` as the primary numeric market-value input. Auction consensus is the source of that value; ADP remains supporting evidence. Auction dollars and ADP ranks are not added or averaged.

Missing or non-positive primary values make a package result unavailable. Missing data is never converted to zero.

## Candidate formulas

The offline module is `lib/tradeComparison/sandboxMarketFairnessCalibration.ts`.

- Formula A — Combined-value share: `score = 100 × (1 − 2 × |A/(A+B) − 0.5|)`. This measures distance from a 50/50 split.
- Formula B — Relative package gap: `gap = |A−B| / average(A,B)` and calibration score `100 / (1 + gap)`.
- Formula C — Value ratio: `ratio = min(A,B) / max(A,B)` and calibration score `100 × ratio`.

All three are symmetric, deterministic, bounded to 0–100, maximum at equal values, and monotonically decrease as imbalance increases. Formula B's score mapping is a candidate presentation transform, not a production threshold decision.

## Synthetic split calibration

| Split | A score | B score | C score | Interpretation |
|---|---:|---:|---:|---|
| 50 / 50 | 100.0 | 100.0 | 100.0 | Identical value |
| 51 / 49 | 98.0 | 96.2 | 96.1 | Near-even |
| 52 / 48 | 96.0 | 92.6 | 92.3 | Very small edge |
| 55 / 45 | 90.0 | 83.3 | 81.8 | Noticeable but modest edge |
| 60 / 40 | 80.0 | 71.4 | 66.7 | Clear edge |
| 65 / 35 | 70.0 | 62.5 | 53.8 | Significant edge |
| 70 / 30 | 60.0 | 55.6 | 42.9 | Strong edge |
| 75 / 25 | 50.0 | 50.0 | 33.3 | Major imbalance |
| 80 / 20 | 40.0 | 45.5 | 25.0 | Major imbalance |
| 90 / 10 | 20.0 | 38.5 | 11.1 | Extreme imbalance |

Formula A has the most intuitive linear interpretation. Formula B compresses large imbalances. Formula C is the most severe and easiest to explain as “the smaller package as a percentage of the larger.”

## Real-market scenarios

Values below use the published 2026 masterview `averageValue`; ADP is shown only as evidence.

| Scenario | Package values | A | B | C | Evidence |
|---|---:|---:|---:|---:|---|
| Brown + Dobbins vs Swift + Higgins | 39.6 / 38.6 | 98.7 | 97.5 | 97.5 | HIGH; all four Auction and ADP source counts are 5 |
| Bijan vs three 20-value players | 59.6 / 60.0 | 99.7 | 99.7 | 99.3 | Synthetic depth values |
| Brown + Higgins vs two 27.4-value players | 54.8 / 54.8 | 100.0 | 100.0 | 100.0 | Synthetic equal-value comparison |
| Bijan vs three deep 2.2-value players | 59.6 / 6.6 | 20.0 | 38.5 | 11.1 | HIGH for Bijan; depth evidence must be checked |
| Two 2.2-value players vs two 2.2-value players | 4.4 / 4.4 | 100.0 | 100.0 | 100.0 | MEDIUM when ADP coverage is incomplete |
| Any package containing a missing primary value | unavailable | unavailable | unavailable | unavailable | LOW / incomplete |

Observed example details: A.J. Brown is 32.8 with ADP 20.0; J.K. Dobbins is 6.8 with ADP 90.8; D'Andre Swift is 16.6 with ADP 47.8; Tee Higgins is 22.0 with ADP 39.2. Each has five Auction sources and five ADP sources.

## Consolidation sensitivity

Pure totals make Bijan (59.6) versus three 20-value players (60.0) nearly equal. This is a useful result for a value-only model, but it does not resolve whether the league wants to price roster consolidation or liquidity. The old +5 stud premium, 85% secondary discount, and roster tax are League Trade coefficients and are excluded.

Recommendation: keep pure totals as Model 1 for calibration. Treat any consolidation adjustment as a separate commissioner policy decision requiring its own evidence; do not approve a coefficient from this exercise.

## Evidence strength

Evidence is separate from fairness. Proposed labels:

- HIGH: every selected player has at least four Auction-value sources and four ADP sources.
- MEDIUM: at least one selected player has complete coverage, but not all do.
- LOW: no selected player has complete coverage, or a primary value is missing.

Evidence strength must not alter the numeric score. A trade can be balanced with LOW evidence or imbalanced with HIGH evidence.

## Candidate verdict bands

For commissioner review only, not approved thresholds:

- 95–100: Very balanced
- 85–94.9: Fair
- 70–84.9: Slight edge
- 50–69.9: Significant edge
- 0–49.9: Major imbalance

Formula choice materially affects these bands, especially for large gaps. Thresholds require commissioner approval.

## Multi-team recommendation

Do not force a two-team fairness score onto three- or four-team trades. Continue factual participant/package comparison until a multi-team contract defines how multiple bilateral values, routing, and consolidation should be interpreted.

## Recommendation

Use Formula A as the leading candidate because its score is directly the distance from equal package share, is symmetric, bounded, deterministic, and easy to explain. Keep Formula C as a useful stricter comparison. Do not integrate either into active Trade Analyzer behavior until the commissioner approves the primary market-value source, formula, consolidation policy, missing-data policy, and verdict bands.

## Production boundary

The calibration module, test, and report are offline-only. No active UI/API imports them. No Auction or ADP data was changed, no Firebase writes occurred, and League Trade behavior was not changed.
