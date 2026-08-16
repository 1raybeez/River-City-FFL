import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
  requireAuctionSalesAccess,
} from "@/lib/auth/auctionAccess";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import {
  markAuctionPurchaseDecisionUndone,
  readAuctionPurchaseDecisionSnapshots,
  recordAuctionPurchaseAtomically,
  AuctionPurchaseIntegrityError,
} from "@/lib/auction/purchaseDecisions";
import type { AuctionPurchaseDecisionSnapshot } from "@/lib/auction/purchaseDecisionTypes";
import { readAuthorizedWarRoomPurchaseSnapshots } from "@/lib/auction/warRoomPurchaseView";
import { getCanonicalAuctionTeamById } from "@/lib/auction/canonicalTeamCatalog";
import { getSleeperPlayerIdentityDirectory } from "@/lib/sleeper";

export const runtime = "nodejs";

async function getAuctionActor() {
  try {
    return await requireAuctionSalesAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return null;
    }

    throw error;
  }
}

async function getAuctionReadActor() {
  try {
    return await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
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

async function readJsonBody(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readNullableString(value: unknown) {
  const text = readString(value);
  return text ? text : null;
}

function readNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

function readRequiredWholeDollar(value: unknown) {
  const amount = Number(value);
  return Number.isInteger(amount) && amount >= 0 ? amount : null;
}

function readSnapshotBody(
  body: Record<string, unknown>
): Omit<
  AuctionPurchaseDecisionSnapshot,
  "capturedAt" | "capturedBy" | "undoneAt" | "undoneBy"
> | null {
  const purchaseId = readString(body.purchaseId);
  const season = readSeason(body.season);
  const playerName = readString(body.playerName);
  const source = readString(body.source);
  const salePrice = readRequiredWholeDollar(body.salePrice);

  if (
    !purchaseId ||
    !playerName ||
    salePrice === null ||
    (source !== "manual-local" && source !== "sleeper-draft")
  ) {
    return null;
  }

  const readNumber = (value: unknown) => {
    const amount = readNullableNumber(value);
    return amount === undefined ? null : amount;
  };

  return {
    purchaseId,
    season,
    sleeperPlayerId: readNullableString(body.sleeperPlayerId),
    playerName,
    position: readNullableString(body.position),
    nflTeam: readNullableString(body.nflTeam),
    buyerOwnerProfileId: readNullableString(body.buyerOwnerProfileId),
    buyerTeamId: readNullableString(body.buyerTeamId),
    buyerRosterId: readNumber(body.buyerRosterId),
    source,
    status: "active",
    salePrice,
    purchaseOrder: readNumber(body.purchaseOrder),
    purchasedAt: readNullableString(body.purchasedAt),
    tagAtPurchase: readNullableString(body.tagAtPurchase),
    preferredEntryAtPurchase: readNumber(body.preferredEntryAtPurchase),
    plannedCapAtPurchase: readNumber(body.plannedCapAtPurchase),
    liveOverrideAtPurchase: readNumber(body.liveOverrideAtPurchase),
    marketValueAtPurchase: readNumber(body.marketValueAtPurchase),
    recommendedMaxAtPurchase: readNumber(body.recommendedMaxAtPurchase),
    currentAiCeilingAtPurchase: readNumber(body.currentAiCeilingAtPurchase),
    legalMaxAtPurchase: readNumber(body.legalMaxAtPurchase),
    predictedSaleAtPurchase: readNumber(body.predictedSaleAtPurchase),
    adpAtPurchase: readNumber(body.adpAtPurchase),
    demandTierAtPurchase: readNullableString(body.demandTierAtPurchase),
    inflationAtPurchase: readNumber(body.inflationAtPurchase),
    roomIntelligenceSummary: readNullableString(body.roomIntelligenceSummary),
    competitionSummary: readNullableString(body.competitionSummary),
    plannedCapVariance: readNumber(body.plannedCapVariance),
    marketVariance: readNumber(body.marketVariance),
    recommendedMaxVariance: readNumber(body.recommendedMaxVariance),
    aiCeilingVariance: readNumber(body.aiCeilingVariance),
  };
}

export async function GET(req: Request) {
  const actor = await getAuctionReadActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room sales access required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const season = readSeason(searchParams.get("season"));
  const snapshots = actor.access.canRecordSales
    ? await readAuctionPurchaseDecisionSnapshots({ season })
    : await readAuthorizedWarRoomPurchaseSnapshots({
        access: actor.access,
        season,
        requestedScope: {
          ownerId: searchParams.get("ownerId"),
          ownerProfileId: searchParams.get("ownerProfileId"),
          franchiseId: searchParams.get("franchiseId"),
          warRoomId: searchParams.get("warRoomId"),
          rosterId: searchParams.get("rosterId"),
        },
      });

  return NextResponse.json({ snapshots });
}

export async function POST(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room sales access required." },
      { status: 401 }
    );
  }

  const snapshot = readSnapshotBody(await readJsonBody(req));
  if (!snapshot) {
    return NextResponse.json(
      { error: "A valid purchase decision snapshot is required." },
      { status: 400 }
    );
  }

  const buyerTeamId = readString(snapshot.buyerTeamId);
  const buyerRosterId = Number(snapshot.buyerRosterId);
  const buyerTeam = getCanonicalAuctionTeamById(buyerTeamId);
  if (!buyerTeam || !Number.isInteger(buyerRosterId) || buyerTeam.rosterId !== buyerRosterId) {
    return NextResponse.json(
      { error: "The selected buyer franchise and roster are not a canonical 2026 match." },
      { status: 400 }
    );
  }

  if (!snapshot.sleeperPlayerId) {
    return NextResponse.json({ error: "A valid player ID is required." }, { status: 400 });
  }
  const playerDirectory = await getSleeperPlayerIdentityDirectory();
  if (!playerDirectory[snapshot.sleeperPlayerId]) {
    return NextResponse.json(
      { error: "The selected player could not be resolved from Sleeper." },
      { status: 400 }
    );
  }

  try {
    const result = await recordAuctionPurchaseAtomically({
      snapshot,
      capturedBy: actor.access.canonicalOwnerId ?? "commissioner",
      buyerTeamId: buyerTeam.id,
      buyerRosterId: buyerTeam.rosterId,
      buyerOwnerProfileId: buyerTeam.managerId,
      buyerWarRoomId: buyerTeam.warRoomId,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuctionPurchaseIntegrityError) {
      const status = error.code === "stale-state" ? 409 : 400;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json(
      { error: "Purchase could not be persisted. Keep the sale details and retry." },
      { status: 503 }
    );
  }
}

export async function DELETE(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room sales access required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const body = await readJsonBody(req);
  const purchaseId =
    readString(body.purchaseId) || readString(searchParams.get("purchaseId"));

  if (!purchaseId) {
    return NextResponse.json(
      { error: "purchaseId is required." },
      { status: 400 }
    );
  }

  const result = await markAuctionPurchaseDecisionUndone({
    season: readSeason(body.season ?? searchParams.get("season")),
    purchaseId,
    undoneBy: actor.access.canonicalOwnerId ?? "commissioner",
  });

  return NextResponse.json(result);
}
