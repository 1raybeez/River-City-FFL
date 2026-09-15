import { createHash } from "node:crypto";
import type { WeeklyCommissionerRecap, WeeklyRecapMatchup, WeeklyRecapTeam } from "@/lib/weeklyCommissionerRecap";

export const WEEKLY_RECAP_PUBLICATION_SCHEMA_VERSION = "weekly-recap-publication-v1" as const;
export const WEEKLY_RECAP_FIRESTORE_PATHS = {
  publications: "weekly_recap_publications",
  pointers: "weekly_recap_pointers",
} as const;

export type WeeklyLeagueRecap = {
  schemaVersion: typeof WEEKLY_RECAP_PUBLICATION_SCHEMA_VERSION;
  season: number;
  week: number;
  recapType: "weekly";
  publicationId: string;
  title: string;
  excerpt: string;
  openingCommissionerTake: string;
  generatedAt: string;
  publishedAt: string | null;
  scoreboard: WeeklyRecapMatchup[];
  honors: WeeklyCommissionerRecap["honors"];
  toughLuck: string;
  matchupWriteups: Array<{ matchupId: number; text: string }>;
  standings: WeeklyRecapTeam[];
  weekAhead: string[];
  sourceMetadata: WeeklyCommissionerRecap["sourceMetadata"];
  contentChecksum: string;
};

export type WeeklyRecapPointer = {
  season: number;
  activeWeek: number;
  activePublicationId: string;
  updatedAt: string;
};

export type WeeklyRecapPublicationRecord = WeeklyLeagueRecap & {
  status: "published";
  supersedes: string | null;
  previousVersionId: string | null;
};

export type WeeklyRecapPublicationPlan = {
  publication: WeeklyRecapPublicationRecord;
  pointer: WeeklyRecapPointer;
  writes: Array<{ operation: "create" | "set" | "update"; path: string; data: Record<string, unknown> }>;
};

export type WeeklyRecapWriteStore = {
  create(path: string, data: Record<string, unknown>): Promise<void> | void;
  set(path: string, data: Record<string, unknown>): Promise<void> | void;
};

export class WeeklyRecapPublicationError extends Error {}

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stable((value as Record<string, unknown>)[key])}`).join(",")}}`;
}

export function weeklyRecapPublicationId(season: number, week: number) {
  if (!Number.isInteger(season) || season < 2000 || !Number.isInteger(week) || week < 1) throw new WeeklyRecapPublicationError("A valid season and week are required.");
  return `${season}:week-${String(week).padStart(2, "0")}`;
}

export function weeklyRecapPublicationPath(season: number, week: number) {
  return `${WEEKLY_RECAP_FIRESTORE_PATHS.publications}/${weeklyRecapPublicationId(season, week)}`;
}

export function weeklyRecapContentChecksum(recap: Pick<WeeklyLeagueRecap, "season" | "week" | "title" | "excerpt" | "openingCommissionerTake" | "scoreboard" | "honors" | "toughLuck" | "matchupWriteups" | "standings" | "weekAhead">) {
  const { season, week, title, excerpt, openingCommissionerTake, scoreboard, honors, toughLuck, matchupWriteups, standings, weekAhead } = recap;
  return createHash("sha256").update(stable({ season, week, title, excerpt, openingCommissionerTake, scoreboard, honors, toughLuck, matchupWriteups, standings, weekAhead })).digest("hex");
}

function validateTeam(team: WeeklyRecapTeam) {
  if (!team.teamName || !Number.isFinite(team.points) || !/^\d-\d$/.test(team.record) || !Number.isFinite(team.pf) || !Number.isFinite(team.pa)) throw new WeeklyRecapPublicationError("Weekly recap contains an invalid team row.");
}

export function validateWeeklyLeagueRecap(recap: WeeklyLeagueRecap) {
  if (recap.recapType !== "weekly" || recap.publicationId !== weeklyRecapPublicationId(recap.season, recap.week)) throw new WeeklyRecapPublicationError("Weekly recap identity is invalid.");
  if (!recap.title.trim() || !recap.excerpt.trim() || recap.scoreboard.length !== 6 || recap.standings.length !== 12 || recap.matchupWriteups.length !== 6 || recap.weekAhead.length === 0) throw new WeeklyRecapPublicationError("Weekly recap coverage is incomplete.");
  recap.standings.forEach(validateTeam);
  if (recap.scoreboard.some((game) => !Number.isFinite(game.margin) || !game.writeup.trim())) throw new WeeklyRecapPublicationError("Weekly matchup evidence is invalid.");
  if (weeklyRecapContentChecksum(recap) !== recap.contentChecksum) throw new WeeklyRecapPublicationError("Weekly recap content checksum does not match its content.");
  return recap;
}

export function buildWeeklyLeagueRecap(source: WeeklyCommissionerRecap, generatedAt = source.generatedAt): WeeklyLeagueRecap {
  const publicationId = weeklyRecapPublicationId(source.season, source.week);
  const base = {
    schemaVersion: WEEKLY_RECAP_PUBLICATION_SCHEMA_VERSION, season: source.season, week: source.week, recapType: "weekly" as const, publicationId,
    title: source.title, excerpt: source.excerpt, openingCommissionerTake: source.openingCommissionerTake, generatedAt, publishedAt: null, scoreboard: source.scoreboard, honors: source.honors, toughLuck: source.toughLuck,
    matchupWriteups: source.scoreboard.map((game) => ({ matchupId: game.matchupId, text: game.writeup })), standings: source.standings, weekAhead: source.week2WatchList, sourceMetadata: source.sourceMetadata,
  };
  return { ...base, contentChecksum: weeklyRecapContentChecksum(base) };
}

export function prepareWeeklyRecapPublication(recap: WeeklyLeagueRecap, publishedAt: string, previous: WeeklyRecapPointer | null = null): WeeklyRecapPublicationPlan {
  validateWeeklyLeagueRecap(recap);
  const previousId = previous?.activePublicationId ?? null;
  const publication: WeeklyRecapPublicationRecord = { ...recap, publishedAt, status: "published", supersedes: previousId, previousVersionId: previousId };
  const pointer: WeeklyRecapPointer = { season: recap.season, activeWeek: recap.week, activePublicationId: recap.publicationId, updatedAt: publishedAt };
  const writes: WeeklyRecapPublicationPlan["writes"] = [{ operation: "create", path: `${WEEKLY_RECAP_FIRESTORE_PATHS.publications}/${recap.publicationId}`, data: publication as unknown as Record<string, unknown> }, { operation: "set", path: `${WEEKLY_RECAP_FIRESTORE_PATHS.pointers}/${recap.season}`, data: pointer as unknown as Record<string, unknown> }];
  return { publication, pointer, writes };
}

export function checkWeeklyRecapDuplicate(candidate: WeeklyLeagueRecap, existing: WeeklyLeagueRecap | null) {
  if (!existing) return { kind: "new" as const };
  if (existing.publicationId !== candidate.publicationId) return { kind: "new" as const };
  if (existing.contentChecksum === candidate.contentChecksum) return { kind: "duplicate" as const };
  return { kind: "conflict" as const };
}

export async function publishWeeklyRecapWithStore({ recap, store, existing, previous, publishedAt }: { recap: WeeklyLeagueRecap; store: WeeklyRecapWriteStore; existing: WeeklyLeagueRecap | null; previous?: WeeklyRecapPointer | null; publishedAt: string }) {
  const duplicate = checkWeeklyRecapDuplicate(recap, existing);
  if (duplicate.kind === "duplicate") return { kind: "duplicate" as const, plan: null };
  if (duplicate.kind === "conflict") throw new WeeklyRecapPublicationError("A different weekly recap already exists for this season and week.");
  const plan = prepareWeeklyRecapPublication(recap, publishedAt, previous ?? null);
  await store.create(plan.writes[0].path, plan.writes[0].data);
  await store.set(plan.writes[1].path, plan.writes[1].data);
  return { kind: "published" as const, plan };
}

export function rollbackWeeklyRecapPointer(current: WeeklyRecapPointer, target: WeeklyRecapPointer) {
  if (current.season !== target.season || target.activeWeek >= current.activeWeek) throw new WeeklyRecapPublicationError("Rollback target must be an earlier week in the same season.");
  return { ...target, updatedAt: new Date().toISOString() };
}

export async function getPublishedWeeklyRecap(season: number): Promise<WeeklyLeagueRecap | null> {
  const { firestore } = await import("@/lib/firebaseAdmin");
  const pointerDoc = await firestore.collection(WEEKLY_RECAP_FIRESTORE_PATHS.pointers).doc(String(season)).get();
  if (!pointerDoc.exists) return null;
  const pointer = pointerDoc.data() as WeeklyRecapPointer;
  if (!pointer.activePublicationId) return null;
  const publicationDoc = await firestore.collection(WEEKLY_RECAP_FIRESTORE_PATHS.publications).doc(pointer.activePublicationId).get();
  if (!publicationDoc.exists) return null;
  const publication = publicationDoc.data() as WeeklyRecapPublicationRecord;
  return publication.status === "published" && publication.recapType === "weekly" ? publication : null;
}

export async function getWeeklyRecap(season: number, week: number): Promise<WeeklyLeagueRecap | null> {
  const { firestore } = await import("@/lib/firebaseAdmin");
  const doc = await firestore.collection(WEEKLY_RECAP_FIRESTORE_PATHS.publications).doc(weeklyRecapPublicationId(season, week)).get();
  if (!doc.exists) return null;
  const recap = doc.data() as WeeklyRecapPublicationRecord;
  return recap.status === "published" && recap.recapType === "weekly" ? recap : null;
}

export async function listPublishedWeeklyRecaps(season: number): Promise<WeeklyLeagueRecap[]> {
  const { firestore } = await import("@/lib/firebaseAdmin");
  const snapshot = await firestore.collection(WEEKLY_RECAP_FIRESTORE_PATHS.publications).where("season", "==", season).where("status", "==", "published").orderBy("week", "desc").get();
  return snapshot.docs.map((doc) => doc.data() as WeeklyRecapPublicationRecord).filter((recap) => recap.recapType === "weekly");
}
