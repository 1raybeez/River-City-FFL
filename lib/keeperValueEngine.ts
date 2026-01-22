// lib/keeperValueEngine.ts

// This module is the central "brain" for player value.
// It combines:
// 1–3: Sleeper (draft, FAAB, stats)
// 4–5: FantasyPros (projections, SOS, ECR, boom/bust)
// And outputs a single value object per player.

export type Position = "QB" | "RB" | "WR" | "TE";

export interface PlayerIdentity {
  playerId: string;      // Sleeper player_id
  name: string;
  pos: Position;
  team: string;
}

export interface KeeperInputs {
  draftPrice?: number | null;
  faabBids?: number[];   // all FAAB bids for this player this season
  keeperEligible: boolean;
}

export interface SleeperStatsInputs {
  fantasyPointsPerGame?: number;
  gamesPlayed?: number;
  snapsShare?: number;       // 0–1
  targetsPerGame?: number;
  carriesPerGame?: number;
  redZoneTouchesPerGame?: number;
}

export interface FantasyProsInputs {
  rosProjection?: number;    // rest-of-season projected points
  playoffProjection?: number; // weeks 15–17 projected points
  sosScore?: number;         // higher = easier schedule
  ecrRank?: number;          // lower = better
  boomRate?: number;         // 0–1
  bustRate?: number;         // 0–1
}

export interface TeamContextInputs {
  rosterNeedScore: number;   // -1 (no need) to +1 (huge need)
  depthScore: number;        // -1 (deep) to +1 (thin)
  byeWeekConflictScore: number; // -1 (bad overlap) to +1 (clean)
  contenderScore: number;    // -1 (rebuild) to +1 (all-in contender)
}

export interface PlayerValueResult {
  player: PlayerIdentity;
  keeperCost: number | null;
  keeperEligible: boolean;
  keeperValueScore: number;
  currentProductionScore: number;
  futureProductionScore: number;
  sosScore: number;
  playoffBoostScore: number;
  riskScore: number;
  positionalScarcityScore: number;
  teamContextAdjustment: number;
  totalValueScore: number;
}

// ---------- CORE HELPERS ----------

function calculateKeeperCost(inputs: KeeperInputs): number | null {
  if (!inputs.keeperEligible) return null;

  const draft = inputs.draftPrice ?? 0;
  const highestFaab = inputs.faabBids && inputs.faabBids.length > 0
    ? Math.max(...inputs.faabBids)
    : 0;

  const highestPrice = Math.max(draft, highestFaab, 0);
  return highestPrice + 10;
}

function positionalMultiplier(pos: Position): number {
  const map: Record<Position, number> = {
    QB: 1.4,
    RB: 1.8,
    WR: 1.6,
    TE: 1.2
  };
  return map[pos] ?? 1;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return (clamped - min) / (max - min); // 0–1
}

// ---------- SCORING PIECES ----------

function scoreKeeperValue(
  keeperCost: number | null,
  inputs: KeeperInputs,
  fantasyPros: FantasyProsInputs,
  pos: Position
): number {
  if (!inputs.keeperEligible || keeperCost == null) return 0;

  // Higher ROS projection + lower cost = better keeper value
  const projection = fantasyPros.rosProjection ?? 0;
  const costPenalty = keeperCost; // raw dollars

  const posMult = positionalMultiplier(pos);

  const raw = projection * posMult - costPenalty * 2;
  return raw;
}

function scoreCurrentProduction(stats: SleeperStatsInputs, pos: Position): number {
  const ppg = stats.fantasyPointsPerGame ?? 0;
  const usage =
    (stats.snapsShare ?? 0) * 50 +
    (stats.targetsPerGame ?? 0) * 3 +
    (stats.carriesPerGame ?? 0) * 2 +
    (stats.redZoneTouchesPerGame ?? 0) * 4;

  const posMult = positionalMultiplier(pos);

  return (ppg * 5 + usage) * posMult;
}

function scoreFutureProduction(fantasyPros: FantasyProsInputs, pos: Position): number {
  const ros = fantasyPros.rosProjection ?? 0;
  const playoff = fantasyPros.playoffProjection ?? 0;
  const ecr = fantasyPros.ecrRank ?? 200;

  const posMult = positionalMultiplier(pos);

  const ecrBonus = (200 - ecr) * 2; // better rank → higher bonus

  return (ros * 3 + playoff * 4 + ecrBonus) * posMult;
}

function scoreSOS(fantasyPros: FantasyProsInputs): number {
  // Assume sosScore is already something like 0–100 from FantasyPros
  return fantasyPros.sosScore ?? 50;
}

function scorePlayoffBoost(fantasyPros: FantasyProsInputs): number {
  const playoff = fantasyPros.playoffProjection ?? 0;
  return playoff * 3;
}

function scoreRisk(fantasyPros: FantasyProsInputs): number {
  const boom = fantasyPros.boomRate ?? 0;
  const bust = fantasyPros.bustRate ?? 0;

  // Higher boom is good, higher bust is bad
  return boom * 40 - bust * 40;
}

function scorePositionalScarcity(pos: Position, leagueSettings?: { qbCount?: number; rbCount?: number; wrCount?: number; teCount?: number; teams?: number; }): number {
  // Simple starter: RB/WR more scarce than QB/TE
  const base = positionalMultiplier(pos) * 20;

  // You can later adjust based on actual league settings
  return base;
}

function scoreTeamContext(ctx: TeamContextInputs): number {
  // Combine need, depth, bye, contender profile
  return (
    ctx.rosterNeedScore * 40 +
    ctx.depthScore * 20 +
    ctx.byeWeekConflictScore * 20 +
    ctx.contenderScore * 20
  );
}

// ---------- MAIN ENTRY POINT ----------

export interface CalculatePlayerValueArgs {
  player: PlayerIdentity;
  keeper: KeeperInputs;
  sleeperStats: SleeperStatsInputs;
  fantasyPros: FantasyProsInputs;
  teamContext: TeamContextInputs;
}

export function calculatePlayerValue(args: CalculatePlayerValueArgs): PlayerValueResult {
  const { player, keeper, sleeperStats, fantasyPros, teamContext } = args;

  const keeperCost = calculateKeeperCost(keeper);

  const keeperValueScore = scoreKeeperValue(keeperCost, keeper, fantasyPros, player.pos);
  const currentProductionScore = scoreCurrentProduction(sleeperStats, player.pos);
  const futureProductionScore = scoreFutureProduction(fantasyPros, player.pos);
  const sosScore = scoreSOS(fantasyPros);
  const playoffBoostScore = scorePlayoffBoost(fantasyPros);
  const riskScore = scoreRisk(fantasyPros);
  const positionalScarcityScore = scorePositionalScarcity(player.pos);
  const teamContextAdjustment = scoreTeamContext(teamContext);

  const totalValueScore =
    keeperValueScore +
    currentProductionScore +
    futureProductionScore +
    sosScore +
    playoffBoostScore +
    riskScore +
    positionalScarcityScore +
    teamContextAdjustment;

  return {
    player,
    keeperCost,
    keeperEligible: keeper.keeperEligible,
    keeperValueScore,
    currentProductionScore,
    futureProductionScore,
    sosScore,
    playoffBoostScore,
    riskScore,
    positionalScarcityScore,
    teamContextAdjustment,
    totalValueScore
  };
}
