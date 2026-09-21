import assert from "node:assert/strict";
import { getCommissionerHubModel } from "../lib/commissionerHub";
import type { AttentionItem, LeagueIntelligenceProduct, OperationalBlocker, WeeklyOperations } from "../lib/commissionerHub";

const weekly: WeeklyOperations = {
  season: 2026, week: 2, lifecycle: "WEEK_LIVE", freshness: "now", matchupState: "LIVE", latestSafelyCompletedWeek: 1,
  finalizationState: "WAITING", awardState: "SETTLED", standingsState: "CURRENT", rankingsState: "CURRENT", predictorState: "CALIBRATING", automationHealth: "HEALTHY", blockers: [],
};
const item = (id: string, sourceCapability: AttentionItem["sourceCapability"] = "FINANCE"): AttentionItem => ({ id, sourceCapability, severity: "WARNING", title: "Review", description: "Review required", actionType: "REVIEW", ctaLabel: "Review", destination: "/commish/finance" });
const blocker: OperationalBlocker = { code: "MATCHUPS_LIVE", title: "Week is live", description: "Scores remain provisional.", severity: "INFO", state: "ACTIVE", affects: ["SEASON_OPERATIONS"], requiresHumanAction: false };
const product: LeagueIntelligenceProduct = { id: "PREDICTOR", label: "Predictor", availability: "ACTIVE", workflowState: "CALIBRATING", publicationState: "NOT_PUBLISHED", route: "/predictor", commissionerRoute: "/commish/intelligence", statusText: "No production probabilities" };

(async () => {
  const healthy = await getCommissionerHubModel({ sources: { weeklyOperations: async () => weekly, intelligenceProducts: [product] } });
  assert.equal(healthy.attentionItems.length, 0);
  assert.equal(healthy.weeklyOperations.lifecycle, "WEEK_LIVE");
  assert.equal(healthy.capabilities.filter((capability) => capability.availability === "ACTIVE").length, 6);
  assert.deepEqual(healthy.leagueSpecificCapabilities, []);
  assert.deepEqual(healthy.capabilities.map((capability) => capability.id), ["FINANCE", "LEGISLATIVE_HUB", "SEASON_OPERATIONS", "WAR_ROOM", "LEAGUE_INTELLIGENCE", "OWNER_FEEDBACK", "SYSTEM_HEALTH"]);
  assert.equal(healthy.leagueIntelligenceProducts[0].workflowState, "CALIBRATING");

  const finance = await getCommissionerHubModel({ sources: { weeklyOperations: async () => weekly, attention: [{ sourceCapability: "FINANCE", items: [item("award-1")] }] } });
  assert.equal(finance.attentionItems.length, 1);
  assert.equal(finance.capabilities.find((capability) => capability.id === "FINANCE")?.attentionCount, 1);

  const operationalOnly = await getCommissionerHubModel({ sources: { weeklyOperations: async () => weekly, blockers: [blocker] } });
  assert.equal(operationalOnly.attentionItems.length, 0);
  assert.equal(operationalOnly.weeklyOperations.blockers[0].requiresHumanAction, false);

  const humanBlocker = { ...blocker, code: "FINALIZATION_CONFLICT", requiresHumanAction: true, severity: "ERROR" as const };
  const humanAction = await getCommissionerHubModel({ sources: { weeklyOperations: async () => weekly, blockers: [humanBlocker], attention: [{ sourceCapability: "SEASON_OPERATIONS", items: [item("finalization-1", "SEASON_OPERATIONS")] }] } });
  assert.equal(humanAction.weeklyOperations.blockers[0].requiresHumanAction, true);
  assert.equal(humanAction.attentionItems[0].sourceCapability, "SEASON_OPERATIONS");

  const ownerHidden = await getCommissionerHubModel({ viewer: { canViewWarRoom: false, warRoomScope: "NONE" }, sources: { weeklyOperations: async () => weekly } });
  assert.equal(ownerHidden.permissions.canViewWarRoom, false);
  assert.equal(ownerHidden.permissions.warRoomScope, "NONE");
  const ownerScoped = await getCommissionerHubModel({ viewer: { canViewWarRoom: true, warRoomScope: "OWNER" }, sources: { weeklyOperations: async () => weekly } });
  assert.equal(ownerScoped.permissions.warRoomScope, "OWNER");

  const unhealthy = await getCommissionerHubModel({ sources: { weeklyOperations: async () => weekly, systemHealth: { overallHealth: "ERROR", issueCount: 2, destination: "/commish/health" } } });
  assert.equal(unhealthy.systemHealthSummary.issueCount, 2);
  assert.equal(unhealthy.systemHealthSummary.destination, "/commish/health");
  console.log("commissioner hub contract and adapter tests passed");
})().catch((error) => { console.error(error); process.exitCode = 1; });
