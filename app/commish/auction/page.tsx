import { redirect } from "next/navigation";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import { readPublishedAdpConsensusFromFirestore } from "@/lib/auction/adpRefreshService";
import { readAuctionOwnerPreferences } from "@/lib/auction/ownerPreferences";
import { readAuctionOwnerProfileSettings } from "@/lib/auction/ownerProfileSettings";
import { readAuctionPurchaseDecisionSnapshots } from "@/lib/auction/purchaseDecisions";
import { readPublishedMasterviewFromFirestore } from "@/lib/auction/valueRefreshService";
import AuctionWarRoomClient from "./AuctionWarRoomClient";
import type {
  AuctionWarRoomInitialAdpSource,
  AuctionWarRoomInitialOwnerPreference,
  AuctionWarRoomInitialOwnerSettings,
  AuctionWarRoomInitialPurchaseDecision,
  AuctionWarRoomInitialValueSource,
} from "./AuctionWarRoomClient";

async function readInitialAuctionValueSource(): Promise<
  AuctionWarRoomInitialValueSource | undefined
> {
  const configuredSource = process.env.AUCTION_VALUES_SOURCE;
  const shouldUsePublishedValues =
    configuredSource === "firestore" ||
    (configuredSource !== "local" && process.env.NODE_ENV === "production");

  if (!shouldUsePublishedValues) return undefined;

  try {
    const publishedMasterview = await readPublishedMasterviewFromFirestore(2026);

    if (!publishedMasterview) {
      return {
        file: null,
        label: "FantasyPros 2026 generated values",
        shortLabel: "FantasyPros 2026",
        path: "data/auction/generated/masterview-2026.json",
        warning: "Using local fallback values; no published Firestore run found.",
      };
    }

    return {
      file: publishedMasterview,
      label: "Published 2026 auction values",
      shortLabel: "Published 2026",
      path: `Firestore run ${publishedMasterview.activeRunId}`,
      activeRunId: publishedMasterview.activeRunId,
      warning: null,
    };
  } catch (error) {
    return {
      file: null,
      label: "FantasyPros 2026 generated values",
      shortLabel: "FantasyPros 2026",
      path: "data/auction/generated/masterview-2026.json",
      warning:
        error instanceof Error
          ? `Using local fallback values; ${error.message}`
          : "Using local fallback values; Firestore values unavailable.",
    };
  }
}

async function readInitialAuctionAdpSource(): Promise<
  AuctionWarRoomInitialAdpSource | undefined
> {
  const configuredSource = process.env.AUCTION_ADP_SOURCE;
  const shouldUsePublishedAdp =
    configuredSource === "firestore" ||
    (configuredSource !== "local" && process.env.NODE_ENV === "production");

  if (!shouldUsePublishedAdp) return undefined;

  try {
    const publishedAdp = await readPublishedAdpConsensusFromFirestore(2026);

    if (!publishedAdp) {
      return {
        file: null,
        label: "Local 2026 ADP consensus",
        shortLabel: "Local ADP 2026",
        warning: "Using local ADP fallback; no published Firestore ADP run found.",
      };
    }

    return {
      file: publishedAdp,
      label: "Published 2026 ADP consensus",
      shortLabel: "Published ADP 2026",
      activeRunId: publishedAdp.activeRunId,
      warning: null,
    };
  } catch (error) {
    return {
      file: null,
      label: "Local 2026 ADP consensus",
      shortLabel: "Local ADP 2026",
      warning:
        error instanceof Error
          ? `Using local ADP fallback; ${error.message}`
          : "Using local ADP fallback; Firestore ADP unavailable.",
    };
  }
}

async function readInitialOwnerPreferences(
  ownerProfileId: string
): Promise<AuctionWarRoomInitialOwnerPreference[]> {
  try {
    return await readAuctionOwnerPreferences({ ownerProfileId });
  } catch (error) {
    console.warn("[auction-owner-preferences] Initial read failed", {
      error:
        error instanceof Error
          ? error.message
          : "Unknown owner preference read error.",
    });
    return [];
  }
}

async function readInitialOwnerSettings(
  ownerProfileId: string
): Promise<AuctionWarRoomInitialOwnerSettings | null> {
  try {
    return await readAuctionOwnerProfileSettings({ ownerProfileId });
  } catch (error) {
    console.warn("[auction-owner-settings] Initial read failed", {
      error:
        error instanceof Error
          ? error.message
          : "Unknown owner settings read error.",
    });
    return null;
  }
}

async function readInitialPurchaseDecisions(
  canRecordSales: boolean
): Promise<AuctionWarRoomInitialPurchaseDecision[]> {
  if (!canRecordSales) return [];

  try {
    return await readAuctionPurchaseDecisionSnapshots();
  } catch (error) {
    console.warn("[auction-purchase-decisions] Initial read failed", {
      error:
        error instanceof Error
          ? error.message
          : "Unknown purchase decision read error.",
    });
    return [];
  }
}

export default async function AuctionWarRoomPage() {
  let actor: Awaited<ReturnType<typeof requireAuctionWarRoomAccess>>;
  try {
    actor = await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect("/commish/auction/login");
    }

    throw error;
  }

  const ownerProfileId = actor.access.ownerProfileId;
  if (!ownerProfileId) {
    redirect("/commish/auction/login");
  }

  const initialOwnerSettings = await readInitialOwnerSettings(ownerProfileId);

  if (
    actor.access.role === "pilot-owner" &&
    !initialOwnerSettings?.onboardingCompleted
  ) {
    redirect("/commish/auction/onboarding");
  }

  const [
    initialValueSource,
    initialAdpSource,
    initialOwnerPreferences,
    initialPurchaseDecisions,
  ] = await Promise.all([
    readInitialAuctionValueSource(),
    readInitialAuctionAdpSource(),
    readInitialOwnerPreferences(ownerProfileId),
    readInitialPurchaseDecisions(actor.access.canRecordSales),
  ]);

  return (
    <AuctionWarRoomClient
      access={actor.access}
      initialValueSource={initialValueSource}
      initialAdpSource={initialAdpSource}
      initialOwnerPreferences={initialOwnerPreferences}
      initialOwnerSettings={initialOwnerSettings}
      initialPurchaseDecisions={initialPurchaseDecisions}
    />
  );
}
