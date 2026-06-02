const FANTASYDATA_SEASON_URL =
  "https://fantasydata.com/NFL_Fantasy_Football_Projections/GetSeasonProjections?format=json";

const GAMES_PER_SEASON = 17;

const POSITION_VOLATILITY: Record<string, number> = {
  QB: 0.9,
  RB: 1.05,
  WR: 1.1,
  TE: 1.0,
  K: 0.95,
  DEF: 0.95,
};

interface FantasyDataProjection {
  Player?: string;
  Team?: string;
  Position?: string;
  FantasyPointsPPR?: number;
  PassingYards?: number;
  RushingYards?: number;
  ReceivingYards?: number;
  PassingTouchdowns?: number;
  RushingTouchdowns?: number;
  ReceivingTouchdowns?: number;
  Receptions?: number;
}

export interface SeasonProjection {
  playerName?: string;
  team?: string;
  position?: string;
  points: number;
  passYds: number;
  rushYds: number;
  recYds: number;
  passTd: number;
  rushTd: number;
  recTd: number;
  receptions: number;
}

export interface WeeklyProjection extends SeasonProjection {
  week: number;
}

function getPositionVolatility(pos: string | undefined) {
  return POSITION_VOLATILITY[pos ?? ""] ?? 1.0;
}

async function fetchSeasonData(): Promise<FantasyDataProjection[]> {
  const res = await fetch(FANTASYDATA_SEASON_URL, { cache: "no-store" });

  if (!res.ok) {
    throw new Error(`Failed to fetch season projections: ${res.status}`);
  }

  return (await res.json()) as FantasyDataProjection[];
}

export function mapSeasonProjection(
  projection: FantasyDataProjection
): SeasonProjection {
  return {
    playerName: projection.Player,
    team: projection.Team,
    position: projection.Position,
    points: projection.FantasyPointsPPR ?? 0,
    passYds: projection.PassingYards ?? 0,
    rushYds: projection.RushingYards ?? 0,
    recYds: projection.ReceivingYards ?? 0,
    passTd: projection.PassingTouchdowns ?? 0,
    rushTd: projection.RushingTouchdowns ?? 0,
    recTd: projection.ReceivingTouchdowns ?? 0,
    receptions: projection.Receptions ?? 0,
  };
}

export function mapWeeklyProjection(
  projection: FantasyDataProjection,
  week: number
): WeeklyProjection {
  const position = projection.Position;
  const vol = getPositionVolatility(position);

  const seasonPtsPpr = projection.FantasyPointsPPR ?? 0;
  const seasonPassYds = projection.PassingYards ?? 0;
  const seasonRushYds = projection.RushingYards ?? 0;
  const seasonRecYds = projection.ReceivingYards ?? 0;
  const seasonPassTd = projection.PassingTouchdowns ?? 0;
  const seasonRushTd = projection.RushingTouchdowns ?? 0;
  const seasonRecTd = projection.ReceivingTouchdowns ?? 0;
  const seasonRec = projection.Receptions ?? 0;

  const ptsPerGame = seasonPtsPpr / GAMES_PER_SEASON;
  const passYdsPerGame = seasonPassYds / GAMES_PER_SEASON;
  const rushYdsPerGame = seasonRushYds / GAMES_PER_SEASON;
  const recYdsPerGame = seasonRecYds / GAMES_PER_SEASON;
  const passTdPerGame = seasonPassTd / GAMES_PER_SEASON;
  const rushTdPerGame = seasonRushTd / GAMES_PER_SEASON;
  const recTdPerGame = seasonRecTd / GAMES_PER_SEASON;
  const recPerGame = seasonRec / GAMES_PER_SEASON;

  return {
    playerName: projection.Player,
    team: projection.Team,
    position,
    week,
    points: ptsPerGame * vol,
    passYds: passYdsPerGame,
    rushYds: rushYdsPerGame,
    recYds: recYdsPerGame,
    passTd: passTdPerGame,
    rushTd: rushTdPerGame,
    recTd: recTdPerGame,
    receptions: recPerGame,
  };
}

export async function getSeasonProjections() {
  const seasonData = await fetchSeasonData();
  return seasonData.map(mapSeasonProjection);
}

export async function getDerivedWeeklyProjections(week: number) {
  const seasonData = await fetchSeasonData();
  return seasonData.map((projection) => mapWeeklyProjection(projection, week));
}
