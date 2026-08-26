import assert from "node:assert/strict";
import {
  PLAYER_CONTEXT_MVP_EVENT_TYPES,
  PLAYER_CONTEXT_RESERVED_EVENT_TYPES,
  buildPlayerContextEventKey,
  type PlayerContextEvent,
  type PlayerContextRecommendationEnrichment,
} from "../lib/auction/playerContextTypes";

assert.deepEqual(PLAYER_CONTEXT_MVP_EVENT_TYPES, [
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
]);
assert.deepEqual(PLAYER_CONTEXT_RESERVED_EVENT_TYPES, [
  "COACH_COMMENT",
  "OTHER",
]);

const identityInput = {
  season: 2026 as const,
  source: "Example Feed",
  sourceReference: "event-123",
  sleeperPlayerId: "9221",
  eventType: "INJURY" as const,
  publishedAt: "2026-08-26T12:00:00.000Z",
  effectiveAt: null,
};

assert.equal(
  buildPlayerContextEventKey(identityInput),
  buildPlayerContextEventKey({ ...identityInput, source: "  example feed " })
);
assert.notEqual(
  buildPlayerContextEventKey(identityInput),
  buildPlayerContextEventKey({ ...identityInput, sourceReference: "event-124" })
);

const event: PlayerContextEvent = {
  id: buildPlayerContextEventKey(identityInput),
  season: 2026,
  sleeperPlayerId: "9221",
  eventType: "INJURY",
  sourceFacts: {
    headline: "Player limited in practice",
    source: "Example Feed",
    sourceReference: "event-123",
    sourceUrl: null,
    publishedAt: "2026-08-26T12:00:00.000Z",
    observedAt: "2026-08-26T12:05:00.000Z",
    effectiveAt: null,
    team: "DET",
    reportedStatus: "limited",
  },
  normalizedFacts: {
    canonicalStatus: "LIMITED",
    relevanceUntil: null,
    expiresAt: null,
  },
  interpretation: {
    severity: "LOW",
    confidence: "MEDIUM",
    fantasyImpactDirection: "UNCERTAIN",
    fantasyImpactMagnitude: "LOW",
  },
  audit: {
    rawSourceReference: "source-record-123",
    createdAt: "2026-08-26T12:05:00.000Z",
    updatedAt: "2026-08-26T12:05:00.000Z",
  },
};

assert.equal(event.sleeperPlayerId, "9221");
assert.equal(event.sourceFacts.reportedStatus, "limited");
assert.equal(event.normalizedFacts.canonicalStatus, "LIMITED");
assert.equal(event.interpretation.fantasyImpactDirection, "UNCERTAIN");

const currentContext = {
  sleeperPlayerId: event.sleeperPlayerId,
  season: event.season,
  activeEventIds: [event.id],
  currentStatus: event.normalizedFacts.canonicalStatus,
  riskFlags: ["practice-monitoring"],
  opportunityFlags: [],
  mostRecentEventAt: event.sourceFacts.observedAt,
  freshness: {
    asOf: event.sourceFacts.observedAt,
    mostRecentEventAt: event.sourceFacts.observedAt,
    relevanceState: "CURRENT" as const,
  },
  supportingEventIds: [event.id],
};
assert.deepEqual(currentContext.activeEventIds, [event.id]);
assert.deepEqual(currentContext, {
  ...currentContext,
  activeEventIds: [event.id],
});

const enrichment: PlayerContextRecommendationEnrichment = {
  warningLabels: ["Practice status needs monitoring"],
  opportunityLabels: [],
  confidence: "MEDIUM",
  explanationFacts: ["Source reported limited practice participation."],
  supportingEventIds: [event.id],
  asOf: "2026-08-26T12:05:00.000Z",
};
const forbiddenMarketFields = [
  "auctionConsensus",
  "adp",
  "auctionValueMultiplier",
  "adpMultiplier",
  "marketConsensusOverride",
  "bidPriceOverride",
];
assert.deepEqual(
  forbiddenMarketFields.filter((field) => field in enrichment),
  []
);

console.log("Player context contract checks passed.");
