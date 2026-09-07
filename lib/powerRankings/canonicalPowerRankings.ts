import "server-only";

import { getPreseasonPowerRankings } from "@/lib/powerRankings/preseasonAdapter";
import type { CanonicalPowerRankings } from "@/lib/powerRankings/types";

export async function getCanonicalPowerRankings(): Promise<CanonicalPowerRankings> {
  return getPreseasonPowerRankings();
}
