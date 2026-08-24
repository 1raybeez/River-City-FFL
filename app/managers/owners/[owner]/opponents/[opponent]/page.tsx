import { notFound } from "next/navigation";
import OwnerHeadToHeadPage from "@/components/managers/OwnerHeadToHeadPage";
import { loadOwnerHeadToHeadPresentation } from "@/lib/managers/ownerHeadToHeadLoader";

export const dynamic = "force-dynamic";

type OwnerHeadToHeadRouteProps = Readonly<{
  params: Promise<{
    owner: string;
    opponent: string;
  }>;
}>;

export default async function OwnerHeadToHeadRoute({
  params,
}: OwnerHeadToHeadRouteProps) {
  const { owner, opponent } = await params;
  const presentation = await loadOwnerHeadToHeadPresentation(owner, opponent);
  if (!presentation) notFound();

  return <OwnerHeadToHeadPage presentation={presentation} />;
}
