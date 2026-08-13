import type { SleeperPlayerIdentity } from "@/lib/sleeper";
import type { WeeklyProjection } from "@/lib/projections";

export type MatchupsProjectionSource =
  | "weekly-live"
  | "weekly-derived"
  | "season-fallback";

export type MatchupsProjectionRecord = WeeklyProjection & {
  playerId?: string | null;
};

export type StarterProjection = Readonly<{
  sleeperPlayerId: string;
  projectionPoints: number | null;
  source: MatchupsProjectionSource;
  coverageState: "available" | "unavailable" | "ambiguous";
  matchedBy: "player-id" | "name" | null;
}>;

export type StarterProjectionAggregation = Readonly<{
  projectedTotalPoints: number | null;
  knownSubtotalPoints: number;
  projectedStarterCount: number;
  totalStarterCount: number;
  missingStarterIds: readonly string[];
  ambiguousStarterIds: readonly string[];
  coverageComplete: boolean;
}>;

function normalizeName(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeField(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();
  return normalized || null;
}

function projectionName(projection: MatchupsProjectionRecord) {
  return projection.playerName?.trim() || null;
}

function candidateMatches(
  identity: SleeperPlayerIdentity,
  projections: readonly MatchupsProjectionRecord[]
) {
  const identityName = normalizeName(identity.displayName);
  if (!identityName) return [];

  const named = projections.filter(
    (projection) => normalizeName(projectionName(projection)) === identityName
  );
  if (named.length <= 1) return named;

  const position = normalizeField(identity.position);
  const team = normalizeField(identity.nflTeam);
  const narrowed = named.filter((projection) => {
    const positionMatches = !position || normalizeField(projection.position) === position;
    const teamMatches = !team || normalizeField(projection.team) === team;
    return positionMatches && teamMatches;
  });
  return narrowed.length > 0 ? narrowed : named;
}

export function resolveStarterProjection(
  identity: SleeperPlayerIdentity | undefined,
  projections: readonly MatchupsProjectionRecord[],
  source: MatchupsProjectionSource
): StarterProjection {
  const sleeperPlayerId = identity?.playerId ?? "";
  if (!identity || !sleeperPlayerId) {
    return { sleeperPlayerId, projectionPoints: null, source, coverageState: "unavailable", matchedBy: null };
  }

  const exact = projections.filter(
    (projection) => projection.playerId !== null && projection.playerId !== undefined && String(projection.playerId) === sleeperPlayerId
  );
  if (exact.length === 1) {
    const points = exact[0].points;
    return {
      sleeperPlayerId,
      projectionPoints: Number.isFinite(points) ? points : null,
      source,
      coverageState: Number.isFinite(points) ? "available" : "unavailable",
      matchedBy: "player-id",
    };
  }
  if (exact.length > 1) {
    return { sleeperPlayerId, projectionPoints: null, source, coverageState: "ambiguous", matchedBy: null };
  }

  const candidates = candidateMatches(identity, projections);
  if (candidates.length !== 1) {
    return {
      sleeperPlayerId,
      projectionPoints: null,
      source,
      coverageState: candidates.length > 1 ? "ambiguous" : "unavailable",
      matchedBy: null,
    };
  }

  const points = candidates[0].points;
  return {
    sleeperPlayerId,
    projectionPoints: Number.isFinite(points) ? points : null,
    source,
    coverageState: Number.isFinite(points) ? "available" : "unavailable",
    matchedBy: "name",
  };
}

export function resolveStarterProjections(
  starterIds: readonly string[],
  identities: Readonly<Record<string, SleeperPlayerIdentity>>,
  projections: readonly MatchupsProjectionRecord[],
  source: MatchupsProjectionSource
) {
  return starterIds.map((starterId) =>
    resolveStarterProjection(
      identities[starterId] ?? {
        playerId: starterId,
        displayName: null,
        position: null,
        nflTeam: null,
      },
      projections,
      source
    )
  );
}

export function aggregateStarterProjections(
  starterProjections: readonly StarterProjection[]
): StarterProjectionAggregation {
  const available = starterProjections.filter((projection) => projection.coverageState === "available");
  const missingStarterIds = starterProjections
    .filter((projection) => projection.coverageState === "unavailable")
    .map((projection) => projection.sleeperPlayerId);
  const ambiguousStarterIds = starterProjections
    .filter((projection) => projection.coverageState === "ambiguous")
    .map((projection) => projection.sleeperPlayerId);
  const knownSubtotalPoints = available.reduce(
    (total, projection) => total + (projection.projectionPoints ?? 0),
    0
  );
  const coverageComplete = starterProjections.length > 0 && available.length === starterProjections.length;

  return {
    projectedTotalPoints: coverageComplete ? knownSubtotalPoints : null,
    knownSubtotalPoints,
    projectedStarterCount: available.length,
    totalStarterCount: starterProjections.length,
    missingStarterIds,
    ambiguousStarterIds,
    coverageComplete,
  };
}
