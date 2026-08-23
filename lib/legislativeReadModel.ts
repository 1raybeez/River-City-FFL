import type {
  ArchivedProposal,
  LegislativeArchiveSession,
} from "@/lib/legislativeArchive";
import {
  hasAllEligibleVotes,
  LEGISLATIVE_ELIGIBLE_VOTE_COUNT,
  type LegislativeProposalSessionType,
  type LegislativeResult,
} from "@/lib/legislativeSession";
import { getConstitutionRuleHref } from "@/lib/constitutionAuthority";

export type LegislativeRecordSource = "legacy" | "live" | "reconciled";
export type LegislativeRecordStatus =
  | "active"
  | "passed"
  | "failed"
  | "tied"
  | "unclear"
  | "informational";

export type ExternalLegislativeResult = {
  yes: number;
  no: number;
  total: number;
  recordedAt?: string | null;
  recordedBy?: string | null;
  sourceLabel: string;
};

export interface NormalizedLegislativeRecord {
  id: string;
  source: LegislativeRecordSource;
  sessionYear: number | null;
  sessionType: LegislativeProposalSessionType | null;
  title: string;
  summary: string | null;
  description: string | null;
  sectionId: string | null;
  sectionLabel: string | null;
  proposer: string | null;
  status: LegislativeRecordStatus;
  yesVotes: number | null;
  noVotes: number | null;
  totalVotes: number | null;
  eligibleVoteCount: number;
  viewerVote: "yes" | "no" | null;
  createdAt: string | null;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  finalizedAt: string | null;
  ratifiedAt: string | null;
  currentRuleHref: string | null;
  amendmentHistoryHref: string | null;
  proposalHref: string | null;
  legacySourceId: string | null;
  reconciledProposalId: string | null;
  allEligibleVotesCast: boolean | null;
  readyForCommissionerFinalization: boolean | null;
  resultSourceLabel: string | null;
}

export interface LiveLegislativeRecordInput {
  id: string;
  sessionYear?: number;
  sessionType?: LegislativeProposalSessionType;
  title?: string;
  description?: string;
  section?: string;
  sectionId?: string;
  submittedBy?: string;
  status?: string;
  votes?: { yes?: unknown[]; no?: unknown[] };
  viewerVote?: "yes" | "no" | null;
  createdAt?: string | null;
  finalizedAt?: string | null;
  passedAt?: string | null;
  externalResult?: Partial<ExternalLegislativeResult> | null;
  resultSource?: "website" | "sleeper" | "manual_external";
  votingOpensAt?: string | null;
  votingClosesAt?: string | null;
}

export const LEGISLATIVE_2026_RECONCILIATION: Readonly<Record<string, string>> = {
  "2026-roster-continuity-clause": "ZgX6RYr0tVtl7SiF2Z5d",
  "2026-authority-hardline": "zVxQKXU9m9vJSMvDOF4N",
};

function leadingSectionId(value: string | null | undefined) {
  if (!value) return null;
  return value.trim().match(/^\d+(?:\.\d+)*/)?.[0] ?? null;
}

function summaryText(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.trim();
  return normalized.length > 280 ? `${normalized.slice(0, 277).trimEnd()}…` : normalized;
}

function safeStatus(value: string | undefined): LegislativeRecordStatus {
  if (
    value === "active" ||
    value === "passed" ||
    value === "failed" ||
    value === "tied" ||
    value === "unclear" ||
    value === "informational"
  ) {
    return value;
  }
  return "unclear";
}

function voteCount(value: unknown[] | undefined) {
  return Array.isArray(value) ? value.length : null;
}

function baseRecord(input: Partial<NormalizedLegislativeRecord>): NormalizedLegislativeRecord {
  return {
    id: input.id ?? "",
    source: input.source ?? "legacy",
    sessionYear: input.sessionYear ?? null,
    sessionType: input.sessionType ?? null,
    title: input.title ?? "",
    summary: input.summary ?? null,
    description: input.description ?? null,
    sectionId: input.sectionId ?? null,
    sectionLabel: input.sectionLabel ?? null,
    proposer: input.proposer ?? null,
    status: input.status ?? "unclear",
    yesVotes: input.yesVotes ?? null,
    noVotes: input.noVotes ?? null,
    totalVotes: input.totalVotes ?? null,
    eligibleVoteCount: input.eligibleVoteCount ?? LEGISLATIVE_ELIGIBLE_VOTE_COUNT,
    viewerVote: input.viewerVote ?? null,
    createdAt: input.createdAt ?? null,
    votingOpensAt: input.votingOpensAt ?? null,
    votingClosesAt: input.votingClosesAt ?? null,
    finalizedAt: input.finalizedAt ?? null,
    ratifiedAt: input.ratifiedAt ?? null,
    currentRuleHref: input.currentRuleHref ?? null,
    amendmentHistoryHref: input.amendmentHistoryHref ?? null,
    proposalHref: input.proposalHref ?? null,
    legacySourceId: input.legacySourceId ?? null,
    reconciledProposalId: input.reconciledProposalId ?? null,
    allEligibleVotesCast: input.allEligibleVotesCast ?? null,
    readyForCommissionerFinalization: input.readyForCommissionerFinalization ?? null,
    resultSourceLabel: input.resultSourceLabel ?? null,
  };
}

export function normalizeLiveLegislativeRecord(
  input: LiveLegislativeRecordInput
): NormalizedLegislativeRecord {
  const yesVotes = voteCount(input.votes?.yes);
  const noVotes = voteCount(input.votes?.no);
  const totalVotes = yesVotes !== null && noVotes !== null ? yesVotes + noVotes : null;
  const externalResult = input.externalResult &&
    Number.isInteger(input.externalResult.yes) &&
    Number.isInteger(input.externalResult.no) &&
    Number.isInteger(input.externalResult.total) &&
    typeof input.externalResult.sourceLabel === "string"
    ? input.externalResult as ExternalLegislativeResult
    : null;
  const aggregateYes = externalResult?.yes ?? yesVotes;
  const aggregateNo = externalResult?.no ?? noVotes;
  const aggregateTotal = externalResult?.total ?? totalVotes;
  const status = safeStatus(input.status);
  return baseRecord({
    id: input.id,
    source: "live",
    sessionYear: input.sessionYear ?? null,
    sessionType: input.sessionType ?? null,
    title: input.title ?? "",
    summary: summaryText(input.description),
    description: input.description ?? null,
    sectionId: input.sectionId ?? leadingSectionId(input.section),
    sectionLabel: input.section ?? null,
    proposer: input.submittedBy ?? null,
    status,
    yesVotes: aggregateYes,
    noVotes: aggregateNo,
    totalVotes: aggregateTotal,
    viewerVote: input.viewerVote ?? null,
    createdAt: input.createdAt ?? null,
    votingOpensAt: input.votingOpensAt ?? null,
    votingClosesAt: input.votingClosesAt ?? null,
    finalizedAt: input.finalizedAt ?? null,
    ratifiedAt: input.passedAt ?? null,
    resultSourceLabel: externalResult?.sourceLabel ?? (input.resultSource === "website" ? "Website" : null),
    amendmentHistoryHref: status === "passed" &&
      (!externalResult || getConstitutionRuleHref(input.sectionId ?? leadingSectionId(input.section)) !== null)
      ? "/history/version-history"
      : null,
    currentRuleHref: status === "passed"
      ? getConstitutionRuleHref(input.sectionId ?? leadingSectionId(input.section))
      : null,
    allEligibleVotesCast:
      aggregateTotal === null ? null : hasAllEligibleVotes(aggregateYes ?? 0, aggregateNo ?? 0),
    readyForCommissionerFinalization:
      status === "active" &&
      aggregateTotal !== null &&
      hasAllEligibleVotes(aggregateYes ?? 0, aggregateNo ?? 0) &&
      (aggregateYes ?? 0) > (aggregateNo ?? 0),
  });
}

function normalizeLegacyProposal(proposal: ArchivedProposal): NormalizedLegislativeRecord {
  const yesVotes = proposal.voteTotals?.yes ?? null;
  const noVotes = proposal.voteTotals?.no ?? null;
  const totalVotes =
    yesVotes !== null || noVotes !== null
      ? (yesVotes ?? 0) + (noVotes ?? 0)
      : null;
  const reconciledProposalId = LEGISLATIVE_2026_RECONCILIATION[proposal.id] ?? null;
  return baseRecord({
    id: reconciledProposalId ?? proposal.id,
    source: reconciledProposalId ? "reconciled" : "legacy",
    sessionYear: proposal.year,
    title: proposal.title,
    summary: summaryText(proposal.description),
    description: proposal.description,
    sectionId: leadingSectionId(proposal.section),
    sectionLabel: proposal.section ?? null,
    proposer: proposal.sponsor ?? null,
    status: safeStatus(proposal.status),
    yesVotes,
    noVotes,
    totalVotes,
    amendmentHistoryHref: proposal.status === "passed" ? "/history/version-history" : null,
    currentRuleHref:
      proposal.status === "passed"
        ? getConstitutionRuleHref(leadingSectionId(proposal.section))
        : null,
    legacySourceId: proposal.id,
    reconciledProposalId,
  });
}

export function buildNormalizedLegislativeRecords(
  liveRecords: readonly LiveLegislativeRecordInput[],
  archiveSessions: readonly LegislativeArchiveSession[]
) {
  const liveById = new Map(liveRecords.map((record) => [record.id, normalizeLiveLegislativeRecord(record)]));
  const legacyRecords = archiveSessions.flatMap((session) =>
    session.proposals.map(normalizeLegacyProposal)
  );
  const reconciledLiveIds = new Set(
    legacyRecords
      .map((record) => record.reconciledProposalId)
      .filter((value): value is string => Boolean(value))
  );
  const reconciledRecords = legacyRecords
    .filter((record) => record.reconciledProposalId && liveById.has(record.reconciledProposalId))
    .map((record) => {
      const live = liveById.get(record.reconciledProposalId as string)!;
      return baseRecord({
        ...record,
        ...live,
        source: "reconciled",
        id: live.id,
        sessionYear: live.sessionYear ?? record.sessionYear,
        legacySourceId: record.legacySourceId,
        reconciledProposalId: live.id,
      });
    });
  const unmatchedLegacy = legacyRecords.filter((record) => !record.reconciledProposalId);
  const unmatchedLive = [...liveById.values()].filter((record) => !reconciledLiveIds.has(record.id));
  return [...reconciledRecords, ...unmatchedLive, ...unmatchedLegacy];
}

export function legislativeVoteSummary(yesVotes: number, noVotes: number) {
  const result: LegislativeResult = yesVotes === noVotes
    ? "tied"
    : yesVotes > noVotes
      ? "passed"
      : "failed";
  return {
    result,
    totalVotes: yesVotes + noVotes,
    eligibleVoteCount: LEGISLATIVE_ELIGIBLE_VOTE_COUNT,
    allEligibleVotesCast: hasAllEligibleVotes(yesVotes, noVotes),
  };
}
