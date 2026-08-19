import assert from "node:assert/strict";
import {
  BEST_VALUE_ELIGIBILITY_POLICY_VERSION,
  getBestValueEligibility,
} from "../lib/auction/recommendedNow";

const check = (input: Parameters<typeof getBestValueEligibility>[0]) =>
  getBestValueEligibility(input);

assert.equal(BEST_VALUE_ELIGIBILITY_POLICY_VERSION, "best-value-eligibility-v1");
assert.equal(check({ auctionConsensus: 2.33, auctionSourceCount: 3, adp: 416.4, adpSourceCount: 3, preferenceTag: "open" }).eligible, false);
assert.deepEqual(check({ auctionConsensus: 10, auctionSourceCount: 1, adp: null, adpSourceCount: 0, preferenceTag: "open" }).reasons, ["AUCTION_RELEVANCE"]);
assert.deepEqual(check({ auctionConsensus: 2, auctionSourceCount: 1, adp: 200, adpSourceCount: 1, preferenceTag: "open" }).reasons, ["ADP_RELEVANCE"]);
assert.deepEqual(check({ auctionConsensus: 2, auctionSourceCount: 4, adp: 301, adpSourceCount: 4, preferenceTag: "open" }).reasons, ["STRONG_SOURCE_COVERAGE"]);
assert.equal(check({ auctionConsensus: 2, auctionSourceCount: 4, adp: 301, adpSourceCount: 3, preferenceTag: "open" }).eligible, false);
assert.deepEqual(check({ auctionConsensus: 1, auctionSourceCount: 1, adp: 500, adpSourceCount: 1, preferenceTag: "target" }).reasons, ["PRIVATE_TARGET"]);
assert.deepEqual(check({ auctionConsensus: 1, auctionSourceCount: 1, adp: 500, adpSourceCount: 1, preferenceTag: "watch" }).reasons, ["PRIVATE_WATCH"]);
assert.equal(check({ auctionConsensus: 1, auctionSourceCount: 5, adp: null, adpSourceCount: 0, preferenceTag: "open" }).eligible, false);
assert.equal(check({ auctionConsensus: 10, auctionSourceCount: 1, adp: null, adpSourceCount: 0, preferenceTag: "open" }).eligible, true);
assert.equal(check({ auctionConsensus: 1, auctionSourceCount: 5, adp: 150, adpSourceCount: 5, preferenceTag: "open" }).eligible, true);

console.log("Best Value eligibility checks passed (fake candidates only; no production writes).");
