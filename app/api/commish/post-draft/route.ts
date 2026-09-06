import { NextResponse } from "next/server";
import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import {
  createNarrativeDraft,
  createNarrativeDraftsForSnapshot,
  generateFactualNarrativeDraft,
  createPostDraftSnapshot,
  isPostDraftWorkflowError,
  listNarratives,
  listPostDraftSnapshots,
  previewNarrative,
  saveNarrativeDraft,
  transitionNarrative,
} from "@/lib/postDraftWorkflow";
import {
  isPostDraftPublicationError,
  listPostDraftPublications,
  publishNarrative,
  rollbackPublication,
  unpublishNarrativePublication,
} from "@/lib/postDraftPublication";
import {
  assemblePostDraftRecap,
  createPostDraftRecapDraft,
  isPostDraftRecapError,
  listPostDraftRecapDrafts,
  previewPostDraftRecap,
  publishPostDraftRecap,
  rollbackPostDraftRecap,
  savePostDraftRecapDraft,
  transitionPostDraftRecap,
  unpublishPostDraftRecap,
} from "@/lib/postDraftRecap";
import { buildReportCardEmailPreview, getReportCardEmailAudit, getResolvedLeagueRecipients, isReportCardEmailReady, sendLeagueEmail } from "@/lib/reportCardEmail";
import { getCommissionerPostDraftIndex } from "@/lib/postDraftWorkflow";

export const runtime = "nodejs";

async function getCommissionerActor() {
  try {
    return await requireAuctionAccess("maintenance");
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

function unauthorized() {
  return NextResponse.json({ error: "Commissioner access required." }, { status: 401 });
}

function errorResponse(error: unknown) {
  const status = (isPostDraftWorkflowError(error) || isPostDraftPublicationError(error) || isPostDraftRecapError(error)) && "status" in error ? error.status : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Post-draft workflow failed." }, { status });
}

export async function GET(request: Request) {
  const actor = await getCommissionerActor();
  if (!actor) return unauthorized();

  try {
    const url = new URL(request.url);
    const snapshotId = url.searchParams.get("snapshotId") ?? undefined;
    return NextResponse.json({ snapshots: await listPostDraftSnapshots(), narratives: await listNarratives(snapshotId), publications: await listPostDraftPublications(), recapDrafts: await listPostDraftRecapDrafts() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  const actor = await getCommissionerActor();
  if (!actor) return unauthorized();

  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "capture-snapshot") return NextResponse.json({ snapshot: await createPostDraftSnapshot() }, { status: 201 });
    if (body.action === "create-narratives") return NextResponse.json({ narratives: await createNarrativeDraftsForSnapshot(String(body.snapshotId)) }, { status: 201 });
    if (body.action === "create-narrative") return NextResponse.json({ narrative: await createNarrativeDraft(String(body.snapshotId), String(body.franchiseId)) }, { status: 201 });
    if (body.action === "generate-factual-draft") return NextResponse.json({ narrative: await generateFactualNarrativeDraft(String(body.narrativeId)) });
    if (body.action === "save-narrative") return NextResponse.json({ narrative: await saveNarrativeDraft({ narrativeId: String(body.narrativeId), input: (body.input ?? {}) as Record<string, unknown>, expectedRevision: Number(body.expectedRevision) }) });
    if (body.action === "transition-narrative") return NextResponse.json({ narrative: await transitionNarrative({ narrativeId: String(body.narrativeId), to: body.to as "in_review" | "approved", expectedRevision: Number(body.expectedRevision) }) });
    if (body.action === "preview-narrative") return NextResponse.json({ preview: await previewNarrative({ narrativeId: String(body.narrativeId) }) });
    if (body.action === "publish-narrative") return NextResponse.json({ publication: await publishNarrative({ narrativeId: String(body.narrativeId), expectedRevision: Number(body.expectedRevision) }) }, { status: 201 });
    if (body.action === "unpublish-publication") return NextResponse.json({ publication: await unpublishNarrativePublication({ publicationId: String(body.publicationId) }) });
    if (body.action === "rollback-publication") return NextResponse.json({ publication: await rollbackPublication({ publicationId: String(body.publicationId) }) });
    if (body.action === "assemble-recap") return NextResponse.json({ recap: await assemblePostDraftRecap(String(body.snapshotId)) });
    if (body.action === "create-recap") return NextResponse.json({ recap: await createPostDraftRecapDraft(String(body.snapshotId)) }, { status: 201 });
    if (body.action === "save-recap") return NextResponse.json({ recap: await savePostDraftRecapDraft({ recapId: String(body.recapId), expectedRevision: Number(body.expectedRevision), input: (body.input ?? {}) as Record<string, unknown> }) });
    if (body.action === "transition-recap") return NextResponse.json({ recap: await transitionPostDraftRecap({ recapId: String(body.recapId), to: body.to as "in_review" | "approved", expectedRevision: Number(body.expectedRevision) }) });
    if (body.action === "preview-recap") return NextResponse.json({ preview: await previewPostDraftRecap(String(body.recapId)) });
    if (body.action === "publish-recap") return NextResponse.json({ publication: await publishPostDraftRecap({ recapId: String(body.recapId), expectedRevision: Number(body.expectedRevision) }) }, { status: 201 });
    if (body.action === "unpublish-recap") return NextResponse.json({ publication: await unpublishPostDraftRecap(String(body.publicationId)) });
    if (body.action === "rollback-recap") return NextResponse.json({ publication: await rollbackPostDraftRecap(String(body.publicationId)) });
    if (body.action === "preview-report-card-email") {
      const reportIndex = await getCommissionerPostDraftIndex();
      const audit = await getReportCardEmailAudit(reportIndex);
      return NextResponse.json({ preview: buildReportCardEmailPreview(reportIndex, audit) }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (body.action === "send-report-card-email") {
      const reportIndex = await getCommissionerPostDraftIndex();
      const audit = await getReportCardEmailAudit(reportIndex);
      const preview = buildReportCardEmailPreview(reportIndex, audit);
      if (!isReportCardEmailReady(audit)) return NextResponse.json({ result: { status: "RECIPIENT_AUDIT_NOT_READY", attemptedRecipientCount: 0, requestId: null } }, { headers: { "Cache-Control": "private, no-store" } });
      const recipients = getResolvedLeagueRecipients(audit);
      const result = await sendLeagueEmail({ recipients: recipients.map((recipient) => recipient.email), subject: preview.subject, html: preview.html, text: preview.text });
      return NextResponse.json({ result }, { headers: { "Cache-Control": "private, no-store" } });
    }
    if (body.action === "send-report-card-test") {
      const reportIndex = await getCommissionerPostDraftIndex();
      const preview = buildReportCardEmailPreview(reportIndex, []);
      const result = await sendLeagueEmail({ recipients: [actor.email], subject: preview.subject, html: preview.html, text: preview.text });
      return NextResponse.json({ result }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ error: "Unknown post-draft action." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}
