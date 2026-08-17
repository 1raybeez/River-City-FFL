import { NextResponse } from "next/server";

function deprecatedResponse() {
  return NextResponse.json(
    { error: "This legacy HTTP maintenance route is deprecated and no longer performs writes." },
    { status: 410, headers: { Deprecation: "true" } }
  );
}

export async function GET() {
  return deprecatedResponse();
}

export async function POST() {
  return deprecatedResponse();
}
