export type AuctionAdvisorPurchaseSource =
  | "manual"
  | "sleeper"
  | "live"
  | "demo"
  | "unknown";
export type AuctionAdvisorPreference = "target" | "fade" | "watch" | "none";
export type AuctionAdvisorSeverity = "ok" | "watch" | "danger";
export type AuctionAdvisorWarningArea =
  | "budget"
  | "roster"
  | "bye week"
  | "overpay"
  | "draft pace";

export interface AuctionAdvisorPlayerValue {
  playerName: string;
  matchedPlayerName?: string | null;
  position?: string | null;
  nflTeam?: string | null;
  sleeperPlayerId?: string | null;
  lowValue?: number | null;
  highValue?: number | null;
  averageValue?: number | null;
  projectedValue?: number | null;
  status?: string | null;
  preference?: AuctionAdvisorPreference | null;
  byeWeek?: number | null;
  sameByeWeekRosterCount?: number | null;
  isTaken?: boolean | null;
}

export interface AuctionAdvisorPurchase {
  playerName: string;
  position?: string | null;
  nflTeam?: string | null;
  purchasePrice?: number | null;
  projectedValue?: number | null;
  lowValue?: number | null;
  highValue?: number | null;
  averageValue?: number | null;
  source?: AuctionAdvisorPurchaseSource | string | null;
  status?: string | null;
}

export interface AuctionAdvisorTeamBudget {
  teamName?: string | null;
  teamBudget?: number | null;
  keeperCost?: number | null;
  totalSpent?: number | null;
  remainingBudget?: number | null;
  rosterSpotsRemaining?: number | null;
  maxBid?: number | null;
  averageDollarsPerOpenSlot?: number | null;
}

export interface AuctionAdvisorRosterNeed {
  label: string;
  current?: number | null;
  target?: number | null;
  needed?: number | null;
  detail?: string | null;
  severity?: AuctionAdvisorSeverity | string | null;
}

export interface AuctionAdvisorRosterWarning {
  title: string;
  message: string;
  severity?: AuctionAdvisorSeverity | string | null;
}

export interface AuctionAdvisorRosterGuidance {
  starterNeeds?: readonly AuctionAdvisorRosterNeed[] | null;
  benchDepthNeeds?: readonly AuctionAdvisorRosterNeed[] | null;
  warnings?: readonly AuctionAdvisorRosterWarning[] | null;
  positionCounts?: Readonly<Record<string, number>> | null;
}

export interface AuctionAdvisorPreferences {
  targetPlayerNames?: readonly string[] | null;
  fadePlayerNames?: readonly string[] | null;
  watchlistPlayerNames?: readonly string[] | null;
}

export interface AuctionAdvisorByeWeekRisks {
  maxSameByeWeekRosterCount?: number | null;
  warnings?: readonly string[] | null;
}

export interface AuctionAdvisorInput {
  playerValues: readonly AuctionAdvisorPlayerValue[];
  activePurchaseSource: AuctionAdvisorPurchaseSource;
  teamBudget: AuctionAdvisorTeamBudget | null;
  rosterGuidance: AuctionAdvisorRosterGuidance;
  preferences: AuctionAdvisorPreferences;
  byeWeekRisks?: AuctionAdvisorByeWeekRisks | null;
  activePurchases?: readonly AuctionAdvisorPurchase[] | null;
  sleeperSnapshotPurchases?: readonly AuctionAdvisorPurchase[] | null;
}

export interface AuctionAdvisorOpportunity {
  playerName: string;
  position: string | null;
  nflTeam: string | null;
  averageValue: number | null;
  highValue: number | null;
  recommendedMaxBid: number | null;
  preference: AuctionAdvisorPreference;
  reason: string;
}

export interface AuctionAdvisorWarning {
  message: string;
  severity: AuctionAdvisorSeverity;
  area: AuctionAdvisorWarningArea;
}

export interface AuctionAdvisorSummary {
  headline: string;
  currentStrategy: string;
  budgetWarning: string;
  rosterNeeds: string[];
  bestValueOpportunities: AuctionAdvisorOpportunity[];
  avoidOverpayWarnings: AuctionAdvisorWarning[];
  nextRecommendedActions: string[];
}

type MarketState = {
  direction: "inflated" | "deflated" | "neutral" | "unknown";
  multiplier: number | null;
  sampleSize: number;
};

const priorityPositions = ["RB", "WR", "TE", "QB", "K", "DEF"];

function normalizeName(value: string | null | undefined) {
  return (
    value
      ?.trim()
      .toLowerCase()
      .replace(/[.'’]/g, "")
      .replace(/\s+/g, " ") ?? ""
  );
}

function normalizePosition(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase();

  if (!normalized) return "UNK";
  if (normalized === "DST" || normalized === "D/ST") return "DEF";

  return normalized;
}

function toNonNegativeNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(value, 0)
    : null;
}

function toNonNegativeInteger(value: number | null | undefined) {
  const safeValue = toNonNegativeNumber(value);
  return safeValue === null ? null : Math.floor(safeValue);
}

function toPositiveNumber(value: number | null | undefined) {
  const safeValue = toNonNegativeNumber(value);
  return safeValue !== null && safeValue > 0 ? safeValue : null;
}

function formatMoney(value: number | null) {
  return value === null ? "N/A" : `$${Math.round(value)}`;
}

function getValueAnchor(
  value: Pick<
    AuctionAdvisorPlayerValue,
    "averageValue" | "projectedValue" | "highValue" | "lowValue"
  >
) {
  return (
    toPositiveNumber(value.averageValue) ??
    toPositiveNumber(value.projectedValue) ??
    toPositiveNumber(value.highValue) ??
    toPositiveNumber(value.lowValue)
  );
}

function getPurchaseValueAnchor(purchase: AuctionAdvisorPurchase) {
  return (
    toPositiveNumber(purchase.averageValue) ??
    toPositiveNumber(purchase.projectedValue) ??
    toPositiveNumber(purchase.highValue) ??
    toPositiveNumber(purchase.lowValue)
  );
}

function calculateMarketState(
  purchases: readonly AuctionAdvisorPurchase[] | null | undefined
): MarketState {
  const ratios =
    purchases
      ?.filter((purchase) => purchase.status !== "voided")
      .flatMap((purchase) => {
        const purchasePrice = toPositiveNumber(purchase.purchasePrice);
        const valueAnchor = getPurchaseValueAnchor(purchase);

        if (purchasePrice === null || valueAnchor === null) return [];

        return [Math.min(Math.max(purchasePrice / valueAnchor, 0.5), 1.75)];
      }) ?? [];

  if (ratios.length === 0) {
    return {
      direction: "unknown",
      multiplier: null,
      sampleSize: 0,
    };
  }

  const multiplier =
    ratios.reduce((sum, ratio) => sum + ratio, 0) / ratios.length;
  const direction =
    multiplier >= 1.05
      ? "inflated"
      : multiplier <= 0.95
        ? "deflated"
        : "neutral";

  return {
    direction,
    multiplier,
    sampleSize: ratios.length,
  };
}

function isOpenNeed(need: AuctionAdvisorRosterNeed) {
  return (toNonNegativeInteger(need.needed) ?? 0) > 0;
}

function getOpenNeeds(rosterGuidance: AuctionAdvisorRosterGuidance) {
  return [
    ...(rosterGuidance.starterNeeds ?? []).filter(isOpenNeed),
    ...(rosterGuidance.benchDepthNeeds ?? []).filter(isOpenNeed),
  ];
}

function formatNeed(need: AuctionAdvisorRosterNeed) {
  const needed = toNonNegativeInteger(need.needed) ?? 0;
  const detail = need.detail ? ` (${need.detail})` : "";

  return `${need.label}: need ${needed}${detail}`;
}

function getNeedPositionSet(needs: readonly AuctionAdvisorRosterNeed[]) {
  return new Set(
    needs
      .map((need) => normalizePosition(need.label))
      .filter((position) => position !== "UNK" && position !== "FLEX")
  );
}

function getBudgetWarning(teamBudget: AuctionAdvisorTeamBudget | null) {
  if (teamBudget === null) {
    return "Ray/Jeffrey budget state is not available yet.";
  }

  const remainingBudget = toNonNegativeNumber(teamBudget.remainingBudget);
  const rosterSpotsRemaining = toNonNegativeInteger(
    teamBudget.rosterSpotsRemaining
  );
  const maxBid = toNonNegativeNumber(teamBudget.maxBid);
  const averageDollarsPerOpenSlot = toNonNegativeNumber(
    teamBudget.averageDollarsPerOpenSlot
  );

  if (rosterSpotsRemaining !== null && rosterSpotsRemaining <= 0) {
    return "Roster is full. Do not bid unless the source data is wrong.";
  }

  if (maxBid !== null && maxBid <= 0) {
    return "Current budget math leaves no legal max bid.";
  }

  if (
    remainingBudget !== null &&
    rosterSpotsRemaining !== null &&
    remainingBudget < rosterSpotsRemaining
  ) {
    return "Remaining budget is below the minimum needed to fill open slots.";
  }

  if (maxBid !== null && maxBid < 20) {
    return `Max bid is tight at ${formatMoney(maxBid)}. Protect $1 slots first.`;
  }

  if (
    averageDollarsPerOpenSlot !== null &&
    averageDollarsPerOpenSlot < 4
  ) {
    return `Average open-slot budget is thin at ${averageDollarsPerOpenSlot.toFixed(1)}.`;
  }

  return `Budget is usable with a current max bid of ${formatMoney(maxBid ?? null)}.`;
}

function getHeadline(
  openNeeds: readonly AuctionAdvisorRosterNeed[],
  teamBudget: AuctionAdvisorTeamBudget | null,
  marketState: MarketState
  ) {
  const maxBid = toNonNegativeNumber(teamBudget?.maxBid);
  const starterNeedCount = openNeeds.filter(
    (need) => need.severity === "danger" || need.label === "FLEX"
  ).length;

  if (maxBid !== null && maxBid < 20) {
    return "Stay disciplined and preserve roster flexibility.";
  }

  if (starterNeedCount > 0) {
    return "Prioritize starter needs before chasing depth.";
  }

  if (marketState.direction === "deflated") {
    return "Market is soft enough to lean into value.";
  }

  if (marketState.direction === "inflated") {
    return "Market is running hot. Keep hard caps visible.";
  }

  return "Use value ranges, roster needs, and preference tags as the guide.";
}

function getCurrentStrategy(
  source: AuctionAdvisorPurchaseSource,
  openNeeds: readonly AuctionAdvisorRosterNeed[],
  marketState: MarketState
) {
  const sourceLabel =
    source === "manual"
      ? "Manual Entry"
      : source === "sleeper"
        ? "Sleeper Snapshot"
        : "Local Demo Data";
  const firstNeed = openNeeds[0];
  const marketPhrase =
    marketState.direction === "unknown"
      ? "market pressure is not established yet"
      : `market looks ${marketState.direction} from ${marketState.sampleSize} priced purchases`;

  if (firstNeed) {
    return `Using ${sourceLabel}, fill ${firstNeed.label} first while ${marketPhrase}.`;
  }

  return `Using ${sourceLabel}, stay value-led while ${marketPhrase}.`;
}

function getPreferenceNames(preferences: AuctionAdvisorPreferences) {
  return new Set(
    [
      ...(preferences.targetPlayerNames ?? []),
      ...(preferences.watchlistPlayerNames ?? []),
    ].map(normalizeName)
  );
}

function getOpportunityScore(
  player: AuctionAdvisorPlayerValue,
  needPositions: ReadonlySet<string>,
  preferredNames: ReadonlySet<string>,
  teamBudget: AuctionAdvisorTeamBudget | null
) {
  const averageValue = toPositiveNumber(player.averageValue);
  const highValue = toPositiveNumber(player.highValue);
  const maxBid = toNonNegativeNumber(teamBudget?.maxBid);

  if (averageValue === null || player.isTaken) return null;
  if (player.preference === "fade") return null;
  if (maxBid !== null && averageValue > maxBid + 5) return null;

  const playerPosition = normalizePosition(player.position);
  const playerNames = [
    normalizeName(player.playerName),
    normalizeName(player.matchedPlayerName),
  ];
  const valueSpread = Math.max((highValue ?? averageValue) - averageValue, 0);
  const preferenceBonus =
    player.preference === "target"
      ? 20
      : player.preference === "watch"
        ? 10
        : playerNames.some((name) => preferredNames.has(name))
          ? 8
          : 0;
  const needBonus = needPositions.has(playerPosition) ? 14 : 0;
  const byePenalty =
    (toNonNegativeInteger(player.sameByeWeekRosterCount) ?? 0) >= 3 ? 10 : 0;

  return averageValue + valueSpread * 0.4 + preferenceBonus + needBonus - byePenalty;
}

function getOpportunityReason(
  player: AuctionAdvisorPlayerValue,
  needPositions: ReadonlySet<string>
) {
  const parts: string[] = [];
  const position = normalizePosition(player.position);

  if (player.preference === "target") parts.push("target tag");
  if (player.preference === "watch") parts.push("watch tag");
  if (needPositions.has(position)) parts.push(`${position} need`);

  const highValue = toPositiveNumber(player.highValue);
  const averageValue = toPositiveNumber(player.averageValue);
  if (highValue !== null && averageValue !== null && highValue > averageValue) {
    parts.push(`${formatMoney(highValue - averageValue)} upside to high value`);
  }

  return parts.length > 0 ? parts.join(", ") : "solid value range";
}

function getOpportunityRecommendedMaxBid(
  player: AuctionAdvisorPlayerValue,
  needPositions: ReadonlySet<string>,
  teamBudget: AuctionAdvisorTeamBudget | null,
  marketState: MarketState
) {
  const anchorValue = getValueAnchor(player);
  if (anchorValue === null) return null;

  const teamMaxBid = toNonNegativeNumber(teamBudget?.maxBid);
  const highValue = toPositiveNumber(player.highValue);
  const playerPosition = normalizePosition(player.position);
  const preferenceMultiplier =
    player.preference === "target"
      ? 1.1
      : player.preference === "watch"
        ? 1.05
        : player.preference === "fade"
          ? 0.75
          : 1;
  const needMultiplier = needPositions.has(playerPosition) ? 1.06 : 1;
  const byeMultiplier =
    (toNonNegativeInteger(player.sameByeWeekRosterCount) ?? 0) >= 3
      ? 0.9
      : 1;
  const marketMultiplier =
    marketState.direction === "deflated"
      ? 1.04
      : marketState.direction === "inflated"
        ? 0.96
        : 1;
  const valueCap =
    highValue === null
      ? anchorValue
      : highValue + (player.preference === "target" ? 2 : 0);
  const uncappedBid = Math.max(
    1,
    Math.round(
      anchorValue *
        preferenceMultiplier *
        needMultiplier *
        byeMultiplier *
        marketMultiplier
    )
  );

  return Math.max(
    0,
    Math.min(uncappedBid, teamMaxBid ?? uncappedBid, Math.round(valueCap))
  );
}

function getBestValueOpportunities(
  input: AuctionAdvisorInput,
  openNeeds: readonly AuctionAdvisorRosterNeed[],
  marketState: MarketState
): AuctionAdvisorOpportunity[] {
  const needPositions = getNeedPositionSet(openNeeds);
  const preferredNames = getPreferenceNames(input.preferences);

  return input.playerValues
    .map((player) => ({
      player,
      score: getOpportunityScore(
        player,
        needPositions,
        preferredNames,
        input.teamBudget
      ),
    }))
    .filter(
      (scoredPlayer): scoredPlayer is {
        player: AuctionAdvisorPlayerValue;
        score: number;
      } => scoredPlayer.score !== null
    )
    .sort((firstPlayer, secondPlayer) => secondPlayer.score - firstPlayer.score)
    .slice(0, 5)
    .map(({ player }) => ({
      playerName: player.playerName,
      position: player.position ?? null,
      nflTeam: player.nflTeam ?? null,
      averageValue: toNonNegativeNumber(player.averageValue),
      highValue: toNonNegativeNumber(player.highValue),
      recommendedMaxBid: getOpportunityRecommendedMaxBid(
        player,
        needPositions,
        input.teamBudget,
        marketState
      ),
      preference: player.preference ?? "none",
      reason: getOpportunityReason(player, needPositions),
    }));
}

function normalizeSeverity(
  severity: AuctionAdvisorSeverity | string | null | undefined
): AuctionAdvisorSeverity {
  if (severity === "danger" || severity === "watch" || severity === "ok") {
    return severity;
  }

  return "watch";
}

function getWarningAreaFromText(text: string): AuctionAdvisorWarningArea {
  const normalizedText = text.toLowerCase();

  if (normalizedText.includes("bye")) return "bye week";
  if (
    normalizedText.includes("budget") ||
    normalizedText.includes("max bid") ||
    normalizedText.includes("slot")
  ) {
    return "budget";
  }
  if (
    normalizedText.includes("over") ||
    normalizedText.includes("cost") ||
    normalizedText.includes("value") ||
    normalizedText.includes("fade")
  ) {
    return "overpay";
  }

  return "roster";
}

function buildWarning(
  message: string,
  area: AuctionAdvisorWarningArea,
  severity: AuctionAdvisorSeverity
): AuctionAdvisorWarning {
  return {
    message,
    area,
    severity,
  };
}

function getAvoidOverpayWarnings(
  input: AuctionAdvisorInput,
  marketState: MarketState
) {
  const warnings: AuctionAdvisorWarning[] = [];
  const maxBid = toNonNegativeNumber(input.teamBudget?.maxBid);
  const rosterWarnings =
    input.rosterGuidance.warnings?.map((warning) =>
      buildWarning(
        warning.message,
        getWarningAreaFromText(`${warning.title} ${warning.message}`),
        normalizeSeverity(warning.severity)
      )
    ) ?? [];
  const fadeCandidates = input.playerValues
    .filter((player) => !player.isTaken && player.preference === "fade")
    .filter((player) => getValueAnchor(player) !== null)
    .sort(
      (firstPlayer, secondPlayer) =>
        (getValueAnchor(secondPlayer) ?? 0) - (getValueAnchor(firstPlayer) ?? 0)
    )
    .slice(0, 2);
  const tooExpensiveCandidate =
    maxBid === null
      ? null
      : input.playerValues
          .filter((player) => !player.isTaken)
          .filter((player) => (getValueAnchor(player) ?? 0) > maxBid)
          .sort(
            (firstPlayer, secondPlayer) =>
              (getValueAnchor(secondPlayer) ?? 0) -
              (getValueAnchor(firstPlayer) ?? 0)
          )[0] ?? null;

  if (marketState.direction === "inflated") {
    warnings.push(
      buildWarning(
        `Recent purchases are averaging ${marketState.multiplier?.toFixed(2)}x value. Require a roster-need reason before paying up.`,
        "draft pace",
        marketState.multiplier !== null && marketState.multiplier >= 1.15
          ? "danger"
          : "watch"
      )
    );
  }

  if (tooExpensiveCandidate && maxBid !== null) {
    warnings.push(
      buildWarning(
        `${tooExpensiveCandidate.playerName} grades above the current ${formatMoney(maxBid)} max bid. Do not chase past budget math.`,
        "budget",
        "danger"
      )
    );
  }

  fadeCandidates.forEach((player) => {
    warnings.push(
      buildWarning(
        `${player.playerName} is tagged fade. Treat any bid as a discount-only price.`,
        "overpay",
        "watch"
      )
    );
  });

  if ((input.byeWeekRisks?.maxSameByeWeekRosterCount ?? 0) >= 3) {
    warnings.push(
      buildWarning(
        "Bye week concentration is already high. Check overlap before adding another same-bye player.",
        "bye week",
        (input.byeWeekRisks?.maxSameByeWeekRosterCount ?? 0) >= 4
          ? "danger"
          : "watch"
      )
    );
  }

  const combinedWarnings = [...warnings, ...rosterWarnings];
  const uniqueWarnings = combinedWarnings.filter(
    (warning, index, allWarnings) =>
      allWarnings.findIndex(
        (candidate) => candidate.message === warning.message
      ) === index
  );

  return uniqueWarnings.length > 0
    ? uniqueWarnings.slice(0, 5)
    : [
        buildWarning(
          "No major warnings from the current read-only inputs.",
          "roster",
          "ok"
        ),
      ];
}

function getNextRecommendedActions(
  input: AuctionAdvisorInput,
  openNeeds: readonly AuctionAdvisorRosterNeed[],
  opportunities: readonly AuctionAdvisorOpportunity[]
) {
  const actions: string[] = [];
  const maxBid = toNonNegativeNumber(input.teamBudget?.maxBid);
  const snapshotPurchaseCount = input.sleeperSnapshotPurchases?.length ?? 0;
  const firstNeed = openNeeds[0];
  const firstOpportunity = opportunities[0];

  if (input.activePurchaseSource === "manual") {
    actions.push("Keep Manual Entry current after each sale so budget, roster, bye, and Advisor reads stay live.");
  } else if (input.activePurchaseSource !== "sleeper") {
    actions.push("Refresh Sleeper Snapshot or use Manual Entry, then verify the newest purchases mapped to River City rosters.");
  } else {
    actions.push(`Use the loaded Sleeper Snapshot (${snapshotPurchaseCount} purchases) as the active spend source before the next bid.`);
  }

  if (firstNeed) {
    actions.push(`Queue a ${firstNeed.label} nomination or value target until that roster need clears.`);
  }

  if (firstOpportunity) {
    actions.push(`Set ${firstOpportunity.playerName}'s hard cap at ${formatMoney(firstOpportunity.recommendedMaxBid)} before bidding starts.`);
  }

  if (maxBid !== null) {
    actions.push(`Before each bid, reserve $1 for every open slot and keep the live bid under the ${formatMoney(maxBid)} max-bid cap.`);
  }

  actions.push("Before the next nomination, check target/fade/watch and bye-week tags for the nominated player.");

  return actions.slice(0, 5);
}

export function buildAuctionAdvisorSummary(
  input: AuctionAdvisorInput
): AuctionAdvisorSummary {
  const marketState = calculateMarketState(input.activePurchases);
  const openNeeds = getOpenNeeds(input.rosterGuidance).sort((firstNeed, secondNeed) => {
    const severityRank = (severity: string | null | undefined) => {
      if (severity === "danger") return 0;
      if (severity === "watch") return 1;
      return 2;
    };
    const firstSeverity = severityRank(firstNeed.severity);
    const secondSeverity = severityRank(secondNeed.severity);

    if (firstSeverity !== secondSeverity) {
      return firstSeverity - secondSeverity;
    }

    const firstPositionRank = priorityPositions.indexOf(
      normalizePosition(firstNeed.label)
    );
    const secondPositionRank = priorityPositions.indexOf(
      normalizePosition(secondNeed.label)
    );

    return (
      (firstPositionRank === -1 ? priorityPositions.length : firstPositionRank) -
      (secondPositionRank === -1 ? priorityPositions.length : secondPositionRank)
    );
  });
  const rosterNeeds =
    openNeeds.length > 0
      ? openNeeds.slice(0, 6).map(formatNeed)
      : ["No urgent roster construction needs from the current inputs."];
  const bestValueOpportunities = getBestValueOpportunities(
    input,
    openNeeds,
    marketState
  );

  return {
    headline: getHeadline(openNeeds, input.teamBudget, marketState),
    currentStrategy: getCurrentStrategy(
      input.activePurchaseSource,
      openNeeds,
      marketState
    ),
    budgetWarning: getBudgetWarning(input.teamBudget),
    rosterNeeds,
    bestValueOpportunities,
    avoidOverpayWarnings: getAvoidOverpayWarnings(input, marketState),
    nextRecommendedActions: getNextRecommendedActions(
      input,
      openNeeds,
      bestValueOpportunities
    ),
  };
}
