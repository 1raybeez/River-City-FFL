import assert from "node:assert/strict";
import {
  resolveKeeperCostForPlayer,
  resolveNextSeasonKeeperCost,
} from "../lib/history/keeperCostResolver";

const result = (events: Parameters<typeof resolveNextSeasonKeeperCost>[0]["acquisitionEvents"]) =>
  resolveNextSeasonKeeperCost({ playerId: "player", acquisitionEvents: events });

assert.equal(result([{ type: "draft", amount: 6 }]).nextSeasonCost, 16);
assert.equal(result([{ type: "waiver", amount: 0 }]).nextSeasonCost, 10);
assert.equal(result([{ type: "waiver", amount: 1 }]).nextSeasonCost, 11);
assert.equal(result([{ type: "waiver", amount: 17 }]).nextSeasonCost, 27);
assert.equal(result([{ type: "draft", amount: 6 }, { type: "waiver", amount: 17 }]).nextSeasonCost, 27);
assert.equal(result([{ type: "draft", amount: 20 }, { type: "waiver", amount: 5 }]).nextSeasonCost, 30);
assert.equal(result([
  { type: "waiver", amount: 3 },
  { type: "waiver", amount: 0 },
  { type: "free_agent", amount: 9 },
]).highestAcquisitionPrice, 9);

const tradedHistory = resolveKeeperCostForPlayer("player", [
  { type: "draft", amount: 20, created: 1 },
  { type: "trade", created: 2 },
  { type: "waiver", amount: 5, created: 3 },
]);
assert.equal(tradedHistory.highestAcquisitionPrice, 20);
assert.equal(tradedHistory.nextSeasonCost, 30);
assert.equal(tradedHistory.acquisitionEvents.length, 2);
assert.equal(result([]).status, "UNKNOWN");
assert.equal(result([{ type: "draft", amount: -1 } as never]).status, "UNKNOWN");
assert.equal(result([{ type: "draft", amount: Number.NaN } as never]).status, "UNKNOWN");

const tradeOnly = resolveKeeperCostForPlayer("trade-only", [{ type: "trade", created: 1 }]);
assert.equal(tradeOnly.status, "UNKNOWN");
assert.equal(tradeOnly.nextSeasonCost, null);

console.log("Keeper policy tests passed.");
