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
  source: "explicit-environment-gate-and-snapshot-pointer";
};

type OwnerPublicationEnvironment = Readonly<Record<string, string | undefined>>;

export function getDraftReportV2OwnerPublicationConfig(season = 2026, env: OwnerPublicationEnvironment = process.env): DraftReportV2OwnerPublicationConfig {
  const explicitlyEnabled = env.DRAFT_REPORT_V2_OWNER_PUBLICATION_ENABLED?.trim().toLowerCase() === "true";
  const snapshotId = env.DRAFT_REPORT_V2_OWNER_PUBLICATION_SNAPSHOT_ID?.trim() || null;
  return { season, enabled: explicitlyEnabled && Boolean(snapshotId), snapshotId, source: "explicit-environment-gate-and-snapshot-pointer" };
}

export function draftReportV2OwnerPublicationEnabled(env: OwnerPublicationEnvironment = process.env) {
  return getDraftReportV2OwnerPublicationConfig(2026, env).enabled;
}

export type DraftReportV2OwnerPublicationStatus = DraftReportV2OwnerPublicationConfig;

export function getDraftReportV2OwnerPublicationStatus(season = 2026, env: OwnerPublicationEnvironment = process.env): DraftReportV2OwnerPublicationStatus {
  return getDraftReportV2OwnerPublicationConfig(season, env);
}
