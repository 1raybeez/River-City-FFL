import { readPublishedAdpConsensusFromFirestore } from "./adpRefreshService";
import { readPublishedMasterviewFromFirestore } from "./valueRefreshService";
import type {
  AuctionEventAvailabilityImpact,
  AuctionFreshness,
  AuctionWarRoomEvent,
  AuctionWarRoomEventType,
} from "./freshnessTypes";

const DETERMINISTIC_UNAVAILABLE_EVENTS = new Set<AuctionWarRoomEventType>([
  "RETIREMENT",
  "SEASON_ENDING_INJURY",
]);

function parseTimestamp(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
}

function latestTimestamp(...values: string[]) {
  return values.reduce((latest, value) =>
    value > latest ? value : latest
  );
}

export type AuctionSnapshotMetadata = {
  generatedAt: string | null | undefined;
  activeRunId?: string | null;
};

export function buildAuctionFreshness({
  valueSnapshot,
  adpSnapshot,
}: {
  valueSnapshot: AuctionSnapshotMetadata;
  adpSnapshot: AuctionSnapshotMetadata;
}): AuctionFreshness | null {
  if (
    !parseTimestamp(valueSnapshot.generatedAt) ||
    !parseTimestamp(adpSnapshot.generatedAt)
  ) {
    return null;
  }

  const valueGeneratedAt = valueSnapshot.generatedAt as string;
  const adpGeneratedAt = adpSnapshot.generatedAt as string;

  return {
    valueGeneratedAt,
    adpGeneratedAt,
    sourceRunId: valueSnapshot.activeRunId ?? null,
    refreshedAt: latestTimestamp(valueGeneratedAt, adpGeneratedAt),
  };
}

export async function readPublishedAuctionFreshness(
  season = 2026
): Promise<AuctionFreshness | null> {
  const [valueSnapshot, adpSnapshot] = await Promise.all([
    readPublishedMasterviewFromFirestore(season),
    readPublishedAdpConsensusFromFirestore(season),
  ]);

  return buildAuctionFreshness({
    valueSnapshot: valueSnapshot
      ? { generatedAt: valueSnapshot.generatedAt, activeRunId: valueSnapshot.activeRunId }
      : { generatedAt: null },
    adpSnapshot: adpSnapshot
      ? { generatedAt: adpSnapshot.generatedAt, activeRunId: adpSnapshot.activeRunId }
      : { generatedAt: null },
  });
}

export function resolveAuctionEventAvailabilityImpact(
  event: Pick<AuctionWarRoomEvent, "eventType" | "availabilityImpact">
): AuctionEventAvailabilityImpact {
  if (DETERMINISTIC_UNAVAILABLE_EVENTS.has(event.eventType)) {
    return "UNAVAILABLE";
  }

  return event.availabilityImpact;
}

export function isAuctionWarRoomEventActive(
  event: Pick<AuctionWarRoomEvent, "active" | "expiresAt">,
  now = new Date().toISOString()
) {
  if (!event.active) return false;
  if (event.expiresAt === null) return parseTimestamp(now) !== null;

  const currentTimestamp = parseTimestamp(now);
  const expirationTimestamp = parseTimestamp(event.expiresAt);
  return (
    currentTimestamp !== null &&
    expirationTimestamp !== null &&
    currentTimestamp < expirationTimestamp
  );
}

export function isEventChangedSinceValueSnapshot(
  event: Pick<AuctionWarRoomEvent, "observedAt">,
  freshness: Pick<AuctionFreshness, "valueGeneratedAt">
) {
  const observedAt = parseTimestamp(event.observedAt);
  const valueGeneratedAt = parseTimestamp(freshness.valueGeneratedAt);

  return (
    observedAt !== null &&
    valueGeneratedAt !== null &&
    observedAt > valueGeneratedAt
  );
}
