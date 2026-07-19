import { NextResponse } from "next/server";

import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import {
  getAuctionOwnerProfile,
  type AuctionOwnerProfile,
} from "@/lib/auction/ownerProfiles";
import {
  readAuctionOwnerProfileSettings,
  updateAuctionOwnerProfileSettingsTeamName,
  upsertAuctionOwnerProfileSettings,
} from "@/lib/auction/ownerProfileSettings";
import {
  type AuctionDraftGoal,
  type AuctionKickerDefenseStrategy,
  type AuctionKeeperFocus,
  type AuctionNominationStyle,
  type AuctionPositionPriority,
  type AuctionRiskTolerance,
  type AuctionRookiePreference,
  type AuctionRosterConstruction,
} from "@/lib/auction/ownerProfileSettingsTypes";

export const runtime = "nodejs";

const rosterConstructionValues = new Set<AuctionRosterConstruction>([
  "balanced",
  "stars-and-scrubs",
  "value-heavy",
  "hero-rb",
  "zero-rb",
  "custom",
]);
const riskToleranceValues = new Set<AuctionRiskTolerance>([
  "conservative",
  "balanced",
  "aggressive",
]);
const keeperFocusValues = new Set<AuctionKeeperFocus>([
  "low",
  "medium",
  "high",
]);
const rookiePreferenceValues = new Set<AuctionRookiePreference>([
  "low",
  "medium",
  "high",
]);
const positionPriorityValues = new Set<AuctionPositionPriority>([
  "QB",
  "RB",
  "WR",
  "TE",
]);
const nominationStyleValues = new Set<AuctionNominationStyle>([
  "targets",
  "decoys",
  "mixed",
  "ai",
]);
const kickerDefenseStrategyValues = new Set<AuctionKickerDefenseStrategy>([
  "minimum",
  "elite-small-premium",
  "flexible",
]);
const draftGoalValues = new Set<AuctionDraftGoal>([
  "win-now",
  "balanced",
  "keeper-build",
  "learning",
]);

async function getAuctionActor() {
  try {
    return await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) return null;
    throw error;
  }
}

async function readJsonBody(req: Request) {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readNullableNote(value: unknown) {
  const note = readString(value);
  return note ? note.slice(0, 500) : null;
}

function readEnum<T extends string>(
  value: unknown,
  allowedValues: ReadonlySet<T>,
  fieldName: string
) {
  if (typeof value === "string" && allowedValues.has(value as T)) {
    return value as T;
  }

  throw new Error(`${fieldName} is invalid.`);
}

function readPositionPriorities(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.flatMap((item) => {
        const position =
          typeof item === "string" ? item.trim().toUpperCase() : "";
        return positionPriorityValues.has(position as AuctionPositionPriority)
          ? [position as AuctionPositionPriority]
          : [];
      })
    )
  ).slice(0, 2);
}

function getActorProfile(
  actor: Awaited<ReturnType<typeof requireAuctionWarRoomAccess>>
) {
  const ownerProfileId = actor.access.ownerProfileId;
  if (!ownerProfileId) {
    throw new Error("Authenticated War Room profile is missing ownerProfileId.");
  }

  const profile = getAuctionOwnerProfile(ownerProfileId);
  if (!profile) {
    throw new Error("Authenticated War Room profile is not configured.");
  }

  return profile;
}

function getSafeProfileResponse(profile: AuctionOwnerProfile) {
  return {
    ownerProfileId: profile.ownerProfileId,
    displayName: profile.displayName,
    teamName: profile.teamName,
    avatarUrl: profile.avatarUrl,
    role: profile.role,
    pilotEnabled: profile.pilotEnabled,
    sleeperRosterId: profile.sleeperRosterId,
    sleeperUserId: profile.sleeperUserId,
  };
}

export async function GET() {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const profile = getActorProfile(actor);
  const settings = await readAuctionOwnerProfileSettings({
    ownerProfileId: profile.ownerProfileId,
  });

  return NextResponse.json({
    profile: getSafeProfileResponse(profile),
    settings,
  });
}

export async function PUT(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const profile = getActorProfile(actor);
  if (profile.role !== "pilot-owner" || !profile.pilotEnabled) {
    return NextResponse.json(
      { error: "Pilot onboarding is not required for this profile." },
      { status: 403 }
    );
  }

  try {
    const body = await readJsonBody(req);
    const positionPriorities = readPositionPriorities(body.positionPriorities);

    const settings = await upsertAuctionOwnerProfileSettings({
      settings: {
        season: riverCityAuctionLeagueSettings.season,
        ownerProfileId: profile.ownerProfileId,
        sleeperTeamName: profile.teamName,
        rosterConstruction: readEnum(
          body.rosterConstruction,
          rosterConstructionValues,
          "rosterConstruction"
        ),
        riskTolerance: readEnum(
          body.riskTolerance,
          riskToleranceValues,
          "riskTolerance"
        ),
        keeperFocus: readEnum(
          body.keeperFocus,
          keeperFocusValues,
          "keeperFocus"
        ),
        rookiePreference: readEnum(
          body.rookiePreference,
          rookiePreferenceValues,
          "rookiePreference"
        ),
        positionPriorities,
        nominationStyle: readEnum(
          body.nominationStyle,
          nominationStyleValues,
          "nominationStyle"
        ),
        kickerDefenseStrategy: readEnum(
          body.kickerDefenseStrategy,
          kickerDefenseStrategyValues,
          "kickerDefenseStrategy"
        ),
        draftGoal: readEnum(body.draftGoal, draftGoalValues, "draftGoal"),
        additionalNotes: readNullableNote(body.additionalNotes),
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
      },
      updatedBy: actor.email,
    });

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save onboarding settings.",
      },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  const actor = await getAuctionActor();
  if (!actor) {
    return NextResponse.json(
      { error: "Auction War Room access required." },
      { status: 401 }
    );
  }

  const profile = getActorProfile(actor);
  const body = await readJsonBody(req);
  const sleeperTeamName = readString(body.sleeperTeamName);

  if (!sleeperTeamName) {
    return NextResponse.json(
      { error: "sleeperTeamName is required." },
      { status: 400 }
    );
  }

  await updateAuctionOwnerProfileSettingsTeamName({
    ownerProfileId: profile.ownerProfileId,
    sleeperTeamName,
    updatedBy: actor.email,
  });

  return NextResponse.json({ ok: true });
}
