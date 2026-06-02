import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Trade evaluation API is not implemented yet." },
    { status: 501 }
  );
}
