import { notFound } from "next/navigation";
import OwnerProfile from "@/components/managers/OwnerProfile";
import {
  getOwnerProfileStaticParams,
  getOwnerProfileViewModelBySlug,
} from "@/lib/managers/identitySelectors";
import { getOwnerProfileById } from "@/lib/managers/identityData";
import { getOwnerSeasonHistory } from "@/lib/history/ownerSeasonHistory";
import { getOwnerCareerSummary } from "@/lib/history/ownerCareerSummary";
import { buildOwnerCareerTimeline } from "@/lib/managers/ownerCareerTimeline";
import { toPublicOwnerProfileViewModel } from "@/lib/managers/ownerProfilePresentation";
import {
  loadOwnerCareerMatchupSummary,
  loadOwnerOpponentMatchupSummaries,
  loadOwnerProfileSeasonHistory,
  loadSupportedOwnerHeadToHeadOpponentIds,
} from "@/lib/managers/ownerMatchupSummaryLoader";
import { loadOwnerFranchiseLegacy } from "@/lib/managers/franchiseHistoryLoader";

type OwnerProfilePageProps = {
  params: Promise<{
    owner: string;
  }>;
};

export function generateStaticParams() {
  return getOwnerProfileStaticParams().map(({ slug }) => ({ owner: slug }));
}

export default async function OwnerProfilePage({
  params,
}: OwnerProfilePageProps) {
  const { owner } = await params;
  const profile = getOwnerProfileViewModelBySlug(owner);

  if (!profile) notFound();

  const careerTimeline = buildOwnerCareerTimeline(
    profile,
    getOwnerSeasonHistory(profile.owner.id)
  );
  const ownerCareerSummary = getOwnerCareerSummary(profile.owner.id);

  if (!ownerCareerSummary) notFound();

  const [
    careerMatchupSummary,
    seasonHistoryEntries,
    opponentMatchupSummaries,
    supportedHeadToHeadOpponentIds,
    franchiseLegacy,
  ] = await Promise.all([
    loadOwnerCareerMatchupSummary(owner),
    loadOwnerProfileSeasonHistory(owner),
    loadOwnerOpponentMatchupSummaries(owner),
    loadSupportedOwnerHeadToHeadOpponentIds(owner),
    loadOwnerFranchiseLegacy(owner),
  ]);

  if (!careerMatchupSummary || !franchiseLegacy) notFound();

  const publicProfile = toPublicOwnerProfileViewModel(profile);

  const opponentIdentities = opponentMatchupSummaries.flatMap((summary) => {
    const opponent = getOwnerProfileById(summary.opponentOwnerId);
    return opponent
      ? [
          {
            ownerId: opponent.id,
            slug: opponent.slug,
            fullName: opponent.fullName,
            photo: opponent.photo,
          },
        ]
      : [];
  });

  return (
    <OwnerProfile
      profile={publicProfile}
      careerTimeline={careerTimeline}
      ownerCareerSummary={ownerCareerSummary}
      careerMatchupSummary={careerMatchupSummary}
      seasonHistoryEntries={seasonHistoryEntries}
      opponentMatchupSummaries={opponentMatchupSummaries}
      opponentIdentities={opponentIdentities}
      supportedHeadToHeadOpponentIds={supportedHeadToHeadOpponentIds}
      franchiseLegacy={franchiseLegacy}
    />
  );
}
