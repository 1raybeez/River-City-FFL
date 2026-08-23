export const FEEDBACK_TYPES = ["BUG", "SUGGESTION"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export const FEEDBACK_AREAS = [
  "HOME",
  "MATCHUPS",
  "MANAGERS",
  "LEAGUE_INFO",
  "CONSTITUTION",
  "LEGISLATION",
  "PAYOUTS",
  "HISTORY",
  "RIVALRIES",
  "DRAFT",
  "TRADE_ANALYZER",
  "RESOURCES",
  "WAR_ROOM",
  "COMMISSIONER",
  "OTHER",
] as const;
export type FeedbackArea = (typeof FEEDBACK_AREAS)[number];

export const FEEDBACK_STATUS = "OPEN" as const;
export type FeedbackStatus = typeof FEEDBACK_STATUS;

export const FEEDBACK_STATUSES = ["OPEN", "PLANNED", "DONE", "DECLINED"] as const;
export type CommissionerFeedbackStatus = (typeof FEEDBACK_STATUSES)[number];
export const COMMISSIONER_NOTE_MAX_LENGTH = 2000;

export const FEEDBACK_LIMITS = {
  title: 100,
  description: 2000,
  expectedBehavior: 1000,
  reproductionSteps: 1500,
  suggestionRationale: 1000,
  pagePath: 200,
} as const;

export type OwnerFeedbackInput = {
  type?: unknown;
  title?: unknown;
  description?: unknown;
  expectedBehavior?: unknown;
  reproductionSteps?: unknown;
  suggestionRationale?: unknown;
  pagePath?: unknown;
  area?: unknown;
};

export type ValidatedOwnerFeedback = {
  type: FeedbackType;
  title: string;
  description: string;
  expectedBehavior: string | null;
  reproductionSteps: string | null;
  suggestionRationale: string | null;
  pagePath: string;
  area: FeedbackArea;
};

export class FeedbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackValidationError";
  }
}

export class DuplicateFeedbackError extends Error {
  constructor() {
    super("You already have a similar open feedback item.");
    this.name = "DuplicateFeedbackError";
  }
}

function isOneOf<T extends readonly string[]>(value: unknown, values: T): value is T[number] {
  return typeof value === "string" && values.includes(value as T[number]);
}

function text(value: unknown, label: string, max: number, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new FeedbackValidationError(`${label} is required.`);
    return null;
  }
  if (typeof value !== "string") throw new FeedbackValidationError(`${label} must be text.`);
  const normalized = value.trim();
  if (required && !normalized) throw new FeedbackValidationError(`${label} is required.`);
  if (normalized.length > max) throw new FeedbackValidationError(`${label} must be ${max} characters or fewer.`);
  return normalized || null;
}

export function normalizeFeedbackPagePath(value: unknown, fallback = "/feedback") {
  if (typeof value !== "string") return fallback;
  const candidate = value.trim();
  if (!candidate.startsWith("/") || candidate.startsWith("//")) return fallback;
  try {
    const parsed = new URL(candidate, "https://river-city.local");
    if (parsed.origin !== "https://river-city.local") return fallback;
    const path = parsed.pathname || "/";
    return path.length <= FEEDBACK_LIMITS.pagePath ? path : fallback;
  } catch {
    return fallback;
  }
}

export function feedbackAreaForPath(path: string): FeedbackArea {
  if (path === "/") return "HOME";
  if (path === "/matchups" || path.startsWith("/matchups/")) return "MATCHUPS";
  if (path === "/managers" || path.startsWith("/managers/")) return "MANAGERS";
  if (path === "/league-info/constitution") return "CONSTITUTION";
  if (path === "/league-info/legislative" || path.startsWith("/league-info/legislative/")) return "LEGISLATION";
  if (path === "/league-info/payouts") return "PAYOUTS";
  if (path === "/history" || path.startsWith("/history/")) return "HISTORY";
  if (path === "/league-info/rivalries") return "RIVALRIES";
  if (path === "/league-info/draft") return "DRAFT";
  if (path === "/league-info/analyzer" || path.startsWith("/trade-comparison")) return "TRADE_ANALYZER";
  if (path === "/league-info/resources") return "RESOURCES";
  if (path === "/commish/auction" || path.startsWith("/commish/auction/")) return "WAR_ROOM";
  if (path === "/commish" || path.startsWith("/commish/")) return "COMMISSIONER";
  if (path.startsWith("/league-info")) return "LEAGUE_INFO";
  return "OTHER";
}

export function validateOwnerFeedbackInput(input: OwnerFeedbackInput): ValidatedOwnerFeedback {
  if (!isOneOf(input.type, FEEDBACK_TYPES)) throw new FeedbackValidationError("Choose BUG or SUGGESTION.");
  if (!isOneOf(input.area, FEEDBACK_AREAS)) throw new FeedbackValidationError("Choose a valid site area.");

  const pagePath = normalizeFeedbackPagePath(input.pagePath);
  const title = text(input.title, "Title", FEEDBACK_LIMITS.title, true)!;
  const description = text(input.description, "Description", FEEDBACK_LIMITS.description, true)!;
  const expectedBehavior = text(input.expectedBehavior, "Expected behavior", FEEDBACK_LIMITS.expectedBehavior);
  const reproductionSteps = text(input.reproductionSteps, "Reproduction steps", FEEDBACK_LIMITS.reproductionSteps);
  const suggestionRationale = text(input.suggestionRationale, "Why this would help", FEEDBACK_LIMITS.suggestionRationale);

  return {
    type: input.type,
    title,
    description,
    expectedBehavior: input.type === "BUG" ? expectedBehavior : null,
    reproductionSteps: input.type === "BUG" ? reproductionSteps : null,
    suggestionRationale: input.type === "SUGGESTION" ? suggestionRationale : null,
    pagePath,
    area: input.area,
  };
}

export function normalizeFeedbackTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export type CommissionerFeedbackRecord = {
  id: string;
  type: FeedbackType;
  title: string;
  description: string;
  pagePath: string;
  area: FeedbackArea;
  submittedByDisplayName: string;
  submittedByFranchise: string | null;
  submittedAt: string | null;
  status: CommissionerFeedbackStatus;
  expectedBehavior: string | null;
  reproductionSteps: string | null;
  suggestionRationale: string | null;
  commissionerNote: string | null;
};

function timestampToIso(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return timestampToIso(value.toDate());
  }
  return null;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeCommissionerFeedbackRecord(id: string, data: Record<string, unknown>): CommissionerFeedbackRecord {
  const pagePath = normalizeFeedbackPagePath(data.pagePath);
  const type: FeedbackType = data.type === "SUGGESTION" ? "SUGGESTION" : "BUG";
  const area: FeedbackArea = isOneOf(data.area, FEEDBACK_AREAS) ? data.area : "OTHER";
  const status: CommissionerFeedbackStatus = isOneOf(data.status, FEEDBACK_STATUSES) ? data.status : "OPEN";
  return {
    id,
    type,
    title: typeof data.title === "string" ? data.title : "Untitled feedback",
    description: typeof data.description === "string" ? data.description : "",
    pagePath,
    area,
    submittedByDisplayName: typeof data.submittedByDisplayName === "string" ? data.submittedByDisplayName : "Unknown owner",
    submittedByFranchise: nullableText(data.submittedByFranchise),
    submittedAt: timestampToIso(data.submittedAt) ?? timestampToIso(data.createdAt),
    status,
    expectedBehavior: nullableText(data.expectedBehavior),
    reproductionSteps: nullableText(data.reproductionSteps),
    suggestionRationale: nullableText(data.suggestionRationale),
    commissionerNote: nullableText(data.commissionerNote),
  };
}

export function sortCommissionerFeedback(records: CommissionerFeedbackRecord[]) {
  return [...records].sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
}

export function filterCommissionerFeedback(
  records: CommissionerFeedbackRecord[],
  filters: { type?: FeedbackType | "ALL"; status?: CommissionerFeedbackStatus | "ALL"; area?: FeedbackArea | "ALL" }
) {
  return records.filter((record) =>
    (!filters.type || filters.type === "ALL" || record.type === filters.type) &&
    (!filters.status || filters.status === "ALL" || record.status === filters.status) &&
    (!filters.area || filters.area === "ALL" || record.area === filters.area)
  );
}

export function countCommissionerFeedbackByStatus(records: CommissionerFeedbackRecord[]) {
  return FEEDBACK_STATUSES.reduce((counts, status) => {
    counts[status] = records.filter((record) => record.status === status).length;
    return counts;
  }, {} as Record<CommissionerFeedbackStatus, number>);
}
