import type { AuctionRiskTolerance } from "@/lib/auction/ownerProfileSettingsTypes";

export const auctionLiveStrategyPositions = [
  "QB",
  "RB",
  "WR",
  "TE",
  "K",
  "DEF",
] as const;

export type AuctionLiveStrategyPosition =
  (typeof auctionLiveStrategyPositions)[number];

export type AuctionLiveDraftStrategy = {
  riskMode: AuctionRiskTolerance;
  priorityPositions: AuctionLiveStrategyPosition[];
  deemphasizedPositions: AuctionLiveStrategyPosition[];
  minimumBudgetReserve: number | null;
  opponentFocus: string | null;
  additionalInstructions: string | null;
  updatedAt: string;
  updatedBy: string;
};

export type AuctionLiveDraftStrategyInput = Omit<
  AuctionLiveDraftStrategy,
  "updatedAt" | "updatedBy"
>;

export type ConversationalLiveStrategyUpdate =
  | {
      status: "clear";
      strategy: AuctionLiveDraftStrategyInput;
      changes: string[];
    }
  | {
      status: "ambiguous";
      message: string;
    }
  | {
      status: "none";
    };

const riskModes = new Set<AuctionRiskTolerance>([
  "conservative",
  "balanced",
  "aggressive",
]);
const positionSet = new Set<AuctionLiveStrategyPosition>(
  auctionLiveStrategyPositions
);

function readText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, maxLength) : null;
}

function readPositions(value: unknown): AuctionLiveStrategyPosition[] {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value.flatMap((item) => {
        const position =
          typeof item === "string" ? item.trim().toUpperCase() : "";
        return positionSet.has(position as AuctionLiveStrategyPosition)
          ? [position as AuctionLiveStrategyPosition]
          : [];
      })
    )
  );
}

export function parseAuctionLiveDraftStrategy(
  value: unknown
): AuctionLiveDraftStrategy | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  const riskMode =
    typeof data.riskMode === "string" &&
    riskModes.has(data.riskMode as AuctionRiskTolerance)
      ? (data.riskMode as AuctionRiskTolerance)
      : "balanced";
  const minimumBudgetReserve =
    typeof data.minimumBudgetReserve === "number" &&
    Number.isSafeInteger(data.minimumBudgetReserve) &&
    data.minimumBudgetReserve >= 0
      ? data.minimumBudgetReserve
      : null;
  const updatedAt = readText(data.updatedAt);
  const updatedBy = readText(data.updatedBy);

  if (!updatedAt || !updatedBy) return null;

  return {
    riskMode,
    priorityPositions: readPositions(data.priorityPositions),
    deemphasizedPositions: readPositions(data.deemphasizedPositions),
    minimumBudgetReserve,
    opponentFocus: readText(data.opponentFocus),
    additionalInstructions: readText(data.additionalInstructions),
    updatedAt,
    updatedBy,
  };
}
export function validateAuctionLiveDraftStrategyInput(
  value: unknown,
  currentRemainingBudget: number | null
): AuctionLiveDraftStrategyInput {
  if (!value || typeof value !== "object") {
    throw new Error("Live strategy is required.");
  }

  const data = value as Record<string, unknown>;
  if (
    typeof data.riskMode !== "string" ||
    !riskModes.has(data.riskMode as AuctionRiskTolerance)
  ) {
    throw new Error("Risk mode is invalid.");
  }

  const rawReserve = data.minimumBudgetReserve;
  const minimumBudgetReserve =
    rawReserve === null || rawReserve === undefined || rawReserve === ""
      ? null
      : typeof rawReserve === "number" &&
          Number.isSafeInteger(rawReserve) &&
          rawReserve >= 0
        ? rawReserve
        : (() => {
            throw new Error(
              "Minimum budget reserve must be a whole-dollar amount of $0 or greater."
            );
          })();

  if (
    minimumBudgetReserve !== null &&
    currentRemainingBudget !== null &&
    minimumBudgetReserve > currentRemainingBudget
  ) {
    throw new Error(
      `Minimum budget reserve cannot exceed the current $${currentRemainingBudget} remaining budget.`
    );
  }

  return {
    riskMode: data.riskMode as AuctionRiskTolerance,
    priorityPositions: readPositions(data.priorityPositions),
    deemphasizedPositions: readPositions(data.deemphasizedPositions),
    minimumBudgetReserve,
    opponentFocus: readText(data.opponentFocus),
    additionalInstructions: readText(data.additionalInstructions),
  };
}

function findMentionedPositions(text: string) {
  const aliases: Array<[AuctionLiveStrategyPosition, RegExp]> = [
    ["QB", /\b(qb|quarterbacks?)\b/i],
    ["RB", /\b(rb|running backs?)\b/i],
    ["WR", /\b(wr|wide receivers?|receivers?|wr1)\b/i],
    ["TE", /\b(te|tight ends?)\b/i],
    ["K", /\b(k|kickers?)\b/i],
    ["DEF", /\b(def|dst|d\/st|defenses?)\b/i],
  ];

  return aliases
    .filter(([, pattern]) => pattern.test(text))
    .map(([position]) => position);
}

function addUniquePositions(
  existing: readonly AuctionLiveStrategyPosition[],
  additions: readonly AuctionLiveStrategyPosition[]
) {
  return Array.from(new Set([...existing, ...additions]));
}

export function parseConversationalLiveStrategyUpdate(
  question: string,
  current: AuctionLiveDraftStrategyInput
): ConversationalLiveStrategyUpdate {
  const text = question.trim();
  if (!text) return { status: "none" };
  const lower = text.toLowerCase();
  const hasStrategyLanguage =
    /\b(prioriti[sz]e|focus|ignore|avoid|de-emphasi[sz]e|conservative|balanced|aggressive|reserve|keep \$|save \$|live instruction|strategy note|remember that|i need)\b/i.test(
      text
    );

  if (
    hasStrategyLanguage &&
    /\b(maybe|might|perhaps|consider|thinking about|should i|could i)\b/i.test(
      text
    )
  ) {
    return {
      status: "ambiguous",
      message:
        "I heard a possible strategy change, but it was not explicit enough to save. Confirm the exact position, risk mode, reserve, or instruction you want applied.",
    };
  }

  const next: AuctionLiveDraftStrategyInput = {
    ...current,
    priorityPositions: [...current.priorityPositions],
    deemphasizedPositions: [...current.deemphasizedPositions],
  };
  const changes: string[] = [];
  const mentionedPositions = findMentionedPositions(text);
  const deemphasizeCommand =
    /\b(ignore|avoid|de-emphasi[sz]e|do not prioritize|don't prioritize)\b/i.test(
      text
    );
  const prioritizeCommand =
    /\b(prioriti[sz]e|make .* a priority|focus on|i need (?:an? )?(?:qb|rb|wr|te|k|def|quarterback|running back|wide receiver|receiver|tight end|kicker|defense))\b/i.test(
      text
    );

  if (deemphasizeCommand && mentionedPositions.length > 0) {
    next.deemphasizedPositions = addUniquePositions(
      next.deemphasizedPositions,
      mentionedPositions
    );
    next.priorityPositions = next.priorityPositions.filter(
      (position) => !mentionedPositions.includes(position)
    );
    changes.push(
      `De-emphasized ${mentionedPositions.join("/")} unless value or roster legality changes the decision.`
    );
  } else if (prioritizeCommand && mentionedPositions.length > 0) {
    next.priorityPositions = addUniquePositions(
      next.priorityPositions,
      mentionedPositions
    );
    next.deemphasizedPositions = next.deemphasizedPositions.filter(
      (position) => !mentionedPositions.includes(position)
    );
    changes.push(`Prioritized ${mentionedPositions.join("/")}.`);
  }

  const riskMatch = lower.match(
    /\b(?:be|go|play|set(?: my)? risk(?: mode)? to|switch to|use)\s+(conservative|balanced|aggressive)\b/
  );
  if (riskMatch) {
    next.riskMode = riskMatch[1] as AuctionRiskTolerance;
    changes.push(`Risk mode set to ${next.riskMode}.`);
  }

  const reserveMatch = lower.match(
    /\b(?:keep|reserve|save|hold)(?:\s+at least)?\s+\$?(\d+)(?:\s+dollars?)?(?:\s+for|\s+in reserve|\s*$)/
  );
  if (reserveMatch) {
    next.minimumBudgetReserve = Number(reserveMatch[1]);
    changes.push(`Strategic reserve set to $${next.minimumBudgetReserve}.`);
  }

  const opponentFocusMatch =
    text.match(
      /\b(?:set (?:my )?opponent focus(?: to)?|remember to|focus my opponent strategy on)\s+(.+)/i
    ) ?? text.match(/^(?:please\s+)?(pressure\s+.+)/i);
  if (
    opponentFocusMatch &&
    /\b(pressure|spend|overpay|bid|block|stop)\b/i.test(opponentFocusMatch[1])
  ) {
    next.opponentFocus = opponentFocusMatch[1].trim().slice(0, 500);
    changes.push(`Opponent focus updated: ${next.opponentFocus}`);
  }

  const generalInstructionMatch = text.match(
    /\b(?:live instruction|strategy note|remember that)\s*:?\s+(.+)/i
  );
  if (generalInstructionMatch && !opponentFocusMatch) {
    next.additionalInstructions = generalInstructionMatch[1]
      .trim()
      .slice(0, 500);
    changes.push(`Live instruction updated: ${next.additionalInstructions}`);
  }

  return changes.length > 0
    ? { status: "clear", strategy: next, changes }
    : { status: "none" };
}
