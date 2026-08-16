import { NextResponse } from "next/server";
import {
  createNarrativeDraft,
  createNarrativeDraftsForSnapshot,
  createPostDraftSnapshot,
  isPostDraftWorkflowError,
  listNarratives,
  listPostDraftSnapshots,
  previewNarrative,
  saveNarrativeDraft,
  transitionNarrative,
} from "@/lib/postDraftWorkflow";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  const status = isPostDraftWorkflowError(error) && "status" in error ? error.status : 500;
  return NextResponse.json({ error: error instanceof Error ? error.message : "Post-draft workflow failed." }, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const snapshotId = url.searchParams.get("snapshotId") ?? undefined;
    return NextResponse.json({ snapshots: await listPostDraftSnapshots(), narratives: await listNarratives(snapshotId) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    if (body.action === "capture-snapshot") return NextResponse.json({ snapshot: await createPostDraftSnapshot() }, { status: 201 });
    if (body.action === "create-narratives") return NextResponse.json({ narratives: await createNarrativeDraftsForSnapshot(String(body.snapshotId)) }, { status: 201 });
    if (body.action === "create-narrative") return NextResponse.json({ narrative: await createNarrativeDraft(String(body.snapshotId), String(body.franchiseId)) }, { status: 201 });
    if (body.action === "save-narrative") return NextResponse.json({ narrative: await saveNarrativeDraft({ narrativeId: String(body.narrativeId), input: (body.input ?? {}) as Record<string, unknown>, expectedRevision: Number(body.expectedRevision) }) });
    if (body.action === "transition-narrative") return NextResponse.json({ narrative: await transitionNarrative({ narrativeId: String(body.narrativeId), to: body.to as "in_review" | "approved", expectedRevision: Number(body.expectedRevision) }) });
    if (body.action === "preview-narrative") return NextResponse.json({ preview: await previewNarrative({ narrativeId: String(body.narrativeId) }) });
    return NextResponse.json({ error: "Unknown post-draft action." }, { status: 400 });
  } catch (error) { return errorResponse(error); }
}
