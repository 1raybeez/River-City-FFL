import { NextResponse } from "next/server";
import { firestore } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export async function GET() {
  const updatesSnapshot = await firestore.collection("version_history_updates").get();
  const entries = await Promise.all(
    updatesSnapshot.docs.map(async (document) => {
      const update = document.data();
      const proposalId = text(update.proposalId) ?? document.id;
      const proposalSnapshot = await firestore.collection("proposals").doc(proposalId).get();
      const proposal = proposalSnapshot.exists ? proposalSnapshot.data() : undefined;

      return {
        id: document.id,
        version: "Legislative Update",
        date: text(update.date) ?? new Date().toISOString(),
        changes: Array.isArray(update.changes) ? update.changes : [],
        proposalId,
        amendmentTitle: text(update.title) ?? text(update.amendmentTitle) ?? text(proposal?.title),
        isLegislativeUpdate: true,
      };
    })
  );

  return NextResponse.json({ entries });
}
