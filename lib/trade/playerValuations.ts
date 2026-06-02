// lib/trade/playerValuations.ts

import { resolveKeeperCostForPlayer } from "@/lib/history/keeperCostResolver";
import { getAllPlayers } from "@/lib/sleeper";

export interface UnifiedPlayerValue {
  playerId: string;
  value: number;
  totalValueScore: number;
  keeperCost: number;        // projected next-season keeper cost
}

export async function calculatePlayerValue(playerId: string): Promise<UnifiedPlayerValue> {
  // 1. Fetch FantasyPros projections
  const fpRes = await fetch(
    `/api/fantasypros/player?playerId=${playerId}`,
    { cache: "no-store" }
  );

  const fantasyPros = fpRes.ok ? await fpRes.json() : {};

  // 2. Fetch Sleeper player metadata directly (no API route)
  const allPlayers = await getAllPlayers();
  const sleeper = allPlayers[playerId] || {};

  // 3. Extract usable metrics from FantasyPros
  const ros = fantasyPros?.rosProjection ?? 0;
  const playoff = fantasyPros?.playoffProjection ?? 0;
  const boom = fantasyPros?.boomRate ?? 0;
  const bust = fantasyPros?.bustRate ?? 0;
  const sos = fantasyPros?.sosScore ?? 0;

  // 4. Extract usable metrics from Sleeper
  const ppg = sleeper?.pts_ppr ?? sleeper?.ppg ?? 0;
  const snaps = sleeper?.snap_share ?? sleeper?.snapsShare ?? 0;
  const targets = sleeper?.tgt_pg ?? sleeper?.targetsPerGame ?? 0;
  const carries = sleeper?.att_pg ?? sleeper?.carriesPerGame ?? 0;
  const redzone = sleeper?.rz_touches_pg ?? sleeper?.redZoneTouchesPerGame ?? 0;

  // 5. Core value score (same logic you already had)
  const valueRaw =
    ros * 0.45 +
    playoff * 0.25 +
    ppg * 0.20 +
    snaps * 10 +
    targets * 1.5 +
    carries * 0.8 +
    redzone * 2 +
    boom * 0.5 -
    bust * 0.3 +
    sos * 0.1;

  const totalValueScore = Math.max(0, Math.round(valueRaw));

  // 6. Keeper cost (real version using transaction history)
  const keeperHistory = Array.isArray(sleeper?.transactions)
    ? sleeper.transactions
    : [];

  const { nextSeasonCost } = resolveKeeperCostForPlayer(playerId, keeperHistory);

  const keeperCost = nextSeasonCost;

  return {
    playerId,
    value: totalValueScore,
    totalValueScore,
    keeperCost,
  };
}
