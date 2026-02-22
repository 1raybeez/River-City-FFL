// lib/history/playerResolver.ts

import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { TradePlayer } from "./computeImbalance";

/**
 * TEMP IMPLEMENTATION:
 * This is a stub that you should wire to your real
 * player/value/keeper data once we decide where it lives.
 */
export async function resolvePlayerForYear(
  playerId: string,
  year: number
): Promise<TradePlayer | null> {
  // TODO: Replace this with your real lookup.
  // Example (if you later store players under `players/{year}/{playerId}`):
  //
  // const ref = doc(db, "players", String(year), "players", playerId);
  // const snap = await getDoc(ref);
  // if (!snap.exists()) return null;
  // const data = snap.data();
  // return {
  //   id: playerId,
  //   name: data.name,
  //   position: data.position,
  //   value: data.value,
  //   keeperCost: data.keeperCost,
  // };

  return {
    id: playerId,
    name: `Player ${playerId}`,
    position: "UNK",
    value: 0,
    keeperCost: null,   // ✅ FIXED — Firestore-safe
  };
}
