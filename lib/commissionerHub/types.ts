/**
 * Universal Commissioner Hub v2 semantic contract.
 *
 * This file is intentionally source-neutral. Availability, health, seasonal
 * relevance, and human action are separate dimensions; consumers must not
 * infer one from another.
 */

export type AttentionSeverity = "INFO" | "WARNING" | "ERROR";
export type AttentionAction = "NONE" | "REVIEW" | "APPROVE" | "RESOLVE" | "OPEN";
export type CapabilityAvailability = "ACTIVE" | "INACTIVE" | "COMING_SOON" | "UNAVAILABLE";
export type CapabilityHealth = "HEALTHY" | "NEEDS_ATTENTION" | "WARNING" | "ERROR" | "UNKNOWN";
export type CapabilitySeason = "IN_SEASON" | "OFFSEASON" | "DRAFT" | "POSTSEASON" | "SEASON_CLOSE";
export type CapabilityAction = "NONE" | "REVIEW" | "APPROVE" | "RESOLVE" | "OPEN";

export type CommissionerHubId =
  | "FINANCE"
  | "LEGISLATIVE_HUB"
  | "SEASON_OPERATIONS"
  | "WAR_ROOM"
  | "LEAGUE_INTELLIGENCE"
  | "OWNER_FEEDBACK"
  | "SYSTEM_HEALTH";

export interface LeagueIdentity {
  readonly leagueId: string;
  readonly leagueName: string;
  readonly season: number;
  readonly teamCount: number | null;
  readonly provider: "sleeper" | "unknown";
}

export interface CommissionerHubPermissions {
  readonly canViewHub: boolean;
  readonly canViewFinance: boolean;
  readonly canViewLegislativeHub: boolean;
  readonly canViewSeasonOperations: boolean;
  readonly canViewWarRoom: boolean;
  readonly warRoomScope: "COMMISSIONER" | "OWNER" | "NONE";
  readonly canViewLeagueIntelligence: boolean;
  readonly canViewOwnerFeedback: boolean;
  readonly canViewSystemHealth: boolean;
}

export interface AttentionItem {
  readonly id: string;
  readonly sourceCapability: CommissionerHubId;
  readonly severity: AttentionSeverity;
  readonly title: string;
  readonly description: string;
  readonly actionType: Exclude<AttentionAction, "NONE">;
  readonly ctaLabel: string;
  readonly destination: string | null;
  readonly amount?: number;
  readonly count?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export type OperationalBlockerSeverity = "INFO" | "WARNING" | "ERROR";
export type OperationalBlockerState = "ACTIVE" | "CLEARED" | "UNKNOWN";

export interface OperationalBlocker {
  readonly code: string;
  readonly title: string;
  readonly description: string;
  readonly severity: OperationalBlockerSeverity;
  readonly state: OperationalBlockerState;
  readonly affects: readonly string[];
  readonly requiresHumanAction: boolean;
  readonly destination?: string | null;
}

export interface WeeklyOperations {
  readonly season: number;
  readonly week: number | null;
  readonly lifecycle: string;
  readonly freshness: string | null;
  readonly matchupState: string | null;
  readonly latestSafelyCompletedWeek: number | null;
  readonly finalizationState: string | null;
  readonly awardState: string | null;
  readonly standingsState: string | null;
  readonly rankingsState: string | null;
  readonly predictorState: string | null;
  readonly automationHealth: string | null;
  readonly blockers: readonly OperationalBlocker[];
  readonly sourceSnapshot?: unknown;
}

export interface CommissionerCapability {
  readonly id: CommissionerHubId;
  readonly label: string;
  readonly description: string;
  readonly route: string | null;
  readonly availability: CapabilityAvailability;
  readonly health: CapabilityHealth;
  readonly seasonalRelevance: CapabilitySeason;
  readonly humanAction: CapabilityAction;
  readonly attentionCount?: number;
  readonly statusText?: string | null;
  readonly visibility: "VISIBLE" | "HIDDEN";
  readonly permissionKey?: keyof CommissionerHubPermissions;
}

export interface LeagueIntelligenceProduct {
  readonly id: string;
  readonly label: string;
  readonly availability: CapabilityAvailability;
  readonly workflowState: string;
  readonly publicationState: string | null;
  readonly route: string | null;
  readonly commissionerRoute?: string | null;
  readonly statusText?: string | null;
}

export interface SystemHealthSummary {
  readonly overallHealth: CapabilityHealth;
  readonly sourceFreshness: string | null;
  readonly automationScheduler: string | null;
  readonly providerRuntime: string | null;
  readonly authIdentityDiagnostics: string | null;
  readonly finalizationDiagnostics: string | null;
  readonly issueCount: number;
  readonly destination: string | null;
}

export interface CommissionerHubModel {
  readonly leagueIdentity: LeagueIdentity;
  readonly permissions: CommissionerHubPermissions;
  readonly attentionItems: readonly AttentionItem[];
  readonly weeklyOperations: WeeklyOperations;
  readonly capabilities: readonly CommissionerCapability[];
  readonly leagueSpecificCapabilities: readonly CommissionerCapability[];
  readonly inactiveCapabilities: readonly CommissionerCapability[];
  readonly leagueIntelligenceProducts: readonly LeagueIntelligenceProduct[];
  readonly systemHealthSummary: SystemHealthSummary;
}
