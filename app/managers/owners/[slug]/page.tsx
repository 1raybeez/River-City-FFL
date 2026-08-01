import { notFound } from "next/navigation";
import OwnerProfile from "@/components/managers/OwnerProfile";
import {
  getOwnerProfileStaticParams,
  getOwnerProfileViewModelBySlug,
} from "@/lib/managers/identitySelectors";
import { getOwnerProfileById } from "@/lib/managers/identityData";
import { getOwnerSeasonHistory } from "@/lib/history/ownerSeasonHistory";
import { buildOwnerCareerTimeline } from "@/lib/managers/ownerCareerTimeline";
import {
  loadOwnerCareerMatchupSummary,
  loadOwnerOpponentMatchupSummaries,
  loadOwnerProfileSeasonHistory,
} from "@/lib/managers/ownerMatchupSummaryLoader";

type OwnerProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return getOwnerProfileStaticParams();
}

export default async function OwnerProfilePage({
  params,
}: OwnerProfilePageProps) {
  const { slug } = await params;
  const profile = getOwnerProfileViewModelBySlug(slug);

  if (!profile) notFound();

  const careerTimeline = buildOwnerCareerTimeline(
    profile,
    getOwnerSeasonHistory(profile.owner.id)
  );

  const [
    careerMatchupSummary,
    seasonHistoryEntries,
    opponentMatchupSummaries,
  ] = await Promise.all([
    loadOwnerCareerMatchupSummary(slug),
    loadOwnerProfileSeasonHistory(slug),
    loadOwnerOpponentMatchupSummaries(slug),
  ]);

  if (!careerMatchupSummary) notFound();

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
      profile={profile}
      careerTimeline={careerTimeline}
      careerMatchupSummary={careerMatchupSummary}
      seasonHistoryEntries={seasonHistoryEntries}
      opponentMatchupSummaries={opponentMatchupSummaries}
      opponentIdentities={opponentIdentities}
    />
  );
}
