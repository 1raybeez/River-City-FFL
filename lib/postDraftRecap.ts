import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import { requireAuctionAccess } from "@/lib/auth/auctionAccess";
import {
  POST_DRAFT_FIRESTORE_PATHS,
  POST_DRAFT_PUBLICATION_SCHEMA_VERSION,
  type PostDraftPublication,
  type PostDraftPublicationPointer,
} from "@/lib/postDraftPublicationTypes";
import {
  serializePublicLeagueRecap,
  type LeagueRecapDraft,
  type PublicLeagueRecap,
} from "@/lib/postDraftNarrativeTypes";
import type { PostDraftSnapshot } from "@/lib/postDraftSnapshotTypes";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { franchisesById, ownerProfilesById } from "@/lib/managers/identityData";
import { getPublishedTeamOutlookPublication } from "@/lib/postDraftPublication";

export const POST_DRAFT_RECAP_SCHEMA_VERSION = "post-draft-recap-v1";

export type PostDraftRecapDeterministic = {
  draftGradeLeaderboard: LeagueRecapDraft["draftGradeLeaderboard"];
  biggestBargains: LeagueRecapDraft["biggestBargains"];
  biggestReaches: LeagueRecapDraft["biggestReaches"];
  spendingTrends: string[];
  positionTrends: string[];
  earlyPowerRankings: LeagueRecapDraft["earlyPowerRankings"];
  teamOutlookLinks: LeagueRecapDraft["teamOutlookLinks"];
};

export type PostDraftRecapDraft = Omit<LeagueRecapDraft, "status" | "revision" | "createdAt" | "updatedAt" | "updatedBy" | "approvedAt" | "approvedBy" | "teamOutlookLinks" | "draftGradeLeaderboard" | "biggestBargains" | "biggestReaches" | "spendingTrends" | "positionTrends" | "earlyPowerRankings" | "privateStrategyLeaderboard" | "internalNotes"> & {
  recapId: string;
  schemaVersion: typeof POST_DRAFT_RECAP_SCHEMA_VERSION;
  status: LeagueRecapDraft["status"];
  revision: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  approvedAt: string | null;
  approvedBy: string | null;
  deterministic: PostDraftRecapDeterministic;
  coverage: PostDraftSnapshot["coverage"];
  sourceMetadata: PostDraftSnapshot["provenance"];
};

export class PostDraftRecapError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "PostDraftRecapError";
  }
}

export function isPostDraftRecapError(error: unknown): error is PostDraftRecapError {
  return error instanceof PostDraftRecapError;
}

function now() { return new Date().toISOString(); }
function recapRef(recapId: string) { return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.recapDrafts).doc(recapId); }
function snapshotRef(snapshotId: string) { return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.snapshots).doc(snapshotId); }
function publicationRef(publicationId: string) { return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.publications).doc(publicationId); }
function pointerRef(season: number) { return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.activePublicationPointers).doc(String(season)); }

function franchiseLink(franchiseId: string) {
  const ownerId = franchisesById[franchiseId]?.activeOwnerIds[0];
  const slug = ownerId ? ownerProfilesById[ownerId]?.slug : null;
  return slug ? `/managers/owners/${slug}` : null;
}

async function getTeamOutlookLinks() {
  const links = await Promise.all(canonicalAuctionTeams.map(async (team) => {
    const active = await getPublishedTeamOutlookPublication(2026, team.franchiseId);
    const href = franchiseLink(team.franchiseId);
    return active && href ? { franchiseId: team.franchiseId, publicationId: active.publicationId } : null;
  }));
  return links.filter((link): link is { franchiseId: string; publicationId: string } => Boolean(link));
}

function formatMoney(value: number) { return `$${value.toFixed(2)}`; }

function assembleDeterministic(snapshot: PostDraftSnapshot, teamOutlookLinks: LeagueRecapDraft["teamOutlookLinks"]): PostDraftRecapDeterministic {
  const records = snapshot.publicRecords;
  const gradeLeaderboard = records
    .filter((record) => record.draftGrade?.draftScore != null)
    .map((record) => ({ franchiseId: record.publicRecord.franchiseId, teamName: record.publicRecord.teamName, grade: record.draftGrade!.letterGrade, draftScore: record.draftGrade!.draftScore }))
    .sort((a, b) => (b.draftScore ?? -Infinity) - (a.draftScore ?? -Infinity) || a.franchiseId.localeCompare(b.franchiseId))
    .map(({ franchiseId, teamName, grade }) => ({ franchiseId, teamName, grade }));
  const bargains = records.filter((record) => record.publicRecord.metrics.bestBuy).map((record) => ({ franchiseId: record.publicRecord.franchiseId, teamName: record.publicRecord.teamName, playerName: record.publicRecord.metrics.bestBuy!.playerName, valueDifferential: record.publicRecord.metrics.bestBuy!.valueDifferential })).sort((a, b) => b.valueDifferential - a.valueDifferential || a.franchiseId.localeCompare(b.franchiseId)).slice(0, 5).map(({ franchiseId, teamName, playerName }) => ({ franchiseId, teamName, playerName }));
  const reaches = records.filter((record) => record.publicRecord.metrics.biggestReach).map((record) => ({ franchiseId: record.publicRecord.franchiseId, teamName: record.publicRecord.teamName, playerName: record.publicRecord.metrics.biggestReach!.playerName, valueDifferential: record.publicRecord.metrics.biggestReach!.valueDifferential })).sort((a, b) => a.valueDifferential - b.valueDifferential || a.franchiseId.localeCompare(b.franchiseId)).slice(0, 5).map(({ franchiseId, teamName, playerName }) => ({ franchiseId, teamName, playerName }));
  const positionTotals = new Map<string, { spend: number; players: number }>();
  records.forEach((record) => Object.entries(record.publicRecord.metrics.positionSpend).forEach(([position, metric]) => {
    const current = positionTotals.get(position) ?? { spend: 0, players: 0 };
    positionTotals.set(position, { spend: current.spend + metric.totalSpend, players: current.players + metric.playerCount });
  }));
  const spendingTrends = records.map((record) => ({ teamName: record.publicRecord.teamName, spend: record.publicRecord.metrics.totalSpend, remaining: record.publicRecord.metrics.remainingBudget })).sort((a, b) => b.spend - a.spend || a.teamName.localeCompare(b.teamName)).map((row) => `${row.teamName}: spent ${formatMoney(row.spend)}, remaining ${formatMoney(row.remaining)}.`);
  const positionTrends = [...positionTotals.entries()].sort((a, b) => b[1].spend - a[1].spend || a[0].localeCompare(b[0])).map(([position, value]) => `${position}: ${formatMoney(value.spend)} across ${value.players} players.`);
  const earlyPowerRankings = records.filter((record) => record.powerRanking?.rank != null).map((record) => ({ franchiseId: record.publicRecord.franchiseId, teamName: record.publicRecord.teamName, rank: record.powerRanking!.rank })).sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER) || a.franchiseId.localeCompare(b.franchiseId));
  return { draftGradeLeaderboard: gradeLeaderboard, biggestBargains: bargains, biggestReaches: reaches, spendingTrends, positionTrends, earlyPowerRankings, teamOutlookLinks };
}

function toLeagueRecapDraft(recap: PostDraftRecapDraft): LeagueRecapDraft {
  return {
    season: recap.season,
    snapshotId: recap.snapshotId,
    status: recap.status,
    revision: recap.revision,
    createdAt: recap.createdAt,
    updatedAt: recap.updatedAt,
    updatedBy: recap.updatedBy,
    approvedAt: recap.approvedAt,
    approvedBy: recap.approvedBy,
    title: recap.title,
    dek: recap.dek,
    openingCommissionerTake: recap.openingCommissionerTake,
    draftGradeLeaderboard: recap.deterministic.draftGradeLeaderboard,
    biggestBargains: recap.deterministic.biggestBargains,
    biggestReaches: recap.deterministic.biggestReaches,
    spendingTrends: recap.deterministic.spendingTrends,
    positionTrends: recap.deterministic.positionTrends,
    earlyPowerRankings: recap.deterministic.earlyPowerRankings,
    teamOneLiners: recap.teamOneLiners,
    notableDraftDecisions: recap.notableDraftDecisions,
    closingTake: recap.closingTake,
    teamOutlookLinks: recap.deterministic.teamOutlookLinks,
    privateStrategyLeaderboard: [],
    internalNotes: null,
  };
}

export async function assemblePostDraftRecap(snapshotId: string) {
  await requireAuctionAccess("maintenance");
  const snapshotDoc = await snapshotRef(snapshotId).get();
  if (!snapshotDoc.exists) throw new PostDraftRecapError("Snapshot was not found.", 404);
  const snapshot = snapshotDoc.data() as PostDraftSnapshot;
  if (snapshot.snapshotStatus !== "locked") throw new PostDraftRecapError("A locked snapshot is required.");
  if (snapshot.coverage.status !== "complete" || snapshot.publicRecords.length !== canonicalAuctionTeams.length) throw new PostDraftRecapError("Complete public franchise coverage is required before recap assembly.");
  const teamOutlookLinks = await getTeamOutlookLinks();
  const deterministic = assembleDeterministic(snapshot, teamOutlookLinks);
  return { snapshot, deterministic };
}

export async function createPostDraftRecapDraft(snapshotId: string) {
  const session = await requireAuctionAccess("maintenance");
  const { snapshot, deterministic } = await assemblePostDraftRecap(snapshotId);
  const recapId = `${snapshot.snapshotId}:league-recap:r1`;
  const draft: PostDraftRecapDraft = {
    recapId, schemaVersion: POST_DRAFT_RECAP_SCHEMA_VERSION, season: snapshot.season, snapshotId, status: "draft", revision: 1,
    createdAt: now(), updatedAt: now(), updatedBy: session.access.canonicalOwnerId ?? "commissioner", approvedAt: null, approvedBy: null,
    title: null, dek: null, openingCommissionerTake: null, teamOneLiners: [], notableDraftDecisions: [], closingTake: null,
    deterministic, coverage: snapshot.coverage, sourceMetadata: snapshot.provenance,
  };
  await recapRef(recapId).create({ ...draft, type: "league-recap", privateStrategyLeaderboard: [], internalNotes: null });
  return draft;
}

export async function listPostDraftRecapDrafts() {
  await requireAuctionAccess("maintenance");
  const result = await firestore.collection(POST_DRAFT_FIRESTORE_PATHS.recapDrafts).orderBy("updatedAt", "desc").limit(20).get();
  return result.docs.map((doc) => doc.data() as PostDraftRecapDraft);
}

function text(value: unknown, max = 4000) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.trim().length > max) throw new PostDraftRecapError("Recap narrative text is invalid.");
  return value.trim() || null;
}

function textList(value: unknown) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > 50) throw new PostDraftRecapError("Recap narrative list is invalid.");
  return value.map((item) => text(item)).filter((item): item is string => Boolean(item));
}

function teamOneLinerList(value: unknown) {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value) || value.length > 20) throw new PostDraftRecapError("Team one-liners must be a structured list.");
  return value.map((item) => {
    if (!item || typeof item !== "object") throw new PostDraftRecapError("Team one-liners must include franchise, team, and text.");
    const candidate = item as Record<string, unknown>;
    const franchiseId = text(candidate.franchiseId, 200);
    const teamName = text(candidate.teamName, 200);
    const line = text(candidate.text);
    if (!franchiseId || !teamName || !line) throw new PostDraftRecapError("Team one-liners must include franchise, team, and text.");
    return { franchiseId, teamName, text: line };
  });
}

export async function savePostDraftRecapDraft({ recapId, expectedRevision, input }: { recapId: string; expectedRevision: number; input: Record<string, unknown> }) {
  const session = await requireAuctionAccess("maintenance");
  const ref = recapRef(recapId);
  let saved: PostDraftRecapDraft | null = null;
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw new PostDraftRecapError("Recap draft was not found.", 404);
    const current = doc.data() as PostDraftRecapDraft;
    if (current.revision !== expectedRevision) throw new PostDraftRecapError("Recap changed since it was loaded. Refresh before saving.", 409);
    if (!["draft", "in_review"].includes(current.status)) throw new PostDraftRecapError("Only draft or in-review recaps can be edited.");
    saved = { ...current, title: text(input.title), dek: text(input.dek), openingCommissionerTake: text(input.openingCommissionerTake), teamOneLiners: teamOneLinerList(input.teamOneLiners), notableDraftDecisions: textList(input.notableDraftDecisions), closingTake: text(input.closingTake), revision: current.revision + 1, updatedAt: now(), updatedBy: session.access.canonicalOwnerId ?? "commissioner" };
    transaction.set(ref, saved, { merge: true });
  });
  if (!saved) throw new PostDraftRecapError("Recap save failed.", 500);
  return saved;
}

export async function transitionPostDraftRecap({ recapId, to, expectedRevision }: { recapId: string; to: "in_review" | "approved"; expectedRevision: number }) {
  const session = await requireAuctionAccess("maintenance");
  const ref = recapRef(recapId);
  let result: PostDraftRecapDraft | null = null;
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw new PostDraftRecapError("Recap draft was not found.", 404);
    const current = doc.data() as PostDraftRecapDraft;
    if (current.revision !== expectedRevision) throw new PostDraftRecapError("Recap changed since it was loaded. Refresh before transitioning.", 409);
    const valid = (current.status === "draft" && to === "in_review") || (current.status === "in_review" && to === "approved");
    if (!valid) throw new PostDraftRecapError("Invalid recap lifecycle transition.");
    const updatedAt = now();
    result = { ...current, status: to, revision: current.revision + 1, updatedAt, updatedBy: session.access.canonicalOwnerId ?? "commissioner", approvedAt: to === "approved" ? updatedAt : current.approvedAt, approvedBy: to === "approved" ? (session.access.canonicalOwnerId ?? "commissioner") : current.approvedBy };
    transaction.set(ref, result, { merge: true });
  });
  if (!result) throw new PostDraftRecapError("Recap transition failed.", 500);
  return result;
}

export async function previewPostDraftRecap(recapId: string): Promise<PublicLeagueRecap> {
  await requireAuctionAccess("maintenance");
  const doc = await recapRef(recapId).get();
  if (!doc.exists) throw new PostDraftRecapError("Recap draft was not found.", 404);
  const recap = doc.data() as PostDraftRecapDraft;
  return serializePublicLeagueRecap(toLeagueRecapDraft(recap), "preview", now());
}

async function assertFreshTeamOutlookLinks(recap: PostDraftRecapDraft) {
  const current = await getTeamOutlookLinks();
  const expected = JSON.stringify(recap.deterministic.teamOutlookLinks);
  if (JSON.stringify(current) !== expected) throw new PostDraftRecapError("A linked team outlook changed. Reassemble the recap before publishing.", 409);
}

export async function publishPostDraftRecap({ recapId, expectedRevision }: { recapId: string; expectedRevision: number }) {
  const session = await requireAuctionAccess("maintenance");
  const recapDoc = await recapRef(recapId).get();
  if (!recapDoc.exists) throw new PostDraftRecapError("Recap draft was not found.", 404);
  const recap = recapDoc.data() as PostDraftRecapDraft;
  if (recap.revision !== expectedRevision || recap.status !== "approved") throw new PostDraftRecapError("Only the current approved recap revision can be published.", 409);
  const snapshotDoc = await snapshotRef(recap.snapshotId).get();
  if (!snapshotDoc.exists || (snapshotDoc.data() as PostDraftSnapshot).snapshotStatus !== "locked") throw new PostDraftRecapError("A locked snapshot is required for publication.");
  await assertFreshTeamOutlookLinks(recap);
  const pointer = pointerRef(recap.season);
  return firestore.runTransaction(async (transaction) => {
    const pointerDoc = await transaction.get(pointer);
    const currentPointer = pointerDoc.exists ? pointerDoc.data() as PostDraftPublicationPointer : null;
    const previousId = currentPointer?.activeLeagueRecapId ?? null;
    const previousDoc = previousId ? await transaction.get(publicationRef(previousId)) : null;
    const publishedAt = now();
    const revision = (currentPointer?.revision ?? 0) + 1;
    const publicationId = `${recap.season}:league-recap:v${revision}`;
    const publicLeagueRecap = serializePublicLeagueRecap(toLeagueRecapDraft(recap), publicationId, publishedAt);
    const publication: PostDraftPublication = {
      publicationId, schemaVersion: POST_DRAFT_PUBLICATION_SCHEMA_VERSION, season: recap.season, publicationKind: "league", franchiseId: null,
      snapshotId: recap.snapshotId, narrativeId: recap.recapId, narrativeRevision: recap.revision, revision, status: "published", createdAt: publishedAt, updatedAt: publishedAt,
      approvedAt: recap.approvedAt, publishedAt, supersedes: previousId, previousVersionId: previousId,
      approval: recap.approvedBy && recap.approvedAt ? { approvedBy: recap.approvedBy, approvedAt: recap.approvedAt, approvalNote: null } : null,
      createdBy: session.access.canonicalOwnerId ?? "commissioner", sourceMetadata: { snapshotGeneratedAt: recap.sourceMetadata.sleeperGeneratedAt ?? recap.updatedAt, metricsModelVersion: "post-draft-recap-v1", draftGradeModelVersion: recap.sourceMetadata.draftGradeModelVersion, strategyExecutionModelVersion: recap.sourceMetadata.strategyExecutionModelVersion, powerRankingsVersion: recap.sourceMetadata.powerRankingsVersion }, rollbackFrom: null, rollbackAt: null, publicTeamOutlooks: [], publicLeagueRecap,
    };
    if (previousDoc?.exists) transaction.update(previousDoc.ref, { status: "superseded", updatedAt: publishedAt });
    transaction.create(publicationRef(publicationId), publication);
    transaction.set(pointer, { season: recap.season, revision, updatedAt: publishedAt, activeByFranchise: currentPointer?.activeByFranchise ?? {}, activeLeagueRecapId: publicationId } satisfies PostDraftPublicationPointer);
    return publication;
  });
}

export async function unpublishPostDraftRecap(publicationId: string) {
  await requireAuctionAccess("maintenance");
  const publicationDoc = await publicationRef(publicationId).get();
  if (!publicationDoc.exists) throw new PostDraftRecapError("Recap publication was not found.", 404);
  const publication = publicationDoc.data() as PostDraftPublication;
  if (publication.publicationKind !== "league") throw new PostDraftRecapError("Publication is not a league recap.");
  const pointer = pointerRef(publication.season);
  return firestore.runTransaction(async (transaction) => {
    const pointerDoc = await transaction.get(pointer);
    const current = pointerDoc.exists ? pointerDoc.data() as PostDraftPublicationPointer : null;
    if (current?.activeLeagueRecapId !== publicationId) throw new PostDraftRecapError("Recap is no longer active.", 409);
    const updatedAt = now();
    transaction.update(publicationRef(publicationId), { status: "unpublished", updatedAt });
    transaction.set(pointer, { ...current, activeLeagueRecapId: null, revision: (current?.revision ?? 0) + 1, updatedAt }, { merge: true });
    return { ...publication, status: "unpublished" as const, updatedAt };
  });
}

export async function rollbackPostDraftRecap(publicationId: string) {
  const session = await requireAuctionAccess("maintenance");
  const targetDoc = await publicationRef(publicationId).get();
  if (!targetDoc.exists) throw new PostDraftRecapError("Recap publication was not found.", 404);
  const target = targetDoc.data() as PostDraftPublication;
  if (target.publicationKind !== "league" || !target.approval || !target.publicLeagueRecap) throw new PostDraftRecapError("Only an approved historical recap can be restored.");
  const pointer = pointerRef(target.season);
  return firestore.runTransaction(async (transaction) => {
    const pointerDoc = await transaction.get(pointer);
    const current = pointerDoc.exists ? pointerDoc.data() as PostDraftPublicationPointer : null;
    const currentId = current?.activeLeagueRecapId ?? null;
    if (currentId === publicationId) return target;
    const currentDoc = currentId ? await transaction.get(publicationRef(currentId)) : null;
    const updatedAt = now();
    if (currentDoc?.exists) transaction.update(currentDoc.ref, { status: "superseded", updatedAt });
    transaction.update(targetDoc.ref, { status: "published", updatedAt, rollbackFrom: currentId, rollbackAt: updatedAt, rolledBackBy: session.access.canonicalOwnerId ?? "commissioner" });
    transaction.set(pointer, { ...current, season: target.season, revision: (current?.revision ?? 0) + 1, updatedAt, activeLeagueRecapId: publicationId }, { merge: true });
    return { ...target, status: "published" as const, updatedAt, rollbackFrom: currentId, rollbackAt: updatedAt };
  });
}

export async function getPublishedLeagueRecap(season: number): Promise<PublicLeagueRecap | null> {
  const pointerDoc = await pointerRef(season).get();
  if (!pointerDoc.exists) return null;
  const pointer = pointerDoc.data() as PostDraftPublicationPointer;
  if (!pointer.activeLeagueRecapId) return null;
  const publicationDoc = await publicationRef(pointer.activeLeagueRecapId).get();
  if (!publicationDoc.exists) return null;
  const publication = publicationDoc.data() as PostDraftPublication;
  return publication.publicationKind === "league" && publication.status === "published" ? publication.publicLeagueRecap : null;
}
