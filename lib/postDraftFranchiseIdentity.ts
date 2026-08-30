/** Stable report IDs for the post-draft commissioner surface. */
const REPORT_ID_ALIASES = new Map([["hawkins-heroes", "nudas-priest"]]);

export function postDraftReportFranchiseId(franchiseId: string) {
  return REPORT_ID_ALIASES.get(franchiseId) ?? franchiseId;
}

export function postDraftSourceFranchiseId(franchiseId: string) {
  for (const [sourceId, reportId] of REPORT_ID_ALIASES) {
    if (reportId === franchiseId) return sourceId;
  }
  return franchiseId;
}
