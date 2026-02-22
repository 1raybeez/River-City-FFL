// lib/history/normalizeTrade.ts

import {
  TradeRecord,
  TradeSide,
  TradePlayer,
  ImbalanceComponents,
  computeImbalanceForTrade,
} from "./computeImbalance";
import { resolvePlayerForYear } from "./playerResolver";
import { resolveManagerForTeam } from "./managerResolver";

export type RawSleeperTransaction = {
  adds?: Record<string, number>;
  drops?: Record<string, number>;
  consenter_ids?: number[];
  creator?: string;
  created?: number;
  draft_picks?: any[];
  leg?: number;
  metadata?: any;
  roster_ids?: number[];
  settings?: any;
  status?: string;
  status_updated?: number;
  transaction_id?: string;
  type?: string;
  waiver_budget?: any;
  teamIdsInvolved?: number[];
};

export type HistoricalTradeDoc = {
  createdAt?: number;
  leagueId: string;
  metadata?: any;
  rawSleeperTransaction: RawSleeperTransaction;
};

type TeamSide = {
  teamId: number;
  managerId: string;
  managerName?: string;
};

function pickTeams(raw: RawSleeperTransaction): [number, number] | null {
  if (raw.teamIdsInvolved && raw.teamIdsInvolved.length >= 2) {
    return [raw.teamIdsInvolved[0], raw.teamIdsInvolved[1]];
  }
  if (raw.roster_ids && raw.roster_ids.length >= 2) {
    return [raw.roster_ids[0], raw.roster_ids[1]];
  }
  if (raw.consenter_ids && raw.consenter_ids.length >= 2) {
    return [raw.consenter_ids[0], raw.consenter_ids[1]];
  }
  return null;
}

async function buildTeamSide(
  leagueId: string,
  teamId: number
): Promise<TeamSide> {
  const resolved = await resolveManagerForTeam(leagueId, teamId);
  return {
    teamId,
    managerId: resolved.managerId,
    managerName: resolved.managerName,
  };
}

async function buildPlayersForTeam(
  raw: RawSleeperTransaction,
  year: number,
  teamId: number
): Promise<{
  received: TradePlayer[];
  sent: TradePlayer[];
}> {
  const adds = raw.adds ?? {};
  const drops = raw.drops ?? {};

  const received: TradePlayer[] = [];
  const sent: TradePlayer[] = [];

  // Players added to this team = received
  for (const [playerId, toTeamId] of Object.entries(adds)) {
    if (toTeamId === teamId) {
      const player = await resolvePlayerForYear(playerId, year);
      if (player) received.push(player);
    }
  }

  // Players dropped from this team = sent
  for (const [playerId, fromTeamId] of Object.entries(drops)) {
    if (fromTeamId === teamId) {
      const player = await resolvePlayerForYear(playerId, year);
      if (player) sent.push(player);
    }
  }

  return { received, sent };
}

/**
 * Normalize a single raw trade document into a TradeRecord
 * suitable for the imbalance engine.
 */
export async function normalizeSingleTrade(
  year: number,
  tradeId: string,
  docData: HistoricalTradeDoc
): Promise<{
  trade: TradeRecord | null;
  components?: ImbalanceComponents;
}> {
  const raw = docData.rawSleeperTransaction;
  if (!raw) {
    return { trade: null };
  }

  const leagueId = docData.leagueId;
  const teams = pickTeams(raw);
  if (!teams) {
    return { trade: null };
  }

  const [teamAId, teamBId] = teams;

  const [teamASide, teamBSide] = await Promise.all([
    buildTeamSide(leagueId, teamAId),
    buildTeamSide(leagueId, teamBId),
  ]);

  const [teamAPlayers, teamBPlayers] = await Promise.all([
    buildPlayersForTeam(raw, year, teamAId),
    buildPlayersForTeam(raw, year, teamBId),
  ]);

  const sideA: TradeSide = {
    managerId: teamASide.managerId,
    managerName: teamASide.managerName,
    playersSent: teamAPlayers.sent,
    playersReceived: teamAPlayers.received,
  };

  const sideB: TradeSide = {
    managerId: teamBSide.managerId,
    managerName: teamBSide.managerName,
    playersSent: teamBPlayers.sent,
    playersReceived: teamBPlayers.received,
  };

  const trade: TradeRecord = {
    id: tradeId,
    year,
    sideA,
    sideB,
  };

  const components = computeImbalanceForTrade(trade);

  return { trade, components };
}
