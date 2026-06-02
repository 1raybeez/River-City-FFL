// /lib/timeline/injuryEngine.ts
//
// Injury impact engine for timeline scoring.
// Uses simple, robust rules based on Sleeper-style injury fields.

export interface InjuryInputPlayer {
  playerId: string;
  fullName: string;
  position?: string;
  injuryStatus?: string | null;
  injuryBodyPart?: string | null;
}

export interface InjuryOutput {
  startersOut: number;
  totalInjuries: number;
  impactScore: number;
}

function severityWeight(status: string | null | undefined): number {
  if (!status) return 0;

  const s = status.toUpperCase();

  if (s === "OUT" || s === "IR" || s === "PUP" || s === "NFI") return 3;
  if (s === "DOUBTFUL") return 2;
  if (s === "QUESTIONABLE") return 1;

  return 0;
}

export function computeInjuryImpact(players: InjuryInputPlayer[]): InjuryOutput {
  if (!players || players.length === 0) {
    return { startersOut: 0, totalInjuries: 0, impactScore: 0 };
  }

  let startersOut = 0;
  let totalInjuries = 0;
  let impactScore = 0;

  for (const p of players) {
    const weight = severityWeight(p.injuryStatus);
    if (weight === 0) continue;

    totalInjuries += 1;
    impactScore += weight;

    // Treat severe statuses as "starters out" for now
    if (weight >= 2) {
      startersOut += 1;
    }
  }

  return {
    startersOut,
    totalInjuries,
    impactScore,
  };
}
