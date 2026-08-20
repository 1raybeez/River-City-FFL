import {
  readPublishedAdpConsensusFromFirestore,
} from "@/lib/auction/adpRefreshService";
import { readAuctionOwnerPreferences } from "@/lib/auction/ownerPreferences";
import { riverCityAuctionLeagueSettings } from "@/lib/auction/leagueSettings";
import { readPublishedMasterviewFromFirestore } from "@/lib/auction/valueRefreshService";
import { readAuthorizedWarRoomPurchaseSnapshots } from "@/lib/auction/warRoomPurchaseView";
import { readAuctionPurchaseDecisionSnapshots } from "@/lib/auction/purchaseDecisions";
import { readWarRoomLiveAuctionState } from "@/lib/auction/warRoomLiveStateFirestore";
import { normalizeSleeperAuctionSyncSnapshot } from "@/lib/auction/sleeperAuctionSync";
import { deriveWarRoomBudgetState } from "@/lib/auction/warRoomLiveState";
import { reconcileAuctionPurchases } from "@/lib/auction/purchaseReconciliation";
import { getLeagueRosters, getLeagueUsers, getSleeperAuctionDraftSnapshot } from "@/lib/sleeper";
import localMasterview from "@/data/auction/generated/masterview-2026.json";
import localAdp from "@/data/auction/adp/generated/adp-consensus-2026.json";
import {
  buildRecommendedNow,
  type RecommendedNowAdpRow,
  type RecommendedNowPurchase,
  type RecommendedNowValueRow,
} from "@/lib/auction/recommendedNow";
import type { AuctionAccessSession } from "@/lib/auth/auctionAccess";

async function readAuctionValues() {
  try {
    const published = await readPublishedMasterviewFromFirestore(2026);
    if (published?.rows.length) return published.rows;
  } catch (error) {
    console.warn("[recommended-now] Published auction values unavailable", error);
  }
  return localMasterview.rows;
}

async function readAdpConsensus() {
  try {
    const published = await readPublishedAdpConsensusFromFirestore(2026);
    if (published?.rows.length) return published.rows;
  } catch (error) {
    console.warn("[recommended-now] Published ADP unavailable", error);
  }
  return localAdp.rows;
}

function toValueRows(rows: Awaited<ReturnType<typeof readAuctionValues>>): RecommendedNowValueRow[] {
  return rows.flatMap((row) => row.sleeperPlayerId ? [{
    playerId: row.sleeperPlayerId,
    playerName: row.playerName,
    position: row.position ?? null,
    nflTeam: row.nflTeam ?? null,
    auctionConsensus: row.averageValue ?? null,
    auctionLow: row.lowValue ?? null,
    auctionHigh: row.highValue ?? null,
    auctionSourceCount: row.sourceCount ?? 0,
  }] : []);
}

function toAdpRows(rows: Awaited<ReturnType<typeof readAdpConsensus>>): RecommendedNowAdpRow[] {
  return rows.map((row) => ({ playerId: row.playerId, adp: row.consensusOverallAdp ?? null, sourceCount: row.sourceCount ?? 0 }));
}

function toPurchases(snapshot: {
  keepers: Array<{ playerId: string | null; playerName: string; position: string | null; rosterId: number | null; keeperPrice: number | null }>;
  completedPurchases: Array<{ playerId: string | null; playerName: string; position: string | null; rosterId: number | null; salePrice: number | null }>;
}): RecommendedNowPurchase[] {
  return [
    ...snapshot.keepers.map((keeper) => ({ playerId: keeper.playerId, playerName: keeper.playerName, position: keeper.position, price: keeper.keeperPrice ?? 0, rosterId: keeper.rosterId, isKeeper: true })),
    ...snapshot.completedPurchases.map((purchase) => ({ playerId: purchase.playerId, playerName: purchase.playerName, position: purchase.position, price: purchase.salePrice ?? 0, rosterId: purchase.rosterId, isKeeper: false })),
  ];
}

async function readPublicAuctionState() {
  try {
    const snapshot = await getSleeperAuctionDraftSnapshot(2026);
    if (!snapshot.leagueId) return null;
    const [rosters, users, playersResponse] = await Promise.all([
      getLeagueRosters(snapshot.leagueId),
      getLeagueUsers(snapshot.leagueId),
      fetch("https://api.sleeper.app/v1/players/nfl", { next: { revalidate: 3600 } }),
    ]);
    const players = playersResponse.ok ? await playersResponse.json() : undefined;
    return normalizeSleeperAuctionSyncSnapshot({
      leagueId: snapshot.leagueId,
      season: 2026,
      fetchedAt: new Date().toISOString(),
      draftId: typeof snapshot.draft?.draft_id === "string" ? snapshot.draft.draft_id : null,
      picks: snapshot.picks,
      rosters,
      users,
      playersById: players,
      warnings: snapshot.warnings,
    });
  } catch (error) {
    console.warn("[recommended-now] Public Sleeper state unavailable", error);
    return null;
  }
}

export async function readRecommendedNowForActor(
  actor: AuctionAccessSession,
  options: { diagnostic?: boolean; evaluationPlayerId?: string } = {}
) {
  const ownerProfileId = actor.access.ownerProfileId;
  const rosterId = actor.access.sleeperRosterId;
  if (!ownerProfileId || rosterId == null) throw new Error("Authorized War Room roster is unavailable.");
  const [values, adp, preferences, publicState, liveState, authorizedPurchases] = await Promise.all([
    readAuctionValues(),
    readAdpConsensus(),
    readAuctionOwnerPreferences({ ownerProfileId, warRoomId: actor.access.warRoomId ?? undefined }),
    readPublicAuctionState(),
    actor.access.warRoomId ? readWarRoomLiveAuctionState(actor.access.warRoomId) : Promise.resolve(null),
    actor.access.warRoomId ? readAuthorizedWarRoomPurchaseSnapshots({ access: actor.access }) : readAuctionPurchaseDecisionSnapshots({ season: 2026 }),
  ]);
  const publicPurchases = publicState ? toPurchases(publicState) : [];
  const keepers = liveState?.keepers ?? publicPurchases.filter((purchase) => purchase.rosterId === rosterId && purchase.isKeeper).map((purchase) => ({ playerId: purchase.playerId ?? "", playerName: purchase.playerName, keeperCost: purchase.price, status: "declared" as const }));
  const reconciliation = reconcileAuctionPurchases({ season: 2026, sleeperPurchases: publicState?.completedPurchases ?? [], operationalPurchases: authorizedPurchases, warRoomPurchases: liveState?.purchases ?? [], warRoomRosterId: rosterId });
  const normalizedPurchases: RecommendedNowPurchase[] = reconciliation.activePurchases.map((purchase) => ({ playerId: purchase.playerId, playerName: purchase.playerName, position: purchase.position, price: purchase.amount, rosterId: purchase.rosterId, isKeeper: false }));
  const activeKeepers: RecommendedNowPurchase[] = keepers.map((keeper) => ({ playerId: keeper.playerId, playerName: keeper.playerName, position: publicPurchases.find((purchase) => purchase.isKeeper && purchase.playerId === keeper.playerId)?.position ?? values.find((value) => value.sleeperPlayerId === keeper.playerId)?.position ?? null, price: keeper.keeperCost ?? 0, rosterId, isKeeper: true }));
  const allPurchases = [...publicPurchases.filter((purchase) => purchase.isKeeper), ...activeKeepers, ...normalizedPurchases].filter((purchase, index, rows) => {
    const key = `${purchase.playerId ?? purchase.playerName}:${purchase.rosterId ?? "unknown"}:${purchase.isKeeper ? "keeper" : "purchase"}`;
    return rows.findIndex((candidate) => `${candidate.playerId ?? candidate.playerName}:${candidate.rosterId ?? "unknown"}:${candidate.isKeeper ? "keeper" : "purchase"}` === key) === index;
  });
  const ownerPurchases = reconciliation.activePurchases.filter((purchase) => purchase.rosterId === rosterId).map((purchase) => ({ purchaseId: purchase.purchaseId ?? `${purchase.playerId ?? purchase.playerName}:${purchase.rosterId ?? "unknown"}`, playerId: purchase.playerId, playerName: purchase.playerName, salePrice: purchase.amount, status: "active" as const }));
  const ownerBudget = deriveWarRoomBudgetState({ teamBudget: riverCityAuctionLeagueSettings.auctionBudgetPerTeam, rosterSlots: 16, keepers, purchases: ownerPurchases });
  const teams = new Map<number, RecommendedNowPurchase[]>();
  allPurchases.forEach((purchase) => { if (purchase.rosterId == null) return; teams.set(purchase.rosterId, [...(teams.get(purchase.rosterId) ?? []), purchase]); });
  const teamStates = Array.from(new Set([...(publicState?.teams.map((team) => team.rosterId) ?? []), rosterId])).map((teamRosterId) => {
    const rows = teams.get(teamRosterId) ?? [];
    return { rosterId: teamRosterId, remainingBudget: Math.max(0, riverCityAuctionLeagueSettings.auctionBudgetPerTeam - rows.filter((row) => row.isKeeper).reduce((sum, row) => sum + row.price, 0) - rows.filter((row) => !row.isKeeper).reduce((sum, row) => sum + row.price, 0)), rosterSlotsRemaining: Math.max(0, 16 - rows.length) };
  });
  const result = buildRecommendedNow({ values: toValueRows(values), adp: toAdpRows(adp), preferences: new Map(preferences.map((preference) => [preference.sleeperPlayerId, { tag: preference.tag, preferredEntry: preference.preferredEntry, plannedCap: preference.plannedCap }])), purchases: allPurchases, teams: teamStates, rayRosterId: rosterId, rayBudget: { teamBudget: riverCityAuctionLeagueSettings.auctionBudgetPerTeam, keeperCostTotal: ownerBudget.keeperCostTotal, spentBudget: ownerBudget.spentBudget, rosterSlotsTotal: 16 }, generatedAt: new Date().toISOString() }, { diagnostic: options.diagnostic ?? false, evaluationPlayerId: options.evaluationPlayerId });
  if (reconciliation.conflicts.length > 0) { result.status = "partial"; result.warnings.push(...reconciliation.conflicts.map((conflict) => conflict.message)); }
  if (result.diagnostic) result.diagnostic.reconciliation = { activePurchaseCount: reconciliation.activePurchases.length, voidedPurchaseCount: reconciliation.voidedPurchases.length, sleeperPurchaseCount: reconciliation.sourceCounts.sleeperPurchaseCount, operationalPurchaseCount: reconciliation.sourceCounts.operationalPurchaseCount, warRoomPurchaseCount: reconciliation.sourceCounts.warRoomPurchaseCount, deduplicatedPurchaseCount: reconciliation.records.length, conflicts: reconciliation.conflicts.map((conflict) => conflict.message), rayPurchases: reconciliation.records.filter((purchase) => purchase.rosterId === rosterId).map((purchase) => ({ playerId: purchase.playerId, playerName: purchase.playerName, status: purchase.status, source: purchase.source, amount: purchase.amount })) };
  return result;
}
