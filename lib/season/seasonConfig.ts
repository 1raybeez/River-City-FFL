export type RiverCitySeasonConfig = {
  season: number;
  seasonStartAt: string;
  timezone: "America/New_York";
  source: string;
  approval: string;
};

const SEASON_CONFIG: Record<number, RiverCitySeasonConfig> = {
  2026: {
    season: 2026,
    seasonStartAt: "2026-09-09T20:20:00-04:00",
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
