import {
  ownerFinancialSeasons,
  paidEarningsWorkbookTotals,
  payoutOwnerAliases,
} from "@/lib/finance/payoutHistoryData";
import type {
  OwnerFinancialSeason,
  OwnerFinancialSummary,
  PayoutHistoryValidationResult,
  SeasonFinancialSummary,
} from "@/lib/finance/payoutHistoryTypes";

function uniqueStrings(values: string[]) {
  return [...new Set(values)];
}

function uniqueNumbers(values: number[]) {
  return [...new Set(values)].sort((a, b) => b - a);
}

function getUniqueNotes(entries: OwnerFinancialSeason[]) {
  const notes = uniqueStrings(entries.flatMap((entry) => entry.notes ?? []));
  return notes.length > 0 ? notes : undefined;
}

function summarizeOwnerEntries(
  ownerId: string,
  entries: OwnerFinancialSeason[]
): OwnerFinancialSummary {
  return {
    ownerId,
    sourceLabels: uniqueStrings(entries.map((entry) => entry.sourceLabel)),
    seasons: uniqueNumbers(entries.map((entry) => entry.season)),
    totalDuesPaid: entries.reduce((sum, entry) => sum + entry.duesPaid, 0),
    totalGrossWon: entries.reduce((sum, entry) => sum + entry.grossWon, 0),
    totalNetEarnings: entries.reduce((sum, entry) => sum + entry.netEarnings, 0),
    ...(getUniqueNotes(entries) ? { notes: getUniqueNotes(entries) } : {}),
  };
}

export function summarizeOwnerFinancialSeasons(
  entries: OwnerFinancialSeason[] = ownerFinancialSeasons
) {
  const entriesByOwnerId = new Map<string, OwnerFinancialSeason[]>();

  entries.forEach((entry) => {
    const ownerEntries = entriesByOwnerId.get(entry.ownerId) ?? [];
    ownerEntries.push(entry);
    entriesByOwnerId.set(entry.ownerId, ownerEntries);
  });

  return [...entriesByOwnerId.entries()]
    .map(([ownerId, ownerEntries]) =>
      summarizeOwnerEntries(ownerId, ownerEntries)
    )
    .sort((a, b) => b.totalNetEarnings - a.totalNetEarnings);
}

export function getAllOwnerFinancialSeasons() {
  return [...ownerFinancialSeasons];
}

export function getOwnerFinancialSeasonsByOwnerId(ownerId: string) {
  return ownerFinancialSeasons
    .filter((entry) => entry.ownerId === ownerId)
    .sort((a, b) => b.season - a.season);
}

export function getAllTimeOwnerFinancialSummaries(
  entries: OwnerFinancialSeason[] = ownerFinancialSeasons
) {
  return summarizeOwnerFinancialSeasons(entries);
}

export function getAllTimeOwnerFinancialSummaryByOwnerId(ownerId: string) {
  return getAllTimeOwnerFinancialSummaries().find(
    (summary) => summary.ownerId === ownerId
  );
}

export function getSeasonFinancialSummaries(): SeasonFinancialSummary[] {
  const seasons = uniqueNumbers(
    ownerFinancialSeasons.map((entry) => entry.season)
  );

  return seasons.map((season) => {
    const entries = ownerFinancialSeasons.filter(
      (entry) => entry.season === season
    );

    return {
      season,
      totalDuesPaid: entries.reduce((sum, entry) => sum + entry.duesPaid, 0),
      totalGrossWon: entries.reduce((sum, entry) => sum + entry.grossWon, 0),
      totalNetEarnings: entries.reduce(
        (sum, entry) => sum + entry.netEarnings,
        0
      ),
      ownerCount: entries.length,
      payingOwnerCount: entries.filter((entry) => entry.duesPaid > 0).length,
      winningOwnerCount: entries.filter((entry) => entry.grossWon > 0).length,
    };
  });
}

export function getSeasonFinancialSummary(season: number) {
  return getSeasonFinancialSummaries().find(
    (summary) => summary.season === season
  );
}

export function getPayoutOwnerAliasBySourceLabel(sourceLabel: string) {
  return payoutOwnerAliases.find((alias) => alias.sourceLabel === sourceLabel);
}

export function validatePayoutHistoryTotals(): PayoutHistoryValidationResult {
  const summariesByOwnerId = new Map(
    getAllTimeOwnerFinancialSummaries().map((summary) => [
      summary.ownerId,
      summary,
    ])
  );
  const messages: string[] = [];

  paidEarningsWorkbookTotals.forEach((expected) => {
    const actual = summariesByOwnerId.get(expected.ownerId);

    if (!actual) {
      messages.push(
        `${expected.sourceLabel}: missing normalized payout summary for ${expected.ownerId}.`
      );
      return;
    }

    if (actual.totalDuesPaid !== expected.totalDuesPaid) {
      messages.push(
        `${expected.sourceLabel}: total dues paid expected ${expected.totalDuesPaid}, got ${actual.totalDuesPaid}.`
      );
    }

    if (actual.totalGrossWon !== expected.totalGrossWon) {
      messages.push(
        `${expected.sourceLabel}: total gross won expected ${expected.totalGrossWon}, got ${actual.totalGrossWon}.`
      );
    }

    if (actual.totalNetEarnings !== expected.totalNetEarnings) {
      messages.push(
        `${expected.sourceLabel}: total net earnings expected ${expected.totalNetEarnings}, got ${actual.totalNetEarnings}.`
      );
    }
  });

  return {
    isValid: messages.length === 0,
    messages,
  };
}

export const payoutHistoryValidation = validatePayoutHistoryTotals();
