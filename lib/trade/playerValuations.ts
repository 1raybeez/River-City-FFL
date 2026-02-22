export interface UnifiedPlayerValue {
  playerId: string;
  value: number;
  totalValueScore: number;
  keeperCost: number;
}

export async function calculatePlayerValue(playerId: string): Promise<UnifiedPlayerValue> {
  // 1. Fetch FantasyPros projections
  const fpRes = await fetch(
    `/api/fantasypros/player?playerId=${playerId}`,
    { cache: "no-store" }
  );

  const fantasyPros = fpRes.ok ? await fpRes.json() : {};

  // 2. Fetch Sleeper usage stats
  const slRes = await fetch(
    `/api/sleeper/player?playerId=${playerId}`,
    { cache: "no-store" }
  );

  const sleeper = slRes.ok ? await slRes.json() : {};

  // 3. Extract usable metrics
  const ros = fantasyPros?.rosProjection ?? 0;
  const playoff = fantasyPros?.playoffProjection ?? 0;
  const boom = fantasyPros?.boomRate ?? 0;
  const bust = fantasyPros?.bustRate ?? 0;
  const sos = fantasyPros?.sosScore ?? 0;

  const ppg = sleeper?.ppg ?? 0;
  const snaps = sleeper?.snapsShare ?? 0;
  const targets = sleeper?.targetsPerGame ?? 0;
  const carries = sleeper?.carriesPerGame ?? 0;
  const redzone = sleeper?.redZoneTouchesPerGame ?? 0;

  // 4. Core value score
  const value =
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

  // 5. Keeper cost (placeholder until Firebase integration)
  const keeperCost = sleeper?.draftPrice ?? 0;

  // 6. Total value score (what your fairness engine uses)
  const totalValueScore = Math.max(0, Math.round(value));

  return {
    playerId,
    value: totalValueScore,
    totalValueScore,
    keeperCost
  };
}
