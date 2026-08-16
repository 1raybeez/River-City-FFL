import "server-only";

import { getRiverCitySeasonConfig } from "@/lib/season/seasonConfig";
import { getRiverCityAuctionDraftStatus } from "@/lib/sleeper";
import { resolveBoxOneState, type BoxOneState } from "@/lib/home/boxOneState";

export async function getHomeBoxOneState(season = 2026, now = new Date()): Promise<BoxOneState> {
  const seasonConfig = getRiverCitySeasonConfig(season);
  try {
    const draft = await getRiverCityAuctionDraftStatus(season);
    return resolveBoxOneState({ season, draftStatus: draft.status, draftId: draft.draftId, draftStartAt: draft.draftStartAt, seasonConfig, now });
  } catch {
    return resolveBoxOneState({ season, draftStatus: "unknown", seasonConfig, now });
  }
}
