import type { AuctionPlayerId, AuctionSeasonYear, AuctionTimestamp } from "./types";

export const PLAYER_CONTEXT_MVP_EVENT_TYPES = [
  "INJURY",
  "PRACTICE_STATUS",
  "IR_PUP_NFI",
  "SUSPENSION",
  "RETIREMENT",
  "TRADE",
  "RELEASE",
  "SIGNING",
  "DEPTH_CHART",
  "ROLE_CHANGE",
] as const;

export const PLAYER_CONTEXT_RESERVED_EVENT_TYPES = [
  "COACH_COMMENT",
  "OTHER",
] as const;

export type PlayerContextMvpEventType =
  (typeof PLAYER_CONTEXT_MVP_EVENT_TYPES)[number];
export type PlayerContextReservedEventType =
  (typeof PLAYER_CONTEXT_RESERVED_EVENT_TYPES)[number];
export type PlayerContextEventType =
  | PlayerContextMvpEventType
  | PlayerContextReservedEventType;

export type PlayerContextCanonicalStatus =
  | "HEALTHY_AVAILABLE"
  | "LIMITED"
  | "QUESTIONABLE"
  | "DOUBTFUL"
  | "OUT"
  | "INJURED_RESERVE"
  | "PUP_NFI"
  | "INACTIVE_UNAVAILABLE"
  | "UNKNOWN";

export type PlayerContextSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type PlayerContextConfidence = "LOW" | "MEDIUM" | "HIGH";
export type PlayerContextImpactDirection =
  | "POSITIVE"
  | "NEGATIVE"
  | "NEUTRAL"
  | "UNCERTAIN";
export type PlayerContextImpactMagnitude = "NONE" | "LOW" | "MEDIUM" | "HIGH";

/** Information reported by an external source, preserved without interpretation. */
export type PlayerContextSourceFacts = {
  headline: string;
  source: string;
  sourceReference: string | null;
  sourceUrl: string | null;
  publishedAt: AuctionTimestamp;
  observedAt: AuctionTimestamp;
  effectiveAt: AuctionTimestamp | null;
  team: string | null;
  reportedStatus: string | null;
};

/** Provider-neutral facts normalized for River City use. */
export type PlayerContextNormalizedFacts = {
  canonicalStatus: PlayerContextCanonicalStatus | null;
  relevanceUntil: AuctionTimestamp | null;
  expiresAt: AuctionTimestamp | null;
};

/** Model-derived interpretation; never a replacement for source facts. */
export type PlayerContextInterpretation = {
  severity: PlayerContextSeverity | null;
  confidence: PlayerContextConfidence | null;
  fantasyImpactDirection: PlayerContextImpactDirection | null;
  fantasyImpactMagnitude: PlayerContextImpactMagnitude | null;
};

export type PlayerContextAudit = {
  rawSourceReference: string | null;
  createdAt: AuctionTimestamp;
  updatedAt: AuctionTimestamp;
};

export type PlayerContextEvent = {
  id: string;
  season: AuctionSeasonYear;
  sleeperPlayerId: AuctionPlayerId;
  eventType: PlayerContextEventType;
  sourceFacts: PlayerContextSourceFacts;
  normalizedFacts: PlayerContextNormalizedFacts;
  interpretation: PlayerContextInterpretation;
  audit: PlayerContextAudit;
};

export type PlayerContextEventIdentityInput = Pick<
  PlayerContextEvent,
  "season" | "sleeperPlayerId" | "eventType"
> & {
  source: string;
  sourceReference?: string | null;
  publishedAt: AuctionTimestamp;
  effectiveAt?: AuctionTimestamp | null;
  normalizedSourceFingerprint?: string | null;
};

function normalizeIdentityPart(value: string | number | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Builds a deterministic identity from stable provenance and player facts.
 * Headline text is intentionally not used as an event identifier.
 */
export function buildPlayerContextEventKey(input: PlayerContextEventIdentityInput) {
  return [
    "player-context",
    normalizeIdentityPart(input.season),
    normalizeIdentityPart(input.source),
    normalizeIdentityPart(input.sourceReference || input.normalizedSourceFingerprint),
    normalizeIdentityPart(input.sleeperPlayerId),
    normalizeIdentityPart(input.eventType),
    normalizeIdentityPart(input.publishedAt),
    normalizeIdentityPart(input.effectiveAt),
  ].join(":");
}

export type PlayerContextFreshness = {
  asOf: AuctionTimestamp;
  mostRecentEventAt: AuctionTimestamp | null;
  relevanceState: "CURRENT" | "STALE" | "UNKNOWN";
};

/** Lightweight current state; event bodies remain in immutable event records. */
export type PlayerCurrentContext = {
  sleeperPlayerId: AuctionPlayerId;
  season: AuctionSeasonYear;
  activeEventIds: readonly string[];
  currentStatus: PlayerContextCanonicalStatus | null;
  riskFlags: readonly string[];
  opportunityFlags: readonly string[];
  mostRecentEventAt: AuctionTimestamp | null;
  freshness: PlayerContextFreshness;
  supportingEventIds: readonly string[];
};

export type PlayerContextRecommendationEnrichment = {
  warningLabels: readonly string[];
  opportunityLabels: readonly string[];
  confidence: PlayerContextConfidence | null;
  explanationFacts: readonly string[];
  supportingEventIds: readonly string[];
  asOf: AuctionTimestamp;
};

export type PlayerContextRelevancePolicy = {
  practiceStatus: "EXPIRES_QUICKLY";
  injury: "UNTIL_SUPERSEDED";
  transaction: "HISTORICAL_IMMUTABLE";
  depthChart: "UNTIL_REPLACED";
  roleChange: "UNTIL_REPLACED";
};
