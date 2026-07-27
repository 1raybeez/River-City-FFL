export type AuctionAdpMaintenanceSourceState = {
  status?: string | null;
  contentHash?: string | null;
  fileHash?: string | null;
  validatedContentHash?: string | null;
};

export function getUploadedAdpSourceHash(
  summary: Pick<AuctionAdpMaintenanceSourceState, "contentHash" | "fileHash"> | null
) {
  return summary?.contentHash ?? summary?.fileHash ?? null;
}

export function adpSourceNeedsValidation(
  summary: AuctionAdpMaintenanceSourceState | null
) {
  if (!summary || summary.status !== "validated") return true;
  const uploadedHash = getUploadedAdpSourceHash(summary);

  return !uploadedHash || summary.validatedContentHash !== uploadedHash;
}

export function getAdpMaintenanceStatusLabel({
  summary,
  hasSelectedFile,
  isUploading,
}: {
  summary: Pick<AuctionAdpMaintenanceSourceState, "status"> | null;
  hasSelectedFile: boolean;
  isUploading: boolean;
}) {
  if (isUploading) return "UPLOADING";
  if (hasSelectedFile) return "SELECTED · CLICK UPLOAD";
  if (!summary || summary.status === "empty") return "EMPTY";
  if (summary.status === "uploaded") return "UPLOADED · AWAITING VALIDATION";
  if (summary.status === "validated") return "VALIDATED";
  if (summary.status === "blocked") return "BLOCKED";

  return summary.status?.toUpperCase() ?? "EMPTY";
}
