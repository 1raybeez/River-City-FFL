import { notFound } from "next/navigation";
import OwnerProfile from "@/components/managers/OwnerProfile";
import {
  getOwnerProfileStaticParams,
  getOwnerProfileViewModelBySlug,
} from "@/lib/managers/identitySelectors";
import { getOwnerProfileById } from "@/lib/managers/identityData";
import {
  loadOwnerCareerMatchupSummary,
  loadOwnerOpponentMatchupSummaries,
  loadOwnerSeasonMatchupSummaries,
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

  const [
    careerMatchupSummary,
    seasonMatchupSummaries,
    opponentMatchupSummaries,
  ] = await Promise.all([
    loadOwnerCareerMatchupSummary(slug),
    loadOwnerSeasonMatchupSummaries(slug),
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
      careerMatchupSummary={careerMatchupSummary}
      seasonMatchupSummaries={seasonMatchupSummaries}
      opponentMatchupSummaries={opponentMatchupSummaries}
      opponentIdentities={opponentIdentities}
    />
  );
}
