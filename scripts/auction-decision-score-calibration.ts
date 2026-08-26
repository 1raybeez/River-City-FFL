import { readFileSync, writeFileSync } from "node:fs";
import {
  applyRayModifierSystem,
  CALIBRATION_MODELS,
  calculateLiveOpportunity,
  disagreementGroup,
  movementAgainstAnchor,
  QUALITY_WEIGHT_VARIANTS,
  RAY_MODIFIER_SYSTEMS,
  scoreCalibrationModel,
  scoreQualityVariant,
  spearmanRankCorrelation,
  topSet,
  type CalibrationModelName,
  type CalibrationPlayer,
  type CalibrationRow,
} from "../lib/auction/decisionScoreCalibration";
import {
  compareShadowToRecommendedNow,
  DECISION_SCORE_SHADOW_POLICY,
  rankShadowDecisionScores,
  type ShadowDecisionState,
} from "../lib/auction/decisionScore";
import { buildRecommendedNow } from "../lib/auction/recommendedNow";

type Masterview = { rows: Array<Record<string, unknown>> };
type AdpFile = { rows: Array<Record<string, unknown>> };

function readJson<T>(path: string) {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function numberOrNull(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function buildPlayers(): CalibrationPlayer[] {
  const masterview = readJson<Masterview>("data/auction/generated/masterview-2026.json");
  const adp = readJson<AdpFile>("data/auction/adp/generated/adp-consensus-2026.json");
  const adpById = new Map(adp.rows.flatMap((row) => {
    const id = typeof row.playerId === "string" ? row.playerId : null;
    return id ? [[id, row] as const] : [];
  }));
  return masterview.rows.flatMap((row) => {
    const playerId = typeof row.sleeperPlayerId === "string" ? row.sleeperPlayerId : null;
    const auctionConsensus = numberOrNull(row.averageValue);
    if (!playerId || auctionConsensus === null) return [];
    const adpRow = adpById.get(playerId);
    return [{
      playerId,
      playerName: typeof row.playerName === "string" ? row.playerName : "Unknown",
      position: typeof row.position === "string" ? row.position : null,
      nflTeam: typeof row.nflTeam === "string" ? row.nflTeam : null,
      auctionConsensus,
      auctionSourceCount: numberOrNull(row.sourceCount) ?? 0,
      auctionConfidenceScore: numberOrNull(row.confidenceScore),
      auctionLow: numberOrNull(row.lowValue),
      auctionHigh: numberOrNull(row.highValue),
      adp: numberOrNull(adpRow?.consensusOverallAdp),
      adpSourceCount: numberOrNull(adpRow?.sourceCount) ?? 0,
    }];
  });
}

function money(value: number | null) { return value === null ? "—" : `$${value.toFixed(1)}`; }
function rowLine(row: CalibrationRow) {
  return `| ${row.rank} | ${row.playerName} | ${row.position ?? "—"} | ${row.nflTeam ?? "—"} | ${money(row.auctionConsensus)} | ${row.components.auction.toFixed(1)} | ${row.adp === null ? "—" : row.adp.toFixed(1)} | ${row.components.adp === null ? "—" : row.components.adp.toFixed(1)} | ${row.components.quality.toFixed(1)} | ${row.score.toFixed(1)} | ${row.auctionSourceCount} | ${row.adpSourceCount} |`;
}
function table(rows: readonly CalibrationRow[]) {
  return ["| Rank | Player | Pos | Team | Auction | Auction comp | ADP | ADP comp | Quality | Market Score | Auc src | ADP src |", "|---:|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|", ...rows.map(rowLine)].join("\n");
}
function names(rows: readonly CalibrationRow[], limit = 20) { return rows.slice(0, limit).map((row) => `${row.playerName} (#${row.rank})`).join(", ") || "None"; }
function topChanges(rows: readonly CalibrationRow[], anchor: readonly CalibrationRow[], direction: "up" | "down") {
  const changes = movementAgainstAnchor(rows, anchor);
  const filtered = direction === "up" ? changes.filter((row) => row.rankChange > 0) : changes.filter((row) => row.rankChange < 0).sort((a, b) => a.rankChange - b.rankChange);
  return filtered.slice(0, 20).map((row) => `${row.playerName} (${row.rankChange > 0 ? "+" : ""}${row.rankChange})`).join(", ") || "None";
}
function setDifference(left: Set<string>, right: Set<string>, rows: readonly CalibrationRow[]) {
  return rows.filter((row) => left.has(row.playerId) && !right.has(row.playerId)).map((row) => row.playerName).join(", ") || "None";
}
function positionSection(rows: readonly CalibrationRow[], position: string, limit: number) {
  return table(rows.filter((row) => row.position === position).slice(0, limit));
}

function qualityReason(player: CalibrationPlayer) {
  const spreadRatio = player.auctionLow !== null && player.auctionHigh !== null && player.auctionConsensus > 0
    ? (player.auctionHigh - player.auctionLow) / player.auctionConsensus
    : null;
  if (player.auctionSourceCount >= 4 && player.adpSourceCount >= 4 && (spreadRatio === null || spreadRatio <= 0.25)) return "broad support with relatively tight agreement";
  if (player.auctionSourceCount >= 4 || player.adpSourceCount >= 4) return "broad source support";
  if (spreadRatio !== null && spreadRatio > 0.5) return "spread/confidence penalty limits evidence quality";
  if ((player.auctionConfidenceScore ?? 0) >= 90) return "clean/high-confidence source matching";
  return "limited coverage; movement is evidence-weighting sensitivity, not player quality";
}

function topSetChangeSummary(candidate: readonly CalibrationRow[], baseline: readonly CalibrationRow[], limit: number) {
  const candidateSet = topSet(candidate, limit);
  const baselineSet = topSet(baseline, limit);
  return `In: ${setDifference(candidateSet, baselineSet, candidate)}; Out: ${setDifference(baselineSet, candidateSet, baseline)}`;
}

function qualityVariantSummary(name: keyof typeof QUALITY_WEIGHT_VARIANTS) {
  const rows = qualityVariants[name];
  const movement = movementAgainstAnchor(rows, qualityAnchor);
  return `correlation ${spearmanRankCorrelation(rows, qualityAnchor).toFixed(3)}; top-25 ${topSetChangeSummary(rows, qualityAnchor, 25)}; top-50 ${topSetChangeSummary(rows, qualityAnchor, 50)}; top-100 ${topSetChangeSummary(rows, qualityAnchor, 100)}; largest movements ${movement.slice(0, 5).map((row) => `${row.playerName} ${row.rankChange > 0 ? "+" : ""}${row.rankChange}`).join(", ") || "none"}`;
}

const scenarioDefinitions = [
  ["Empty roster except keepers", { QB: 0, RB: 1, WR: 0, TE: 0 }, 153, 15],
  ["One elite RB acquired", { QB: 0, RB: 2, WR: 0, TE: 0 }, 125, 14],
  ["Two strong RBs acquired", { QB: 0, RB: 3, WR: 0, TE: 0 }, 100, 13],
  ["WR-heavy start", { QB: 0, RB: 1, WR: 4, TE: 0 }, 125, 11],
  ["QB already acquired", { QB: 1, RB: 1, WR: 1, TE: 0 }, 145, 13],
  ["TE already acquired", { QB: 0, RB: 1, WR: 1, TE: 1 }, 145, 13],
  ["Low remaining budget", { QB: 0, RB: 2, WR: 2, TE: 0 }, 35, 10],
  ["High remaining budget", { QB: 0, RB: 1, WR: 1, TE: 0 }, 180, 14],
  ["Several starter holes", { QB: 0, RB: 0, WR: 0, TE: 0 }, 160, 16],
  ["Mostly complete; FLEX/depth", { QB: 1, RB: 3, WR: 3, TE: 1 }, 42, 8],
] as const;

const starterTargets = { QB: 1, RB: 2, WR: 2, TE: 1 };
const benchTargets = { QB: 2, RB: 5, WR: 5, TE: 2 };
function scenarioModifier(player: CalibrationPlayer, counts: Readonly<Record<string, number>>, remainingBudget: number, openSlots: number) {
  const position = player.position && player.position in starterTargets ? player.position as keyof typeof starterTargets : null;
  const starterNeed = position ? Math.max(starterTargets[position] - (counts[position] ?? 0), 0) : 0;
  const depthNeed = position ? Math.max(benchTargets[position] - (counts[position] ?? 0), 0) : 0;
  const fit = starterNeed > 0 ? Math.min(5, starterNeed * 2) : depthNeed > 0 ? 1 : -2;
  const legalMax = Math.max(0, remainingBudget - Math.max(openSlots - 1, 0));
  const affordability = player.auctionConsensus <= legalMax ? "AFFORDABLE" : player.auctionConsensus <= legalMax + 5 ? "STRETCH" : "NOT_REALISTIC";
  const budgetFit = affordability === "AFFORDABLE" ? 1 : affordability === "STRETCH" ? -1 : -5;
  return { rosterFit: fit, scarcity: player.auctionConsensus >= 30 ? 1 : 0, budgetFit, affordability } as const;
}

function scenarioNames(rows: readonly CalibrationRow[], counts: Readonly<Record<string, number>>, budget: number, openSlots: number, system: typeof RAY_MODIFIER_SYSTEMS[keyof typeof RAY_MODIFIER_SYSTEMS] | null) {
  return rows.flatMap((row) => {
    const modified = system ? applyRayModifierSystem({ marketScore: row.score, ...scenarioModifier(row, counts, budget, openSlots) }, system) : { score: row.score };
    return modified ? [{ row, score: modified.score }] : [];
  }).sort((a, b) => b.score - a.score || a.row.playerName.localeCompare(b.row.playerName)).slice(0, 15).map(({ row }) => row.playerName).join(", ");
}

function headToHeadPairs(rows: readonly CalibrationRow[]) {
  const pairs: Array<[CalibrationRow, CalibrationRow]> = [];
  for (let index = 0; index < rows.length && pairs.length < 20; index += 1) {
    const first = rows[index];
    const second = rows.slice(index + 1).find((candidate) => candidate.position !== first.position && Math.abs(candidate.score - first.score) <= 2);
    if (second) pairs.push([first, second]);
  }
  return pairs;
}

const players = buildPlayers();
const modelNames = Object.keys(CALIBRATION_MODELS) as CalibrationModelName[];
const models = new Map(modelNames.map((name) => [name, scoreCalibrationModel(players, name, "PROPORTIONAL")]));
const anchor = models.get("MODEL C")!;
const neutralModelC = scoreCalibrationModel(players, "MODEL C", "NEUTRAL");
const qualityVariants = Object.fromEntries(Object.keys(QUALITY_WEIGHT_VARIANTS).map((name) => [name, scoreQualityVariant(players, name as keyof typeof QUALITY_WEIGHT_VARIANTS)])) as Record<keyof typeof QUALITY_WEIGHT_VARIANTS, CalibrationRow[]>;
const qualityAnchor = qualityVariants["QUALITY 10%"];
const qualitylessAnchor = qualityVariants["QUALITY 0%"];
const bothInputs = players.filter((player) => player.adp !== null);
const qualityless = scoreCalibrationModel(bothInputs, "MODEL C", "PROPORTIONAL");
const qualitylessRows = qualityless
  .map((row) => ({ ...row, components: { ...row.components, quality: 0 }, score: row.components.adp === null ? row.components.auction : (row.components.auction * 60 + row.components.adp * 30) / 90 }))
  .sort((first, second) => second.score - first.score || first.playerName.localeCompare(second.playerName))
  .map((row, index) => ({ ...row, rank: index + 1 }));
const qCorrelation = spearmanRankCorrelation(scoreCalibrationModel(bothInputs, "MODEL C"), qualitylessRows);
const top25Anchor = topSet(anchor, 25);
const top50Anchor = topSet(anchor, 50);
const top100Anchor = topSet(anchor, 100);
const qualityMovements = movementAgainstAnchor(scoreCalibrationModel(bothInputs, "MODEL C"), qualitylessRows);
const disagreement = new Map<string, CalibrationRow[]>();
for (const row of anchor) disagreement.set(disagreementGroup(row), [...(disagreement.get(disagreementGroup(row)) ?? []), row]);
const modifiers = [
  { name: "Quality-first player with balanced fit", base: 80, rosterFit: 6, scarcity: 2, budgetFit: 2 },
  { name: "High-quality player after position filled", base: 90, rosterFit: -8, scarcity: -3, budgetFit: 0 },
  { name: "Barely affordable target", base: 80, rosterFit: 8, scarcity: 3, budgetFit: -5 },
];
const liveExamples = [[60, 45], [60, 50], [60, 55], [60, 60], [60, 63], [60, 65], [60, 70]] as const;
const shadowState: ShadowDecisionState = { roster: [], remainingBudget: 150, rosterSlotsRemaining: 16 };
const shadowResults = rankShadowDecisionScores(players, shadowState);
const currentRecommended = buildRecommendedNow({
  values: players.map((player) => ({ playerId: player.playerId, playerName: player.playerName, position: player.position, nflTeam: player.nflTeam, auctionConsensus: player.auctionConsensus, auctionLow: player.auctionLow, auctionHigh: player.auctionHigh, auctionSourceCount: player.auctionSourceCount })),
  adp: players.map((player) => ({ playerId: player.playerId, adp: player.adp, sourceCount: player.adpSourceCount })),
  preferences: new Map(),
  purchases: [],
  teams: [{ rosterId: 1, remainingBudget: 150, rosterSlotsRemaining: 16 }],
  rayRosterId: 1,
  rayBudget: { teamBudget: 150, keeperCostTotal: 0, spentBudget: 0, rosterSlotsTotal: 16 },
  generatedAt: "2026-08-26T00:00:00.000Z",
});
const shadowComparison = compareShadowToRecommendedNow(shadowResults, currentRecommended.recommendations.map((recommendation) => ({ playerId: recommendation.playerId, playerName: recommendation.playerName, category: recommendation.category })));

const lines: string[] = [];
lines.push("# 2026 Auction War Room Decision Score Calibration");
lines.push("", "> CALIBRATION ONLY — NOT PRODUCTION LOGIC — NO WEIGHTS APPROVED");
lines.push("", `Generated from local 2026 masterview and ADP artifacts. Player universe: **${players.length}** players with canonical Sleeper IDs and valid Auction consensus.`);
lines.push(`Players with Auction + ADP: **${bothInputs.length}**; Auction-only: **${players.length - bothInputs.length}**.`);
lines.push("", "## Confidence semantics");
lines.push("The masterview `confidenceScore` is not player quality. It is `min(average match confidence, average source confidence)`, reduced by penalties for missing Sleeper identity, fewer than two sources, high source spread, match review, row warnings, and row errors. The harness uses it only as evidence quality alongside source coverage; it is not treated as a projection.");
lines.push("", "## Components");
lines.push("- Auction component: percentile rank of `averageValue` across the valid Auction universe × 100; higher dollar value is stronger.");
lines.push("- ADP component: inverse percentile rank of `consensusOverallAdp` across players with ADP × 100; lower ADP is stronger.");
lines.push("- Quality component: average of Auction source coverage and masterview confidence; when ADP exists, average that Auction evidence with ADP source coverage. Missing ADP is not a zero-quality score.");
lines.push("", "## Coverage by position");
for (const position of ["QB", "RB", "WR", "TE", "K", "DEF"]) { const group = players.filter((p) => p.position === position); lines.push(`- ${position}: ${group.length} total; ${group.filter((p) => p.adp !== null).length} with ADP; ${group.filter((p) => p.adp === null).length} Auction-only.`); }
lines.push("", "## Candidate model weights");
lines.push("| Model | Auction | ADP | Quality | Missing ADP treatment |", "|---|---:|---:|---:|---|", "| MODEL A | 50% | 35% | 15% | Proportional reweight in harness |", "| MODEL B | 55% | 30% | 15% | Proportional reweight in harness |", "| MODEL C | 60% | 30% | 10% | Proportional reweight in harness |", "| MODEL D | 65% | 25% | 10% | Proportional reweight in harness |", "| MODEL E | 70% | 20% | 10% | Proportional reweight in harness |", "| CONTROL AUCTION | 100% | — | — | Auction-only |", "| CONTROL ADP | — | 100% | — | ADP-present players only |", "| CURRENT BEST-OVERALL APPROXIMATION | 62.5% | 37.5% | 0% | Renormalized 25:15 market ratio |", "");
for (const name of modelNames) { lines.push(`### ${name}`, "", table(models.get(name)!.slice(0, 30)), ""); }
lines.push("## Position-specific MODEL C", "", "### QB", "", positionSection(anchor, "QB", 15), "", "### RB", "", positionSection(anchor, "RB", 25), "", "### WR", "", positionSection(anchor, "WR", 25), "", "### TE", "", positionSection(anchor, "TE", 15));
lines.push("## Model movement versus MODEL C", "", "| Model | Largest risers | Largest fallers |", "|---|---|---|");
for (const name of ["MODEL A", "MODEL B", "MODEL D", "MODEL E", "CONTROL AUCTION", "CONTROL ADP", "CURRENT BEST-OVERALL APPROXIMATION"] as CalibrationModelName[]) lines.push(`| ${name} | ${topChanges(models.get(name)!, anchor, "up")} | ${topChanges(models.get(name)!, anchor, "down")} |`);
lines.push("", "### Top-set entries/exits", "", "| Model | Top 25 changes | Top 50 changes | Top 100 changes |", "|---|---|---|---|");
for (const name of ["MODEL A", "MODEL B", "MODEL D", "MODEL E"] as CalibrationModelName[]) { const rows = models.get(name)!; lines.push(`| ${name} | In: ${setDifference(topSet(rows, 25), top25Anchor, rows)}; Out: ${setDifference(top25Anchor, topSet(rows, 25), anchor)} | In: ${setDifference(topSet(rows, 50), top50Anchor, rows)}; Out: ${setDifference(top50Anchor, topSet(rows, 50), anchor)} | In: ${setDifference(topSet(rows, 100), top100Anchor, rows)}; Out: ${setDifference(top100Anchor, topSet(rows, 100), anchor)} |`); }
lines.push("", "## Auction versus ADP disagreement", "", ...["AUCTION LOVES MORE THAN ADP", "ADP LOVES MORE THAN AUCTION", "BOTH STRONGLY AGREE", "BOTH WEAK"].map((group) => `- **${group}:** ${names(disagreement.get(group) ?? [], 12)}`));
const qualityMovementSummary = qualityMovements.slice(0, 10).map((row) => `${row.playerName} ${row.rankChange > 0 ? "+" : ""}${row.rankChange}`).join(", ") || "none";
lines.push("", "## Quality sensitivity", "", `MODEL C versus Auction+ADP-only on players with both inputs: Spearman rank correlation **${qCorrelation.toFixed(3)}**. Quality changed **${qualityMovements.filter((row) => row.rankChange !== 0).length}** of ${bothInputs.length} paired ranks; largest movements: ${qualityMovementSummary}. Quality should remain a reviewable evidence component; this run does not approve 10%.`);
const neutralMovement = movementAgainstAnchor(neutralModelC, anchor);
const neutralTop25Changes = neutralMovement.filter((row) => row.rank <= 25 && (row.rankChange !== 0)).length;
lines.push("", "## Missing ADP sensitivity", "", `Auction-only players affected: **${players.length - bothInputs.length}**. Proportional reweighting preserves their Auction/Quality evidence; neutral ADP inserts a 50-point assumption and compresses results toward the middle. Against proportional MODEL C, neutral treatment changes **${neutralMovement.filter((row) => row.rankChange !== 0).length}** ranks and changes **${neutralTop25Changes}** top-25 memberships. Largest neutral-treatment movements: ${neutralMovement.slice(0, 8).map((row) => `${row.playerName} ${row.rankChange > 0 ? "+" : ""}${row.rankChange}`).join(", ") || "none"}. The next calibration round should review proportional reweighting first, without making it production policy.`);
lines.push("", "## Positional effects", "", "Global percentiles favor the largest cross-position Auction values and strongest ADP ranks. Elite RB/WR values dominate the global top; QBs and low-dollar K/DEF are naturally lower. No position adjustment was introduced. Review position-specific tables before considering any adjustment.");
lines.push("", "## Sanity-check players", "", table(anchor.slice(0, 25)));
lines.push("", "## Ray-specific modifier simulation", "", "Synthetic only; no production integration:", "", "| Scenario | Base | Fit | Scarcity | Budget | Result |", "|---|---:|---:|---:|---:|---:|");
for (const scenario of modifiers) lines.push(`| ${scenario.name} | ${scenario.base} | ${scenario.rosterFit} | ${scenario.scarcity} | ${scenario.budgetFit} | ${Math.min(100, Math.max(0, scenario.base + scenario.rosterFit + scenario.scarcity + scenario.budgetFit))} |`);
lines.push("", "The synthetic ranges can move a 80-point player to 90 and a 90-point player to 79, so fit/scarcity/budget modifiers can overpower quality when stacked. A later review should start around ±5 total per layer, with a combined modifier guardrail around ±10, before considering larger ranges.");
lines.push("", "## Live opportunity simulation", "", "Synthetic only; no current bid was wired into Recommended Now.", "", "| Consensus | Current bid | Absolute difference | Percentage difference |", "|---:|---:|---:|---:|");
for (const [consensus, bid] of liveExamples) { const result = calculateLiveOpportunity(consensus, bid); lines.push(`| $${consensus} | $${bid} | $${result.absoluteDifference} | ${result.percentageDifference}% |`); }
lines.push("", "Absolute dollars are intuitive but overstate discounts on low-priced players. Percentage better compares scale but can overstate small-dollar noise. A future hybrid should use percentage as the normalized signal with an absolute-dollar floor/context guardrail. No thresholds are approved.");
const qualitylessById = new Map(qualitylessAnchor.map((row) => [row.playerId, row]));
const qualityMovers = qualityAnchor
  .flatMap((row) => {
    const withoutQuality = qualitylessById.get(row.playerId);
    return withoutQuality ? [{ row, withoutQuality, movement: withoutQuality.rank - row.rank }] : [];
  })
  .sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement) || a.row.playerName.localeCompare(b.row.playerName));
lines.push("", "## PHASE 3 — Quality and modifier calibration", "", "> CALIBRATION ONLY — synthetic/offline analysis; no production decision weights, modifiers, thresholds, UI, API, or data were changed.");
lines.push("", "### Quality decomposition", "", "Quality is evidence quality, not player talent: Auction coverage is `min(auctionSourceCount / 5, 1) × 100`; Auction evidence averages that coverage with masterview confidence; when ADP exists, ADP source coverage is averaged into the evidence score. The masterview confidence input is the existing `min(averageMatchConfidence, averageSourceConfidence)` after its source/match/spread/warning/error penalties. Missing ADP is proportionally reweighted, never treated as a permanent neutral 50-point input.");
lines.push("", "### Top 30 quality-sensitive players", "", "Movement is `rank without quality − rank with quality`; positive values rise when quality is included.", "", "| Player | Pos | Auction | ADP | Auc src | ADP src | Confidence | Quality rank | No-quality rank | Movement | Classification |", "|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|");
for (const { row, withoutQuality, movement } of qualityMovers.slice(0, 30)) lines.push(`| ${row.playerName} | ${row.position ?? "—"} | ${money(row.auctionConsensus)} | ${row.adp === null ? "—" : row.adp.toFixed(1)} | ${row.auctionSourceCount} | ${row.adpSourceCount} | ${row.auctionConfidenceScore === null ? "—" : row.auctionConfidenceScore.toFixed(1)} | ${row.rank} | ${withoutQuality.rank} | ${movement > 0 ? "+" : ""}${movement} | ${qualityReason(row)} |`);
lines.push("", "### Quality weight sensitivity", "", "| Variant | Auction | ADP | Quality | Result versus QUALITY 10% |", "|---|---:|---:|---:|---|");
for (const name of Object.keys(QUALITY_WEIGHT_VARIANTS) as Array<keyof typeof QUALITY_WEIGHT_VARIANTS>) {
  const weights = QUALITY_WEIGHT_VARIANTS[name];
  lines.push(`| ${name} | ${weights.auction}% | ${weights.adp}% | ${weights.quality}% | ${qualityVariantSummary(name)} |`);
}
lines.push("", "Working recommendation for commissioner review: QUALITY 10% remains the balanced candidate because it rewards evidence quality without replacing Auction/ADP market signal; this is not a production approval. QUALITY 0%, 5%, and 15% remain valid comparison points.");
lines.push("", "### Market Score and roster semantics", "", "The working market score is Auction percentile × Auction weight + inverse-ADP percentile × ADP weight + evidence quality × Quality weight, with proportional reweighting when ADP is missing. It has no roster, current-bid, budget, or owner-preference input.", "", "Roster fit audit: starter need is the strongest signal; bench/depth need is weaker; a filled position receives a bounded negative fit only when the roster is beyond the modeled depth target. FLEX can be modeled as (A) position-only starter fit, (B) starter plus bench/depth fit, or (C) starter plus bench plus flexible replacement opportunity. C is the most useful next review candidate because it preserves positional need while recognizing multi-position open paths; it remains unapproved and offline.");
lines.push("", "### Roster modifier caps", "", "Synthetic 80-point example with fit only:", "", "| Cap | Result | Interpretation |", "|---:|---:|---|");
for (const cap of [3, 5, 7, 10]) lines.push(`| ±${cap} | ${80 + cap} | Maximum positive roster movement in this isolated example |`);
lines.push("", "A ±5 roster cap is the preferred next review starting point: ±3 may under-express a real starter hole, while ±7/±10 can dominate too easily. No cap is applied to production.");
lines.push("", "### Scarcity modifier caps", "", "Synthetic 80-point example with scarcity only:", "", "| Cap | Result | Interpretation |", "|---:|---:|---|");
for (const cap of [1, 2, 3, 5]) lines.push(`| ±${cap} | ${80 + cap} | Maximum positive scarcity movement in this isolated example |`);
lines.push("", "A ±2 scarcity cap is the preferred next review starting point. Scarcity should break close market-score ties, not overturn a materially stronger market signal.");
lines.push("", "### Budget treatment", "", "Budget fit should primarily be a gate/label: NOT_REALISTIC removes a candidate from a legal recommendation set; AFFORDABLE and STRETCH explain feasibility. A large positive budget modifier would double-count affordability and can incorrectly elevate spend capacity over player value. A small bounded budget signal may be tested only after the gate semantics are stable.");
lines.push("", "### Combined modifier systems", "", "| System | Roster cap | Scarcity cap | Budget | Combined cap | Assessment |", "|---|---:|---:|---:|---:|---|");
for (const [name, system] of Object.entries(RAY_MODIFIER_SYSTEMS)) {
  const assessment = name === "SYSTEM A" ? "full stack; highest double-count risk" : name === "SYSTEM B" ? "transparent gate-first baseline" : "upper-bound roster sensitivity";
  lines.push(`| ${name} | ±${system.rosterMaximum} | ±${system.scarcityMaximum} | ${system.budgetMode === "GATE" ? "gate only" : `±${system.budgetMaximum}`} | ±${system.totalMaximum} | ${assessment} |`);
}
lines.push("", "System A permits the full ±10 budget-inclusive stack and is the least stable when affordability is already gating. System B preserves a transparent ±5 roster signal, ±2 scarcity signal, and budget gate with a ±7 combined cap; it is the preferred first review candidate. System C provides the full ±10 combined philosophy with a larger roster range but no budget score; it is a useful sensitivity upper bound. System D is intentionally absent—no fourth combined system was invented without a distinct semantic contract.");
lines.push("", "### Ten roster scenarios — MODEL C top 15", "", "Each scenario is synthetic. ‘Market’ is the unchanged market score; A/B/C apply only the bounded offline modifier systems.", "", "| Scenario | Market top 15 | System A top 15 | System B top 15 | System C top 15 |", "|---|---|---|---|---|");
for (const [scenario, counts, budget, openSlots] of scenarioDefinitions) lines.push(`| ${scenario} | ${scenarioNames(anchor, counts, budget, openSlots, null)} | ${scenarioNames(anchor, counts, budget, openSlots, RAY_MODIFIER_SYSTEMS["SYSTEM A"])} | ${scenarioNames(anchor, counts, budget, openSlots, RAY_MODIFIER_SYSTEMS["SYSTEM B"])} | ${scenarioNames(anchor, counts, budget, openSlots, RAY_MODIFIER_SYSTEMS["SYSTEM C"])} |`);
const pairRows = headToHeadPairs(anchor);
const comparisonScenario = scenarioDefinitions[8];
lines.push("", "### Twenty head-to-head comparisons", "", `Scenario: ${comparisonScenario[0]}; System B. These are close MODEL C pairs, not production recommendations.`, "", "| Pair | Market winner | System B winner | Flip? |", "|---|---|---|---|");
for (const [first, second] of pairRows) {
  const [winner] = [first, second].sort((a, b) => b.score - a.score || a.playerName.localeCompare(b.playerName));
  const modified = [first, second].map((row) => ({ row, result: applyRayModifierSystem({ marketScore: row.score, ...scenarioModifier(row, comparisonScenario[1], comparisonScenario[2], comparisonScenario[3]) }, RAY_MODIFIER_SYSTEMS["SYSTEM B"]) })).filter((item) => item.result).sort((a, b) => b.result!.score - a.result!.score || a.row.playerName.localeCompare(b.row.playerName));
  const modifiedWinner = modified[0]?.row ?? winner;
  lines.push(`| ${first.playerName} vs ${second.playerName} | ${winner.playerName} | ${modifiedWinner.playerName} | ${winner.playerId !== modifiedWinner.playerId ? "YES" : "NO"} |`);
}
lines.push("", "### Live opportunity matrix", "", "Live opportunity remains separate from market score and owner/roster modifiers. It is calculated from consensus and current bid only: absolute difference = consensus − bid; percentage difference = `(consensus − bid) / consensus × 100`. Across low-dollar examples, percentage is more comparable but noisier; absolute dollars are more intuitive but scale-sensitive.", "", "| Consensus | Bid bands tested | Interpretation |", "|---:|---|---|");
for (const consensus of [5, 10, 15, 20, 30, 40, 50, 60, 80]) lines.push(`| $${consensus} | ${[consensus - 15, consensus - 10, consensus - 5, consensus, consensus + 5].map((bid) => `$${Math.max(1, bid)}`).join(", ")} | Discount percentage should be normalized with an absolute-dollar floor; no threshold is approved |`);
lines.push("", "Hybrid band proposal for later review only: use normalized percentage as the primary signal, require a minimum absolute-dollar difference before calling a discount meaningful, and label near-consensus/overpay states separately. The bands must not enter Recommended Now until explicitly selected and implemented in a later task.");
lines.push("", "### Independence proof", "", "Market Score is independent of current bid, roster fit, scarcity, budget fit, and owner preferences. Ray Fit/modifiers are independent of current bid. Live opportunity is independent of the market ranking and is evaluated as a separate event-time signal. The focused regression asserts these boundaries and confirms no production recommendation path was changed.");
lines.push("", "## PHASE 4 — SHADOW ENGINE", "", "> SHADOW ONLY — NOT USED BY PRODUCTION RECOMMENDED NOW — NOT DISPLAYED IN PRODUCTION UI — no Firestore writes, deployment, or production JSON.", "", `Policy version: **decision-score-shadow-v1** (${DECISION_SCORE_SHADOW_POLICY}). The isolated engine reuses the calibration normalization, roster guidance, canonical max-bid calculation, and affordability labels; it adds only bounded System B roster/scarcity modifiers. Decision Score is Market Score plus Ray modifier, clamped to 0–100. NOT_REALISTIC results remain auditable but are excluded from acquire-now ranking.`, "", "The Phase 4 comparison uses synthetic/reference roster states and does not constitute production validation. Real-state shadow evaluation is still required; existing Recommended Now remains authoritative in production.", "", "### Shadow comparison: empty-roster reference state", "", `Agreement: **${shadowComparison.agreementCount}/${shadowComparison.currentSelections.length}** current Recommended Now selections appear in the shadow ranked set. This comparison is descriptive, not a correctness verdict.`, "", "#### Shadow top 20", "", "| Rank | Player | Market Score | Ray modifier | Decision Score | Affordability |", "|---:|---|---:|---:|---:|---|");
for (const [index, result] of shadowComparison.shadowTop20.entries()) lines.push(`| ${index + 1} | ${result.playerName} | ${result.marketScore.toFixed(1)} | ${result.rayModifier >= 0 ? "+" : ""}${result.rayModifier} | ${result.decisionScore.toFixed(1)} | ${result.affordability} |`);
lines.push("", "#### Current selections and shadow ranks", "", "| Category | Player | Shadow rank |", "|---|---|---:|");
for (const selection of shadowComparison.currentSelections) lines.push(`| ${selection.category} | ${selection.playerName} | ${selection.shadowRank ?? "omitted"} |`);
lines.push("", "#### Shadow players omitted by current Recommended Now", "", shadowComparison.shadowOmittedByRecommendedNow.slice(0, 10).map((result) => `- ${result.playerName}: Market ${result.marketScore.toFixed(1)}, Ray ${result.rayModifier >= 0 ? "+" : ""}${result.rayModifier}, Decision ${result.decisionScore.toFixed(1)}; ${result.affordability}.`).join("\n") || "- None.", "", "Disagreement explanation is intentionally component-level: market-score difference is the objective 60/30/10 baseline; roster/FLEX and scarcity are bounded System B nudges; affordability can hard-gate; Recommended Now also selects distinct categories and applies availability/private-preference behavior that Shadow v1 does not.");
lines.push("", "### Shadow implementation boundaries", "", "The pure shadow engine has no current-bid parameter and no private target/watch/fade bonus. The server-only adapter accepts an already assembled War Room state and performs no reads or writes itself. The live-opportunity classifier is separate and never changes Market Score, Ray Fit, or Decision Score. No production import depends on the shadow module.", "", "Score saturation near 100 remains an open evaluation item. No compression or rescaling policy has been approved. Phase 5 must test saturation using real War Room state before any production UI exposure.");
lines.push("", "## Approved for SHADOW V1", "", "The commissioner-approved shadow policy is recorded here without implementing it in production Recommended Now:", "", "- Base Market Score: 60% Auction + 30% ADP + 10% Market Quality.", "- Missing ADP: proportional reweighting of available components; no neutral ADP 50.", "- Quality: 10% evidence quality only, using Auction coverage, Auction confidence, and ADP source coverage.", "- Roster/FLEX: starter need, depth need, and FLEX opportunity; roster modifier maximum ±5.", "- Scarcity: maximum ±2.", "- Budget: no numeric score modifier; feasibility gate with affordability/stretch labels; NOT_REALISTIC is a hard gate.", "- Combined Ray-specific modifier: System B, maximum ±7.", "- Live Opportunity: entirely separate from Market Score and Ray Fit.", "", "### Shadow live-value bands", "", "| Band | Below/above consensus | Absolute-dollar floor |", "|---|---:|---:|", "| SMASH VALUE | ≥25% below | ≥$5 below |", "| STRONG VALUE | ≥15% below | ≥$4 below |", "| VALUE | ≥7.5% below | ≥$2 below |", "| FAIR | no value/overpay threshold crossed | — |", "| STRETCH | ≥7.5% above | ≥$2 above |", "| OVERPAY | ≥15% above | ≥$4 above |", "| HEAVY OVERPAY | ≥25% above | ≥$5 above |", "", "These bands are shadow-test policy only. They are NOT YET APPROVED FOR PRODUCTION RECOMMENDED NOW.");
lines.push("", "## Controls and caveats", "", "The Auction control is the Auction component alone. The ADP control is ADP-only where present. The current BEST OVERALL approximation uses only its market-related Auction/ADP weights; actual production BEST OVERALL additionally uses roster fit, scarcity, affordability, private preference, and league pressure. This report does not reproduce the production recommendation.");
writeFileSync("docs/auction-decision-score-calibration-2026.md", `${lines.join("\n")}\n`, "utf8");
console.log(`Decision score calibration report written for ${players.length} players.`);
