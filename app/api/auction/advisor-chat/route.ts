import { NextResponse } from "next/server";
import {
  AuctionAccessError,
  requireAuctionWarRoomAccess,
} from "@/lib/auth/auctionAccess";
import {
  buildAuctionAdvisorContext,
  type AuctionAdvisorContext,
  type AuctionAdvisorContextSelectedPlayer,
  type AuctionAdvisorContextValueTarget,
} from "@/lib/auction/advisorContext";
import {
  buildDraftCoachResponse,
  type DraftCoachInput,
  type DraftCoachResult,
} from "@/lib/auction/draftCoach";
import { readAuctionOwnerProfileSettings } from "@/lib/auction/ownerProfileSettings";

type AdvisorChatRequestBody = {
  mode?: unknown;
  question?: unknown;
  selectedPlayerName?: unknown;
  draftCoachContext?: unknown;
};

type AdvisorChatResponse = {
  answer: string;
  recommendation: string;
  reasons: string[];
  warnings: string[];
  source: "local-rule-based";
  contextSummary: ReturnType<typeof buildContextSummary>;
};

type DraftCoachChatResponse = {
  answer: string;
  recommendation: DraftCoachResult["decision"];
  intelSummary: string[];
  buddyMessage: string;
  riskGuidance: string;
  budgetPace: DraftCoachResult["budgetPace"];
  spendGuidance: DraftCoachResult["spendGuidance"];
  reasons: string[];
  warnings: string[];
  source: "local-hybrid-coach";
  contextSummary: ReturnType<typeof buildDraftCoachContextSummary>;
};

const GENERIC_QUESTION_PATTERNS = [
  /\bwho should i target\b/i,
  /\bbest values?\b/i,
  /\bpositions? do i need\b/i,
  /\bneed most\b/i,
  /\boverspending\b/i,
  /\boverpay\b/i,
  /\bbye weeks?\b/i,
  /\brisky\b/i,
];

function normalizeText(value: string | null | undefined) {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

function readString(value: unknown) {
  return typeof value === "string" ? normalizeText(value) : "";
}

function readMode(value: unknown) {
  return value === "draft-coach" ? "draft-coach" : "advisor-chat";
}

async function readRequestBody(req: Request): Promise<AdvisorChatRequestBody> {
  try {
    return (await req.json()) as AdvisorChatRequestBody;
  } catch {
    return {};
  }
}

function stripTrailingQuestionPunctuation(value: string) {
  return value.replace(/[?!.]+$/g, "").trim();
}

function inferSelectedPlayerName(question: string) {
  const cleanedQuestion = stripTrailingQuestionPunctuation(question);

  if (
    !cleanedQuestion ||
    GENERIC_QUESTION_PATTERNS.some((pattern) => pattern.test(cleanedQuestion))
  ) {
    return "";
  }

  const playerQuestionPatterns = [
    /\bmax bid(?: for)?\s+(.+)$/i,
    /\bshould i bid on\s+(.+)$/i,
    /\bbid on\s+(.+)$/i,
    /\bnominate\s+(.+)$/i,
    /\bbuy\s+(.+)$/i,
    /\bdraft\s+(.+)$/i,
  ];

  for (const pattern of playerQuestionPatterns) {
    const match = cleanedQuestion.match(pattern);
    const playerName = stripTrailingQuestionPunctuation(match?.[1] ?? "");

    if (playerName) return playerName;
  }

  const wordCount = cleanedQuestion.split(/\s+/).filter(Boolean).length;

  return wordCount <= 4 ? cleanedQuestion : "";
}

function formatMoney(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? `$${Math.round(value)}`
    : "N/A";
}

function formatPlayerLabel(
  player:
    | AuctionAdvisorContextSelectedPlayer
    | AuctionAdvisorContextValueTarget
) {
  return [player.playerName, player.position, player.nflTeam]
    .filter(Boolean)
    .join(" - ");
}

function buildContextSummary(context: AuctionAdvisorContext) {
  return {
    generatedAt: context.generatedAt,
    playerValuesSeason: context.playerValuesSeason,
    activePurchaseSource: context.activePurchaseSource,
    budget: context.rayJeffreyBudget
      ? {
          teamName: context.rayJeffreyBudget.teamName,
          managerName: context.rayJeffreyBudget.managerName,
          remainingBudget: context.rayJeffreyBudget.remainingBudget,
          rosterSpotsRemaining:
            context.rayJeffreyBudget.rosterSpotsRemaining,
          maxBid: context.rayJeffreyBudget.maxBid,
          averageDollarsPerOpenSlot:
            context.rayJeffreyBudget.averageDollarsPerOpenSlot,
        }
      : null,
    rosterNeeds: [
      ...context.rosterNeeds.starter,
      ...context.rosterNeeds.benchDepth,
    ]
      .slice(0, 3)
      .map((need) => ({
        label: need.label,
        needed: need.needed,
        severity: need.severity,
      })),
    topValueTargets: context.topValueTargets.slice(0, 5).map((target) => ({
      playerName: target.playerName,
      position: target.position,
      nflTeam: target.nflTeam,
      recommendedMaxBid: target.recommendedMaxBid,
      preference: target.preference,
    })),
    warningCount: context.currentWarnings.length,
    selectedPlayer: context.selectedPlayer
      ? {
          playerName: context.selectedPlayer.playerName,
          position: context.selectedPlayer.position,
          nflTeam: context.selectedPlayer.nflTeam,
          byeWeek: context.selectedPlayer.byeWeek,
          recommendedMaxBid:
            context.selectedPlayer.recommendation.recommendedMaxBid,
          confidence: context.selectedPlayer.recommendation.confidence,
          preference: context.selectedPlayer.preference,
          status: context.selectedPlayer.status,
        }
      : null,
    dataLimits: context.dataLimits,
  };
}

function readDraftCoachContext(
  value: unknown,
  question: string
): DraftCoachInput | null {
  if (!value || typeof value !== "object") return null;

  return {
    ...(value as DraftCoachInput),
    question,
  };
}

function buildDraftCoachContextSummary(
  context: DraftCoachInput,
  result: DraftCoachResult
) {
  return {
    selectedPlayer: context.selectedPlayer
      ? {
          playerName: context.selectedPlayer.playerName,
          position: context.selectedPlayer.position,
          preference: context.selectedPlayer.preference,
        }
      : null,
    currentBid: context.currentBid,
    ownerMaxBid: context.ownerMaxBid,
    legalMaxBid: context.budget?.legalMaxBid ?? null,
    budgetPace: result.budgetPace.status,
    mustReserve: result.spendGuidance.mustReserve,
    currentBidIncluded:
      typeof context.currentBid === "number" && Number.isFinite(context.currentBid),
    historicalContext: context.historicalPricing?.kind ?? "none",
    ownerSettingsApplied: Boolean(context.ownerSettings),
  };
}

function answerSelectedPlayer(
  player: AuctionAdvisorContextSelectedPlayer
): Omit<AdvisorChatResponse, "source" | "contextSummary"> {
  const isTaken = player.status.trim().toLowerCase() !== "none";
  const valueRange = `${formatMoney(player.lowValue)}-${formatMoney(
    player.highValue
  )}`;
  const maxBid = formatMoney(player.recommendation.recommendedMaxBid);
  const preference =
    player.preference === "none" ? "no preference tag" : player.preference;
  const reasons = [
    `Value range is ${valueRange} with average ${formatMoney(
      player.averageValue
    )}.`,
    `Preference signal: ${preference}.`,
    ...player.recommendation.reasons,
  ];
  const warnings = [
    ...(isTaken ? [`Status is ${player.status}; treat as unavailable.`] : []),
    ...player.recommendation.warnings,
  ];

  return {
    answer: `${formatPlayerLabel(
      player
    )} has a local recommended max bid of ${maxBid}. Bye week is ${
      player.byeWeek ?? "unknown"
    }; current status is ${player.status}.`,
    recommendation: isTaken
      ? `Do not bid unless the status is corrected; otherwise cap at ${maxBid}.`
      : `Cap the bid at ${maxBid} and only push if the roster need still fits.`,
    reasons,
    warnings,
  };
}

function answerPlayerNotFound(
  selectedPlayerName: string,
  context: AuctionAdvisorContext
): Omit<AdvisorChatResponse, "source" | "contextSummary"> {
  const topTarget = context.topValueTargets[0];

  return {
    answer: `I could not match "${selectedPlayerName}" in the minimized local advisor context.`,
    recommendation: topTarget
      ? `Use ${topTarget.playerName} as the current local value benchmark, capped at ${formatMoney(
          topTarget.recommendedMaxBid
        )}.`
      : "Try a more complete player name or ask for best values, roster needs, or bye-week risk.",
    reasons: [
      "The protected Advisor API does not expose or return the full player pool.",
      ...(topTarget ? [`Top available value reason: ${topTarget.reason}.`] : []),
    ],
    warnings: context.currentWarnings.map((warning) => warning.message),
  };
}

function answerTargets(
  context: AuctionAdvisorContext
): Omit<AdvisorChatResponse, "source" | "contextSummary"> {
  const targets = context.topValueTargets.slice(0, 5);

  if (targets.length === 0) {
    return {
      answer: "No value targets are available in the minimized local context.",
      recommendation: "Use roster needs and hard budget caps until values refresh.",
      reasons: ["The server context intentionally does not expose the full pool."],
      warnings: context.currentWarnings.map((warning) => warning.message),
    };
  }

  const targetText = targets
    .map(
      (target) =>
        `${formatPlayerLabel(target)} up to ${formatMoney(
          target.recommendedMaxBid
        )}`
    )
    .join("; ");

  return {
    answer: `Best local value targets: ${targetText}.`,
    recommendation: `Start with ${targets[0].playerName} if the room price stays under ${formatMoney(
      targets[0].recommendedMaxBid
    )}.`,
    reasons: targets.map(
      (target) => `${target.playerName}: ${target.reason}.`
    ),
    warnings: context.currentWarnings
      .filter((warning) => warning.area === "overpay")
      .map((warning) => warning.message),
  };
}

function answerRosterNeeds(
  context: AuctionAdvisorContext
): Omit<AdvisorChatResponse, "source" | "contextSummary"> {
  const needs = [
    ...context.rosterNeeds.starter,
    ...context.rosterNeeds.benchDepth,
  ].slice(0, 5);

  if (needs.length === 0) {
    return {
      answer: "The local roster guidance does not show any open needs.",
      recommendation: "Stay value-led and avoid paying above the recommended caps.",
      reasons: ["Starter and bench-depth needs are currently filled in context."],
      warnings: context.currentWarnings.map((warning) => warning.message),
    };
  }

  return {
    answer: `Top roster needs: ${needs
      .map((need) => `${need.label} (${need.needed})`)
      .join(", ")}.`,
    recommendation: `Prioritize ${needs[0].label} before chasing lower-need depth.`,
    reasons: needs.map((need) => `${need.label}: ${need.detail}.`),
    warnings: context.currentWarnings
      .filter((warning) => warning.area === "roster")
      .map((warning) => warning.message),
  };
}

function answerWarnings(
  context: AuctionAdvisorContext,
  area: "budget" | "overpay" | "bye week"
): Omit<AdvisorChatResponse, "source" | "contextSummary"> {
  const warnings = context.currentWarnings.filter(
    (warning) => warning.area === area
  );
  const areaLabel = area === "bye week" ? "bye-week" : area;

  if (warnings.length === 0) {
    return {
      answer: `No ${areaLabel} warning is active in the minimized local context.`,
      recommendation: "Keep using local max-bid caps and roster needs as guardrails.",
      reasons: [
        `The server context found no current ${areaLabel} warning among the top warnings.`,
      ],
      warnings: [],
    };
  }

  return {
    answer: `${areaLabel} warnings: ${warnings
      .map((warning) => warning.message)
      .join(" ")}`,
    recommendation:
      area === "bye week"
        ? "Avoid adding another overlapping bye unless the discount is clear."
        : "Lower the bid cap or pass when the room price moves past local value.",
    reasons: warnings.map(
      (warning) => `${warning.severity.toUpperCase()}: ${warning.message}`
    ),
    warnings: warnings.map((warning) => warning.message),
  };
}

function answerOverview(
  context: AuctionAdvisorContext
): Omit<AdvisorChatResponse, "source" | "contextSummary"> {
  const budget = context.rayJeffreyBudget;
  const topTarget = context.topValueTargets[0];
  const topNeed = [
    ...context.rosterNeeds.starter,
    ...context.rosterNeeds.benchDepth,
  ][0];

  return {
    answer: `Local Advisor is using ${context.activePurchaseSource.applied} purchases. Current max bid is ${formatMoney(
      budget?.maxBid
    )}; top need is ${topNeed?.label ?? "not flagged"}; top value target is ${
      topTarget?.playerName ?? "not available"
    }.`,
    recommendation: topTarget
      ? `Use ${topTarget.playerName} as the next value benchmark and stay under ${formatMoney(
          topTarget.recommendedMaxBid
        )}.`
      : "Ask about a player, roster needs, overspending, bye weeks, or best values.",
    reasons: [
      context.activePurchaseSource.note,
      ...(topNeed ? [`Roster need: ${topNeed.detail}.`] : []),
      ...(topTarget ? [`Top target reason: ${topTarget.reason}.`] : []),
    ],
    warnings: context.currentWarnings.map((warning) => warning.message),
  };
}

function buildLocalAnswer(
  question: string,
  selectedPlayerName: string,
  context: AuctionAdvisorContext
): Omit<AdvisorChatResponse, "source" | "contextSummary"> {
  const normalizedQuestion = question.toLowerCase();

  if (context.selectedPlayer) {
    return answerSelectedPlayer(context.selectedPlayer);
  }

  if (selectedPlayerName) {
    return answerPlayerNotFound(selectedPlayerName, context);
  }

  if (/\bpositions? do i need\b|\bneed most\b|\broster\b/.test(normalizedQuestion)) {
    return answerRosterNeeds(context);
  }

  if (/\boverspending\b|\boverpay\b|\btoo much\b/.test(normalizedQuestion)) {
    return answerWarnings(context, "overpay");
  }

  if (/\bbudget\b/.test(normalizedQuestion)) {
    return answerWarnings(context, "budget");
  }

  if (/\bbye weeks?\b|\bbye\b/.test(normalizedQuestion)) {
    return answerWarnings(context, "bye week");
  }

  if (/\btarget\b|\bbest values?\b|\bvalue\b|\bnominate\b/.test(normalizedQuestion)) {
    return answerTargets(context);
  }

  return answerOverview(context);
}

export async function POST(req: Request) {
  let actor: Awaited<ReturnType<typeof requireAuctionWarRoomAccess>>;

  try {
    actor = await requireAuctionWarRoomAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      return NextResponse.json(
        { error: "Auction War Room access required." },
        { status: 401 }
      );
    }

    throw error;
  }

  const body = await readRequestBody(req);
  const mode = readMode(body.mode);
  const question = readString(body.question);
  const selectedPlayerName =
    readString(body.selectedPlayerName) || inferSelectedPlayerName(question);

  if (!question) {
    return NextResponse.json(
      { error: "Missing advisor question." },
      { status: 400 }
    );
  }

  if (mode === "draft-coach") {
    const draftCoachContext = readDraftCoachContext(
      body.draftCoachContext,
      question
    );

    if (!draftCoachContext) {
      return NextResponse.json(
        { error: "Missing draft coach context." },
        { status: 400 }
      );
    }

    try {
      const ownerProfileId = actor.access.ownerProfileId;
      const ownerSettings = ownerProfileId
        ? await readAuctionOwnerProfileSettings({ ownerProfileId }).catch(
            () => null
          )
        : null;
      const coachContextWithOwnerSettings: DraftCoachInput = {
        ...draftCoachContext,
        ownerSettings: ownerSettings?.onboardingCompleted
          ? {
              rosterConstruction: ownerSettings.rosterConstruction,
              riskTolerance: ownerSettings.riskTolerance,
              keeperFocus: ownerSettings.keeperFocus,
              rookiePreference: ownerSettings.rookiePreference,
              positionPriorities: ownerSettings.positionPriorities,
              nominationStyle: ownerSettings.nominationStyle,
              kickerDefenseStrategy: ownerSettings.kickerDefenseStrategy,
              draftGoal: ownerSettings.draftGoal,
              additionalNotes: ownerSettings.additionalNotes,
            }
          : null,
        liveStrategy: ownerSettings?.liveDraftStrategy
          ? {
              riskMode: ownerSettings.liveDraftStrategy.riskMode,
              priorityPositions:
                ownerSettings.liveDraftStrategy.priorityPositions,
              deemphasizedPositions:
                ownerSettings.liveDraftStrategy.deemphasizedPositions,
              minimumBudgetReserve:
                ownerSettings.liveDraftStrategy.minimumBudgetReserve,
              opponentFocus: ownerSettings.liveDraftStrategy.opponentFocus,
              additionalInstructions:
                ownerSettings.liveDraftStrategy.additionalInstructions,
            }
          : null,
      };
      const coachResult = buildDraftCoachResponse(coachContextWithOwnerSettings);

      return NextResponse.json({
        answer: coachResult.buddyMessage,
        recommendation: coachResult.decision,
        intelSummary: coachResult.intelSummary,
        buddyMessage: coachResult.buddyMessage,
        riskGuidance: coachResult.riskGuidance,
        budgetPace: coachResult.budgetPace,
        spendGuidance: coachResult.spendGuidance,
        reasons: coachResult.reasons,
        warnings: coachResult.warnings,
        source: "local-hybrid-coach",
        contextSummary: buildDraftCoachContextSummary(
          coachContextWithOwnerSettings,
          coachResult
        ),
      } satisfies DraftCoachChatResponse);
    } catch (error) {
      console.error("Auction draft coach local answer failed:", error);
      return NextResponse.json(
        { error: "Failed to build local draft coach answer." },
        { status: 500 }
      );
    }
  }

  try {
    const context = buildAuctionAdvisorContext({
      selectedPlayerName,
      topValueTargetLimit: 5,
      warningLimit: 5,
    });
    const localAnswer = buildLocalAnswer(question, selectedPlayerName, context);

    return NextResponse.json({
      ...localAnswer,
      source: "local-rule-based",
      contextSummary: buildContextSummary(context),
    } satisfies AdvisorChatResponse);
  } catch (error) {
    console.error("Auction advisor local answer failed:", error);
    return NextResponse.json(
      { error: "Failed to build local advisor answer." },
      { status: 500 }
    );
  }
}
