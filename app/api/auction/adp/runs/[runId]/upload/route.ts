import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import {
  removeAuctionAdpSource,
  uploadAuctionAdpSource,
} from "@/lib/auction/adpRefreshService";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ runId: string }>;
};

async function getActor() {
  try {
    return await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(req: Request, context: RouteContext) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Auction access required." }, { status: 401 });
  }

  try {
    const { runId } = await context.params;
    const formData = await req.formData();
    const sourceKey = readString(formData.get("sourceKey"));
    const file = formData.get("file");
    if (!sourceKey || !(file instanceof File)) {
      return NextResponse.json(
        { error: "sourceKey and CSV file are required." },
        { status: 400 }
      );
    }

    const source = await uploadAuctionAdpSource({
      runId,
      sourceKey,
      fileName: file.name,
      fileBuffer: Buffer.from(await file.arrayBuffer()),
      actor,
    });

    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to upload ADP source." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  const actor = await getActor();
  if (!actor) {
    return NextResponse.json({ error: "Auction access required." }, { status: 401 });
  }

  try {
    const { runId } = await context.params;
    const { searchParams } = new URL(req.url);
    const sourceKey = readString(searchParams.get("sourceKey"));
    if (!sourceKey) {
      return NextResponse.json({ error: "sourceKey is required." }, { status: 400 });
    }

    await removeAuctionAdpSource({ runId, sourceKey, actor });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to remove ADP source." },
      { status: 400 }
    );
  }
}
