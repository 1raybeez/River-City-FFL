import type {
  PostDraftMetricsInput,
  PostDraftPublicRecord,
  PostDraftPublicResult,
} from "@/lib/postDraftMetrics";

export const ANALYSIS_POSITIONS = ["QB", "RB", "WR", "TE", "FLEX", "DST", "K"] as const;
export type AnalysisPosition = typeof ANALYSIS_POSITIONS[number];

export type PositionStrength = {
  position: AnalysisPosition;
  rank: number | null;
  label: "ELITE" | "STRONG" | "MIDDLE" | "WEAK" | "MAJOR NEED" | "DATA UNAVAILABLE";
  score: number | null;
  starters: Array<{ playerId: string; playerName: string; position: string; value: number | null }>;
};

export type DraftInsight = { label: string; text: string };

export type PostDraftTeamAnalysis = {
  strengths: string[];
  concerns: string[];
  nextMoves: string[];
  positionStrengths: PositionStrength[];
  insights: DraftInsight[];
};

type PositionSummary = {
  position: string;
  players: Array<{ name: string; value: number | null }>;
  totalValue: number;
  knownValueCount: number;
  spend: number;
  shareOfSpend: number;
  required: number;
  covered: number;
  starters: number;
};

function position(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return normalized || "OTHER";
}

function positionLabel(value: string) {
  return ({ QB: "quarterback", RB: "running back", WR: "wide receiver", TE: "tight end", K: "kicker", DEF: "defense" } as Record<string, string>)[value] ?? value.toLowerCase();
}

function sentencePositionLabel(value: string) {
  const label = positionLabel(value);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function money(value: number) {
  return `$${Math.round(value)}`;
}

function topNames(summary: PositionSummary, count = 2) {
  return summary.players
    .slice()
    .sort((first, second) => (second.value ?? -Infinity) - (first.value ?? -Infinity))
    .slice(0, count)
    .map((player) => player.name);
}

function positionKey(value: string | null | undefined): string {
  const normalized = position(value);
  return normalized === "DST" ? "DEF" : normalized;
}

function strengthLabel(rank: number | null): PositionStrength["label"] {
  if (rank === null) return "DATA UNAVAILABLE";
  if (rank <= 2) return "ELITE";
  if (rank <= 4) return "STRONG";
  if (rank <= 8) return "MIDDLE";
  if (rank <= 10) return "WEAK";
  return "MAJOR NEED";
}

function rankValue(value: number | null) {
  return value ?? 0;
}

function buildPositionScore(
  roster: PostDraftMetricsInput["rosters"][number],
  input: PostDraftMetricsInput,
  analysisPosition: AnalysisPosition,
) {
  const required = analysisPosition === "DST" ? "DEF" : analysisPosition;
  const eligible = roster.playerIds
    .map((playerId) => ({ playerId, player: input.players.get(playerId) }))
    .filter(({ player }) => positionKey(player?.position) === required)
    .sort((first, second) => rankValue(second.player?.publishedValue ?? null) - rankValue(first.player?.publishedValue ?? null) || first.playerId.localeCompare(second.playerId));
  const requiredCount = analysisPosition === "FLEX"
    ? input.rosterRequirements?.flexSlots ?? 0
    : input.rosterRequirements?.requiredStarterSlots[required] ?? 0;
  const selected = analysisPosition === "FLEX"
    ? []
    : eligible.slice(0, requiredCount);
  const used = new Set(selected.map(({ playerId }) => playerId));
  let flexSelected: typeof eligible = [];
  if (analysisPosition === "FLEX") {
    const requiredPositions = new Set(["RB", "WR", "TE"]);
    const requiredUsed = new Set<string>();
    for (const pos of requiredPositions) {
      const count = input.rosterRequirements?.requiredStarterSlots[pos] ?? 0;
      eligibleForPosition(roster, input, pos).slice(0, count).forEach(({ playerId }) => requiredUsed.add(playerId));
    }
    flexSelected = roster.playerIds
      .map((playerId) => ({ playerId, player: input.players.get(playerId) }))
      .filter(({ player, playerId }) => !requiredUsed.has(playerId) && ["RB", "WR", "TE"].includes(positionKey(player?.position)))
      .sort((first, second) => rankValue(second.player?.publishedValue ?? null) - rankValue(first.player?.publishedValue ?? null) || first.playerId.localeCompare(second.playerId))
      .slice(0, input.rosterRequirements?.flexSlots ?? 0);
  }
  const starters = analysisPosition === "FLEX" ? flexSelected : selected;
  const depth = analysisPosition === "FLEX" || analysisPosition === "DST" || analysisPosition === "K" ? [] : eligible.filter(({ playerId }) => !used.has(playerId)).slice(0, 2);
  const scoredRows = [...starters, ...depth].filter((row) => row.player?.publishedValue !== null && row.player?.publishedValue !== undefined);
  const score = scoredRows.length === 0 ? null : starters.reduce((sum, row) => sum + rankValue(row.player?.publishedValue ?? null), 0) + depth.reduce((sum, row) => sum + rankValue(row.player?.publishedValue ?? null) * 0.25, 0);
  return { score, starters };
}

function eligibleForPosition(roster: PostDraftMetricsInput["rosters"][number], input: PostDraftMetricsInput, wanted: string) {
  return roster.playerIds
    .map((playerId) => ({ playerId, player: input.players.get(playerId) }))
    .filter(({ player }) => positionKey(player?.position) === wanted)
    .sort((first, second) => rankValue(second.player?.publishedValue ?? null) - rankValue(first.player?.publishedValue ?? null) || first.playerId.localeCompare(second.playerId));
}

export function buildLeaguePositionStrengths(metrics: PostDraftPublicResult, input: PostDraftMetricsInput) {
  const result = new Map<string, PositionStrength[]>();
  for (const record of metrics.records) {
    const roster = input.rosters.find((candidate) => candidate.rosterId === record.rosterId);
    if (!roster) continue;
    const raw = ANALYSIS_POSITIONS.map((analysisPosition) => {
      const built = buildPositionScore(roster, input, analysisPosition);
      return { position: analysisPosition, score: built.score, starters: built.starters };
    });
    const ranks = new Map<AnalysisPosition, number | null>();
    for (const analysisPosition of ANALYSIS_POSITIONS) {
      const peers = input.rosters.map((peer) => ({ rosterId: peer.rosterId, score: buildPositionScore(peer, input, analysisPosition).score }))
        .filter((peer): peer is { rosterId: number; score: number } => peer.score !== null)
        .sort((first, second) => second.score - first.score || first.rosterId - second.rosterId);
      const rank = peers.findIndex((peer) => peer.rosterId === roster.rosterId);
      ranks.set(analysisPosition, rank < 0 ? null : rank + 1);
    }
    result.set(record.franchiseId, raw.map((row) => ({
      position: row.position,
      rank: ranks.get(row.position) ?? null,
      label: strengthLabel(ranks.get(row.position) ?? null),
      score: row.score,
      starters: row.starters.map(({ playerId, player }) => ({ playerId, playerName: player?.playerName ?? playerId, position: position(player?.position), value: player?.publishedValue ?? null })),
    })));
  }
  return result;
}

/**
 * Public, descriptive analysis only. This intentionally does not participate
 * in the draft-grade calculation and never reads owner strategy preferences.
 */
export function buildPostDraftTeamAnalysis(
  record: PostDraftPublicRecord,
  input: PostDraftMetricsInput,
  metrics?: PostDraftPublicResult,
): PostDraftTeamAnalysis {
  const roster = input.rosters.find((candidate) => candidate.rosterId === record.rosterId);
  if (!roster) {
    return {
      strengths: ["Roster data is unavailable for a reliable positional strength call."],
      concerns: ["The current roster could not be matched to the public post-draft record."],
      nextMoves: ["Preserve the factual report and revisit roster decisions after current roster data is available."],
      positionStrengths: [], insights: [],
    };
  }

  const acquisitions = input.acquisitions.filter((acquisition) => acquisition.rosterId === roster.rosterId);
  const starterIds = new Set(roster.starterIds ?? []);
  const required = record.metrics.requiredStarterSlots;
  const summaries = new Map<string, PositionSummary>();

  roster.playerIds.forEach((playerId) => {
    const player = input.players.get(playerId);
    const pos = position(player?.position);
    const summary = summaries.get(pos) ?? {
      position: pos,
      players: [],
      totalValue: 0,
      knownValueCount: 0,
      spend: record.metrics.positionSpend[pos]?.totalSpend ?? 0,
      shareOfSpend: record.metrics.positionSpend[pos]?.shareOfTotalSpend ?? 0,
      required: required[pos] ?? 0,
      covered: record.metrics.starterCoverageByPosition[pos]?.covered ?? 0,
      starters: 0,
    };
    const value = player?.publishedValue ?? null;
    summary.players.push({ name: player?.playerName ?? playerId, value });
    if (value !== null) {
      summary.totalValue += value;
      summary.knownValueCount += 1;
    }
    if (starterIds.has(playerId)) summary.starters += 1;
    summaries.set(pos, summary);
  });

  const positionRows = [...summaries.values()]
    .filter((summary) => summary.position !== "OTHER")
    .sort((first, second) => second.totalValue - first.totalValue || second.players.length - first.players.length || first.position.localeCompare(second.position));
  const keeperCount = acquisitions.filter((acquisition) => acquisition.isKeeper).length;
  const totalValueDifferential = record.metrics.valueDifferential.total;
  const positionStrengths = metrics ? buildLeaguePositionStrengths(metrics, input).get(record.franchiseId) ?? [] : [];
  const rankedPositions = positionStrengths.filter((row): row is PositionStrength & { rank: number } => row.rank !== null);
  const premiumPositions = new Set(["QB", "RB", "WR", "TE", "FLEX"]);
  const premiumPriority = new Map([["QB", 0], ["RB", 1], ["WR", 2], ["TE", 3], ["FLEX", 4]]);
  const strongestRanked = rankedPositions.slice().sort((first, second) => first.rank - second.rank || first.position.localeCompare(second.position))[0];
  const weakestRanked = rankedPositions.filter((row) => premiumPositions.has(row.position)).slice().sort((first, second) => second.rank - first.rank || (premiumPriority.get(first.position) ?? 99) - (premiumPriority.get(second.position) ?? 99))[0] ?? rankedPositions.slice().sort((first, second) => second.rank - first.rank || first.position.localeCompare(second.position))[0];
  const canonicalStrongest = strongestRanked ? positionRows.find((row) => row.position === (strongestRanked.position === "DST" ? "DEF" : strongestRanked.position)) : undefined;
  const canonicalWeakest = weakestRanked ? positionRows.find((row) => row.position === (weakestRanked.position === "DST" ? "DEF" : weakestRanked.position)) : undefined;
  const strongest = canonicalStrongest ?? positionRows[0];
  const weakest = canonicalWeakest ?? positionRows[positionRows.length - 1];
  const strongestNames = strongest ? topNames(strongest) : [];
  const strongestPlayers = strongestRanked && ["QB", "RB", "WR", "TE"].includes(strongestRanked.position)
    ? roster.playerIds.map((playerId) => ({ playerId, player: input.players.get(playerId) })).filter(({ player }) => positionKey(player?.position) === strongestRanked.position && player?.publishedValue !== null && player?.publishedValue !== undefined).sort((first, second) => (second.player?.publishedValue ?? 0) - (first.player?.publishedValue ?? 0) || first.playerId.localeCompare(second.playerId))
    : [];
  const requiredCount = strongestRanked ? input.rosterRequirements?.requiredStarterSlots[positionKey(strongestRanked.position)] ?? 0 : 0;
  const namedTradeAsset = strongestRanked && weakestRanked && strongestRanked.rank <= 4 && weakestRanked.rank >= 9 && strongestPlayers.length > requiredCount && strongestPlayers.length >= 3
    ? strongestPlayers.slice(1).find(({ player }, index) => {
        const coreValue = strongestPlayers[0]?.player?.publishedValue ?? 0;
        const candidateValue = player?.publishedValue ?? 0;
        return index === 0 && candidateValue < coreValue * 0.9;
      })
    : undefined;
  const strongestUsesFlex = strongestRanked ? positionStrengths.find((row) => row.position === "FLEX")?.starters.some((starter) => starter.position === strongestRanked.position) ?? false : false;
  const insights: DraftInsight[] = [];
  if (strongestRanked && strongestRanked.rank <= 4) insights.push({ label: "Positional Advantage", text: `${strongestRanked.position} ranks #${strongestRanked.rank} in River City (${strongestRanked.label}).` });
  if (weakestRanked && weakestRanked.rank >= 9) insights.push({ label: "Positional Need", text: `${weakestRanked.position} ranks #${weakestRanked.rank} in River City (${weakestRanked.label}).` });
  if (record.metrics.bestBuy) insights.push({ label: "Best Buy", text: `${record.metrics.bestBuy.playerName} was acquired for ${money(record.metrics.bestBuy.valueDifferential)} below market value.` });
  if (record.metrics.biggestReach) insights.push({ label: "Biggest Reach", text: `${record.metrics.biggestReach.playerName} was acquired for ${money(Math.abs(record.metrics.biggestReach.valueDifferential))} above market value.` });
  else if (record.metrics.valueDifferential.comparablePlayerCount > 0) insights.push({ label: "Biggest Reach", text: "NO MAJOR REACH — No comparable acquisition finished meaningfully above market value." });
  if (record.metrics.keeperValueDifferential !== null && record.metrics.keeperValueDifferential > 0) insights.push({ label: "Keeper Edge", text: `Keepers produced a ${money(record.metrics.keeperValueDifferential)} published value differential.` });
  if (strongest && strongest.shareOfSpend >= 0.4) insights.push({ label: "Spending Concentration", text: `${positionLabel(strongest.position)} received ${Math.round(strongest.shareOfSpend * 100)}% of total spend.` });
  if (record.metrics.bestBuy || record.metrics.biggestReach) insights.push({ label: "Draft Identity", text: totalValueDifferential !== null && totalValueDifferential >= 0 ? "Value-focused build: the draft found more savings than overpays." : "Aggressive build: the draft paid premiums on more value decisions than it beat." });

  const strengths = strongest
    ? [
        `${strongestNames.length > 0 ? strongestNames.join(" and ") : "The roster"} ${strongestNames.length > 0 ? "give" : "gives"} this team its clearest ${sentencePositionLabel(strongestRanked?.position ?? strongest.position)}${strongestUsesFlex ? "/FLEX" : ""} group strength, ranking #${strongestRanked?.rank ?? "N/A"} in River City.`,
        ...(canonicalStrongest && canonicalStrongest.covered >= canonicalStrongest.required && canonicalStrongest.players.length > canonicalStrongest.required
          ? [`The ${positionLabel(strongestRanked?.position ?? canonicalStrongest.position)} room covers its required starter slot${canonicalStrongest.required === 1 ? "" : "s"} and retains depth behind it.`]
          : []),
        ...(keeperCount > 0 && record.metrics.keeperValueDifferential !== null
          ? [`The roster also carries ${keeperCount} keeper${keeperCount === 1 ? "" : "s"} with a published keeper value differential of ${money(record.metrics.keeperValueDifferential)}.`]
          : []),
      ]
    : ["Positional value coverage is not sufficient to identify a reliable roster strength."];

  const concerns = weakest
    ? [
        `${sentencePositionLabel(weakestRanked?.position ?? weakest.position)} is the clearest relative concern at #${weakestRanked?.rank ?? "N/A"} in River City, with ${canonicalWeakest?.covered ?? weakest.covered} of ${canonicalWeakest?.required ?? weakest.required} required starter slot${(canonicalWeakest?.required ?? weakest.required) === 1 ? "" : "s"} covered and ${canonicalWeakest?.players.length ?? weakest.players.length} rostered player${(canonicalWeakest?.players.length ?? weakest.players.length) === 1 ? "" : "s"}.`,
        ...((canonicalWeakest?.covered ?? weakest.covered) < (canonicalWeakest?.required ?? weakest.required)
          ? [`The ${positionLabel(weakestRanked?.position ?? weakest.position)} room has an uncovered starter need rather than merely a depth concern.`]
          : (canonicalWeakest?.players.length ?? weakest.players.length) <= (canonicalWeakest?.required ?? weakest.required)
            ? [`The ${positionLabel(weakestRanked?.position ?? weakest.position)} room has little depth behind the projected starters.`]
            : []),
        ...(canonicalStrongest && canonicalStrongest.shareOfSpend >= 0.4
          ? [`Spending is concentrated in ${positionLabel(strongestRanked?.position ?? canonicalStrongest.position)} at ${Math.round(canonicalStrongest.shareOfSpend * 100)}% of total spend, which limits flexibility if another position needs an upgrade.`]
          : []),
        ...(totalValueDifferential !== null && totalValueDifferential < 0
          ? [`The draft paid ${money(Math.abs(totalValueDifferential))} more than market value across comparable acquisitions, making purchase discipline an additional pressure point.`]
          : []),
      ]
    : ["Position and value coverage is not sufficient to identify a reliable roster concern."];

  const nextMoves = namedTradeAsset && strongestRanked && weakestRanked
    ? [`With ${strongestRanked.position} ranked #${strongestRanked.rank} and ${weakestRanked.position} ranked #${weakestRanked.rank}, consider shopping ${namedTradeAsset.player?.playerName ?? namedTradeAsset.playerId} as part of a package for a meaningful ${positionLabel(weakestRanked.position)} upgrade while preserving ${strongestPlayers[0]?.player?.playerName ?? "the top player"} as the ${positionLabel(strongestRanked.position)} foundation.`]
    : weakest && strongest && weakest.position !== strongest.position
    ? [
        ...(strongest.players.length > strongest.required && strongest.covered >= strongest.required
          ? [`Consider using surplus ${positionLabel(strongest.position)} depth as a strategic trade asset to improve ${positionLabel(weakest.position)}; pursue only an option that preserves the roster's value advantage.`]
          : [`Prioritize ${positionLabel(weakest.position)} on waivers or through value-conscious trade exploration before moving core ${positionLabel(strongest.position)} assets.`]),
        ...(weakest.covered < weakest.required
          ? [`Address the uncovered ${positionLabel(weakest.position)} starter slot before consolidating depth elsewhere.`]
          : [`Monitor ${positionLabel(weakest.position)} depth and consolidate only if the return materially improves the weak position.`]),
      ]
    : ["The roster does not show a decisive positional imbalance; preserve its current core and monitor waivers for value rather than forcing a trade."];

  const mixed = strongestRanked && weakestRanked && strongestRanked.rank <= 4 && weakestRanked.rank >= 5 && weakestRanked.rank <= 8;
  const balanced = strongestRanked && weakestRanked && strongestRanked.rank >= 5 && weakestRanked.rank <= 8;
  if (!namedTradeAsset && mixed) nextMoves.splice(0, nextMoves.length, `Protect the ${positionLabel(strongestRanked.position)} advantage at #${strongestRanked.rank}; monitor waiver and trade opportunities to improve the middle-tier skill-position group, but do not force a deal without clear value.`, `Preserve the roster's strongest core while looking for low-cost upgrades at the ${positionLabel(weakestRanked.position)} end of the ranked group.`);
  else if (balanced) nextMoves.splice(0, nextMoves.length, "The roster is balanced across the ranked units; preserve the core and monitor waivers rather than forcing a trade.");
  return { strengths, concerns, nextMoves, positionStrengths, insights };
}
