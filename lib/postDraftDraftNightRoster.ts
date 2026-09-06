import type {
  SleeperAuctionCompletedPurchaseRow,
  SleeperAuctionKeeperRow,
  SleeperAuctionSyncPayload,
} from "@/lib/auction/sleeperAuctionSync";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import type {
  PostDraftAcquisitionInput,
  PostDraftPlayerInput,
  PostDraftRosterInput,
  PostDraftRosterRequirements,
} from "@/lib/postDraftMetrics";

export type DraftNightRosterDiagnostic = {
  franchiseId: string;
  franchiseName: string;
  rosterId: number;
  playerCount: number;
  keeperCount: number;
  auctionAcquisitionCount: number;
  totalSpend: number;
  remainingBudget: number;
  duplicatePlayerIds: string[];
  unresolvedPlayerIds: string[];
  unresolvedPositions: string[];
  orphanRecords: string[];
};

export type DraftNightRosterResolution = {
  rosters: PostDraftRosterInput[];
  acquisitions: PostDraftAcquisitionInput[];
  diagnostics: DraftNightRosterDiagnostic[];
  warnings: string[];
};

function deriveStarterIds(
  playerIds: readonly string[],
  players: ReadonlyMap<string, PostDraftPlayerInput>,
  requirements: PostDraftRosterRequirements | null,
) {
  if (!requirements) return [];
  const remaining = [...playerIds];
  const starters: string[] = [];
  const takePosition = (position: string, count: number) => {
    let taken = 0;
    for (const playerId of [...remaining]) {
      if (taken >= count) break;
      if ((players.get(playerId)?.position ?? "").toUpperCase() !== position) continue;
      starters.push(playerId);
      remaining.splice(remaining.indexOf(playerId), 1);
      taken += 1;
    }
  };

  Object.entries(requirements.requiredStarterSlots).forEach(([position, count]) => takePosition(position, count));
  let flexTaken = 0;
  for (const playerId of remaining) {
    if (flexTaken >= requirements.flexSlots) break;
    const position = players.get(playerId)?.position?.toUpperCase();
    if (!position || !requirements.flexEligiblePositions.includes(position)) continue;
    starters.push(playerId);
    flexTaken += 1;
  }
  return starters;
}

function keeperAcquisition(row: SleeperAuctionKeeperRow): PostDraftAcquisitionInput {
  return {
    playerId: row.playerId ?? "",
    playerName: row.playerName,
    position: row.position,
    nflTeam: row.nflTeam,
    rosterId: row.rosterId ?? -1,
    purchasePrice: row.keeperPrice,
    isKeeper: true,
    pickNumber: row.keeperRound,
    keeperCost: row.keeperPrice,
    acquisitionClassification: "KEEPER",
  };
}

function auctionAcquisition(row: SleeperAuctionCompletedPurchaseRow): PostDraftAcquisitionInput {
  return {
    playerId: row.playerId ?? "",
    playerName: row.playerName,
    position: row.position,
    nflTeam: row.nflTeam,
    rosterId: row.rosterId ?? -1,
    purchasePrice: row.salePrice,
    isKeeper: false,
    pickNumber: row.pickNumber,
    keeperCost: null,
    acquisitionClassification: "AUCTION",
  };
}

/** Resolves the completed auction itself; current Sleeper rosters are not consulted. */
export function resolveDraftNightRosters({
  auction,
  players,
  requirements,
  budget,
}: {
  auction: SleeperAuctionSyncPayload;
  players: ReadonlyMap<string, PostDraftPlayerInput>;
  requirements: PostDraftRosterRequirements | null;
  budget: number;
}): DraftNightRosterResolution {
  const acquisitions = [
    ...auction.keepers.map(keeperAcquisition),
    ...auction.completedPurchases.map(auctionAcquisition),
  ];
  const byRoster = new Map<number, PostDraftAcquisitionInput[]>();
  acquisitions.forEach((acquisition) => {
    const rows = byRoster.get(acquisition.rosterId) ?? [];
    rows.push(acquisition);
    byRoster.set(acquisition.rosterId, rows);
  });

  const warnings = [...auction.warnings];
  const diagnostics = canonicalAuctionTeams.map((team) => {
    const rows = byRoster.get(team.rosterId) ?? [];
    const playerIds = rows.map((row) => row.playerId).filter(Boolean);
    const duplicatePlayerIds = [...new Set(playerIds.filter((id, index) => playerIds.indexOf(id) !== index))];
    const unresolvedPlayerIds = [...new Set(playerIds.filter((id) => !players.has(id)))];
    const unresolvedPositions = [...new Set(rows.filter((row) => !row.position).map((row) => row.playerName))];
    const orphanRecords = rows.flatMap((row) => row.playerId && row.rosterId === team.rosterId ? [] : [`${row.playerName} has no valid draft roster assignment.`]);
    const totalSpend = rows.reduce((sum, row) => sum + (row.purchasePrice ?? 0), 0);
    return {
      franchiseId: team.franchiseId,
      franchiseName: team.teamName,
      rosterId: team.rosterId,
      playerCount: playerIds.length,
      keeperCount: rows.filter((row) => row.isKeeper).length,
      auctionAcquisitionCount: rows.filter((row) => !row.isKeeper).length,
      totalSpend,
      remainingBudget: budget - totalSpend,
      duplicatePlayerIds,
      unresolvedPlayerIds,
      unresolvedPositions,
      orphanRecords,
    };
  });

  const canonicalRosterIds = new Set<number>(canonicalAuctionTeams.map((team) => team.rosterId));
  const unknownRosterRows = acquisitions.filter((row) => !canonicalRosterIds.has(row.rosterId));
  if (unknownRosterRows.length > 0) warnings.push(`${unknownRosterRows.length} draft acquisition records are outside the canonical 2026 roster map.`);
  diagnostics.forEach((diagnostic) => {
    if (diagnostic.playerCount !== 16) warnings.push(`${diagnostic.franchiseName} has ${diagnostic.playerCount} draft-night records; expected 16.`);
    if (diagnostic.duplicatePlayerIds.length > 0) warnings.push(`${diagnostic.franchiseName} has duplicate draft-night player IDs.`);
    if (diagnostic.unresolvedPlayerIds.length > 0) warnings.push(`${diagnostic.franchiseName} has unresolved draft-night players.`);
  });

  const rosters = canonicalAuctionTeams.map((team) => {
    const playerIds = (byRoster.get(team.rosterId) ?? []).map((row) => row.playerId).filter(Boolean);
    return {
      rosterId: team.rosterId,
      ownerUserId: team.managerId,
      teamName: team.teamName,
      playerIds,
      starterIds: deriveStarterIds(playerIds, players, requirements),
      franchiseId: team.franchiseId,
      ownerIds: team.ownerIds,
    };
  });

  return {
    rosters,
    acquisitions: acquisitions.filter((row) => row.playerId && row.rosterId > 0),
    diagnostics,
    warnings: [...new Set(warnings)],
  };
}
