// /lib/tradeAggressionService.ts

import { collectionGroup, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  computeTradeAggression,
  TradeDoc,
} from "./tradeAggressionEngine";

export async function getTradeAggressionForManager(
  managerRosterId: number
): Promise<number> {
  const tradesRef = collectionGroup(db, "trades");
  const snapshot = await getDocs(tradesRef);

  const trades: TradeDoc[] = snapshot.docs.map(doc => {
    const data = doc.data() as any;

    return {
      tradeId: data.tradeId ?? doc.id,
      year: data.year,
      week: data.week,
      teamIdsInvolved: data.teamIdsInvolved ?? data.roster_ids ?? [],
      valueGap: data.valueGap ?? null,
      waiver_budget: data.waiver_budget ?? null,
      rawSleeperTransaction:
        data.metadata?.rawSleeperTransaction ?? data.rawSleeperTransaction,
    };
  });

  return computeTradeAggression(trades, managerRosterId);
}
