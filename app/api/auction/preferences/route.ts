import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import {
  clearAuctionOwnerPreference,
  readAuctionOwnerPreferences,
  upsertAuctionOwnerPreference,
} from "@/lib/auction/ownerPreferences";
import {
  type AuctionOwnerPreferenceTag,
} from "@/lib/auction/ownerPreferenceTypes";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";

export const runtime = "nodejs";

const validOwnerPreferenceTags = new Set<AuctionOwnerPreferenceTag>([
  "open",
  "target",
  "watch",
  "fade",
]);

async function getAuctionActor() {
  try {
    return await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return null;
    }

    throw error;
  }
}

function readSeason(value: unknown) {
  const season = Number(value ?? riverCityAuctionLeagueSettings.season);
  return Number.isInteger(season) && season > 2000
    ? season
    : riverCityAuctionLeagueSettings.season;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableDollar(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isInteger(amount) && amount >= 1 ? amount : undefined;
}

function readNote(value: unknown) {
  const note = readString(value);
  return note ? note.slice(0, 240) : null;
}

async function readJsonBody(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readPreferenceScope(
  searchParams: URLSearchParams,
  body: Record<string, unknown>,
  ownerProfileId: string
) {
  return {
    season: readSeason(body.season ?? searchParams.get("season")),
    ownerProfileId,
  };
}

function getActorOwnerProfileId(
  actor: Awaited<ReturnType<typeof requireAuctionWarRoomAccess>>
) {
  const ownerProfileId = actor.access.ownerProfileId;
  if (!ownerProfileId) {
    throw new Error("Authenticated War Room profile is missing ownerProfileId.");
  }

  return ownerProfileId;
}

export async function GET(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const ownerProfileId = getActorOwnerProfileId(actor);
  const preferences = await readAuctionOwnerPreferences({
    season: readSeason(searchParams.get("season")),
    ownerProfileId,
  });

  return NextResponse.json({ preferences, ownerProfileId });
}

export async function PUT(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const body = await readJsonBody(req);
  const ownerProfileId = getActorOwnerProfileId(actor);
  const { season } = readPreferenceScope(searchParams, body, ownerProfileId);
  const sleeperPlayerId = readString(body.sleeperPlayerId);
  const tag = readString(body.tag);
  const preferredEntry = readNullableDollar(
    body.preferredEntry ?? body.openingBid
  );
  const plannedCap = readNullableDollar(body.plannedCap ?? body.hardCap);

  if (!sleeperPlayerId) {
    return NextResponse.json(
      { error: "sleeperPlayerId is required." },
      { status: 400 }
    );
  }

  if (!validOwnerPreferenceTags.has(tag as AuctionOwnerPreferenceTag)) {
    return NextResponse.json(
      { error: "Invalid draft plan tag." },
      { status: 400 }
    );
  }

  if (preferredEntry === undefined) {
    return NextResponse.json(
      { error: "Preferred Entry must be a whole dollar amount of at least $1." },
      { status: 400 }
    );
  }

  if (plannedCap === undefined) {
    return NextResponse.json(
      { error: "Planned Cap must be a whole dollar amount of at least $1." },
      { status: 400 }
    );
  }

  if (
    preferredEntry !== null &&
    plannedCap !== null &&
    preferredEntry > plannedCap
  ) {
    return NextResponse.json(
      { error: "Preferred Entry cannot exceed Planned Cap." },
      { status: 400 }
    );
  }

  const preference = await upsertAuctionOwnerPreference({
    preference: {
      season,
      ownerProfileId,
      sleeperPlayerId,
      tag: tag as AuctionOwnerPreferenceTag,
      preferredEntry,
      plannedCap,
      note: readNote(body.note),
    },
    updatedBy: actor.email,
  });

  return NextResponse.json({ preference });
}

export async function DELETE(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const body = await readJsonBody(req);
  const ownerProfileId = getActorOwnerProfileId(actor);
  const { season } = readPreferenceScope(searchParams, body, ownerProfileId);
  const sleeperPlayerId =
    readString(body.sleeperPlayerId) ||
    readString(searchParams.get("sleeperPlayerId"));

  if (!sleeperPlayerId) {
    return NextResponse.json(
      { error: "sleeperPlayerId is required." },
      { status: 400 }
    );
  }

  await clearAuctionOwnerPreference({
    season,
    ownerProfileId,
    sleeperPlayerId,
    updatedBy: actor.email,
  });

  return NextResponse.json({ ok: true });
}
