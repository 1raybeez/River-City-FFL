import { DRAFT_REPORT_V2_VERSION } from "@/lib/draftReportV2/types";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";

/**
 * Single Draft Report V2 owner-publication gate.
 *
 * Missing, malformed, or false configuration always keeps the canonical owner
 * route on V1. A future publication phase must explicitly provide both the
 * enablement flag and an approved frozen snapshot pointer. P9 does not change
 * environment configuration or write a publication pointer. The commissioner
 * preview is intentionally independent of this gate.
 */
export type DraftReportV2OwnerPublicationConfig = {
  season: number;
  enabled: boolean;
  snapshotId: string | null;
  expectedChecksum: string | null;
  source: "explicit-environment-gate-and-snapshot-pointer";
};

type OwnerPublicationEnvironment = Readonly<Record<string, string | undefined>>;

export function getDraftReportV2OwnerPublicationConfig(season = 2026, env: OwnerPublicationEnvironment = process.env): DraftReportV2OwnerPublicationConfig {
  const explicitlyEnabled = env.DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED?.trim().toLowerCase() === "true";
  const snapshotId = env.DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID?.trim() || null;
  const configuredSeason = env.DRAFT_REPORT_V2_OWNER_PUBLICATION_SEASON?.trim();
  const expectedSeason = configuredSeason && /^\d+$/.test(configuredSeason) && Number(configuredSeason) === season ? season : null;
  const configuredChecksum = env.DRAFT_REPORT_V2_OWNER_PUBLICATION_CHECKSUM?.trim().toLowerCase();
  const expectedChecksum = configuredChecksum && /^[a-f0-9]{64}$/.test(configuredChecksum) ? configuredChecksum : null;
  return { season, enabled: explicitlyEnabled && Boolean(snapshotId) && expectedSeason !== null && expectedChecksum !== null, snapshotId, expectedChecksum, source: "explicit-environment-gate-and-snapshot-pointer" };
}

export function draftReportV2OwnerPublicationEnabled(env: OwnerPublicationEnvironment = process.env) {
  return getDraftReportV2OwnerPublicationConfig(2026, env).enabled;
}

export type DraftReportV2OwnerPublicationStatus = DraftReportV2OwnerPublicationConfig;

export function getDraftReportV2OwnerPublicationStatus(season = 2026, env: OwnerPublicationEnvironment = process.env): DraftReportV2OwnerPublicationStatus {
  return getDraftReportV2OwnerPublicationConfig(season, env);
}

export function isDraftReportV2OwnerPublicationReviewValid(review: unknown, config: DraftReportV2OwnerPublicationConfig) {
  if (!review || typeof review !== "object") return false;
  const candidate = review as any;
  const snapshot = candidate.snapshot;
  if (!snapshot || snapshot.schemaVersion !== DRAFT_REPORT_V2_VERSION || snapshot.season !== config.season || snapshot.snapshotId !== config.snapshotId || snapshot.inputChecksum !== config.expectedChecksum) return false;
  const teams = snapshot.teams;
  const franchiseIds = Array.isArray(teams) ? teams.map((team: any) => team?.franchiseId) : [];
  const expectedIds = new Set(canonicalAuctionTeams.map((team) => team.franchiseId));
  if (franchiseIds.length !== expectedIds.size || franchiseIds.some((id: unknown) => typeof id !== "string" || !expectedIds.has(id)) || new Set(franchiseIds).size !== expectedIds.size) return false;
  const completeResults = (rows: unknown) => Array.isArray(rows) && rows.length === 12 && new Set(rows.map((row: any) => row?.franchiseId)).size === 12 && rows.every((row: any) => expectedIds.has(row?.franchiseId));
  if (snapshot.modelVersions?.report !== DRAFT_REPORT_V2_VERSION || snapshot.modelVersions?.draftQuality !== "draft-quality-v1" || snapshot.modelVersions?.auctionEfficiency !== "auction-efficiency-v1" || !completeResults(candidate.formulaC) || !completeResults(candidate.quality?.teams) || !completeResults(candidate.auctionEfficiency?.teams) || !completeResults(candidate.contributionMap) || !completeResults(candidate.finalGrades)) return false;
  return candidate.finalGrades.every((row: any) => Number.isFinite(row?.methodDScore) && Number.isInteger(row?.overallRank) && typeof row?.grade === "string");
}
