import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import {
  clearAuctionOwnerPreference,
  readAuctionOwnerPreferences,
  updateAuctionOwnerPreference,
} from "@/lib/auction/ownerPreferences";
import {
  type AuctionOwnerPreferenceTag,
} from "@/lib/auction/ownerPreferenceTypes";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { assertAuthorizedWarRoomRequest } from "@/lib/auction/warRoomScope";

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

function assertRequestScope(
  actor: Awaited<ReturnType<typeof requireAuctionWarRoomAccess>>,
  searchParams: URLSearchParams,
  body: Record<string, unknown> = {}
) {
  if (!actor.access.warRoomId) {
    const hasRequestedScope = Object.values(body).some(Boolean) ||
      searchParams.has("warRoomId") ||
      searchParams.has("ownerProfileId") ||
      searchParams.has("ownerId") ||
      searchParams.has("franchiseId") ||
      searchParams.has("rosterId");
    if (hasRequestedScope) {
      throw new Error("Requested War Room scope is not authorized.");
    }
    return;
  }
  assertAuthorizedWarRoomRequest(actor.access, {
    ownerId: readString(body.ownerId ?? searchParams.get("ownerId")),
    ownerProfileId: readString(
      body.ownerProfileId ?? searchParams.get("ownerProfileId")
    ),
    franchiseId: readString(body.franchiseId ?? searchParams.get("franchiseId")),
    warRoomId: readString(body.warRoomId ?? searchParams.get("warRoomId")),
    rosterId:
      typeof body.rosterId === "string" || typeof body.rosterId === "number"
        ? body.rosterId
        : searchParams.get("rosterId"),
  });
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
  assertRequestScope(actor, searchParams);
  const ownerProfileId = getActorOwnerProfileId(actor);
  const preferences = await readAuctionOwnerPreferences({
    season: readSeason(searchParams.get("season")),
    ownerProfileId,
    warRoomId: actor.access.warRoomId ?? undefined,
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
  assertRequestScope(actor, searchParams, body);
  const ownerProfileId = getActorOwnerProfileId(actor);
  const { season } = readPreferenceScope(searchParams, body, ownerProfileId);
  const sleeperPlayerId = readString(body.sleeperPlayerId);
  const hasTag = Object.prototype.hasOwnProperty.call(body, "tag");
  const hasPreferredEntry =
    Object.prototype.hasOwnProperty.call(body, "preferredEntry") ||
    Object.prototype.hasOwnProperty.call(body, "openingBid");
  const hasPlannedCap =
    Object.prototype.hasOwnProperty.call(body, "plannedCap") ||
    Object.prototype.hasOwnProperty.call(body, "hardCap");
  const hasNote = Object.prototype.hasOwnProperty.call(body, "note");
  const tag = hasTag ? readString(body.tag) : null;
  const preferredEntry = hasPreferredEntry
    ? readNullableDollar(body.preferredEntry ?? body.openingBid)
    : null;
  const plannedCap = hasPlannedCap
    ? readNullableDollar(body.plannedCap ?? body.hardCap)
    : null;

  if (!sleeperPlayerId) {
    return NextResponse.json(
      { error: "sleeperPlayerId is required." },
      { status: 400 }
    );
  }

  if (hasTag && !validOwnerPreferenceTags.has(tag as AuctionOwnerPreferenceTag)) {
    return NextResponse.json(
      { error: "Invalid draft plan tag." },
      { status: 400 }
    );
  }

  if (hasPreferredEntry && preferredEntry === undefined) {
    return NextResponse.json(
      { error: "Preferred Entry must be a whole dollar amount of at least $1." },
      { status: 400 }
    );
  }

  if (hasPlannedCap && plannedCap === undefined) {
    return NextResponse.json(
      { error: "Planned Cap must be a whole dollar amount of at least $1." },
      { status: 400 }
    );
  }

  if (
    hasPreferredEntry &&
    hasPlannedCap &&
    preferredEntry !== undefined &&
    plannedCap !== undefined &&
    preferredEntry !== null &&
    plannedCap !== null &&
    preferredEntry > plannedCap
  ) {
    return NextResponse.json(
      { error: "Preferred Entry cannot exceed Planned Cap." },
      { status: 400 }
    );
  }

  if (!hasTag && !hasPreferredEntry && !hasPlannedCap && !hasNote) {
    return NextResponse.json(
      { error: "At least one draft plan field must be provided." },
      { status: 400 }
    );
  }

  let preference;
  try {
    preference = await updateAuctionOwnerPreference({
      season,
      ownerProfileId,
      sleeperPlayerId,
      patch: {
        ...(hasTag ? { tag: tag as AuctionOwnerPreferenceTag } : {}),
        ...(hasPreferredEntry ? { preferredEntry: preferredEntry ?? null } : {}),
        ...(hasPlannedCap ? { plannedCap: plannedCap ?? null } : {}),
        ...(hasNote ? { note: readNote(body.note) } : {}),
      },
      updatedBy: actor.email,
      warRoomId: actor.access.warRoomId ?? undefined,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save draft plan." },
      { status: 400 }
    );
  }

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
  assertRequestScope(actor, searchParams, body);
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
    warRoomId: actor.access.warRoomId ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
