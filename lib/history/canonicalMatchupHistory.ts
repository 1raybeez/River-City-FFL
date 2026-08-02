import type { BracketMatch } from "@/lib/sleeper";

export type CanonicalMatchupType =
  | "regular"
  | "championship-playoff"
  | "third-place"
  | "consolation"
  | "toilet-bowl"
  | "placement"
  | "bye"
  | "incomplete";

export type CanonicalBracketType = "winners" | "losers" | null;

export type CanonicalMatchupScoringPeriod = {
  week: number;
  sourceMatchupId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  isComplete: boolean;
};

export type CanonicalMatchupSource = {
  provider: "sleeper";
  sourceType: "weekly-matchup" | "bracket";
  bracketType: CanonicalBracketType;
  sourceMatchupId: number | null;
  bracketMatchNumber: number | null;
  retrievedAt: string | null;
  sourceVersion: string;
};

export type CanonicalMatchupRecordCoverage = {
  pairing: "resolved" | "partial" | "ambiguous";
  scores: "resolved" | "missing";
  completion: "resolved" | "incomplete";
  franchises: "mapped" | "source-roster";
  classification: "resolved" | "incomplete";
};

/**
 * One physical River City contest, represented exactly once at franchise level.
 * Sleeper roster-franchise IDs are used when no reviewed canonical franchise map
 * is supplied. Owner identity and owner attribution are intentionally absent.
 */
export type CanonicalFranchiseMatchup = {
  matchupKey: string;
  season: number;
  leagueId: string;
  week: number;
  matchupType: CanonicalMatchupType;
  bracketType: CanonicalBracketType;
  round: number | null;
  bracketPlacement: number | null;
  isChampionshipGame: boolean;
  scoringPeriods: CanonicalMatchupScoringPeriod[];
  homeFranchiseId: string | null;
  awayFranchiseId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  winnerFranchiseId: string | null;
  loserFranchiseId: string | null;
  isComplete: boolean;
  correctionVersion: number;
  source: CanonicalMatchupSource;
  coverage: CanonicalMatchupRecordCoverage;
};

export type CanonicalMatchupRow = {
  roster_id: number;
  matchup_id?: number;
  points: number | null;
};

export type CanonicalMatchupSeasonInput = {
  season: number;
  leagueId: string;
  playoffWeekStart: number;
  finalScoringPeriod: number;
  completedScoringPeriods: number[];
  matchupRowsByWeek: Record<number, CanonicalMatchupRow[]>;
  winnersBracket: BracketMatch[];
  losersBracket: BracketMatch[];
  losersBracketType: "toilet-bowl" | "consolation";
  playoffRoundScoringPeriods?: Record<number, number[]>;
  franchiseIdByRosterId?: Record<number, string>;
  correctionVersion?: number;
  retrievedAt?: string | null;
  sourceVersion?: string;
};

export type CanonicalMatchupBuildInput = {
  seasons: CanonicalMatchupSeasonInput[];
};

export type CanonicalMatchupSeasonCoverage = {
  season: number;
  leagueId: string;
  regularWeeksExpected: number;
  scoringPeriodsLoaded: number;
  rawMatchupRows: number;
  pairedRegularMatchups: number;
  unpairedRows: number;
  ambiguousRegularGroups: number;
  bracketRows: number;
  canonicalMatchups: number;
  completeMatchups: number;
  incompleteMatchups: number;
  duplicateMatchupKeys: string[];
  classificationTotals: Record<CanonicalMatchupType, number>;
  warnings: string[];
};

export type CanonicalMatchupCoverage = {
  seasonsRequested: number[];
  seasonsLoaded: number[];
  seasonsWithoutLeagueIds: number[];
  canonicalMatchups: number;
  completeMatchups: number;
  incompleteMatchups: number;
  duplicateMatchupKeys: string[];
  classificationTotals: Record<CanonicalMatchupType, number>;
  bySeason: CanonicalMatchupSeasonCoverage[];
};

type BuildResult = {
  records: CanonicalFranchiseMatchup[];
  coverage: CanonicalMatchupCoverage;
};

const MATCHUP_TYPES: CanonicalMatchupType[] = [
  "regular",
  "championship-playoff",
  "third-place",
  "consolation",
  "toilet-bowl",
  "placement",
  "bye",
  "incomplete",
];

const DEFAULT_SOURCE_VERSION = "sleeper-live-v1";
const DEFAULT_CORRECTION_VERSION = 1;

let cachedMatchups: CanonicalFranchiseMatchup[] | null = null;
let cachedCoverage: CanonicalMatchupCoverage | null = null;

function emptyClassificationTotals() {
  return Object.fromEntries(
    MATCHUP_TYPES.map((matchupType) => [matchupType, 0])
  ) as Record<CanonicalMatchupType, number>;
}

function requireInitializedMatchups() {
  if (cachedMatchups === null) {
    throw new Error(
      "Canonical matchup history is not initialized. Supply acquired or fixture input to buildCanonicalMatchups() first."
    );
  }

  return cachedMatchups;
}

function requireInitializedCoverage() {
  if (cachedCoverage === null) {
    throw new Error(
      "Canonical matchup coverage is not initialized. Supply acquired or fixture input to buildCanonicalMatchups() first."
    );
  }

  return cachedCoverage;
}

function cloneMatchup(
  matchup: CanonicalFranchiseMatchup
): CanonicalFranchiseMatchup {
  return {
    ...matchup,
    scoringPeriods: matchup.scoringPeriods.map((period) => ({ ...period })),
    source: { ...matchup.source },
    coverage: { ...matchup.coverage },
  };
}

function cloneCoverage(
  coverage: CanonicalMatchupCoverage
): CanonicalMatchupCoverage {
  return {
    ...coverage,
    seasonsRequested: [...coverage.seasonsRequested],
    seasonsLoaded: [...coverage.seasonsLoaded],
    seasonsWithoutLeagueIds: [...coverage.seasonsWithoutLeagueIds],
    duplicateMatchupKeys: [...coverage.duplicateMatchupKeys],
    classificationTotals: { ...coverage.classificationTotals },
    bySeason: coverage.bySeason.map((season) => ({
      ...season,
      duplicateMatchupKeys: [...season.duplicateMatchupKeys],
      classificationTotals: { ...season.classificationTotals },
      warnings: [...season.warnings],
    })),
  };
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readInteger(value: unknown): number | null {
  const number = readNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function sourceFranchiseId(
  seasonInput: CanonicalMatchupSeasonInput,
  rosterId: number
) {
  return (
    seasonInput.franchiseIdByRosterId?.[rosterId] ??
    `sleeper-roster:${seasonInput.season}:${seasonInput.leagueId}:${rosterId}`
  );
}

function hasReviewedFranchiseMap(
  seasonInput: CanonicalMatchupSeasonInput,
  rosterIds: number[]
) {
  return rosterIds.every(
    (rosterId) => seasonInput.franchiseIdByRosterId?.[rosterId] !== undefined
  );
}

function completedPeriodSet(seasonInput: CanonicalMatchupSeasonInput) {
  return new Set(seasonInput.completedScoringPeriods);
}

function matchupSource(
  seasonInput: CanonicalMatchupSeasonInput,
  values: Pick<
    CanonicalMatchupSource,
    | "sourceType"
    | "bracketType"
    | "sourceMatchupId"
    | "bracketMatchNumber"
  >
): CanonicalMatchupSource {
  return {
    provider: "sleeper",
    ...values,
    retrievedAt: seasonInput.retrievedAt ?? null,
    sourceVersion: seasonInput.sourceVersion ?? DEFAULT_SOURCE_VERSION,
  };
}

function scoreResult(
  homeFranchiseId: string | null,
  awayFranchiseId: string | null,
  homeScore: number | null,
  awayScore: number | null,
  isComplete: boolean
) {
  if (
    !isComplete ||
    homeFranchiseId === null ||
    awayFranchiseId === null ||
    homeScore === null ||
    awayScore === null ||
    homeScore === awayScore
  ) {
    return {
      winnerFranchiseId: null,
      loserFranchiseId: null,
    };
  }

  return homeScore > awayScore
    ? {
        winnerFranchiseId: homeFranchiseId,
        loserFranchiseId: awayFranchiseId,
      }
    : {
        winnerFranchiseId: awayFranchiseId,
        loserFranchiseId: homeFranchiseId,
      };
}

function sumScores(
  periods: CanonicalMatchupScoringPeriod[],
  side: "homeScore" | "awayScore"
) {
  if (periods.some((period) => period[side] === null)) return null;
  return periods.reduce((total, period) => total + (period[side] ?? 0), 0);
}

function regularMatchupKey(
  season: number,
  leagueId: string,
  week: number,
  matchupId: number
) {
  return `sleeper:${season}:${leagueId}:regular:w${week}:m${matchupId}`;
}

function bracketMatchupKey(
  season: number,
  leagueId: string,
  bracketType: Exclude<CanonicalBracketType, null>,
  round: number,
  bracketMatchNumber: number
) {
  return `sleeper:${season}:${leagueId}:bracket:${bracketType}:r${round}:m${bracketMatchNumber}`;
}

function buildRegularMatchups(
  seasonInput: CanonicalMatchupSeasonInput,
  seasonCoverage: CanonicalMatchupSeasonCoverage
) {
  const records: CanonicalFranchiseMatchup[] = [];
  const completePeriods = completedPeriodSet(seasonInput);

  for (let week = 1; week < seasonInput.playoffWeekStart; week += 1) {
    const rows = seasonInput.matchupRowsByWeek[week] ?? [];
    const groupedRows = new Map<number, CanonicalMatchupRow[]>();

    rows.forEach((row) => {
      const matchupId = readInteger(row.matchup_id);
      if (matchupId === null) {
        seasonCoverage.unpairedRows += 1;
        return;
      }

      groupedRows.set(matchupId, [
        ...(groupedRows.get(matchupId) ?? []),
        row,
      ]);
    });

    [...groupedRows.entries()]
      .sort(([firstId], [secondId]) => firstId - secondId)
      .forEach(([matchupId, group]) => {
        if (group.length > 2) {
          seasonCoverage.ambiguousRegularGroups += 1;
          return;
        }

        const orderedRows = [...group].sort(
          (first, second) => first.roster_id - second.roster_id
        );
        const homeRow = orderedRows[0] ?? null;
        const awayRow = orderedRows[1] ?? null;
        const rosterIds = orderedRows.map((row) => row.roster_id);
        const homeFranchiseId = homeRow
          ? sourceFranchiseId(seasonInput, homeRow.roster_id)
          : null;
        const awayFranchiseId = awayRow
          ? sourceFranchiseId(seasonInput, awayRow.roster_id)
          : null;
        const homeScore = readNumber(homeRow?.points);
        const awayScore = readNumber(awayRow?.points);
        const isBye = group.length === 1;
        const isComplete =
          !isBye &&
          completePeriods.has(week) &&
          homeScore !== null &&
          awayScore !== null;
        const matchupType: CanonicalMatchupType = isBye
          ? "bye"
          : isComplete
            ? "regular"
            : "incomplete";
        const scoringPeriods: CanonicalMatchupScoringPeriod[] = [
          {
            week,
            sourceMatchupId: matchupId,
            homeScore,
            awayScore,
            isComplete,
          },
        ];

        records.push({
          matchupKey: regularMatchupKey(
            seasonInput.season,
            seasonInput.leagueId,
            week,
            matchupId
          ),
          season: seasonInput.season,
          leagueId: seasonInput.leagueId,
          week,
          matchupType,
          bracketType: null,
          round: null,
          bracketPlacement: null,
          isChampionshipGame: false,
          scoringPeriods,
          homeFranchiseId,
          awayFranchiseId,
          homeScore,
          awayScore,
          ...scoreResult(
            homeFranchiseId,
            awayFranchiseId,
            homeScore,
            awayScore,
            isComplete
          ),
          isComplete,
          correctionVersion:
            seasonInput.correctionVersion ?? DEFAULT_CORRECTION_VERSION,
          source: matchupSource(seasonInput, {
            sourceType: "weekly-matchup",
            bracketType: null,
            sourceMatchupId: matchupId,
            bracketMatchNumber: null,
          }),
          coverage: {
            pairing: isBye ? "partial" : "resolved",
            scores:
              homeScore !== null && awayScore !== null
                ? "resolved"
                : "missing",
            completion: isComplete ? "resolved" : "incomplete",
            franchises: hasReviewedFranchiseMap(seasonInput, rosterIds)
              ? "mapped"
              : "source-roster",
            classification:
              matchupType === "incomplete" ? "incomplete" : "resolved",
          },
        });

        if (group.length === 2) seasonCoverage.pairedRegularMatchups += 1;
        else seasonCoverage.unpairedRows += group.length;
      });
  }

  return records;
}

function classifyBracketMatchup(
  bracketType: Exclude<CanonicalBracketType, null>,
  placement: number | null,
  losersBracketType: CanonicalMatchupSeasonInput["losersBracketType"]
): CanonicalMatchupType {
  if (bracketType === "losers") return losersBracketType;
  if (placement === 3) return "third-place";
  if (placement !== null && placement !== 1) return "placement";
  return "championship-playoff";
}

function buildBracketMatchups(
  seasonInput: CanonicalMatchupSeasonInput,
  bracketType: Exclude<CanonicalBracketType, null>,
  bracket: BracketMatch[],
  seasonCoverage: CanonicalMatchupSeasonCoverage
) {
  const records: CanonicalFranchiseMatchup[] = [];
  const completePeriods = completedPeriodSet(seasonInput);

  bracket
    .map((row) => ({
      row,
      round: readInteger(row.r),
      matchNumber: readInteger(row.m),
    }))
    .sort(
      (first, second) =>
        (first.round ?? Number.MAX_SAFE_INTEGER) -
          (second.round ?? Number.MAX_SAFE_INTEGER) ||
        (first.matchNumber ?? Number.MAX_SAFE_INTEGER) -
          (second.matchNumber ?? Number.MAX_SAFE_INTEGER)
    )
    .forEach(({ row, round, matchNumber }) => {
      if (round === null || matchNumber === null) {
        seasonCoverage.warnings.push(
          `${bracketType} bracket row is missing a stable round or match number.`
        );
        return;
      }

      const participantIds = [readInteger(row.t1), readInteger(row.t2)]
        .filter((rosterId): rosterId is number => rosterId !== null)
        .sort((first, second) => first - second);
      const homeRosterId = participantIds[0] ?? null;
      const awayRosterId = participantIds[1] ?? null;
      const isBye = participantIds.length === 1;
      const periodWeeks =
        seasonInput.playoffRoundScoringPeriods?.[round] ??
        [seasonInput.playoffWeekStart + round - 1];
      const scoringPeriods = periodWeeks.map((week) => {
        const weekRows = seasonInput.matchupRowsByWeek[week] ?? [];
        const homeRow = weekRows.find(
          (candidate) => candidate.roster_id === homeRosterId
        );
        const awayRow = weekRows.find(
          (candidate) => candidate.roster_id === awayRosterId
        );
        const homeScore = readNumber(homeRow?.points);
        const awayScore = readNumber(awayRow?.points);

        return {
          week,
          sourceMatchupId:
            readInteger(homeRow?.matchup_id) ??
            readInteger(awayRow?.matchup_id),
          homeScore,
          awayScore,
          isComplete:
            completePeriods.has(week) &&
            homeScore !== null &&
            awayScore !== null,
        };
      });
      const bracketHasResult =
        readInteger(row.w) !== null && readInteger(row.l) !== null;
      const isComplete =
        !isBye &&
        participantIds.length === 2 &&
        bracketHasResult &&
        scoringPeriods.length > 0 &&
        scoringPeriods.every((period) => period.isComplete);
      const placement = readInteger(row.p);
      const matchupType: CanonicalMatchupType = isBye
        ? "bye"
        : isComplete
          ? classifyBracketMatchup(
              bracketType,
              placement,
              seasonInput.losersBracketType
            )
          : "incomplete";
      const homeFranchiseId =
        homeRosterId === null
          ? null
          : sourceFranchiseId(seasonInput, homeRosterId);
      const awayFranchiseId =
        awayRosterId === null
          ? null
          : sourceFranchiseId(seasonInput, awayRosterId);
      const homeScore = sumScores(scoringPeriods, "homeScore");
      const awayScore = sumScores(scoringPeriods, "awayScore");

      records.push({
        matchupKey: bracketMatchupKey(
          seasonInput.season,
          seasonInput.leagueId,
          bracketType,
          round,
          matchNumber
        ),
        season: seasonInput.season,
        leagueId: seasonInput.leagueId,
        week: periodWeeks[0] ?? seasonInput.playoffWeekStart + round - 1,
        matchupType,
        bracketType,
        round,
        bracketPlacement: placement,
        isChampionshipGame:
          isComplete && bracketType === "winners" && placement === 1,
        scoringPeriods,
        homeFranchiseId,
        awayFranchiseId,
        homeScore,
        awayScore,
        ...scoreResult(
          homeFranchiseId,
          awayFranchiseId,
          homeScore,
          awayScore,
          isComplete
        ),
        isComplete,
        correctionVersion:
          seasonInput.correctionVersion ?? DEFAULT_CORRECTION_VERSION,
        source: matchupSource(seasonInput, {
          sourceType: "bracket",
          bracketType,
          sourceMatchupId: null,
          bracketMatchNumber: matchNumber,
        }),
        coverage: {
          pairing: isBye
            ? "partial"
            : participantIds.length === 2
              ? "resolved"
              : "ambiguous",
          scores:
            homeScore !== null && awayScore !== null
              ? "resolved"
              : "missing",
          completion: isComplete ? "resolved" : "incomplete",
          franchises: hasReviewedFranchiseMap(
            seasonInput,
            participantIds
          )
            ? "mapped"
            : "source-roster",
          classification:
            matchupType === "incomplete" ? "incomplete" : "resolved",
        },
      });
    });

  return records;
}

function createSeasonCoverage(
  seasonInput: CanonicalMatchupSeasonInput
): CanonicalMatchupSeasonCoverage {
  return {
    season: seasonInput.season,
    leagueId: seasonInput.leagueId,
    regularWeeksExpected: Math.max(0, seasonInput.playoffWeekStart - 1),
    scoringPeriodsLoaded: Object.values(
      seasonInput.matchupRowsByWeek
    ).filter((rows) => rows.length > 0).length,
    rawMatchupRows: Object.values(seasonInput.matchupRowsByWeek).reduce(
      (total, rows) => total + rows.length,
      0
    ),
    pairedRegularMatchups: 0,
    unpairedRows: 0,
    ambiguousRegularGroups: 0,
    bracketRows:
      seasonInput.winnersBracket.length + seasonInput.losersBracket.length,
    canonicalMatchups: 0,
    completeMatchups: 0,
    incompleteMatchups: 0,
    duplicateMatchupKeys: [],
    classificationTotals: emptyClassificationTotals(),
    warnings: [],
  };
}

function buildFromInput(input: CanonicalMatchupBuildInput): BuildResult {
  const records: CanonicalFranchiseMatchup[] = [];
  const bySeason: CanonicalMatchupSeasonCoverage[] = [];

  [...input.seasons]
    .sort((first, second) => first.season - second.season)
    .forEach((seasonInput) => {
      const seasonCoverage = createSeasonCoverage(seasonInput);
      const seasonRecords = [
        ...buildRegularMatchups(seasonInput, seasonCoverage),
        ...buildBracketMatchups(
          seasonInput,
          "winners",
          seasonInput.winnersBracket,
          seasonCoverage
        ),
        ...buildBracketMatchups(
          seasonInput,
          "losers",
          seasonInput.losersBracket,
          seasonCoverage
        ),
      ].sort((first, second) =>
        first.matchupKey.localeCompare(second.matchupKey)
      );
      const keyCounts = new Map<string, number>();
      seasonRecords.forEach((record) => {
        keyCounts.set(
          record.matchupKey,
          (keyCounts.get(record.matchupKey) ?? 0) + 1
        );
      });
      seasonCoverage.duplicateMatchupKeys = [...keyCounts.entries()]
        .filter(([, count]) => count > 1)
        .map(([key]) => key)
        .sort();
      const uniqueSeasonRecords = seasonRecords.filter(
        (record, index, allRecords) =>
          allRecords.findIndex(
            (candidate) => candidate.matchupKey === record.matchupKey
          ) === index
      );

      uniqueSeasonRecords.forEach((record) => {
        seasonCoverage.classificationTotals[record.matchupType] += 1;
      });
      seasonCoverage.canonicalMatchups = uniqueSeasonRecords.length;
      seasonCoverage.completeMatchups = uniqueSeasonRecords.filter(
        (record) => record.isComplete
      ).length;
      seasonCoverage.incompleteMatchups =
        uniqueSeasonRecords.length - seasonCoverage.completeMatchups;
      records.push(...uniqueSeasonRecords);
      bySeason.push(seasonCoverage);
    });

  const classificationTotals = emptyClassificationTotals();
  records.forEach((record) => {
    classificationTotals[record.matchupType] += 1;
  });
  const duplicateMatchupKeys = bySeason.flatMap(
    (season) => season.duplicateMatchupKeys
  );

  return {
    records,
    coverage: {
      seasonsRequested: input.seasons.map((season) => season.season).sort(),
      seasonsLoaded: input.seasons.map((season) => season.season).sort(),
      seasonsWithoutLeagueIds: [],
      canonicalMatchups: records.length,
      completeMatchups: records.filter((record) => record.isComplete).length,
      incompleteMatchups: records.filter((record) => !record.isComplete)
        .length,
      duplicateMatchupKeys,
      classificationTotals,
      bySeason,
    },
  };
}

export function buildCanonicalMatchups(input: CanonicalMatchupBuildInput) {
  const result = buildFromInput(input);
  cachedMatchups = result.records.map(cloneMatchup);
  cachedCoverage = cloneCoverage(result.coverage);

  return result.records.map(cloneMatchup);
}

export function getAllCanonicalMatchups() {
  return requireInitializedMatchups().map(cloneMatchup);
}

export function getCanonicalMatchupsForSeason(season: number) {
  return requireInitializedMatchups()
    .filter((matchup) => matchup.season === season)
    .map(cloneMatchup);
}

export function getCanonicalMatchup(matchupKey: string) {
  const matchup = requireInitializedMatchups().find(
    (candidate) => candidate.matchupKey === matchupKey
  );
  return matchup ? cloneMatchup(matchup) : null;
}

export function getCanonicalCoverage() {
  return cloneCoverage(requireInitializedCoverage());
}
