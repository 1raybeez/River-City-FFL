import { getAllDrafts } from "@/lib/sleeper";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const drafts = await getAllDrafts();
    return NextResponse.json(drafts);
  } catch (error) {
    console.error("Error loading draft history:", error);
    return NextResponse.json({ error: "Failed to load draft history." }, { status: 500 });
  }
}
