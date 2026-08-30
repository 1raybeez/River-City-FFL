import "server-only";

import { firestore } from "@/lib/firebaseAdmin";
import {
  AuctionAccessError,
  requireAuctionAccess,
} from "@/lib/auth/auctionAccess";
import {
  calculatePublicDraftGrades,
} from "@/lib/draftGrade";
import {
  POST_DRAFT_FIRESTORE_PATHS,
} from "@/lib/postDraftPublicationTypes";
import {
  POST_DRAFT_NARRATIVE_SCHEMA_VERSION,
  serializePublicTeamOutlook,
  type FranchiseNarrativeDraft,
  type PostDraftNarrativeStatus,
} from "@/lib/postDraftNarrativeTypes";
import {
  POST_DRAFT_SNAPSHOT_SCHEMA_VERSION,
  type PostDraftSnapshot,
} from "@/lib/postDraftSnapshotTypes";
import { calculatePrivatePostDraftMetrics, getPostDraftMetrics, loadPostDraftMetricsInput } from "@/lib/postDraftMetrics";
import { calculateStrategyExecution } from "@/lib/strategyExecution";
import { readAuctionOwnerPreferences } from "@/lib/auction/ownerPreferences";
import { readAuctionOwnerProfileSettings } from "@/lib/auction/ownerProfileSettings";
import { getCanonicalPowerRankings } from "@/lib/powerRankings";
import { readPublishedMasterviewFromFirestore } from "@/lib/auction/valueRefreshService";
import { readPublishedAdpConsensusFromFirestore } from "@/lib/auction/adpRefreshService";
import { canonicalAuctionTeams } from "@/lib/auction/canonicalTeamCatalog";
import { buildCommissionerPostDraftIndex } from "@/lib/commissionerPostDraftIndex";
import { getCurrentSeasonTeamIdentityMap } from "@/lib/currentSeasonTeamIdentityServer";
import { buildPostDraftTeamAnalysis } from "@/lib/postDraftTeamAnalysis";
import { postDraftReportFranchiseId, postDraftSourceFranchiseId } from "@/lib/postDraftFranchiseIdentity";

const MAX_TEXT_LENGTH = 4000;
const MAX_LIST_ITEMS = 20;

export class PostDraftWorkflowError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
    this.name = "PostDraftWorkflowError";
  }
}

export function isPostDraftWorkflowError(error: unknown): error is PostDraftWorkflowError {
  return error instanceof PostDraftWorkflowError || error instanceof AuctionAccessError;
}

async function requireCommissioner() {
  return requireAuctionAccess("maintenance");
}

function now() {
  return new Date().toISOString();
}

function snapshotRef(snapshotId: string) {
  return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.snapshots).doc(snapshotId);
}

function narrativeRef(narrativeId: string) {
  return firestore.collection(POST_DRAFT_FIRESTORE_PATHS.narratives).doc(narrativeId);
}

function normalizeText(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new PostDraftWorkflowError("Narrative fields must be text.");
  const text = value.trim();
  if (text.length > MAX_TEXT_LENGTH) throw new PostDraftWorkflowError("Narrative text exceeds the allowed length.");
  return text || null;
}

function normalizeList(value: unknown) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > MAX_LIST_ITEMS) throw new PostDraftWorkflowError("Narrative lists are invalid.");
  return value.map(normalizeText).filter((item): item is string => Boolean(item));
}

function sourceRunId(source: { activeRunId?: string | null } | null) {
  return source?.activeRunId ?? null;
}

async function readSourceState() {
  const [values, adp, rankings] = await Promise.all([
    readPublishedMasterviewFromFirestore(2026),
    readPublishedAdpConsensusFromFirestore(2026),
    getCanonicalPowerRankings(),
  ]);
  return {
    valuesRunId: sourceRunId(values),
    valuesGeneratedAt: values?.generatedAt ?? null,
    adpRunId: adp?.activeRunId ?? null,
    adpGeneratedAt: adp?.generatedAt ?? null,
    rankingsGeneratedAt: rankings.generatedAt,
    franchiseSignature: canonicalAuctionTeams.map((team) => `${team.franchiseId}:${team.rosterId}`).join("|")
  };
}

export async function createPostDraftSnapshot() {
  const session = await requireCommissioner();
  const before = await readSourceState();
  const metrics = await getPostDraftMetrics();
  if (metrics.sourceDraftStatus !== "complete" || metrics.status === "not-ready") {
    throw new PostDraftWorkflowError("A completed Sleeper draft with final coverage is required before snapshot capture.");
  }
  const rankings = await getCanonicalPowerRankings();
  const grades = calculatePublicDraftGrades(metrics);
  const input = await loadPostDraftMetricsInput(metrics.season);
  const after = await readSourceState();
  if (before.valuesRunId !== after.valuesRunId || before.adpRunId !== after.adpRunId || before.franchiseSignature !== after.franchiseSignature) {
    throw new PostDraftWorkflowError("A source run or canonical franchise mapping changed during snapshot capture. Retry capture.", 409);
  }
  const generatedAt = now();
  const snapshotId = `${metrics.season}-${generatedAt.replace(/[^0-9]/g, "").slice(0, 14)}`;
  const publicRecords = metrics.records.map((publicRecord) => ({
    publicRecord,
    draftGrade: grades.records.find((grade) => grade.franchiseId === publicRecord.franchiseId) ?? null,
    powerRanking: rankings.teams.find((team) => postDraftReportFranchiseId(team.franchiseId) === publicRecord.franchiseId) ?? null,
    teamAnalysis: buildPostDraftTeamAnalysis(publicRecord, input, metrics),
  }));
  if (publicRecords.length !== canonicalAuctionTeams.length) {
    throw new PostDraftWorkflowError("Every canonical franchise must have a public snapshot record before locking.");
  }
  const privateRecords = [];
  for (const team of canonicalAuctionTeams) {
    const privateResult = await calculatePrivatePostDraftMetrics(metrics, input, {
      warRoomId: team.warRoomId,
      franchiseId: team.franchiseId,
      preferences: await readAuctionOwnerPreferences({ season: metrics.season, ownerProfileId: team.ownerIds[0] ?? "", warRoomId: team.warRoomId }),
    });
    const privateRecord = privateResult.records[0];
    if (!privateRecord) throw new PostDraftWorkflowError(`Private snapshot data is unavailable for ${team.franchiseId}.`);
    const settings = await readAuctionOwnerProfileSettings({ season: metrics.season, ownerProfileId: team.ownerIds[0] ?? "", warRoomId: team.warRoomId });
    privateRecords.push({ privateRecord, strategyExecution: calculateStrategyExecution({ privateRecord, settings }) });
  }
  const warnings = Array.from(new Set([
    ...metrics.warnings,
    ...(rankings.coverage.status === "partial" ? [rankings.coverage.message ?? "Power Ranking coverage is partial."] : []),
  ]));
  const snapshot: PostDraftSnapshot = {
    snapshotId,
    schemaVersion: POST_DRAFT_SNAPSHOT_SCHEMA_VERSION,
    snapshotStatus: "locked",
    season: metrics.season,
    draftId: metrics.sourceDraftId,
    sleeperDraftStatus: metrics.sourceDraftStatus,
    generatedAt,
    sourceTimestamps: [before.valuesGeneratedAt, before.adpGeneratedAt, before.rankingsGeneratedAt].filter((value): value is string => Boolean(value)),
    modelVersions: {
      metrics: metrics.metricsSchemaVersion,
      draftGrade: grades.gradeModelVersion,
      strategyExecution: "river-city-strategy-execution-v1",
      powerRankings: "canonical-power-rankings-v1",
    },
    provenance: {
      sleeperDraftId: metrics.sourceDraftId,
      sleeperDraftStatus: metrics.sourceDraftStatus,
      sleeperGeneratedAt: null,
      auctionValueRunId: before.valuesRunId,
      auctionValueGeneratedAt: before.valuesGeneratedAt,
      adpRunId: before.adpRunId,
      adpGeneratedAt: before.adpGeneratedAt,
      draftGradeModelVersion: grades.gradeModelVersion,
      strategyExecutionModelVersion: "river-city-strategy-execution-v1",
      powerRankingsGeneratedAt: rankings.generatedAt,
      powerRankingsVersion: "canonical-power-rankings-v1",
    },
    publicRecords,
    privateRecords,
    coverage: { status: warnings.length > 0 ? "partial" : "complete", warnings },
  };
  await snapshotRef(snapshotId).create({ ...snapshot, createdBy: session.access.canonicalOwnerId ?? "commissioner" });
  return snapshot;
}

export async function listPostDraftSnapshots() {
  await requireCommissioner();
  const result = await firestore.collection(POST_DRAFT_FIRESTORE_PATHS.snapshots).orderBy("generatedAt", "desc").limit(25).get();
  return result.docs.map((doc) => doc.data() as PostDraftSnapshot);
}

export async function getCommissionerPostDraftIndex() {
  const session = await requireCommissioner();
  if (session.access.role !== "commissioner") throw new PostDraftWorkflowError("Commissioner access required.", 401);
  const [metrics, identities] = await Promise.all([getPostDraftMetrics(), getCurrentSeasonTeamIdentityMap()]);
  return buildCommissionerPostDraftIndex(metrics, calculatePublicDraftGrades(metrics), identities);
}

export async function getCommissionerPostDraftReport(franchiseId: string) {
  const session = await requireCommissioner();
  if (session.access.role !== "commissioner") throw new PostDraftWorkflowError("Commissioner access required.", 401);
  const [metrics, identities, input] = await Promise.all([getPostDraftMetrics(), getCurrentSeasonTeamIdentityMap(), loadPostDraftMetricsInput(2026)]);
  const reportFranchiseId = postDraftReportFranchiseId(franchiseId);
  const publicRecord = metrics.records.find((record) => record.franchiseId === reportFranchiseId);
  if (!publicRecord) throw new PostDraftWorkflowError("Franchise report data is unavailable.", 404);
  const sourceFranchiseId = postDraftSourceFranchiseId(franchiseId);
  const currentPublicRecord = { ...publicRecord, teamName: identities.get(sourceFranchiseId)?.currentTeamName ?? publicRecord.teamName };
  return {
    publicRecord: currentPublicRecord,
    draftGrade: calculatePublicDraftGrades(metrics).records.find((record) => record.franchiseId === franchiseId) ?? null,
    teamAnalysis: buildPostDraftTeamAnalysis(currentPublicRecord, input, metrics),
  };
}

function validateNarrativeInput(input: Record<string, unknown>) {
  return {
    strengths: normalizeList(input.strengths),
    concerns: normalizeList(input.concerns),
    bestBuyCommentary: normalizeText(input.bestBuyCommentary),
    biggestReachCommentary: normalizeText(input.biggestReachCommentary),
    xFactor: normalizeText(input.xFactor),
    rosterOutlook: normalizeText(input.rosterOutlook),
    commissionerTake: normalizeText(input.commissionerTake),
    privateStrategyTake: normalizeText(input.privateStrategyTake),
    trashTalk: normalizeText(input.trashTalk),
    internalNotes: normalizeText(input.internalNotes),
  };
}

function factualNarrativeCandidates(record: PostDraftSnapshot["publicRecords"][number]) {
  const analysis = record.teamAnalysis;
  if (!analysis) return null;
  const bestBuy = record.publicRecord.metrics.bestBuy;
  const biggestReach = record.publicRecord.metrics.biggestReach;
  const ranked = analysis.positionStrengths.filter((row) => row.rank !== null);
  const strongest = ranked.slice().sort((first, second) => first.rank! - second.rank!)[0];
  const weakest = ranked.filter((row) => ["QB", "RB", "WR", "TE", "FLEX"].includes(row.position)).slice().sort((first, second) => second.rank! - first.rank!)[0] ?? ranked.slice().sort((first, second) => second.rank! - first.rank!)[0];
  return {
    strengths: analysis.strengths,
    concerns: analysis.concerns,
    bestBuyCommentary: bestBuy ? `${bestBuy.playerName} was acquired for $${bestBuy.valueDifferential.toFixed(0)} below market value. Add editorial context before publication.` : null,
    biggestReachCommentary: biggestReach ? `${biggestReach.playerName} was acquired for $${Math.abs(biggestReach.valueDifferential).toFixed(0)} above market value. Add editorial context before publication.` : null,
    rosterOutlook: strongest && weakest ? `${strongest.position} ranks #${strongest.rank} in River City while ${weakest.position} ranks #${weakest.rank}; use that positional spread to frame the roster outlook.` : null,
    xFactor: null,
  };
}

export async function createNarrativeDraft(snapshotId: string, franchiseId: string) {
  const session = await requireCommissioner();
  const snapshotDoc = await snapshotRef(snapshotId).get();
  if (!snapshotDoc.exists) throw new PostDraftWorkflowError("Snapshot was not found.", 404);
  const snapshot = snapshotDoc.data() as PostDraftSnapshot;
  if (snapshot.snapshotStatus !== "locked") throw new PostDraftWorkflowError("Only locked snapshots can create narratives.");
  const record = snapshot.publicRecords.find((item) => item.publicRecord.franchiseId === franchiseId);
  if (!record) throw new PostDraftWorkflowError("Franchise is not present in the locked snapshot.", 404);
  const narrativeId = `${snapshotId}:${franchiseId}:r1`;
  const candidates = factualNarrativeCandidates(record);
  const narrative: FranchiseNarrativeDraft = {
    franchiseId, season: snapshot.season, snapshotId, status: "draft", revision: 1,
    createdAt: now(), updatedAt: now(), updatedBy: session.access.canonicalOwnerId ?? "commissioner",
    approvedAt: null, approvedBy: null, strengths: candidates?.strengths ?? [], concerns: candidates?.concerns ?? [], bestBuyCommentary: candidates?.bestBuyCommentary ?? null,
    biggestReachCommentary: candidates?.biggestReachCommentary ?? null, xFactor: candidates?.xFactor ?? null, rosterOutlook: candidates?.rosterOutlook ?? null, commissionerTake: null,
    privateStrategyTake: null, trashTalk: null, internalNotes: null,
  };
  await narrativeRef(narrativeId).create({ ...narrative, narrativeId, schemaVersion: POST_DRAFT_NARRATIVE_SCHEMA_VERSION });
  return narrative;
}

export async function createNarrativeDraftsForSnapshot(snapshotId: string) {
  await requireCommissioner();
  const snapshotDoc = await snapshotRef(snapshotId).get();
  if (!snapshotDoc.exists) throw new PostDraftWorkflowError("Snapshot was not found.", 404);
  const snapshot = snapshotDoc.data() as PostDraftSnapshot;
  const created: FranchiseNarrativeDraft[] = [];
  for (const record of snapshot.publicRecords) {
    const narrativeId = `${snapshotId}:${record.publicRecord.franchiseId}:r1`;
    const existing = await narrativeRef(narrativeId).get();
    if (!existing.exists) created.push(await createNarrativeDraft(snapshotId, record.publicRecord.franchiseId));
  }
  return created;
}

export async function generateFactualNarrativeDraft(narrativeId: string) {
  const session = await requireCommissioner();
  const ref = narrativeRef(narrativeId);
  let generated: FranchiseNarrativeDraft | null = null;
  await firestore.runTransaction(async (transaction) => {
    const narrativeDoc = await transaction.get(ref);
    if (!narrativeDoc.exists) throw new PostDraftWorkflowError("Narrative was not found.", 404);
    const current = narrativeDoc.data() as FranchiseNarrativeDraft;
    if (current.status !== "draft" && current.status !== "in_review") throw new PostDraftWorkflowError("Only draft narratives can receive factual candidates.");
    const snapshotDoc = await transaction.get(snapshotRef(current.snapshotId));
    if (!snapshotDoc.exists || (snapshotDoc.data() as PostDraftSnapshot).snapshotStatus !== "locked") throw new PostDraftWorkflowError("A locked snapshot is required for factual candidates.");
    const record = (snapshotDoc.data() as PostDraftSnapshot).publicRecords.find((item) => item.publicRecord.franchiseId === current.franchiseId);
    const candidates = record ? factualNarrativeCandidates(record) : null;
    if (!candidates) throw new PostDraftWorkflowError("This snapshot predates stored factual analysis. Capture a new locked snapshot to generate candidates.");
    generated = {
      ...current,
      strengths: current.strengths.length > 0 ? current.strengths : candidates.strengths,
      concerns: current.concerns.length > 0 ? current.concerns : candidates.concerns,
      bestBuyCommentary: current.bestBuyCommentary ?? candidates.bestBuyCommentary,
      biggestReachCommentary: current.biggestReachCommentary ?? candidates.biggestReachCommentary,
      rosterOutlook: current.rosterOutlook ?? candidates.rosterOutlook,
      xFactor: current.xFactor ?? candidates.xFactor,
      revision: current.revision + 1,
      updatedAt: now(),
      updatedBy: session.access.canonicalOwnerId ?? "commissioner",
    };
    transaction.set(ref, generated, { merge: true });
  });
  if (!generated) throw new PostDraftWorkflowError("Factual candidate generation failed.", 500);
  return generated;
}

export async function listNarratives(snapshotId?: string) {
  await requireCommissioner();
  let query: FirebaseFirestore.Query = firestore.collection(POST_DRAFT_FIRESTORE_PATHS.narratives);
  if (snapshotId) query = query.where("snapshotId", "==", snapshotId);
  const result = await query.orderBy("updatedAt", "desc").limit(100).get();
  return result.docs.map((doc) => doc.data() as FranchiseNarrativeDraft);
}

export async function saveNarrativeDraft({ narrativeId, input, expectedRevision }: { narrativeId: string; input: Record<string, unknown>; expectedRevision: number }) {
  const session = await requireCommissioner();
  const ref = narrativeRef(narrativeId);
  let saved: FranchiseNarrativeDraft | null = null;
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw new PostDraftWorkflowError("Narrative was not found.", 404);
    const current = doc.data() as FranchiseNarrativeDraft;
    if (current.revision !== expectedRevision) throw new PostDraftWorkflowError("Narrative changed since it was loaded. Refresh before saving.", 409);
    if (current.status !== "draft" && current.status !== "in_review") throw new PostDraftWorkflowError("Only draft narratives can be edited.");
    saved = { ...current, ...validateNarrativeInput(input), revision: current.revision + 1, updatedAt: now(), updatedBy: session.access.canonicalOwnerId ?? "commissioner" };
    transaction.set(ref, saved, { merge: true });
  });
  if (!saved) throw new PostDraftWorkflowError("Narrative save failed.", 500);
  return saved;
}

export async function transitionNarrative({ narrativeId, to, expectedRevision }: { narrativeId: string; to: PostDraftNarrativeStatus; expectedRevision: number }) {
  const session = await requireCommissioner();
  const ref = narrativeRef(narrativeId);
  let result: FranchiseNarrativeDraft | null = null;
  await firestore.runTransaction(async (transaction) => {
    const doc = await transaction.get(ref);
    if (!doc.exists) throw new PostDraftWorkflowError("Narrative was not found.", 404);
    const current = doc.data() as FranchiseNarrativeDraft;
    if (current.revision !== expectedRevision) throw new PostDraftWorkflowError("Narrative changed since it was loaded. Refresh before transitioning.", 409);
    const valid = (current.status === "draft" && to === "in_review") || (current.status === "in_review" && to === "approved");
    if (!valid) throw new PostDraftWorkflowError("Invalid narrative lifecycle transition.");
    const snapshot = await snapshotRef(current.snapshotId).get();
    if (!snapshot.exists || (snapshot.data() as PostDraftSnapshot).snapshotStatus !== "locked") throw new PostDraftWorkflowError("A locked snapshot is required for approval.");
    const updated = now();
    result = { ...current, status: to, revision: current.revision + 1, updatedAt: updated, updatedBy: session.access.canonicalOwnerId ?? "commissioner", approvedAt: to === "approved" ? updated : current.approvedAt, approvedBy: to === "approved" ? (session.access.canonicalOwnerId ?? "commissioner") : current.approvedBy };
    transaction.set(ref, result, { merge: true });
  });
  if (!result) throw new PostDraftWorkflowError("Narrative transition failed.", 500);
  return result;
}

export async function previewNarrative({ narrativeId }: { narrativeId: string }) {
  await requireCommissioner();
  const narrativeDoc = await narrativeRef(narrativeId).get();
  if (!narrativeDoc.exists) throw new PostDraftWorkflowError("Narrative was not found.", 404);
  const narrative = narrativeDoc.data() as FranchiseNarrativeDraft;
  const snapshotDoc = await snapshotRef(narrative.snapshotId).get();
  if (!snapshotDoc.exists) throw new PostDraftWorkflowError("Snapshot was not found.", 404);
  const snapshot = snapshotDoc.data() as PostDraftSnapshot;
  const record = snapshot.publicRecords.find((item) => item.publicRecord.franchiseId === narrative.franchiseId);
  if (!record) throw new PostDraftWorkflowError("Franchise is not present in the snapshot.", 404);
  return serializePublicTeamOutlook({ snapshot, record, narrative, publicationVersion: "preview", publishedAt: now() });
}

export { POST_DRAFT_FIRESTORE_PATHS };
