export type AuctionOpponentCandidate = {
  ownerId: string;
  ownerName: string;
  shortName: string | null;
  teamName: string;
};

export type AuctionOpponentResolution =
  | {
      status: "matched";
      candidate: AuctionOpponentCandidate;
      matchedAlias: string;
    }
  | {
      status: "ambiguous";
      candidates: AuctionOpponentCandidate[];
    }
  | {
      status: "none";
    };

export type OpponentRecommendationCandidate<T> = {
  value: T;
  position: string | null;
  marketValue: number | null;
  available: boolean;
};

export type OpponentPressurePositionInput<TPosition extends string = string> = {
  position: TPosition;
  needed: number;
  availableCount: number;
  historicalSpendShare: number | null;
  marketHeat: "Hot" | "Normal" | "Cold";
  order: number;
};

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesAlias(question: string, alias: string) {
  if (!alias || alias.length < 2) return false;
  return ` ${question} `.includes(` ${alias} `);
}

export function isOpponentStrategyQuestion(question: string) {
  const normalized = normalize(question);
  return [
    "nominate",
    "pressure",
    "make",
    "force",
    "spend",
    "overpay",
    "bid up",
    "dont want",
    "do not want",
    "draft difficult",
    "draft hard",
    "stop",
    "block",
  ].some((phrase) => normalized.includes(phrase));
}

export function resolveAuctionOpponent(
  question: string,
  candidates: readonly AuctionOpponentCandidate[],
  excludedOwnerId: string | null = null
): AuctionOpponentResolution {
  if (!isOpponentStrategyQuestion(question)) return { status: "none" };
  const normalizedQuestion = normalize(question);
  const matches = candidates
    .filter((candidate) => candidate.ownerId !== excludedOwnerId)
    .flatMap((candidate) => {
      const aliases = Array.from(
        new Set(
          [
            candidate.shortName,
            candidate.ownerName,
            candidate.ownerName.split(/\s+/)[0],
            candidate.teamName,
          ]
            .filter((alias): alias is string => Boolean(alias?.trim()))
            .map(normalize)
        )
      )
        .filter((alias) => includesAlias(normalizedQuestion, alias))
        .sort((first, second) => second.length - first.length);

      return aliases[0]
        ? [{ candidate, alias: aliases[0], score: aliases[0].length }]
        : [];
    })
    .sort((first, second) => second.score - first.score);

  if (matches.length === 0) return { status: "none" };
  const topScore = matches[0].score;
  const topMatches = matches.filter((match) => match.score === topScore);
  if (topMatches.length > 1) {
    return {
      status: "ambiguous",
      candidates: topMatches.map((match) => match.candidate),
    };
  }

  return {
    status: "matched",
    candidate: matches[0].candidate,
    matchedAlias: matches[0].alias,
  };
}

export function selectAvailableOpponentRecommendations<T>(
  candidates: readonly OpponentRecommendationCandidate<T>[],
  position: string | null
) {
  return candidates
    .filter((candidate) => candidate.available)
    .filter(
      (candidate) =>
        !position ||
        candidate.position?.trim().toUpperCase() === position.toUpperCase()
    )
    .sort(
      (first, second) =>
        (second.marketValue ?? 0) - (first.marketValue ?? 0)
    )
    .map((candidate) => candidate.value);
}

export function rankOpponentPressurePositions<TPosition extends string>(
  positions: readonly OpponentPressurePositionInput<TPosition>[]
) {
  return positions
    .filter((position) => position.needed > 0)
    .map((position) => ({
      ...position,
      score:
        position.needed * 100 +
        (position.historicalSpendShare ?? 0) * 40 +
        Math.max(0, 18 - position.availableCount) +
        (position.marketHeat === "Hot"
          ? 12
          : position.marketHeat === "Cold"
            ? -4
            : 0),
    }))
    .sort(
      (first, second) =>
        second.score - first.score || first.order - second.order
    );
}
