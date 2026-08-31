export type CurrentValueMode = "REST_OF_SEASON" | "REDRAFT" | "FALLBACK";
export type CurrentValueFreshness = "FRESH" | "AGING" | "STALE" | "UNKNOWN";
export type CurrentValueConfidence = "HIGH" | "MEDIUM" | "LOW" | "UNAVAILABLE";

export type CurrentSeasonPlayerValue = {
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  overallRank: number | null;
  positionalRank: number | null;
  currentValueScore: number | null;
  mode: CurrentValueMode;
  generatedAt: string | null;
  ageDays: number | null;
  freshness: CurrentValueFreshness;
  confidence: CurrentValueConfidence;
  sourceCount: number;
  sources: { source: string; rank?: number | null; value?: number | null; generatedAt?: string | null }[];
  safeAsPrimaryCurrentValue: boolean;
  contextOnly: boolean;
  unavailableReason?: string | null;
};

export type CurrentValueSourceInput = {
  source: string;
  mode: CurrentValueMode;
  overallRank?: number | null;
  positionalRank?: number | null;
  value?: number | null;
  generatedAt?: string | null;
  sourceCount?: number;
  confidence?: Exclude<CurrentValueConfidence, "UNAVAILABLE">;
  allowAsFallback?: boolean;
};

export function rosConsensusToCurrentValueSource(row: { source: string; mode?: "REST_OF_SEASON" | "REDRAFT"; overallRank: number | null; positionalRank: number | null; sourceValue: number | null; generatedAt: string | null; sourceCount: number; confidence: Exclude<CurrentValueConfidence, "UNAVAILABLE"> }): CurrentValueSourceInput {
  return { source: row.source, mode: row.mode ?? "REST_OF_SEASON", overallRank: row.overallRank, positionalRank: row.positionalRank, value: row.sourceValue, generatedAt: row.generatedAt, sourceCount: row.sourceCount, confidence: row.confidence };
}

export function evaluateCurrentValueFreshness(generatedAt: string | null | undefined, now = new Date().toISOString()) {
  if (!generatedAt) return { freshness: "UNKNOWN" as const, ageDays: null };
  const generated = Date.parse(generatedAt);
  const current = Date.parse(now);
  if (!Number.isFinite(generated) || !Number.isFinite(current) || generated > current) return { freshness: "UNKNOWN" as const, ageDays: null };
  const ageDays = (current - generated) / 86_400_000;
  return { freshness: ageDays <= 7 ? "FRESH" as const : ageDays <= 14 ? "AGING" as const : "STALE" as const, ageDays };
}

export function resolveCurrentSeasonPlayerValue({
  playerId,
  playerName,
  position,
  nflTeam,
  sources,
  now = new Date().toISOString(),
  adpFreshnessWindowDays = 14,
}: {
  playerId: string;
  playerName: string;
  position: string;
  nflTeam: string | null;
  sources: readonly CurrentValueSourceInput[];
  now?: string;
  adpFreshnessWindowDays?: number;
}): CurrentSeasonPlayerValue {
  const ordered = [...sources].sort((first, second) => {
    const priority = (source: CurrentValueSourceInput) => source.mode === "REST_OF_SEASON" ? 0 : source.mode === "REDRAFT" ? 1 : 2;
    return priority(first) - priority(second);
  });
  const selected = ordered.find((source) => {
    if (source.mode !== "FALLBACK") return true;
    if (source.allowAsFallback === false) return false;
    return true;
  }) ?? null;
  if (!selected) {
    return { playerId, playerName, position, nflTeam, overallRank: null, positionalRank: null, currentValueScore: null, mode: "FALLBACK", generatedAt: null, ageDays: null, freshness: "UNKNOWN", confidence: "UNAVAILABLE", sourceCount: 0, sources: [], safeAsPrimaryCurrentValue: false, contextOnly: true, unavailableReason: sources.length ? "No current-value source is within its freshness policy." : "No current-value source is available." };
  }
  const freshness = evaluateCurrentValueFreshness(selected.generatedAt, now);
  const isFallback = selected.mode === "FALLBACK";
  const staleFallback = isFallback && (freshness.ageDays === null || freshness.ageDays > adpFreshnessWindowDays);
  const safeAsPrimaryCurrentValue = !isFallback && freshness.freshness !== "STALE";
  return {
    playerId,
    playerName,
    position,
    nflTeam,
    overallRank: selected.overallRank ?? null,
    positionalRank: selected.positionalRank ?? null,
    currentValueScore: staleFallback ? null : selected.value ?? null,
    mode: isFallback ? "FALLBACK" : selected.mode,
    generatedAt: selected.generatedAt ?? null,
    ageDays: freshness.ageDays,
    freshness: freshness.freshness,
    confidence: staleFallback ? "UNAVAILABLE" : selected.confidence ?? (isFallback ? "LOW" : "MEDIUM"),
    sourceCount: selected.sourceCount ?? 1,
    sources: ordered.map((source) => ({ source: source.source, rank: source.overallRank ?? null, value: source.value ?? null, generatedAt: source.generatedAt ?? null })),
    safeAsPrimaryCurrentValue,
    contextOnly: isFallback || !safeAsPrimaryCurrentValue,
    unavailableReason: staleFallback ? "ADP is stale preseason context and is outside the current-value freshness window." : null,
  };
}

export function buildUnavailableCurrentValue(player: { playerId: string; name: string | null; position: string | null; nflTeam: string | null }, reason = "No current football value is available.") {
  return { ...resolveCurrentSeasonPlayerValue({ playerId: player.playerId, playerName: player.name ?? player.playerId, position: player.position ?? "UNKNOWN", nflTeam: player.nflTeam, sources: [], now: new Date().toISOString() }), unavailableReason: reason };
}
