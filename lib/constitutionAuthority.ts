import constitutionData from "@/lib/constitutionData";

export type AuthoritySource =
  | "constitution-base"
  | "ratified-rules"
  | "legacy-version-history"
  | "live-version-history"
  | "live-proposals"
  | "legacy-legislative-archive";

export type RuleLinkStatus =
  | "valid-current-id"
  | "legacy-unresolved"
  | "invalid-orphan";

export type NormalizedGovernanceRecord = {
  source: AuthoritySource;
  proposalId: string | null;
  sectionId: string | null;
  title: string | null;
  summary: string;
  ratifiedAt: string | null;
  effectiveDate: string | null;
  voteTotals: { yes: number; no: number } | null;
  currentRuleHref: string | null;
  proposalHref: string | null;
  linkStatus: RuleLinkStatus;
};

const currentRuleIds = new Set(
  constitutionData.flatMap((section) => [
    section.id,
    ...(section.subsections?.map((subsection) => subsection.id) ?? []),
  ])
);

// These references are retained as historical identifiers. Their numeric
// shapes overlap with current IDs in places, but the stored change summaries
// do not provide enough evidence to assert semantic equivalence.
export const LEGACY_VERSION_RULE_IDS = new Set([
  "2.1.3",
  "5.2.1",
  "1.6.1",
  "1.6.2",
  "2.2.1",
  "5.2.2",
  "1.6",
  "2.2.4",
  "2.5.5",
  "2",
  "11a/b",
  "6b/c",
  "6a/3d",
  "9a",
  "8b",
  "1.2",
  "4.1",
  "4.2",
]);

export function isValidCurrentRuleId(sectionId: string | null | undefined) {
  return typeof sectionId === "string" && currentRuleIds.has(sectionId);
}

export function classifyRuleReference(
  sectionId: string | null | undefined,
  source: AuthoritySource
): RuleLinkStatus {
  if (source === "legacy-version-history") {
    return LEGACY_VERSION_RULE_IDS.has(sectionId ?? "")
      ? "legacy-unresolved"
      : "invalid-orphan";
  }

  return isValidCurrentRuleId(sectionId)
    ? "valid-current-id"
    : "invalid-orphan";
}

export function getConstitutionRuleHref(
  sectionId: string | null | undefined,
  source: AuthoritySource = "ratified-rules"
) {
  if (classifyRuleReference(sectionId, source) !== "valid-current-id") {
    return null;
  }

  const isSubsection = sectionId?.includes(".");
  return `/league-info/constitution#${isSubsection ? "constitution-subsection" : "constitution-section"}-${sectionId}`;
}

export function normalizeRatifiedAmendment(input: {
  proposalId?: unknown;
  sectionId?: unknown;
  title?: unknown;
  content?: unknown;
  passedAt?: unknown;
  effectiveDate?: unknown;
  voteTotals?: unknown;
}): NormalizedGovernanceRecord | null {
  const sectionId = typeof input.sectionId === "string" ? input.sectionId : null;
  if (!isValidCurrentRuleId(sectionId)) return null;

  const proposalId = typeof input.proposalId === "string" ? input.proposalId : null;
  const title = typeof input.title === "string" ? input.title : null;
  const content = Array.isArray(input.content)
    ? input.content.filter((value): value is string => typeof value === "string")
    : [];
  const voteTotals = input.voteTotals && typeof input.voteTotals === "object"
    ? input.voteTotals as { yes?: unknown; no?: unknown }
    : null;

  return {
    source: "ratified-rules",
    proposalId,
    sectionId,
    title,
    summary: content.join(" "),
    ratifiedAt: typeof input.passedAt === "string" ? input.passedAt : null,
    effectiveDate: typeof input.effectiveDate === "string" ? input.effectiveDate : null,
    voteTotals: voteTotals && typeof voteTotals.yes === "number" && typeof voteTotals.no === "number"
      ? { yes: voteTotals.yes, no: voteTotals.no }
      : null,
    currentRuleHref: getConstitutionRuleHref(sectionId),
    proposalHref: null,
    linkStatus: "valid-current-id",
  };
}

export function getLatestRatifiedAt(records: readonly NormalizedGovernanceRecord[]) {
  const validDates = records
    .map((record) => record.ratifiedAt)
    .filter((value): value is string => value !== null && !Number.isNaN(new Date(value).getTime()))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  return validDates[0] ?? null;
}

export function formatGovernanceDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" });
}
