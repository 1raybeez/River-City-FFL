export type PayoutHistorySourceSheet = "Paid_Earnings";

export interface PayoutOwnerAlias {
  sourceLabel: string;
  ownerId: string;
}

export interface OwnerFinancialSeason {
  season: number;
  ownerId: string;
  sourceLabel: string;
  duesPaid: number;
  grossWon: number;
  netEarnings: number;
  sourceSheet: PayoutHistorySourceSheet;
  notes?: string[];
}

export interface OwnerFinancialSummary {
  ownerId: string;
  sourceLabels: string[];
  seasons: number[];
  totalDuesPaid: number;
  totalGrossWon: number;
  totalNetEarnings: number;
  notes?: string[];
}

export interface SeasonFinancialSummary {
  season: number;
  totalDuesPaid: number;
  totalGrossWon: number;
  totalNetEarnings: number;
  ownerCount: number;
  payingOwnerCount: number;
  winningOwnerCount: number;
}

export interface PayoutOwnerWorkbookTotal {
  sourceLabel: string;
  ownerId: string;
  totalDuesPaid: number;
  totalGrossWon: number;
  totalNetEarnings: number;
}

export interface PayoutHistoryValidationResult {
  isValid: boolean;
  messages: string[];
}
