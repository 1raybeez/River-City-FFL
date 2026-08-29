export type RiverCitySeasonConfig = {
  season: number;
  seasonStartAt: string;
  openingEvent: RiverCityOpeningEvent;
  timezone: "America/New_York";
  source: string;
  approval: string;
};

export type RiverCityOpeningEvent = {
  type: "NFL_KICKOFF";
  title: "NFL Kickoff";
  awayTeam: "New England Patriots";
  homeTeam: "Seattle Seahawks";
  matchupLabel: "Patriots at Seahawks";
  startsAt: string;
};

const RIVER_CITY_NFL_KICKOFF_STARTS_AT = "2026-09-09T20:20:00-04:00";

const RIVER_CITY_NFL_KICKOFF: RiverCityOpeningEvent = {
  type: "NFL_KICKOFF",
  title: "NFL Kickoff",
  awayTeam: "New England Patriots",
  homeTeam: "Seattle Seahawks",
  matchupLabel: "Patriots at Seahawks",
  startsAt: RIVER_CITY_NFL_KICKOFF_STARTS_AT,
};

const SEASON_CONFIG: Record<number, RiverCitySeasonConfig> = {
  2026: {
    season: 2026,
    seasonStartAt: RIVER_CITY_NFL_KICKOFF_STARTS_AT,
    openingEvent: RIVER_CITY_NFL_KICKOFF,
    timezone: "America/New_York",
    source: "commissioner-approved-river-city-season-config",
    approval: "River City Week 1 first NFL regular-season kickoff",
  },
};

export function getRiverCitySeasonConfig(season: number): RiverCitySeasonConfig | null {
  return SEASON_CONFIG[season] ?? null;
}

export function getConfiguredRiverCitySeasons(): number[] {
  return Object.keys(SEASON_CONFIG).map(Number).sort((a, b) => a - b);
}
