import type { OperationalFinanceSeasonConfig } from "@/lib/finance/operationalFinanceTypes";
import {
  calculateChampionPayout,
  validateRingExpense,
} from "@/lib/finance/operationalFinanceRules";

export type OperationalFinanceProposalCategory =
  | "weekly-high-score"
  | "division-winner"
  | "third-place"
  | "runner-up"
  | "champion"
  | "championship-ring-expense";

export type OperationalFinanceProposalState =
  | "not-eligible"
  | "pending-finality"
  | "proposed"
  | "unresolved";

export type OperationalFinanceProposalCoverageState =
  | "available"
  | "pending-finality"
  | "unresolved-sleeper-tie"
  | "unresolved-identity"
  | "pending-ring-cost"
  | "ring-cap-override-required"
  | "not-yet-applicable"
  | "source-unavailable";

export type OperationalFinanceProposalFinalityState =
  | "not-started"
  | "in-progress"
  | "provisional"
  | "sleeper-final"
  | "unresolved"
  | "not-applicable";

export type OperationalFinanceSourceType =
  | "sleeper-matchups"
  | "sleeper-standings"
  | "sleeper-winners-bracket"
  | "operational-input";

export type OperationalFinanceSourceFactValue =
  | string
  | number
  | boolean
  | null;

export type OperationalFinanceSourceFact = Readonly<
  Record<string, OperationalFinanceSourceFactValue>
>;

export interface OperationalFinanceProposal {
  readonly proposalKey: string;
  readonly season: number;
  readonly category: OperationalFinanceProposalCategory;
  readonly amountCents: number | null;
  readonly financialOwnerId: string | null;
  readonly franchiseId: string | null;
  readonly sourceType: OperationalFinanceSourceType;
  readonly sourceRef: string;
  readonly sourceFacts: OperationalFinanceSourceFact;
  readonly finalityState: OperationalFinanceProposalFinalityState;
  readonly proposalState: OperationalFinanceProposalState;
  readonly ruleRef: string;
  readonly reason: string;
  readonly coverage: OperationalFinanceProposalCoverageState;
  readonly createdFromSnapshotAt: string | null;
  readonly notes: readonly string[];
}

export interface OperationalFinanceProposalIssue {
  readonly code: string;
  readonly severity: "warning" | "error";
  readonly proposalKey: string | null;
  readonly message: string;
}

export interface OperationalFinanceProposalCoverage {
  readonly proposed: number;
  readonly pending: number;
  readonly unresolved: number;
  readonly notYetApplicable: number;
  readonly totalProposalSlots: number;
  readonly coverageByState: Readonly<
    Record<OperationalFinanceProposalCoverageState, number>
  >;
}

export interface OperationalFinanceProposalSet {
  readonly season: number;
  readonly leagueId: string;
  readonly proposals: readonly OperationalFinanceProposal[];
  readonly issues: readonly OperationalFinanceProposalIssue[];
  readonly coverage: OperationalFinanceProposalCoverage;
  readonly snapshotTimestamp: string | null;
}

export type OperationalFinanceLeagueState =
  | "preseason"
  | "regular-season"
  | "postseason"
  | "complete";

export interface OperationalFinanceRosterMappingInput {
  readonly rosterId: number;
  readonly franchiseId: string;
  readonly sourceRef: string;
}

export interface OperationalFinanceWeeklyResultInput {
  readonly week: number;
  readonly finalityState: Exclude<
    OperationalFinanceProposalFinalityState,
    "not-applicable"
  >;
  readonly officialWinnerRosterId?: number | null;
  readonly tiedRosterIds?: readonly number[];
  readonly officialWinnerPoints?: number | null;
  readonly matchupId?: number | null;
  readonly sourceRef: string;
  readonly finalityEvidence: string;
}

export interface OperationalFinanceDivisionResultInput {
  readonly divisionId: string;
  readonly divisionName?: string;
  readonly finalityState: Exclude<
    OperationalFinanceProposalFinalityState,
    "not-applicable"
  >;
  readonly sleeperOrderedRosterIds?: readonly number[];
  readonly sourceRef: string;
  readonly finalityEvidence: string;
}

export interface OperationalFinanceBracketResultInput {
  readonly finalityState: Exclude<
    OperationalFinanceProposalFinalityState,
    "not-applicable"
  >;
  readonly winnerRosterId?: number | null;
  readonly loserRosterId?: number | null;
  readonly bracketMatchId?: number | null;
  readonly round?: number | null;
  readonly sourceRef: string;
  readonly finalityEvidence: string;
}

export interface OperationalFinanceProposalInput {
  readonly rules: OperationalFinanceSeasonConfig;
  readonly season: number;
  readonly leagueId: string;
  readonly currentWeek: number;
  readonly leagueState: OperationalFinanceLeagueState;
  readonly rosterMappings: readonly OperationalFinanceRosterMappingInput[];
  readonly weeklyResults: readonly OperationalFinanceWeeklyResultInput[];
  readonly divisions: readonly OperationalFinanceDivisionResultInput[];
  readonly thirdPlaceResult?: OperationalFinanceBracketResultInput | null;
  readonly championshipResult?: OperationalFinanceBracketResultInput | null;
  readonly approvedRingCostCents?: number;
  readonly approvedRingCapOverrideCents?: number;
  readonly snapshotTimestamp?: string;
}

type IdentityResolution = Readonly<{
  franchiseId: string | null;
  financialOwnerId: string | null;
  issue: OperationalFinanceProposalIssue | null;
}>;

const COVERAGE_STATES: readonly OperationalFinanceProposalCoverageState[] = [
  "available",
  "pending-finality",
  "unresolved-sleeper-tie",
  "unresolved-identity",
  "pending-ring-cost",
  "ring-cap-override-required",
  "not-yet-applicable",
  "source-unavailable",
];

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach((child) => deepFreeze(child));
  }
  return value;
}

function proposalKey(
  season: number,
  category: OperationalFinanceProposalCategory,
  suffix?: string
) {
  return [
    "operational-finance-proposal",
    season,
    category,
    suffix,
  ]
    .filter((part) => part !== undefined)
    .join(":");
}

function issue(
  code: string,
  message: string,
  key: string | null,
  severity: "warning" | "error" = "error"
): OperationalFinanceProposalIssue {
  return deepFreeze({ code, severity, proposalKey: key, message });
}

function resolveIdentity(
  input: OperationalFinanceProposalInput,
  rosterId: number,
  key: string
): IdentityResolution {
  const rosterMappings = input.rosterMappings.filter(
    (mapping) => mapping.rosterId === rosterId
  );
  if (rosterMappings.length !== 1) {
    return deepFreeze({
      franchiseId: null,
      financialOwnerId: null,
      issue: issue(
        "unresolved-roster-identity",
        `Sleeper roster ${rosterId} has ${rosterMappings.length} canonical franchise mappings; exactly one is required.`,
        key
      ),
    });
  }

  const franchiseId = rosterMappings[0].franchiseId;
  const financialMappings = input.rules.financialOwnerMappings.filter(
    (mapping) => mapping.franchiseId === franchiseId
  );
  if (financialMappings.length !== 1) {
    return deepFreeze({
      franchiseId,
      financialOwnerId: null,
      issue: issue(
        "unresolved-financial-owner",
        `Franchise ${franchiseId} has ${financialMappings.length} approved financial-owner mappings; exactly one is required.`,
        key
      ),
    });
  }

  return deepFreeze({
    franchiseId,
    financialOwnerId: financialMappings[0].financialOwnerId,
    issue: null,
  });
}

function makeProposal(
  input: OperationalFinanceProposalInput,
  values: Omit<
    OperationalFinanceProposal,
    "season" | "createdFromSnapshotAt" | "notes" | "sourceFacts"
  > & {
    sourceFacts?: OperationalFinanceSourceFact;
    notes?: readonly string[];
  }
): OperationalFinanceProposal {
  return deepFreeze({
    ...values,
    season: input.season,
    sourceFacts: { ...(values.sourceFacts ?? {}) },
    createdFromSnapshotAt: input.snapshotTimestamp ?? null,
    notes: [...(values.notes ?? [])],
  });
}

function unresolvedIdentityProposal(
  input: OperationalFinanceProposalInput,
  base: Omit<
    Parameters<typeof makeProposal>[1],
    | "amountCents"
    | "financialOwnerId"
    | "franchiseId"
    | "proposalState"
    | "coverage"
    | "reason"
  >,
  identity: IdentityResolution
) {
  return makeProposal(input, {
    ...base,
    amountCents: null,
    franchiseId: identity.franchiseId,
    financialOwnerId: null,
    proposalState: "unresolved",
    coverage: "unresolved-identity",
    reason: identity.issue?.message ?? "Canonical financial identity is unresolved.",
  });
}

function pendingProposal(
  input: OperationalFinanceProposalInput,
  values: Pick<
    OperationalFinanceProposal,
    "proposalKey" | "category" | "sourceType" | "sourceRef" | "finalityState" | "ruleRef"
  > & {
    coverage: "pending-finality" | "not-yet-applicable";
    reason: string;
    sourceFacts?: OperationalFinanceSourceFact;
  }
) {
  return makeProposal(input, {
    ...values,
    amountCents: null,
    financialOwnerId: null,
    franchiseId: null,
    proposalState:
      values.coverage === "pending-finality"
        ? "pending-finality"
        : "not-eligible",
  });
}

function buildWeeklyProposals(
  input: OperationalFinanceProposalInput,
  proposals: OperationalFinanceProposal[],
  issues: OperationalFinanceProposalIssue[]
) {
  const eligibleWeeks = input.rules.weeklyAward.eligibleWeeks ?? [];

  for (const week of eligibleWeeks) {
    const key = proposalKey(input.season, "weekly-high-score", `week-${week}`);
    const results = input.weeklyResults.filter((result) => result.week === week);
    const result = results[0];

    if (results.length > 1) {
      issues.push(
        issue(
          "duplicate-week-source",
          `Week ${week} has ${results.length} normalized Sleeper result rows.`,
          key
        )
      );
      proposals.push(
        makeProposal(input, {
          proposalKey: key,
          category: "weekly-high-score",
          amountCents: null,
          financialOwnerId: null,
          franchiseId: null,
          sourceType: "sleeper-matchups",
          sourceRef: `sleeper:league:${input.leagueId}:matchups:week-${week}`,
          sourceFacts: { leagueId: input.leagueId, week },
          finalityState: "unresolved",
          proposalState: "unresolved",
          ruleRef: input.rules.weeklyAward.id,
          reason: "Multiple normalized source rows prevent a unique weekly result.",
          coverage: "source-unavailable",
        })
      );
      continue;
    }

    if (!result) {
      const isFuture = input.leagueState === "preseason" || week > input.currentWeek;
      proposals.push(
        makeProposal(input, {
          proposalKey: key,
          category: "weekly-high-score",
          amountCents: null,
          financialOwnerId: null,
          franchiseId: null,
          sourceType: "sleeper-matchups",
          sourceRef: `sleeper:league:${input.leagueId}:matchups:week-${week}`,
          sourceFacts: { leagueId: input.leagueId, week },
          finalityState: isFuture ? "not-started" : "unresolved",
          proposalState: isFuture ? "not-eligible" : "unresolved",
          ruleRef: input.rules.weeklyAward.id,
          reason: isFuture
            ? "The eligible scoring week has not started."
            : "Sleeper matchup facts are unavailable for an elapsed eligible week.",
          coverage: isFuture ? "not-yet-applicable" : "source-unavailable",
        })
      );
      if (!isFuture) {
        issues.push(
          issue(
            "missing-week-source",
            `Week ${week} has elapsed without a normalized Sleeper result.`,
            key
          )
        );
      }
      continue;
    }

    const sourceFacts: OperationalFinanceSourceFact = {
      leagueId: input.leagueId,
      week,
      matchupId: result.matchupId ?? null,
      winnerRosterId: result.officialWinnerRosterId ?? null,
      winnerPoints: result.officialWinnerPoints ?? null,
      finalityEvidence: result.finalityEvidence,
      tiedRosterIds: result.tiedRosterIds?.join(",") ?? "",
    };

    if (result.finalityState === "not-started") {
      proposals.push(
        pendingProposal(input, {
          proposalKey: key,
          category: "weekly-high-score",
          sourceType: "sleeper-matchups",
          sourceRef: result.sourceRef,
          sourceFacts,
          finalityState: result.finalityState,
          ruleRef: input.rules.weeklyAward.id,
          reason: "Sleeper has not started this scoring week.",
          coverage: "not-yet-applicable",
        })
      );
      continue;
    }

    if (result.finalityState === "unresolved") {
      proposals.push(
        makeProposal(input, {
          proposalKey: key,
          category: "weekly-high-score",
          amountCents: null,
          financialOwnerId: null,
          franchiseId: null,
          sourceType: "sleeper-matchups",
          sourceRef: result.sourceRef,
          sourceFacts,
          finalityState: "unresolved",
          proposalState: "unresolved",
          ruleRef: input.rules.weeklyAward.id,
          reason: "Sleeper source facts cannot establish a safely final weekly result.",
          coverage: "source-unavailable",
        })
      );
      issues.push(
        issue(
          "unresolved-week-source",
          `Week ${week} lacks the complete Sleeper facts required for finality.`,
          key
        )
      );
      continue;
    }

    if (result.finalityState !== "sleeper-final") {
      proposals.push(
        pendingProposal(input, {
          proposalKey: key,
          category: "weekly-high-score",
          sourceType: "sleeper-matchups",
          sourceRef: result.sourceRef,
          sourceFacts,
          finalityState: result.finalityState,
          ruleRef: input.rules.weeklyAward.id,
          reason: "Sleeper has not safely finalized this scoring week.",
          coverage: "pending-finality",
        })
      );
      continue;
    }

    if ((result.tiedRosterIds?.length ?? 0) > 1 && !result.officialWinnerRosterId) {
      proposals.push(
        makeProposal(input, {
          proposalKey: key,
          category: "weekly-high-score",
          amountCents: null,
          financialOwnerId: null,
          franchiseId: null,
          sourceType: "sleeper-matchups",
          sourceRef: result.sourceRef,
          sourceFacts,
          finalityState: "sleeper-final",
          proposalState: "unresolved",
          ruleRef: input.rules.weeklyAward.id,
          reason: "Sleeper exposes tied top scores without a unique league-wide weekly winner.",
          coverage: "unresolved-sleeper-tie",
          notes: [
            "A later commissioner workflow must confirm only the winner displayed by Sleeper; the $10 is not split and no River City fallback tiebreak is permitted.",
          ],
        })
      );
      issues.push(
        issue(
          "unresolved-sleeper-weekly-tie",
          `Week ${week} has no uniquely resolved API winner; Sleeper's authoritative displayed winner must be commissioner-confirmed.`,
          key,
          "warning"
        )
      );
      continue;
    }

    if (!result.officialWinnerRosterId) {
      proposals.push(
        makeProposal(input, {
          proposalKey: key,
          category: "weekly-high-score",
          amountCents: null,
          financialOwnerId: null,
          franchiseId: null,
          sourceType: "sleeper-matchups",
          sourceRef: result.sourceRef,
          sourceFacts,
          finalityState: "sleeper-final",
          proposalState: "unresolved",
          ruleRef: input.rules.weeklyAward.id,
          reason: "A final Sleeper week did not contain a unique official winner.",
          coverage: "source-unavailable",
        })
      );
      issues.push(issue("missing-week-winner", `Week ${week} has no official winner.`, key));
      continue;
    }

    const identity = resolveIdentity(input, result.officialWinnerRosterId, key);
    if (identity.issue) {
      issues.push(identity.issue);
      proposals.push(
        unresolvedIdentityProposal(
          input,
          {
            proposalKey: key,
            category: "weekly-high-score",
            sourceType: "sleeper-matchups",
            sourceRef: result.sourceRef,
            sourceFacts,
            finalityState: "sleeper-final",
            ruleRef: input.rules.weeklyAward.id,
          },
          identity
        )
      );
      continue;
    }

    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category: "weekly-high-score",
        amountCents: input.rules.weeklyAward.amountCents,
        financialOwnerId: identity.financialOwnerId,
        franchiseId: identity.franchiseId,
        sourceType: "sleeper-matchups",
        sourceRef: result.sourceRef,
        sourceFacts: { ...sourceFacts, canonicalFranchiseId: identity.franchiseId },
        finalityState: "sleeper-final",
        proposalState: "proposed",
        ruleRef: input.rules.weeklyAward.id,
        reason: "Sleeper supplied a unique winner for a safely finalized eligible week.",
        coverage: "available",
      })
    );
  }
}

function buildDivisionProposals(
  input: OperationalFinanceProposalInput,
  proposals: OperationalFinanceProposal[],
  issues: OperationalFinanceProposalIssue[]
) {
  const orderedDivisions = [...input.divisions].sort((first, second) =>
    first.divisionId.localeCompare(second.divisionId)
  );

  if (orderedDivisions.length !== input.rules.divisionAwards.awardCount) {
    issues.push(
      issue(
        "division-coverage",
        `Expected ${input.rules.divisionAwards.awardCount} divisions but received ${orderedDivisions.length}.`,
        null
      )
    );
  }

  for (const division of orderedDivisions) {
    const key = proposalKey(input.season, "division-winner", division.divisionId);
    const sourceFacts: OperationalFinanceSourceFact = {
      leagueId: input.leagueId,
      divisionId: division.divisionId,
      divisionName: division.divisionName ?? division.divisionId,
      sleeperOrder: division.sleeperOrderedRosterIds?.join(",") ?? "",
      finalityEvidence: division.finalityEvidence,
    };

    if (division.finalityState === "not-started") {
      proposals.push(
        pendingProposal(input, {
          proposalKey: key,
          category: "division-winner",
          sourceType: "sleeper-standings",
          sourceRef: division.sourceRef,
          sourceFacts,
          finalityState: "not-started",
          ruleRef: input.rules.divisionAwards.id,
          reason: "The regular-season division result is not yet applicable.",
          coverage: "not-yet-applicable",
        })
      );
      continue;
    }

    if (division.finalityState === "unresolved") {
      proposals.push(
        makeProposal(input, {
          proposalKey: key,
          category: "division-winner",
          amountCents: null,
          financialOwnerId: null,
          franchiseId: null,
          sourceType: "sleeper-standings",
          sourceRef: division.sourceRef,
          sourceFacts,
          finalityState: "unresolved",
          proposalState: "unresolved",
          ruleRef: input.rules.divisionAwards.id,
          reason: "Sleeper source facts cannot establish a safely final division result.",
          coverage: "source-unavailable",
        })
      );
      issues.push(
        issue(
          "unresolved-division-source",
          `Division ${division.divisionId} lacks complete authoritative Sleeper facts.`,
          key
        )
      );
      continue;
    }

    if (division.finalityState !== "sleeper-final") {
      proposals.push(
        pendingProposal(input, {
          proposalKey: key,
          category: "division-winner",
          sourceType: "sleeper-standings",
          sourceRef: division.sourceRef,
          sourceFacts,
          finalityState: division.finalityState,
          ruleRef: input.rules.divisionAwards.id,
          reason: "Sleeper has not finalized the division result.",
          coverage: "pending-finality",
        })
      );
      continue;
    }

    const winnerRosterId = division.sleeperOrderedRosterIds?.[0];
    if (!winnerRosterId) {
      proposals.push(
        makeProposal(input, {
          proposalKey: key,
          category: "division-winner",
          amountCents: null,
          financialOwnerId: null,
          franchiseId: null,
          sourceType: "sleeper-standings",
          sourceRef: division.sourceRef,
          sourceFacts,
          finalityState: "sleeper-final",
          proposalState: "unresolved",
          ruleRef: input.rules.divisionAwards.id,
          reason: "No authoritative Sleeper-preserving division order is available.",
          coverage: "source-unavailable",
          notes: [
            "The proposal engine does not reproduce division tiebreak mathematics; a later commissioner workflow may confirm only the winner displayed by Sleeper.",
          ],
        })
      );
      issues.push(
        issue(
          "missing-sleeper-division-order",
          `Division ${division.divisionId} lacks an authoritative Sleeper ordering.`,
          key,
          "warning"
        )
      );
      continue;
    }

    const identity = resolveIdentity(input, winnerRosterId, key);
    if (identity.issue) {
      issues.push(identity.issue);
      proposals.push(
        unresolvedIdentityProposal(
          input,
          {
            proposalKey: key,
            category: "division-winner",
            sourceType: "sleeper-standings",
            sourceRef: division.sourceRef,
            sourceFacts,
            finalityState: "sleeper-final",
            ruleRef: input.rules.divisionAwards.id,
          },
          identity
        )
      );
      continue;
    }

    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category: "division-winner",
        amountCents: input.rules.divisionAwards.amountCents,
        financialOwnerId: identity.financialOwnerId,
        franchiseId: identity.franchiseId,
        sourceType: "sleeper-standings",
        sourceRef: division.sourceRef,
        sourceFacts: { ...sourceFacts, winnerRosterId, canonicalFranchiseId: identity.franchiseId },
        finalityState: "sleeper-final",
        proposalState: "proposed",
        ruleRef: input.rules.divisionAwards.id,
        reason: "The supplied final ordering preserves Sleeper's division result.",
        coverage: "available",
      })
    );
  }
}

function buildPlacementProposal(
  input: OperationalFinanceProposalInput,
  category: "third-place" | "runner-up",
  result: OperationalFinanceBracketResultInput | null | undefined,
  rosterSide: "winnerRosterId" | "loserRosterId",
  proposals: OperationalFinanceProposal[],
  issues: OperationalFinanceProposalIssue[]
) {
  const key = proposalKey(input.season, category);
  const rule = input.rules.placementAwards.find(
    (award) => award.category === category
  );
  if (!rule) {
    issues.push(issue("missing-placement-rule", `No ${category} rule exists.`, key));
    return;
  }

  if (!result) {
    const notYet = input.leagueState !== "complete";
    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category,
        amountCents: null,
        financialOwnerId: null,
        franchiseId: null,
        sourceType: "sleeper-winners-bracket",
        sourceRef: `sleeper:league:${input.leagueId}:winners-bracket:${category}`,
        sourceFacts: { leagueId: input.leagueId, placement: category },
        finalityState: notYet ? "not-started" : "unresolved",
        proposalState: notYet ? "not-eligible" : "unresolved",
        ruleRef: rule.id,
        reason: notYet
          ? "The relevant playoff placement is not yet applicable."
          : "The completed season lacks the required Sleeper bracket result.",
        coverage: notYet ? "not-yet-applicable" : "source-unavailable",
        notes: notYet
          ? []
          : [
              "Later commissioner confirmation must follow Sleeper's displayed result; seed, roster ordering, and prior seasons are not fallbacks.",
            ],
      })
    );
    if (!notYet) {
      issues.push(issue("missing-placement-source", `No ${category} result is available.`, key));
    }
    return;
  }

  const rosterId = result[rosterSide];
  const sourceFacts: OperationalFinanceSourceFact = {
    leagueId: input.leagueId,
    bracketMatchId: result.bracketMatchId ?? null,
    round: result.round ?? null,
    winnerRosterId: result.winnerRosterId ?? null,
    loserRosterId: result.loserRosterId ?? null,
    finalityEvidence: result.finalityEvidence,
  };

  if (result.finalityState === "not-started") {
    proposals.push(
      pendingProposal(input, {
        proposalKey: key,
        category,
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts,
        finalityState: "not-started",
        ruleRef: rule.id,
        reason: "The relevant playoff placement is not yet applicable.",
        coverage: "not-yet-applicable",
      })
    );
    return;
  }

  if (result.finalityState === "unresolved") {
    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category,
        amountCents: null,
        financialOwnerId: null,
        franchiseId: null,
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts,
        finalityState: "unresolved",
        proposalState: "unresolved",
        ruleRef: rule.id,
        reason: "Sleeper bracket classification is ambiguous or incomplete; later commissioner confirmation must follow Sleeper's displayed result.",
        coverage: "source-unavailable",
      })
    );
    issues.push(
      issue(
        "ambiguous-placement-source",
        `Sleeper bracket facts do not unambiguously identify ${category}.`,
        key
      )
    );
    return;
  }

  if (result.finalityState !== "sleeper-final") {
    proposals.push(
      pendingProposal(input, {
        proposalKey: key,
        category,
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts,
        finalityState: result.finalityState,
        ruleRef: rule.id,
        reason: "Sleeper has not finalized the relevant playoff result.",
        coverage: "pending-finality",
      })
    );
    return;
  }

  if (!rosterId) {
    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category,
        amountCents: null,
        financialOwnerId: null,
        franchiseId: null,
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts,
        finalityState: "sleeper-final",
        proposalState: "unresolved",
        ruleRef: rule.id,
        reason: `Sleeper's final bracket result does not identify the ${category} roster.`,
        coverage: "source-unavailable",
        notes: [
          "Later commissioner confirmation must follow Sleeper's displayed result; no placement is inferred.",
        ],
      })
    );
    issues.push(issue("missing-placement-roster", `No ${category} roster is available.`, key));
    return;
  }

  const identity = resolveIdentity(input, rosterId, key);
  if (identity.issue) {
    issues.push(identity.issue);
    proposals.push(
      unresolvedIdentityProposal(
        input,
        {
          proposalKey: key,
          category,
          sourceType: "sleeper-winners-bracket",
          sourceRef: result.sourceRef,
          sourceFacts,
          finalityState: "sleeper-final",
          ruleRef: rule.id,
        },
        identity
      )
    );
    return;
  }

  proposals.push(
    makeProposal(input, {
      proposalKey: key,
      category,
      amountCents: rule.amountCents,
      financialOwnerId: identity.financialOwnerId,
      franchiseId: identity.franchiseId,
      sourceType: "sleeper-winners-bracket",
      sourceRef: result.sourceRef,
      sourceFacts: { ...sourceFacts, canonicalFranchiseId: identity.franchiseId },
      finalityState: "sleeper-final",
      proposalState: "proposed",
      ruleRef: rule.id,
      reason: "Sleeper's final championship bracket identifies this placement.",
      coverage: "available",
    })
  );
}

function buildChampionProposal(
  input: OperationalFinanceProposalInput,
  proposals: OperationalFinanceProposal[],
  issues: OperationalFinanceProposalIssue[]
) {
  const key = proposalKey(input.season, "champion");
  const result = input.championshipResult;
  const ruleRef = `${input.season}-championship-allocation`;

  if (!result) {
    const notYet = input.leagueState !== "complete";
    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category: "champion",
        amountCents: null,
        financialOwnerId: null,
        franchiseId: null,
        sourceType: "sleeper-winners-bracket",
        sourceRef: `sleeper:league:${input.leagueId}:winners-bracket:championship`,
        sourceFacts: { leagueId: input.leagueId, placement: "champion" },
        finalityState: notYet ? "not-started" : "unresolved",
        proposalState: notYet ? "not-eligible" : "unresolved",
        ruleRef,
        reason: notYet
          ? "The championship result is not yet applicable."
          : "The completed season lacks a Sleeper championship result.",
        coverage: notYet ? "not-yet-applicable" : "source-unavailable",
        notes: notYet
          ? []
          : [
              "Later commissioner confirmation must follow Sleeper's displayed result; seed, roster ordering, and prior seasons are not fallbacks.",
            ],
      })
    );
    if (!notYet) {
      issues.push(issue("missing-championship-source", "No championship result is available.", key));
    }
    return;
  }

  const sourceFacts: OperationalFinanceSourceFact = {
    leagueId: input.leagueId,
    bracketMatchId: result.bracketMatchId ?? null,
    round: result.round ?? null,
    winnerRosterId: result.winnerRosterId ?? null,
    loserRosterId: result.loserRosterId ?? null,
    finalityEvidence: result.finalityEvidence,
  };

  if (result.finalityState === "not-started") {
    proposals.push(
      pendingProposal(input, {
        proposalKey: key,
        category: "champion",
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts,
        finalityState: "not-started",
        ruleRef,
        reason: "The championship result is not yet applicable.",
        coverage: "not-yet-applicable",
      })
    );
    return;
  }

  if (result.finalityState === "unresolved") {
    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category: "champion",
        amountCents: null,
        financialOwnerId: null,
        franchiseId: null,
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts,
        finalityState: "unresolved",
        proposalState: "unresolved",
        ruleRef,
        reason: "Sleeper championship classification is ambiguous or incomplete; later commissioner confirmation must follow Sleeper's displayed result.",
        coverage: "source-unavailable",
      })
    );
    issues.push(
      issue(
        "ambiguous-championship-source",
        "Sleeper bracket facts do not unambiguously identify the championship result.",
        key
      )
    );
    return;
  }

  if (result.finalityState !== "sleeper-final") {
    proposals.push(
      pendingProposal(input, {
        proposalKey: key,
        category: "champion",
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts,
        finalityState: result.finalityState,
        ruleRef,
        reason: "Sleeper has not finalized the championship result.",
        coverage: "pending-finality",
      })
    );
    return;
  }

  if (!result.winnerRosterId) {
    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category: "champion",
        amountCents: null,
        financialOwnerId: null,
        franchiseId: null,
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts,
        finalityState: "sleeper-final",
        proposalState: "unresolved",
        ruleRef,
        reason: "Sleeper's final championship result does not identify a winner.",
        coverage: "source-unavailable",
        notes: [
          "Later commissioner confirmation must follow Sleeper's displayed result; no champion is inferred.",
        ],
      })
    );
    issues.push(issue("missing-champion-roster", "No championship winner roster is available.", key));
    return;
  }

  const identity = resolveIdentity(input, result.winnerRosterId, key);
  if (identity.issue) {
    issues.push(identity.issue);
    proposals.push(
      unresolvedIdentityProposal(
        input,
        {
          proposalKey: key,
          category: "champion",
          sourceType: "sleeper-winners-bracket",
          sourceRef: result.sourceRef,
          sourceFacts,
          finalityState: "sleeper-final",
          ruleRef,
        },
        identity
      )
    );
    return;
  }

  if (input.approvedRingCostCents === undefined) {
    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category: "champion",
        amountCents: null,
        financialOwnerId: identity.financialOwnerId,
        franchiseId: identity.franchiseId,
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts: { ...sourceFacts, canonicalFranchiseId: identity.franchiseId },
        finalityState: "sleeper-final",
        proposalState: "unresolved",
        ruleRef,
        reason: "The champion is final, but no actual approved ring cost was supplied.",
        coverage: "pending-ring-cost",
      })
    );
    return;
  }

  const payout = calculateChampionPayout(
    input.approvedRingCostCents,
    input.approvedRingCapOverrideCents,
    input.rules
  );
  if (!payout.resolved || payout.championCashCents === null) {
    const needsOverride = payout.ringValidation.warnings.some(
      (warning) => warning.code === "commissioner-override-required"
    );
    proposals.push(
      makeProposal(input, {
        proposalKey: key,
        category: "champion",
        amountCents: null,
        financialOwnerId: identity.financialOwnerId,
        franchiseId: identity.franchiseId,
        sourceType: "sleeper-winners-bracket",
        sourceRef: result.sourceRef,
        sourceFacts: {
          ...sourceFacts,
          canonicalFranchiseId: identity.franchiseId,
          approvedRingCostCents: input.approvedRingCostCents,
          approvedRingCapOverrideCents: input.approvedRingCapOverrideCents ?? null,
        },
        finalityState: "sleeper-final",
        proposalState: "unresolved",
        ruleRef,
        reason: payout.ringValidation.errors.map((entry) => entry.message).join(" "),
        coverage: needsOverride
          ? "ring-cap-override-required"
          : "source-unavailable",
      })
    );
    payout.ringValidation.errors.forEach((entry) =>
      issues.push(issue(entry.code, entry.message, key))
    );
    return;
  }

  proposals.push(
    makeProposal(input, {
      proposalKey: key,
      category: "champion",
      amountCents: payout.championCashCents,
      financialOwnerId: identity.financialOwnerId,
      franchiseId: identity.franchiseId,
      sourceType: "sleeper-winners-bracket",
      sourceRef: result.sourceRef,
      sourceFacts: {
        ...sourceFacts,
        canonicalFranchiseId: identity.franchiseId,
        approvedRingCostCents: input.approvedRingCostCents,
        effectiveRingExpenseCents: payout.effectiveRingExpenseCents,
        approvedRingCapOverrideCents: input.approvedRingCapOverrideCents ?? null,
      },
      finalityState: "sleeper-final",
      proposalState: "proposed",
      ruleRef,
      reason: "Sleeper finalized the champion and the approved ring input resolves champion cash.",
      coverage: "available",
    })
  );
}

function buildRingProposal(
  input: OperationalFinanceProposalInput,
  proposals: OperationalFinanceProposal[],
  issues: OperationalFinanceProposalIssue[]
) {
  if (input.approvedRingCostCents === undefined) return;

  const key = proposalKey(input.season, "championship-ring-expense");
  const validation = validateRingExpense(
    input.approvedRingCostCents,
    input.approvedRingCapOverrideCents,
    input.rules
  );
  const needsOverride = validation.warnings.some(
    (warning) => warning.code === "commissioner-override-required"
  );

  proposals.push(
    makeProposal(input, {
      proposalKey: key,
      category: "championship-ring-expense",
      amountCents: validation.resolved
        ? validation.effectiveRingExpenseCents
        : null,
      financialOwnerId: null,
      franchiseId: null,
      sourceType: "operational-input",
      sourceRef: `operational-finance:${input.season}:approved-ring-cost`,
      sourceFacts: {
        approvedRingCostCents: input.approvedRingCostCents,
        approvedRingCapCents: validation.approvedRingFundingCapCents,
        approvedRingCapOverrideCents: input.approvedRingCapOverrideCents ?? null,
        fundingSource: input.rules.ringPolicy.fundingSource,
      },
      finalityState: "not-applicable",
      proposalState: validation.resolved ? "proposed" : "unresolved",
      ruleRef: input.rules.ringPolicy.id,
      reason: validation.resolved
        ? "An explicit approved ring cost is within the approved dues-funded cap."
        : validation.errors.map((entry) => entry.message).join(" "),
      coverage: validation.resolved
        ? "available"
        : needsOverride
          ? "ring-cap-override-required"
          : "source-unavailable",
      notes: ["This is a league expense, not owner cash winnings."],
    })
  );

  validation.errors.forEach((entry) =>
    issues.push(issue(entry.code, entry.message, key))
  );
}

function buildCoverage(
  proposals: readonly OperationalFinanceProposal[]
): OperationalFinanceProposalCoverage {
  const coverageByState = Object.fromEntries(
    COVERAGE_STATES.map((state) => [
      state,
      proposals.filter((proposal) => proposal.coverage === state).length,
    ])
  ) as Record<OperationalFinanceProposalCoverageState, number>;

  return deepFreeze({
    proposed: coverageByState.available,
    pending:
      coverageByState["pending-finality"] +
      coverageByState["pending-ring-cost"],
    unresolved:
      coverageByState["unresolved-sleeper-tie"] +
      coverageByState["unresolved-identity"] +
      coverageByState["ring-cap-override-required"] +
      coverageByState["source-unavailable"],
    notYetApplicable: coverageByState["not-yet-applicable"],
    totalProposalSlots: proposals.length,
    coverageByState,
  });
}

export function buildOperationalFinanceProposals(
  input: OperationalFinanceProposalInput
): OperationalFinanceProposalSet {
  const proposals: OperationalFinanceProposal[] = [];
  const issues: OperationalFinanceProposalIssue[] = [];

  if (input.season !== input.rules.season) {
    issues.push(
      issue(
        "rules-season-mismatch",
        `Proposal season ${input.season} does not match rules season ${input.rules.season}.`,
        null
      )
    );
  }

  buildWeeklyProposals(input, proposals, issues);
  buildDivisionProposals(input, proposals, issues);
  buildPlacementProposal(
    input,
    "third-place",
    input.thirdPlaceResult,
    "winnerRosterId",
    proposals,
    issues
  );
  buildPlacementProposal(
    input,
    "runner-up",
    input.championshipResult,
    "loserRosterId",
    proposals,
    issues
  );
  buildChampionProposal(input, proposals, issues);
  buildRingProposal(input, proposals, issues);

  const duplicateKeys = [...new Set(
    proposals
      .map((proposal) => proposal.proposalKey)
      .filter(
        (key, index, keys) => keys.indexOf(key) !== index
      )
  )];
  duplicateKeys.forEach((key) =>
    issues.push(issue("duplicate-proposal-key", `Duplicate proposal key: ${key}.`, key))
  );

  const uniqueProposals = [...new Map(
    proposals.map((proposal) => [proposal.proposalKey, proposal])
  ).values()];
  const orderedProposals = uniqueProposals.sort((first, second) =>
    first.proposalKey.localeCompare(second.proposalKey)
  );
  const orderedIssues = [...issues].sort((first, second) =>
    `${first.proposalKey ?? ""}:${first.code}`.localeCompare(
      `${second.proposalKey ?? ""}:${second.code}`
    )
  );

  return deepFreeze({
    season: input.season,
    leagueId: input.leagueId,
    proposals: orderedProposals,
    issues: orderedIssues,
    coverage: buildCoverage(orderedProposals),
    snapshotTimestamp: input.snapshotTimestamp ?? null,
  });
}
