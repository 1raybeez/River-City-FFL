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
