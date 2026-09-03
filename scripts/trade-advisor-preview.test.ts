import { readFileSync } from "node:fs";

const route = readFileSync("app/api/trade-comparison/multi-team/route.ts", "utf8");
const client = readFileSync("components/TradeComparison.tsx", "utf8");
const adapter = readFileSync("lib/tradeComparison/serverRecommendationAdapter.ts", "utf8");

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(route.includes("member.canAccessMaintenance"), "Trade Advisor must use authoritative commissioner capability.");
assert(route.includes("buildServerTradeRecommendation(input, context)"), "Trade Advisor must use the server adapter.");
assert(route.includes("...(member.canAccessMaintenance ? { tradeAdvisor } : {})"), "Non-commissioners must not receive advisor data.");
assert(adapter.includes('if (request.mode !== "LEAGUE_TRADE")'), "Sandbox recommendation execution must remain disabled.");
assert(adapter.includes("request.participants.length !== 2"), "Multi-team recommendation must remain unavailable.");
assert(client.includes('aria-labelledby="trade-advisor-title"'), "Commissioner preview must render a Trade Verdict section.");
assert(client.includes('FantasyCalc Redraft Market'), "Current value must identify FantasyCalc Redraft Market.");
assert(client.includes('Current ROS ranking unavailable'), "Missing ROS must be explicit.");
assert(client.includes('FantasyCalc Redraft Market: {row.fantasyCalc ?'), "Missing FantasyCalc must be explicit.");
assert(client.includes('result.confidence === "LOW"'), "Low-confidence cards must not fall back to a no-concern message.");
assert(adapter.includes("Current trade-market value is unavailable for"), "Missing FantasyCalc evidence must use owner language.");
assert(client.includes("Your optimized starting lineup improves."), "Technical lineup language must be translated.");
assert(client.includes("playerDisplayName"), "Owner-facing lineup changes must resolve player names.");
assert(client.includes("Very large historical imbalance"), "Fairness bands must be translated.");
assert(client.includes("High confidence"), "Keeper confidence must be translated.");
assert(client.includes("tradeAdvisor?.status === \"READY\""), "Raw roster counts must be hidden when the preview is active.");
assert(client.includes('key={`${change.slot}:${change.before ?? "empty"}:${change.after ?? "empty"}:${index}`}'), "Starter change keys must be unique.");
assert(route.includes("member.canAccessMaintenance ?"), "Preview access must be server-gated.");
assert(client.includes("slotOnlyMoves"), "Slot-only movement must remain secondary context.");
assert(client.includes('aria-labelledby="fairness-title"'), "Fairness must remain a supporting section.");
console.log("trade-advisor-preview.test.ts passed");
