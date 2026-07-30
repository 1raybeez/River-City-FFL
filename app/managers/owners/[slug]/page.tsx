import { notFound } from "next/navigation";
import OwnerProfile from "@/components/managers/OwnerProfile";
import {
  getOwnerProfileStaticParams,
  getOwnerProfileViewModelBySlug,
} from "@/lib/managers/identitySelectors";
import {
  loadOwnerCareerMatchupSummary,
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

  const [careerMatchupSummary, seasonMatchupSummaries] = await Promise.all([
    loadOwnerCareerMatchupSummary(slug),
    loadOwnerSeasonMatchupSummaries(slug),
  ]);

  if (!careerMatchupSummary) notFound();

  return (
    <OwnerProfile
      profile={profile}
      careerMatchupSummary={careerMatchupSummary}
      seasonMatchupSummaries={seasonMatchupSummaries}
    />
  );
}
