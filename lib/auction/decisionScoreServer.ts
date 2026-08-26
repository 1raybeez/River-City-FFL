import "server-only";

import {
  rankShadowDecisionScores,
  type ShadowDecisionState,
  type ShadowDecisionResult,
} from "@/lib/auction/decisionScore";
import type {
  RecommendedNowAdpRow,
  RecommendedNowPurchase,
  RecommendedNowValueRow,
} from "@/lib/auction/recommendedNow";
import type { CalibrationPlayer } from "@/lib/auction/decisionScoreCalibration";

/** Server-side adapter for an already assembled War Room state. It has no route and performs no writes. */
export function buildShadowDecisionScoresFromWarRoomState({
  values,
  adp,
  purchases,
  state,
}: {
  values: readonly RecommendedNowValueRow[];
  adp: readonly RecommendedNowAdpRow[];
  purchases: readonly RecommendedNowPurchase[];
  state: ShadowDecisionState;
}): ShadowDecisionResult[] {
  const adpById = new Map(adp.map((row) => [row.playerId, row]));
  const purchasedIds = new Set(purchases.map((purchase) => purchase.playerId).filter((id): id is string => Boolean(id)));
  const players: CalibrationPlayer[] = values.flatMap((value) => {
    if (purchasedIds.has(value.playerId) || value.auctionConsensus === null) return [];
    const adpRow = adpById.get(value.playerId);
    return [{
      playerId: value.playerId,
      playerName: value.playerName,
      position: value.position,
      nflTeam: value.nflTeam,
      auctionConsensus: value.auctionConsensus,
      auctionSourceCount: value.auctionSourceCount,
      auctionConfidenceScore: null,
      auctionLow: value.auctionLow,
      auctionHigh: value.auctionHigh,
      adp: adpRow?.adp ?? null,
      adpSourceCount: adpRow?.sourceCount ?? 0,
    }];
  });
  return rankShadowDecisionScores(players, state);
}
