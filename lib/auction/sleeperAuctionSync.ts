export type SleeperAuctionSyncStatus = 'complete' | 'partial';
export type SleeperAuctionPriceStatus = 'confirmed' | 'missing';
export type SleeperAuctionLayerSource =
  | 'sleeper-keeper'
  | 'sleeper-draft'
  | 'manual-local';

export type SleeperAuctionSyncPick = {
  draftId: string | null;
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  pickedByUserId: string | null;
  rosterId: number | null;
  round: number | null;
  draftSlot: number | null;
  pickNo: number | null;
  isKeeper: boolean | null;
  auctionPrice: number | null;
  needsAuctionPriceReview: boolean;
};

export type SleeperAuctionSyncRosterLike = {
  roster_id?: number | string | null;
  owner_id?: string | number | null;
  co_owners?: readonly (string | number)[] | null;
  players?: readonly (string | number)[] | null;
  keepers?:
    | readonly (string | number)[]
    | Record<string, unknown>
    | null;
};

export type SleeperAuctionSyncUserLike = {
  user_id?: string | number | null;
  display_name?: string | null;
  username?: string | null;
  metadata?: {
    team_name?: string | null;
    [key: string]: unknown;
  } | null;
};

export type SleeperAuctionSyncPlayerLike = {
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  position?: string | null;
  team?: string | null;
};

export type SleeperAuctionSyncRoster = {
  rosterId: number;
  ownerUserId: string | null;
  ownerName: string | null;
  teamName: string | null;
  playerIds: string[];
  keeperIds: string[];
};

export type SleeperAuctionSyncTeam = {
  rosterId: number;
  ownerUserId: string | null;
  ownerName: string | null;
  teamName: string | null;
};

export type SleeperAuctionKeeperRow = {
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId: number | null;
  ownerUserId: string | null;
  ownerName: string | null;
  teamName: string | null;
  keeperPrice: number | null;
  keeperRound: number | null;
  source: 'sleeper-keeper';
  priceStatus: SleeperAuctionPriceStatus;
};

export type SleeperAuctionCompletedPurchaseRow = {
  playerId: string | null;
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  rosterId: number | null;
  ownerUserId: string | null;
  ownerName: string | null;
  teamName: string | null;
  salePrice: number | null;
  pickNumber: number | null;
  isKeeper: boolean;
  source: 'sleeper-draft';
};

export type SleeperAuctionSyncPayload = {
  source: 'sleeper';
  leagueId: string | null;
  season: number;
  fetchedAt: string;
  draftId: string | null;
  keepers: SleeperAuctionKeeperRow[];
  completedPurchases: SleeperAuctionCompletedPurchaseRow[];
  rosters: SleeperAuctionSyncRoster[];
  teams: SleeperAuctionSyncTeam[];
  warnings: string[];
  syncStatus: SleeperAuctionSyncStatus;
};

export type SleeperAuctionSyncNormalizeInput = {
  leagueId: string | null;
  season: number;
  fetchedAt: string;
  draftId: string | null;
  picks: readonly SleeperAuctionSyncPick[];
  rosters: readonly SleeperAuctionSyncRosterLike[];
  users: readonly SleeperAuctionSyncUserLike[];
  playersById?: Record<string, SleeperAuctionSyncPlayerLike> | null;
  warnings?: readonly string[];
};

export type SleeperAuctionMergeRow = {
  id: string;
  playerId: string | null;
  playerName: string;
  position: string | null;
  rosterId: number | null;
  purchasePrice: number;
  source: SleeperAuctionLayerSource | 'demo';
};

export type SleeperAuctionMergeResult<T extends SleeperAuctionMergeRow> = {
  rows: T[];
  warnings: string[];
  suppressedManualRowIds: string[];
};

function normalizeId(value: string | number | null | undefined) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function normalizePlayerName(value: string | null | undefined) {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s.'-]/g, ' ')
    .replace(/\s+/g, ' ') ?? '';
}

export function normalizeSleeperAuctionPosition(
  value: string | null | undefined
) {
  const position = value?.trim().toUpperCase() ?? '';

  if (position === 'DST' || position === 'D/ST' || position === 'DEFENSE') {
    return 'DEF';
  }

  return position || null;
}

function readRosterId(value: string | number | null | undefined) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value));
  }

  if (typeof value !== 'string') return null;

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? Math.max(0, Math.floor(parsedValue)) : null;
}

function getUserName(user: SleeperAuctionSyncUserLike | null) {
  return user?.display_name?.trim() || user?.username?.trim() || null;
}

function getTeamName(user: SleeperAuctionSyncUserLike | null) {
  return user?.metadata?.team_name?.trim() || getUserName(user);
}

function getPlayerName(playerId: string, player: SleeperAuctionSyncPlayerLike | null) {
  const name =
    player?.full_name?.trim() ||
    [player?.first_name, player?.last_name]
      .filter(Boolean)
      .join(' ')
      .trim();

  return name || playerId || 'Unknown Player';
}

function formatMoney(value: number) {
  return `$${Math.round(value)}`;
}

export function getSleeperAuctionSyncPlayerKey({
  playerId,
  playerName,
  position,
}: {
  playerId?: string | null;
  playerName?: string | null;
  position?: string | null;
}) {
  const normalizedPlayerId = normalizeId(playerId);
  if (normalizedPlayerId) return `id:${normalizedPlayerId}`;

  const normalizedName = normalizePlayerName(playerName);
  const normalizedPosition = normalizeSleeperAuctionPosition(position) ?? '';
  if (!normalizedName) return '';

  return `name:${normalizedName}:${normalizedPosition}`;
}

function uniqueStrings(values: readonly (string | null | undefined)[]) {
  const seen = new Set<string>();

  return values.flatMap((value) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue || seen.has(trimmedValue)) return [];
    seen.add(trimmedValue);
    return [trimmedValue];
  });
}

function readKeeperIds(
  value:
    | readonly (string | number)[]
    | Record<string, unknown>
    | null
    | undefined
) {
  if (Array.isArray(value)) return value.map(normalizeId).filter(Boolean);

  if (value && typeof value === 'object') {
    return Object.keys(value).map(normalizeId).filter(Boolean);
  }

  return [];
}

function mergeKeeperRows(
  keeperRows: readonly (SleeperAuctionKeeperRow & {
    sourceDetail: 'draft-pick' | 'roster';
  })[]
) {
  const mergedKeeperRows = new Map<
    string,
    SleeperAuctionKeeperRow & { sourceDetails: Set<'draft-pick' | 'roster'> }
  >();

  keeperRows.forEach((keeper) => {
    const keeperKey = getSleeperAuctionSyncPlayerKey(keeper);
    const existingKeeper = keeperKey ? mergedKeeperRows.get(keeperKey) : null;

    if (!keeperKey || !existingKeeper) {
      mergedKeeperRows.set(keeperKey || `row:${mergedKeeperRows.size}`, {
        ...keeper,
        sourceDetails: new Set([keeper.sourceDetail]),
      });
      return;
    }

    existingKeeper.sourceDetails.add(keeper.sourceDetail);

    const shouldReplace =
      existingKeeper.priceStatus === 'missing' &&
      keeper.priceStatus === 'confirmed';
    const preferredKeeper = shouldReplace ? keeper : existingKeeper;
    const fallbackKeeper = shouldReplace ? existingKeeper : keeper;

    mergedKeeperRows.set(keeperKey, {
      ...preferredKeeper,
      rosterId: preferredKeeper.rosterId ?? fallbackKeeper.rosterId,
      ownerUserId: preferredKeeper.ownerUserId ?? fallbackKeeper.ownerUserId,
      ownerName: preferredKeeper.ownerName ?? fallbackKeeper.ownerName,
      teamName: preferredKeeper.teamName ?? fallbackKeeper.teamName,
      sourceDetails: existingKeeper.sourceDetails,
    });
  });

  return [...mergedKeeperRows.values()];
}

export function normalizeSleeperAuctionSyncSnapshot({
  leagueId,
  season,
  fetchedAt,
  draftId,
  picks,
  rosters,
  users,
  playersById = null,
  warnings = [],
}: SleeperAuctionSyncNormalizeInput): SleeperAuctionSyncPayload {
  const usersById = new Map(
    users.flatMap((user) => {
      const userId = normalizeId(user.user_id);
      return userId ? [[userId, user] as const] : [];
    })
  );
  const normalizedRosters = rosters.flatMap<SleeperAuctionSyncRoster>((roster) => {
    const rosterId = readRosterId(roster.roster_id);
    if (rosterId === null) return [];

    const ownerUserId = normalizeId(roster.owner_id) || null;
    const ownerUser = ownerUserId ? usersById.get(ownerUserId) ?? null : null;

    return [
      {
        rosterId,
        ownerUserId,
        ownerName: getUserName(ownerUser),
        teamName: getTeamName(ownerUser),
        playerIds: (roster.players ?? []).map(normalizeId).filter(Boolean),
        keeperIds: readKeeperIds(roster.keepers),
      },
    ];
  });
  const rosterById = new Map(
    normalizedRosters.map((roster) => [roster.rosterId, roster])
  );
  const resolveOwner = (pick: SleeperAuctionSyncPick) => {
    const roster = pick.rosterId === null ? null : rosterById.get(pick.rosterId) ?? null;
    const ownerUserId = normalizeId(pick.pickedByUserId) || roster?.ownerUserId || null;
    const ownerUser = ownerUserId ? usersById.get(ownerUserId) ?? null : null;

    return {
      ownerUserId,
      ownerName: getUserName(ownerUser) ?? roster?.ownerName ?? null,
      teamName: getTeamName(ownerUser) ?? roster?.teamName ?? null,
    };
  };
  const completedPurchases = picks.map<SleeperAuctionCompletedPurchaseRow>((pick) => {
    const owner = resolveOwner(pick);

    return {
      playerId: pick.playerId,
      playerName: pick.playerName,
      position: normalizeSleeperAuctionPosition(pick.position),
      nflTeam: pick.nflTeam,
      rosterId: pick.rosterId,
      ownerUserId: owner.ownerUserId,
      ownerName: owner.ownerName,
      teamName: owner.teamName,
      salePrice: pick.auctionPrice,
      pickNumber: pick.pickNo,
      isKeeper: pick.isKeeper === true,
      source: 'sleeper-draft',
    };
  }).filter((purchase) => !purchase.isKeeper);
  const pickKeeperRows = picks
    .filter((pick) => pick.isKeeper === true)
    .map<SleeperAuctionKeeperRow & { sourceDetail: 'draft-pick' }>((pick) => {
      const owner = resolveOwner(pick);

      return {
        playerId: pick.playerId,
        playerName: pick.playerName,
        position: normalizeSleeperAuctionPosition(pick.position),
        nflTeam: pick.nflTeam,
        rosterId: pick.rosterId,
        ownerUserId: owner.ownerUserId,
        ownerName: owner.ownerName,
        teamName: owner.teamName,
        keeperPrice: pick.auctionPrice,
        keeperRound: pick.round,
        source: 'sleeper-keeper',
        priceStatus: pick.auctionPrice === null ? 'missing' : 'confirmed',
        sourceDetail: 'draft-pick',
      };
    });
  const rosterKeeperRows = normalizedRosters.flatMap<
    SleeperAuctionKeeperRow & { sourceDetail: 'roster' }
  >((roster) =>
    roster.keeperIds.map((playerId) => {
      const player = playersById?.[playerId] ?? null;

      return {
        playerId,
        playerName: getPlayerName(playerId, player),
        position: normalizeSleeperAuctionPosition(player?.position),
        nflTeam: player?.team ?? null,
        rosterId: roster.rosterId,
        ownerUserId: roster.ownerUserId,
        ownerName: roster.ownerName,
        teamName: roster.teamName,
        keeperPrice: null,
        keeperRound: null,
        source: 'sleeper-keeper',
        priceStatus: 'missing',
        sourceDetail: 'roster',
      };
    })
  );
  const mergedKeepers = mergeKeeperRows([
    ...pickKeeperRows,
    ...rosterKeeperRows,
  ]);
  const keepers = mergedKeepers.map<SleeperAuctionKeeperRow>((keeper) => ({
    playerId: keeper.playerId,
    playerName: keeper.playerName,
    position: keeper.position,
    nflTeam: keeper.nflTeam,
    rosterId: keeper.rosterId,
    ownerUserId: keeper.ownerUserId,
    ownerName: keeper.ownerName,
    teamName: keeper.teamName,
    keeperPrice: keeper.keeperPrice,
    keeperRound: keeper.keeperRound,
    source: keeper.source,
    priceStatus: keeper.priceStatus,
  }));
  const missingKeeperPriceWarnings = keepers
    .filter((keeper) => keeper.priceStatus === 'missing')
    .map((keeper) => {
      const ownerLabel = keeper.teamName ?? keeper.ownerName ?? 'unknown roster';
      return `Keeper assigned — price missing: ${keeper.playerName} (${ownerLabel}).`;
    });
  const normalizedWarnings = uniqueStrings([
    ...warnings,
    ...missingKeeperPriceWarnings,
  ]);

  return {
    source: 'sleeper',
    leagueId,
    season,
    fetchedAt,
    draftId,
    keepers,
    completedPurchases,
    rosters: normalizedRosters,
    teams: normalizedRosters.map((roster) => ({
      rosterId: roster.rosterId,
      ownerUserId: roster.ownerUserId,
      ownerName: roster.ownerName,
      teamName: roster.teamName,
    })),
    warnings: normalizedWarnings,
    syncStatus:
      missingKeeperPriceWarnings.length > 0 || warnings.length > 0
        ? 'partial'
        : 'complete',
  };
}

export function mergeSleeperAuctionPurchaseLayers<
  T extends SleeperAuctionMergeRow,
>({
  sleeperKeeperRows,
  sleeperDraftRows,
  manualRows,
}: {
  sleeperKeeperRows: readonly T[];
  sleeperDraftRows: readonly T[];
  manualRows: readonly T[];
}): SleeperAuctionMergeResult<T> {
  const rows: T[] = [];
  const warnings: string[] = [];
  const suppressedManualRowIds: string[] = [];
  const rowByPlayerKey = new Map<string, T>();

  const addSleeperRow = (row: T) => {
    const playerKey = getSleeperAuctionSyncPlayerKey(row);
    if (!playerKey) {
      rows.push(row);
      return;
    }

    const existingRow = rowByPlayerKey.get(playerKey);
    if (existingRow) {
      if (
        existingRow.rosterId !== null &&
        row.rosterId !== null &&
        existingRow.rosterId !== row.rosterId
      ) {
        warnings.push(
          `${row.playerName} appears in multiple Sleeper rows with different rosters; using ${existingRow.source}.`
        );
      }
      if (existingRow.purchasePrice !== row.purchasePrice) {
        warnings.push(
          `${row.playerName} appears in multiple Sleeper rows with different prices; using ${formatMoney(existingRow.purchasePrice)}.`
        );
      }
      return;
    }

    rowByPlayerKey.set(playerKey, row);
    rows.push(row);
  };

  sleeperKeeperRows.forEach(addSleeperRow);
  sleeperDraftRows.forEach(addSleeperRow);

  manualRows.forEach((manualRow) => {
    const playerKey = getSleeperAuctionSyncPlayerKey(manualRow);
    const existingSleeperRow = playerKey ? rowByPlayerKey.get(playerKey) : null;

    if (existingSleeperRow) {
      suppressedManualRowIds.push(manualRow.id);

      const sameBuyer =
        existingSleeperRow.rosterId !== null &&
        manualRow.rosterId !== null &&
        existingSleeperRow.rosterId === manualRow.rosterId;

      if (!sameBuyer) {
        warnings.push(
          `${manualRow.playerName} manual sale conflicts with Sleeper roster assignment; using Sleeper.`
        );
        return;
      }

      if (existingSleeperRow.purchasePrice !== manualRow.purchasePrice) {
        warnings.push(
          `${manualRow.playerName} manual sale price ${formatMoney(manualRow.purchasePrice)} was replaced by Sleeper ${formatMoney(existingSleeperRow.purchasePrice)}.`
        );
      }
      return;
    }

    if (playerKey) rowByPlayerKey.set(playerKey, manualRow);
    rows.push(manualRow);
  });

  return {
    rows,
    warnings: uniqueStrings(warnings),
    suppressedManualRowIds,
  };
}
