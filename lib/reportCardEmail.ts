import "server-only";

import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { listAuthorizedEmailMappingsFromFirestore } from "@/lib/auth/canonicalAuctionEmailMapping";
import { resolveCanonicalOwnerAuthorization } from "@/lib/auth/canonicalAuctionAuthorization";
import type { CommissionerPostDraftReportRow } from "@/lib/commissionerPostDraftIndex";
import {
  buildReportCardEmailContent,
  REPORT_CARD_PERSONAL_HREF,
  type ReportCardEmailAuditRow,
  type ReportCardEmailRecipient,
} from "@/lib/reportCardEmailContract";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function getReportCardEmailAudit(reportIndex: CommissionerPostDraftReportRow[]): Promise<ReportCardEmailAuditRow[]> {
  const mappings = await listAuthorizedEmailMappingsFromFirestore();
  const rows = canonicalAuctionTeams.map((team) => {
    const owners: ReportCardEmailRecipient[] = team.ownerIds.map((ownerId) => {
      const ownerName = team.ownerNames[team.ownerIds.indexOf(ownerId)] ?? ownerId;
      const ownerMappings = mappings.filter((mapping) => mapping.canonicalOwnerId === ownerId);
      const mapping = ownerMappings.length === 1 ? ownerMappings[0] : null;
      const authorization = mapping ? resolveCanonicalOwnerAuthorization(mapping.canonicalOwnerId) : null;
      const valid = Boolean(mapping?.normalizedEmail && isEmail(mapping.normalizedEmail) && authorization && authorization.authorizedFranchiseId === team.franchiseId);
      return { ownerId, ownerName, email: valid ? mapping?.normalizedEmail ?? null : null };
    });
    const emails = owners.map((owner) => owner.email).filter((email): email is string => Boolean(email));
    const duplicate = emails.some((email, index) => emails.indexOf(email) !== index);
    const invalid = owners.some((owner) => {
      const mappingCount = mappings.filter((mapping) => mapping.canonicalOwnerId === owner.ownerId).length;
      const mapping = mappings.find((candidate) => candidate.canonicalOwnerId === owner.ownerId);
      const authorization = mapping ? resolveCanonicalOwnerAuthorization(mapping.canonicalOwnerId) : null;
      return mappingCount > 1 || (mappingCount === 1 && (!mapping?.normalizedEmail || !isEmail(mapping.normalizedEmail) || authorization?.authorizedFranchiseId !== team.franchiseId));
    });
    const missing = owners.some((owner) => !owner.email);
    const status = duplicate ? "DUPLICATE_EMAIL" : invalid ? "INTEGRITY_ERROR" : missing ? "MISSING_EMAIL" : "READY";
    return {
      franchiseId: team.franchiseId,
      teamName: reportIndex.find((row) => row.franchiseId === team.franchiseId)?.teamName ?? team.teamName,
      owners,
      reportCardHref: REPORT_CARD_PERSONAL_HREF,
      status,
      warning: duplicate ? "The same email is assigned more than once." : invalid ? "An authorization mapping failed canonical owner or franchise validation." : missing ? "One or more canonical owners do not have an email configured." : null,
    } satisfies ReportCardEmailAuditRow;
  });
  const counts = new Map<string, number>();
  rows.flatMap((row) => row.owners).forEach((owner) => { if (owner.email) counts.set(owner.email, (counts.get(owner.email) ?? 0) + 1); });
  const audited = rows.map((row) => countsOf(row, counts));
  const currentOwnerIds = new Set(canonicalAuctionTeams.flatMap((team) => team.ownerIds));
  const invalidExternalMapping = mappings.some((mapping) => {
    const authorization = resolveCanonicalOwnerAuthorization(mapping.canonicalOwnerId);
    return !currentOwnerIds.has(mapping.canonicalOwnerId) || !authorization;
  });
  return invalidExternalMapping ? audited.map((row) => row.status === "READY" ? { ...row, status: "INTEGRITY_ERROR", warning: "An unrelated authorization mapping failed canonical ownership validation." } : row) : audited;
}

function countsOf(row: ReportCardEmailAuditRow, counts: Map<string, number>): ReportCardEmailAuditRow {
  const duplicate = row.owners.some((owner) => owner.email && (counts.get(owner.email) ?? 0) > 1);
  return duplicate ? { ...row, status: "DUPLICATE_EMAIL", warning: "An email is assigned to more than one franchise." } : row;
}

export function getResolvedLeagueRecipients(audit: ReportCardEmailAuditRow[]) {
  return audit.flatMap((row) => row.owners).filter((owner): owner is ReportCardEmailRecipient & { email: string } => Boolean(owner.email));
}

export function isReportCardEmailReady(audit: ReportCardEmailAuditRow[]) {
  return audit.length === canonicalAuctionTeams.length && audit.every((row) => row.status === "READY");
}

export function buildReportCardEmailPreview(reportIndex: CommissionerPostDraftReportRow[], audit: ReportCardEmailAuditRow[]) {
  const content = buildReportCardEmailContent(reportIndex);
  const recipients = getResolvedLeagueRecipients(audit);
  return { ...content, audit, recipients: recipients.map(({ ownerId, ownerName, email }) => ({ ownerId, ownerName, email })), recipientCount: recipients.length };
}

export type MailTransport = (input: { recipients: string[]; subject: string; html: string; text: string }) => Promise<{ requestId?: string | null }>;

export async function sendLeagueEmail(input: Parameters<MailTransport>[0], transport: MailTransport = postmarkTransport) {
  if (process.env.REPORT_CARD_EMAIL_SEND_ENABLED !== "true") {
    return { status: "SEND_DISABLED" as const, attemptedRecipientCount: input.recipients.length, requestId: null };
  }
  try {
    const result = await transport(input);
    return { status: "SENT" as const, attemptedRecipientCount: input.recipients.length, requestId: result.requestId ?? null };
  } catch (error) {
    return { status: "FAILED" as const, attemptedRecipientCount: input.recipients.length, requestId: null, error: error instanceof Error ? error.message : "Email provider failed." };
  }
}

async function postmarkTransport(input: Parameters<MailTransport>[0]): Promise<{ requestId?: string | null }> {
  const token = process.env.POSTMARK_SERVER_TOKEN?.trim();
  const from = process.env.REPORT_CARD_EMAIL_FROM?.trim();
  if (!token) throw new Error("Postmark is not configured: POSTMARK_SERVER_TOKEN is missing.");
  if (!from) throw new Error("Postmark is not configured: REPORT_CARD_EMAIL_FROM is missing.");
  const response = await fetch("https://api.postmarkapp.com/email", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json", "X-Postmark-Server-Token": token },
    body: JSON.stringify({ From: from, To: input.recipients.join(","), Subject: input.subject, HtmlBody: input.html, TextBody: input.text, MessageStream: "outbound" }),
  });
  const payload = await response.json() as { ErrorCode?: number; Message?: string; MessageID?: string };
  if (!response.ok || payload.ErrorCode !== 0 || !payload.MessageID) throw new Error(payload.Message ?? `Postmark rejected the request (${response.status}).`);
  return { requestId: payload.MessageID };
}
