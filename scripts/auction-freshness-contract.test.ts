import { strict as assert } from "node:assert";
import {
  buildAuctionFreshness,
  isAuctionWarRoomEventActive,
  isEventChangedSinceValueSnapshot,
  resolveAuctionEventAvailabilityImpact,
} from "../lib/auction/freshness";
import type { AuctionWarRoomEvent } from "../lib/auction/freshnessTypes";

const valueGeneratedAt = "2026-08-16T04:25:21.836Z";
const adpGeneratedAt = "2026-08-16T04:25:24.511Z";

function event(
  overrides: Partial<AuctionWarRoomEvent> = {}
): AuctionWarRoomEvent {
  return {
    id: "event-1",
    season: 2026,
    sleeperPlayerId: "123",
    eventType: "WATCH",
    headline: "Monitor role",
    summary: "Monitor the situation.",
    sourceLabel: "Commissioner",
    sourceUrl: null,
    observedAt: "2026-08-17T00:00:00.000Z",
    effectiveAt: null,
    expiresAt: null,
    confidence: "MEDIUM",
    availabilityImpact: "NONE",
    relatedPlayerIds: [],
    team: "BUF",
    active: true,
    ...overrides,
  };
}

const freshness = buildAuctionFreshness({
  valueSnapshot: { generatedAt: valueGeneratedAt, activeRunId: "run-values-1" },
  adpSnapshot: { generatedAt: adpGeneratedAt, activeRunId: "run-adp-1" },
});

assert.deepEqual(freshness, {
  valueGeneratedAt,
  adpGeneratedAt,
  sourceRunId: "run-values-1",
  refreshedAt: adpGeneratedAt,
});
assert.equal(
  buildAuctionFreshness({
    valueSnapshot: { generatedAt: null },
    adpSnapshot: { generatedAt: adpGeneratedAt },
  }),
  null
);

assert.equal(
  resolveAuctionEventAvailabilityImpact(
    event({ eventType: "RETIREMENT", availabilityImpact: "NONE" })
  ),
  "UNAVAILABLE"
);
assert.equal(
  resolveAuctionEventAvailabilityImpact(
    event({ eventType: "SEASON_ENDING_INJURY", availabilityImpact: "WARNING" })
  ),
  "UNAVAILABLE"
);
assert.equal(
  resolveAuctionEventAvailabilityImpact(
    event({ eventType: "INJURY_RISK", availabilityImpact: "WARNING" })
  ),
  "WARNING"
);
assert.equal(
  resolveAuctionEventAvailabilityImpact(
    event({ eventType: "OUT", availabilityImpact: "UNAVAILABLE" })
  ),
  "UNAVAILABLE"
);
assert.equal(
  resolveAuctionEventAvailabilityImpact(
    event({ eventType: "PUP_IR", availabilityImpact: "NONE" })
  ),
  "NONE"
);
assert.equal(
  resolveAuctionEventAvailabilityImpact(
    event({ eventType: "SUSPENSION", availabilityImpact: "WARNING" })
  ),
  "WARNING"
);
assert.equal(
  resolveAuctionEventAvailabilityImpact(
    event({ eventType: "ROLE_UP", availabilityImpact: "NONE" })
  ),
  "NONE"
);
assert.equal(
  resolveAuctionEventAvailabilityImpact(
    event({ eventType: "OPPORTUNITY_UP", availabilityImpact: "NONE" })
  ),
  "NONE"
);

assert.equal(
  isAuctionWarRoomEventActive(event(), "2026-08-18T00:00:00.000Z"),
  true
);
assert.equal(
  isAuctionWarRoomEventActive(
    event({ expiresAt: "2026-08-17T00:00:00.000Z" }),
    "2026-08-18T00:00:00.000Z"
  ),
  false
);
assert.equal(
  isAuctionWarRoomEventActive(event({ active: false }), "2026-08-18T00:00:00.000Z"),
  false
);
assert.equal(
  isAuctionWarRoomEventActive(event({ expiresAt: "not-a-date" }), "2026-08-18T00:00:00.000Z"),
  false
);

assert.equal(
  isEventChangedSinceValueSnapshot(event(), { valueGeneratedAt }),
  true
);
assert.equal(
  isEventChangedSinceValueSnapshot(
    event({ observedAt: "2026-08-15T00:00:00.000Z" }),
    { valueGeneratedAt }
  ),
  false
);
assert.equal(
  isEventChangedSinceValueSnapshot(
    event({ observedAt: "not-a-date" }),
    { valueGeneratedAt }
  ),
  false
);
assert.equal(
  isEventChangedSinceValueSnapshot(event(), { valueGeneratedAt: "not-a-date" }),
  false
);

const injuryWithBeneficiary = event({
  eventType: "SEASON_ENDING_INJURY",
  relatedPlayerIds: ["456"],
});
assert.deepEqual(injuryWithBeneficiary.relatedPlayerIds, ["456"]);
assert.equal(injuryWithBeneficiary.sleeperPlayerId, "123");
assert.equal(event({ relatedPlayerIds: [] }).relatedPlayerIds.length, 0);
assert.equal(event().sourceLabel.length > 0, true);
assert.equal(event().observedAt.length > 0, true);

console.log("Auction freshness contract tests passed.");
