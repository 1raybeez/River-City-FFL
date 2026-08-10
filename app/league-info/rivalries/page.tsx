import RivalryHubClient from "@/components/league-info/RivalryHubClient";
import { loadRivalryHubPresentation } from "@/lib/managers/rivalryHubLoader";

export default async function RivalryHubPage() {
  const presentation = await loadRivalryHubPresentation();
  return <RivalryHubClient presentation={presentation} />;
}
