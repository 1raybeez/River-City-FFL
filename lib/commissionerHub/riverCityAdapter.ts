import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { LEAGUE_ID } from "@/lib/sleeper";
import type { WeeklyOperationsSnapshot } from "@/lib/weeklyOperations";
import type {
  AttentionItem,
  CapabilityAction,
  CapabilityAvailability,
  CapabilityHealth,
  CapabilitySeason,
  CommissionerCapability,
  CommissionerHubId,
  CommissionerHubModel,
  CommissionerHubPermissions,
  LeagueIntelligenceProduct,
  OperationalBlocker,
  SystemHealthSummary,
  WeeklyOperations,
} from "./types";

export interface CommissionerHubViewer {
  readonly canViewHub?: boolean;
  readonly canViewFinance?: boolean;
  readonly canViewLegislativeHub?: boolean;
  readonly canViewSeasonOperations?: boolean;
  readonly canViewWarRoom?: boolean;
  readonly warRoomScope?: "COMMISSIONER" | "OWNER" | "NONE";
  readonly canViewLeagueIntelligence?: boolean;
  readonly canViewOwnerFeedback?: boolean;
  readonly canViewSystemHealth?: boolean;
}

export interface CommissionerHubSourceAttention {
  readonly sourceCapability: CommissionerHubId;
  readonly items: readonly AttentionItem[];
}

export interface CommissionerHubSources {
  readonly weeklyOperations?: () => Promise<WeeklyOperationsSnapshot | WeeklyOperations>;
  readonly attention?: readonly CommissionerHubSourceAttention[];
  readonly blockers?: readonly OperationalBlocker[];
  readonly intelligenceProducts?: readonly LeagueIntelligenceProduct[];
  readonly systemHealth?: Partial<SystemHealthSummary>;
  readonly providerRuntime?: string | null;
  readonly sourceFreshness?: string | null;
  readonly authIdentityDiagnostics?: string | null;
}

export interface GetCommissionerHubModelOptions {
  readonly viewer?: CommissionerHubViewer;
  readonly sources?: CommissionerHubSources;
  readonly now?: Date;
}

const primaryCapabilities: ReadonlyArray<{
  id: Exclude<CommissionerHubId, "SYSTEM_HEALTH">;
  label: string;
  description: string;
  route: string;
  seasonalRelevance: CapabilitySeason;
  permissionKey: keyof CommissionerHubPermissions;
}> = [
  { id: "FINANCE", label: "Finance", description: "Read-only financial review and reconciliation state.", route: "/commish/finance", seasonalRelevance: "IN_SEASON", permissionKey: "canViewFinance" },
  { id: "LEGISLATIVE_HUB", label: "Legislative Hub", description: "Proposals, voting, and constitution state.", route: "/commish/legislation", seasonalRelevance: "IN_SEASON", permissionKey: "canViewLegislativeHub" },
  { id: "SEASON_OPERATIONS", label: "Season Operations", description: "Weekly lifecycle, finalization, settlement, and automation state.", route: "/commish/operations", seasonalRelevance: "IN_SEASON", permissionKey: "canViewSeasonOperations" },
  { id: "WAR_ROOM", label: "War Room", description: "Auction tools with existing commissioner or owner-scoped authorization.", route: "/commish/auction", seasonalRelevance: "DRAFT", permissionKey: "canViewWarRoom" },
  { id: "LEAGUE_INTELLIGENCE", label: "League Intelligence", description: "Independent draft, rankings, predictor, and recap products.", route: "/commish/intelligence", seasonalRelevance: "IN_SEASON", permissionKey: "canViewLeagueIntelligence" },
  { id: "OWNER_FEEDBACK", label: "Owner Feedback", description: "Actionable owner feedback queue state.", route: "/commish/feedback", seasonalRelevance: "IN_SEASON", permissionKey: "canViewOwnerFeedback" },
];

function permissions(viewer: CommissionerHubViewer): CommissionerHubPermissions {
  const canViewHub = viewer.canViewHub ?? true;
  return {
    canViewHub,
    canViewFinance: canViewHub && (viewer.canViewFinance ?? true),
    canViewLegislativeHub: canViewHub && (viewer.canViewLegislativeHub ?? true),
    canViewSeasonOperations: canViewHub && (viewer.canViewSeasonOperations ?? true),
    canViewWarRoom: canViewHub && (viewer.canViewWarRoom ?? false),
    warRoomScope: canViewHub ? viewer.warRoomScope ?? "NONE" : "NONE",
    canViewLeagueIntelligence: canViewHub && (viewer.canViewLeagueIntelligence ?? true),
    canViewOwnerFeedback: canViewHub && (viewer.canViewOwnerFeedback ?? true),
    canViewSystemHealth: canViewHub && (viewer.canViewSystemHealth ?? true),
  };
}

function normalizeWeeklyOperations(value: WeeklyOperationsSnapshot | WeeklyOperations, blockers: readonly OperationalBlocker[]): WeeklyOperations {
  if ("matchups" in value) {
    return {
      season: value.season,
      week: value.currentWeek,
      lifecycle: value.health.lifecycle,
      freshness: value.generatedAtEastern,
      matchupState: value.matchups.status,
      latestSafelyCompletedWeek: value.lastScoredLeg,
      finalizationState: value.matchups.status,
      awardState: value.settlement.status,
      standingsState: value.leagueStatus,
      rankingsState: null,
      predictorState: value.predictor.status,
      automationHealth: value.health.scheduler,
      blockers,
      sourceSnapshot: value,
    };
  }
  return { ...value, blockers: [...value.blockers, ...blockers] };
}

function makeCapability(
  definition: (typeof primaryCapabilities)[number],
  permission: boolean,
  attentionCount: number,
  statusText: string | null,
  healthOverride?: CapabilityHealth,
): CommissionerCapability {
  const availability: CapabilityAvailability = permission ? "ACTIVE" : "UNAVAILABLE";
  const health = !permission ? "UNKNOWN" : healthOverride ?? (attentionCount > 0 ? "NEEDS_ATTENTION" : "UNKNOWN");
  const humanAction: CapabilityAction = attentionCount > 0 ? "REVIEW" : "NONE";
  return { ...definition, availability, health, humanAction, attentionCount, statusText, visibility: permission ? "VISIBLE" : "HIDDEN" };
}

/** Read-only aggregation boundary. It invokes no mutation, write, settlement, or publication path. */
export async function getCommissionerHubModel(options: GetCommissionerHubModelOptions = {}): Promise<CommissionerHubModel> {
  const viewer = options.viewer ?? {};
  const source = options.sources ?? {};
  const hubPermissions = permissions(viewer);
  const rawAttentionItems = (source.attention ?? []).flatMap((entry) => entry.items);
  const permissionForCapability: Partial<Record<CommissionerHubId, boolean>> = {
    FINANCE: hubPermissions.canViewFinance,
    LEGISLATIVE_HUB: hubPermissions.canViewLegislativeHub,
    SEASON_OPERATIONS: hubPermissions.canViewSeasonOperations,
    WAR_ROOM: hubPermissions.canViewWarRoom,
    LEAGUE_INTELLIGENCE: hubPermissions.canViewLeagueIntelligence,
    OWNER_FEEDBACK: hubPermissions.canViewOwnerFeedback,
    SYSTEM_HEALTH: hubPermissions.canViewSystemHealth,
  };
  const attentionItems = rawAttentionItems.filter((item) => permissionForCapability[item.sourceCapability] !== false);
  const blockers = [...(source.blockers ?? [])];
  const weeklySource = source.weeklyOperations
    ? await source.weeklyOperations()
    : await (async () => {
        const { buildWeeklyOperationsSnapshot } = await import("@/lib/weeklyOperations");
        return buildWeeklyOperationsSnapshot(options.now);
      })();
  const weeklyOperations = normalizeWeeklyOperations(weeklySource, blockers);
  const products = source.intelligenceProducts ?? [];
  const capabilities = primaryCapabilities.map((definition) => {
    const count = attentionItems.filter((item) => item.sourceCapability === definition.id).length;
    const status = definition.id === "SEASON_OPERATIONS" ? weeklyOperations.lifecycle : null;
    const health: CapabilityHealth | undefined = definition.id === "SEASON_OPERATIONS" && weeklyOperations.blockers.some((blocker) => blocker.state === "ACTIVE" && blocker.requiresHumanAction) ? "NEEDS_ATTENTION" : undefined;
    return makeCapability(definition, hubPermissions[definition.permissionKey] === true, count, status, health);
  });
  const snapshotHealth = weeklyOperations.sourceSnapshot && typeof weeklyOperations.sourceSnapshot === "object" && "health" in weeklyOperations.sourceSnapshot
    ? (weeklyOperations.sourceSnapshot as { health?: { schedulerStatus?: CapabilityHealth; lastSuccessfulRunAt?: string | null; lastFailedRunAt?: string | null; failureReason?: string | null; affectedSystems?: readonly string[] } }).health
    : undefined;
  const schedulerFailed = snapshotHealth?.schedulerStatus === "ERROR";
  const systemHealthSummary: SystemHealthSummary = {
    overallHealth: source.systemHealth?.overallHealth ?? (schedulerFailed || weeklyOperations.blockers.some((blocker) => blocker.state === "ACTIVE") ? "WARNING" : "HEALTHY"),
    sourceFreshness: source.systemHealth?.sourceFreshness ?? source.sourceFreshness ?? weeklyOperations.freshness,
    automationScheduler: source.systemHealth?.automationScheduler ?? weeklyOperations.automationHealth,
    schedulerStatus: source.systemHealth?.schedulerStatus ?? snapshotHealth?.schedulerStatus ?? "UNKNOWN",
    lastSuccessfulRunAt: source.systemHealth?.lastSuccessfulRunAt ?? snapshotHealth?.lastSuccessfulRunAt ?? null,
    lastFailedRunAt: source.systemHealth?.lastFailedRunAt ?? snapshotHealth?.lastFailedRunAt ?? null,
    failureReason: source.systemHealth?.failureReason ?? snapshotHealth?.failureReason ?? null,
    affectedSystems: source.systemHealth?.affectedSystems ?? snapshotHealth?.affectedSystems ?? [],
    providerRuntime: source.systemHealth?.providerRuntime ?? source.providerRuntime ?? "UNKNOWN",
    authIdentityDiagnostics: source.systemHealth?.authIdentityDiagnostics ?? source.authIdentityDiagnostics ?? "UNKNOWN",
    finalizationDiagnostics: source.systemHealth?.finalizationDiagnostics ?? weeklyOperations.finalizationState,
    issueCount: source.systemHealth?.issueCount ?? attentionItems.length + weeklyOperations.blockers.filter((blocker) => blocker.state === "ACTIVE").length + (schedulerFailed ? 1 : 0),
    destination: source.systemHealth?.destination ?? "/commish/health",
  };
  const systemCapability: CommissionerCapability = {
    id: "SYSTEM_HEALTH", label: "System Health", description: "Compact provider, scheduler, identity, and finalization diagnostics.", route: "/commish/health", availability: hubPermissions.canViewSystemHealth ? "ACTIVE" : "UNAVAILABLE", health: systemHealthSummary.overallHealth, seasonalRelevance: "IN_SEASON", humanAction: weeklyOperations.blockers.some((blocker) => blocker.state === "ACTIVE" && blocker.requiresHumanAction) || attentionItems.some((item) => item.sourceCapability === "SYSTEM_HEALTH") ? "REVIEW" : "NONE", attentionCount: systemHealthSummary.issueCount, statusText: systemHealthSummary.issueCount ? `${systemHealthSummary.issueCount} issue(s)` : "Healthy", visibility: hubPermissions.canViewSystemHealth ? "VISIBLE" : "HIDDEN", permissionKey: "canViewSystemHealth",
  };
  const allCapabilities = [...capabilities, systemCapability];
  return {
    leagueIdentity: { leagueId: LEAGUE_ID, leagueName: riverCityAuctionLeagueSettings.leagueName, season: riverCityAuctionLeagueSettings.season, teamCount: riverCityAuctionLeagueSettings.teamCount, provider: "sleeper" },
    permissions: hubPermissions,
    attentionItems,
    weeklyOperations,
    capabilities: allCapabilities,
    leagueSpecificCapabilities: [],
    inactiveCapabilities: allCapabilities.filter((capability) => capability.availability !== "ACTIVE"),
    leagueIntelligenceProducts: products,
    systemHealthSummary,
  };
}
