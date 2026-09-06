import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { buildCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentity";
import type { SleeperFetchOptions, SleeperPlayerIdentity } from "@/lib/sleeper";
import {
  readPublishedFantasyCalcArtifact,
  type FantasyCalcRow,
} from "@/lib/tradeComparison/fantasyCalcArtifact";
import {
  readPublishedRosArtifact,
  type LoadedPublishedRos,
} from "@/lib/tradeComparison/rosArtifact";

export const PREDICTION_INPUT_SCHEMA_VERSION = "predictions-input-v1" as const;
export const PREDICTION_SEASON = 2026 as const;
export const PREDICTION_LEAGUE_ID = "1312149033254416384" as const;
export const PREDICTION_COVERAGE_STATES = ["COMPLETE", "PARTIAL", "MISSING"] as const;
export type PredictionCoverageState = (typeof PREDICTION_COVERAGE_STATES)[number];
export type PredictionEvidenceSource = "FANTASYCALC_REDRAFT" | "ROS_CONSENSUS" | "PRESEASON_CONTEXT";

type RawRoster = {
  roster_id?: string | number | null;
  owner_id?: string | number | null;
  players?: readonly (string | number | null)[] | null;
  starters?: readonly (string | number | null)[] | null;
  reserve?: readonly (string | number | null)[] | null;
  taxi?: readonly (string | number | null)[] | null;
};
type RawUser = { user_id?: string | number | null; display_name?: string | null; avatar?: string | null; metadata?: { team_name?: string | null } | null };

export type PredictionSourceFreshness = {
  source: PredictionEvidenceSource;
  artifactId: string | null;
  generatedAt: string | null;
  asOf: string | null;
};

export type PredictionCoverage = {
  state: PredictionCoverageState;
  covered: number;
  total: number;
  missingIds: readonly string[];
};

export type PredictionPlayerEvidence = {
  fantasyCalc: {
    source: "FANTASYCALC_REDRAFT";
    value: number;
    generatedAt: string;
    sourcePlayerId: string;
    coverage: "COMPLETE";
  } | null;
  ros: {
    source: "ROS_CONSENSUS";
    overallRank: number | null;
    positionalRank: number | null;
    sourceCount: number;
    providerCoverage: readonly string[];
    generatedAt: string;
    sourcePlayerId: string;
    coverage: "COMPLETE";
  } | null;
};

export type PredictionRosterPlayer = {
  sleeperPlayerId: string;
  displayName: string | null;
  position: string | null;
  nflTeam: string | null;
  rosterStatus: "STARTER" | "BENCH" | "RESERVE" | "TAXI" | "ROSTERED";
  starterEligible: boolean;
  evidence: PredictionPlayerEvidence;
  diagnostics: {
    identity: PredictionCoverageState;
    position: PredictionCoverageState;
    nflTeam: PredictionCoverageState;
    fantasyCalc: PredictionCoverageState;
    ros: PredictionCoverageState;
  };
};

export type PredictionFranchiseInput = {
  franchiseId: string;
  canonicalTeamName: string;
  currentTeamName: string;
  ownerIds: readonly string[];
  ownerNames: readonly string[];
  currentSleeperRosterId: number;
  sleeperUserId: string;
  rosterPlayers: readonly PredictionRosterPlayer[];
  coverage: {
    identity: PredictionCoverage;
    position: PredictionCoverage;
    fantasyCalc: PredictionCoverage;
    ros: PredictionCoverage;
  };
};

export type PredictionInputSnapshot = {
  schemaVersion: typeof PREDICTION_INPUT_SCHEMA_VERSION;
  season: typeof PREDICTION_SEASON;
  generatedAt: string;
  asOf: string;
  league: { leagueId: string; sport: "nfl"; teamCount: number };
  evidenceFreshness: readonly PredictionSourceFreshness[];
  franchises: readonly PredictionFranchiseInput[];
  coverage: {
    franchises: PredictionCoverage;
    identity: PredictionCoverage;
    position: PredictionCoverage;
    fantasyCalc: PredictionCoverage;
    ros: PredictionCoverage;
  };
};

export type PredictionSnapshotBuildInput = {
  rosters: readonly RawRoster[];
  users?: readonly RawUser[];
  playerDirectory: Readonly<Record<string, SleeperPlayerIdentity>>;
  fantasyCalc?: ReadonlyMap<string, FantasyCalcRow>;
  ros?: LoadedPublishedRos;
  generatedAt?: string;
  asOf?: string;
  leagueId?: string;
};

function id(value: unknown) {
  return value === null || value === undefined ? null : String(value).trim() || null;
}

function state(covered: number, total: number): PredictionCoverageState {
  if (total === 0) return "MISSING";
  return covered === total ? "COMPLETE" : covered > 0 ? "PARTIAL" : "MISSING";
}

function coverage(covered: number, total: number, missingIds: readonly string[]): PredictionCoverage {
  return { state: state(covered, total), covered, total, missingIds: [...missingIds].sort() };
}

function rosterStatus(playerId: string, roster: RawRoster): PredictionRosterPlayer["rosterStatus"] {
  if ((roster.starters ?? []).some((candidate) => id(candidate) === playerId)) return "STARTER";
  if ((roster.reserve ?? []).some((candidate) => id(candidate) === playerId)) return "RESERVE";
  if ((roster.taxi ?? []).some((candidate) => id(candidate) === playerId)) return "TAXI";
  return roster.players?.some((candidate) => id(candidate) === playerId) ? "BENCH" : "ROSTERED";
}

export function buildPredictionInputSnapshot(input: PredictionSnapshotBuildInput): PredictionInputSnapshot {
  const generatedAt = input.generatedAt ?? new Date().toISOString();
  const asOf = input.asOf ?? generatedAt;
  const identities = buildCurrentSeasonTeamIdentityMap({ users: input.users ?? [], rosters: input.rosters });
  const fantasyCalc = input.fantasyCalc ?? new Map<string, FantasyCalcRow>();
  const ros = input.ros?.rows ?? new Map();

  const franchises = canonicalAuctionTeams.map((team) => {
    const roster = input.rosters.find((candidate) => Number(candidate.roster_id) === team.rosterId) ?? null;
    const identity = identities.get(team.franchiseId);
    const playerIds = [...new Set((roster?.players ?? []).map(id).filter((value): value is string => value !== null))].sort();
    const players = playerIds.map((playerId) => {
      const player = input.playerDirectory[playerId];
      const fantasy = fantasyCalc.get(playerId) ?? null;
      const rosRow = ros.get(playerId) ?? null;
      const diagnostics = {
        identity: player ? "COMPLETE" as const : "MISSING" as const,
        position: player?.position ? "COMPLETE" as const : "MISSING" as const,
        nflTeam: player?.nflTeam ? "COMPLETE" as const : "MISSING" as const,
        fantasyCalc: fantasy ? "COMPLETE" as const : "MISSING" as const,
        ros: rosRow ? "COMPLETE" as const : "MISSING" as const,
      };
      return {
        sleeperPlayerId: playerId,
        displayName: player?.displayName ?? null,
        position: player?.position ?? null,
        nflTeam: player?.nflTeam ?? null,
        rosterStatus: roster ? rosterStatus(playerId, roster) : "ROSTERED",
        starterEligible: Boolean(player?.position && ["QB", "RB", "WR", "TE", "K", "DEF"].includes(player.position)),
        evidence: {
          fantasyCalc: fantasy ? { source: "FANTASYCALC_REDRAFT" as const, value: fantasy.rawSourceValue, generatedAt: fantasy.generatedAt, sourcePlayerId: fantasy.playerId, coverage: "COMPLETE" as const } : null,
          ros: rosRow ? { source: "ROS_CONSENSUS" as const, overallRank: rosRow.consensusOverallRank, positionalRank: rosRow.consensusPositionalRank, sourceCount: rosRow.sourceCount, providerCoverage: rosRow.sourceRanks.map((source: { source: string }) => source.source), generatedAt: rosRow.generatedAt, sourcePlayerId: rosRow.playerId, coverage: "COMPLETE" as const } : null,
        },
        diagnostics,
      } satisfies PredictionRosterPlayer;
    });
    const missing = (key: keyof typeof players[number]["diagnostics"]) => players.filter((player) => player.diagnostics[key] === "MISSING").map((player) => player.sleeperPlayerId);
    return {
      franchiseId: team.franchiseId,
      canonicalTeamName: team.teamName,
      currentTeamName: identity?.currentTeamName || team.teamName,
      ownerIds: team.ownerIds,
      ownerNames: team.ownerNames,
      currentSleeperRosterId: team.rosterId,
      sleeperUserId: identity?.sleeperUserId ?? String(team.managerId),
      rosterPlayers: players,
      coverage: {
        identity: coverage(players.length - missing("identity").length, players.length, missing("identity")),
        position: coverage(players.length - missing("position").length, players.length, missing("position")),
        fantasyCalc: coverage(players.length - missing("fantasyCalc").length, players.length, missing("fantasyCalc")),
        ros: coverage(players.length - missing("ros").length, players.length, missing("ros")),
      },
    } satisfies PredictionFranchiseInput;
  });
  const totalPlayers = franchises.reduce((total, franchise) => total + franchise.rosterPlayers.length, 0);
  const franchiseCoverage = coverage(franchises.length, canonicalAuctionTeams.length, []);
  const aggregate = (key: "identity" | "position" | "fantasyCalc" | "ros") => {
    const missing = franchises.flatMap((franchise) => franchise.coverage[key].missingIds);
    const covered = franchises.reduce((total, franchise) => total + franchise.coverage[key].covered, 0);
    return coverage(covered, totalPlayers, missing);
  };
  return {
    schemaVersion: PREDICTION_INPUT_SCHEMA_VERSION,
    season: PREDICTION_SEASON,
    generatedAt,
    asOf,
    league: { leagueId: input.leagueId ?? PREDICTION_LEAGUE_ID, sport: "nfl", teamCount: franchises.length },
    evidenceFreshness: [
      { source: "FANTASYCALC_REDRAFT", artifactId: "fantasycalc-redraft-2026-2026-08-31", generatedAt: fantasyCalc.size ? [...fantasyCalc.values()][0]?.generatedAt ?? null : null, asOf: null },
      { source: "ROS_CONSENSUS", artifactId: input.ros?.artifactId ?? null, generatedAt: input.ros?.generatedAt ?? null, asOf: null },
    ],
    franchises,
    coverage: { franchises: franchiseCoverage, identity: aggregate("identity"), position: aggregate("position"), fantasyCalc: aggregate("fantasyCalc"), ros: aggregate("ros") },
  };
}

export async function loadCurrentPredictionInputSnapshot(options: SleeperFetchOptions = {}): Promise<PredictionInputSnapshot> {
  const { getLeagueRosters, getLeagueUsers, getSleeperPlayerIdentityDirectory } = await import("@/lib/sleeper");
  const [rosters, users, fantasyCalc, ros] = await Promise.all([
    getLeagueRosters(PREDICTION_LEAGUE_ID, options),
    getLeagueUsers(PREDICTION_LEAGUE_ID, options),
    Promise.resolve(readPublishedFantasyCalcArtifact()),
    readPublishedRosArtifact(),
  ]);
  const playerIds = rosters.flatMap((roster) => Array.isArray(roster.players) ? roster.players : []);
  const playerDirectory = await getSleeperPlayerIdentityDirectory(playerIds);
  return buildPredictionInputSnapshot({ rosters, users, playerDirectory, fantasyCalc: fantasyCalc.rows, ros });
}
