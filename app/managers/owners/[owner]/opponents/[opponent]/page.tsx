import { notFound } from "next/navigation";
import OwnerHeadToHeadPage from "@/components/managers/OwnerHeadToHeadPage";
import {
  loadOwnerHeadToHeadPresentation,
  loadOwnerHeadToHeadStaticParams,
} from "@/lib/managers/ownerHeadToHeadLoader";

type OwnerHeadToHeadRouteProps = Readonly<{
  params: Promise<{
    owner: string;
    opponent: string;
  }>;
}>;

export async function generateStaticParams() {
  return [...(await loadOwnerHeadToHeadStaticParams())];
}

export default async function OwnerHeadToHeadRoute({
  params,
}: OwnerHeadToHeadRouteProps) {
  const { owner, opponent } = await params;
  const presentation = await loadOwnerHeadToHeadPresentation(owner, opponent);
  if (!presentation) notFound();

  return <OwnerHeadToHeadPage presentation={presentation} />;
}
