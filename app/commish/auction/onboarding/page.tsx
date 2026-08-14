import { redirect } from "next/navigation";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import { getAuctionOwnerProfile } from "@/lib/auction/ownerProfiles";
import { readAuctionOwnerProfileSettings } from "@/lib/auction/ownerProfileSettings";
import OnboardingClient from "./OnboardingClient";

export default async function AuctionOnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  let actor: Awaited<ReturnType<typeof requireAuctionWarRoomAccess>>;

  try {
    actor = await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect("/commish/auction/login?returnTo=%2Fcommish%2Fauction%2Fonboarding");
    }

    throw error;
  }

  const ownerProfileId = actor.access.ownerProfileId;
  if (!ownerProfileId) redirect("/commish/auction/login?returnTo=%2Fcommish%2Fauction%2Fonboarding");

  const profile = getAuctionOwnerProfile(ownerProfileId);
  if (!profile) redirect("/commish/auction/login?returnTo=%2Fcommish%2Fauction%2Fonboarding");

  if (profile.role !== "pilot-owner" || !profile.pilotEnabled) {
    redirect("/commish/auction");
  }

  const settings = await readAuctionOwnerProfileSettings({ ownerProfileId });
  const resolvedSearchParams = await searchParams;
  const isEditing = resolvedSearchParams?.edit === "1";

  if (settings?.onboardingCompleted && !isEditing) {
    redirect("/commish/auction");
  }

  return (
    <OnboardingClient
      profile={{
        ownerProfileId: profile.ownerProfileId,
        displayName: profile.displayName,
        teamName: profile.teamName,
        avatarUrl: profile.avatarUrl,
      }}
      initialSettings={settings}
    />
  );
}
