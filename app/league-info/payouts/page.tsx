'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { collection, doc, serverTimestamp, updateDoc, writeBatch } from "firebase/firestore";
import { 
  Home, Landmark, CreditCard, Lock, Unlock, Loader2, 
  Sun, Moon, Monitor
} from 'lucide-react';
import { 
  FINANCE_OWNERS_SUBCOLLECTION,
  FINANCE_AWARDS_SUBCOLLECTION,
  FINANCE_SEASONS_COLLECTION,
  getFinanceAwards,
  getFinanceOwnerLedger,
  getFinanceRules,
  getFinanceSeason,
  type FinanceAchievementTag,
  type FinanceAward,
  type FinanceAwardType,
  type FinanceOwnerLedgerEntry,
  type FinanceRules,
  type FinanceSeason,
} from '@/lib/finance/firestoreFinance';
import {
  getAllOwnerFinancialSeasons,
  getAllTimeOwnerFinancialSummaries,
} from '@/lib/finance/payoutHistorySelectors';
import {
  JORDAN_SHAKE_N_BAKERS_PAYOUT_ATTRIBUTION_NOTE,
  LANDON_SPECIAL_BROWNIES_PAYOUT_ATTRIBUTION_NOTE,
  RAY_JEFFREY_PAYOUT_ATTRIBUTION_NOTE,
} from '@/lib/finance/payoutHistoryData';
import type { OwnerFinancialSeason } from '@/lib/finance/payoutHistoryTypes';
import { db } from '@/lib/firebase';
import { ownerProfilesById } from '@/lib/managers/identityData';
import { OwnerProfileStatus } from '@/lib/managers/identityTypes';

// --- CONFIGURATION ---
const FINANCE_SEASON_YEAR = 2026;
const AWARD_TYPES: FinanceAwardType[] = [
  'weekly_high_score',
  'division_winner',
  'champion',
  'runner_up',
  'third_place',
  'adjustment',
];

const AWARD_TYPE_LABELS: Record<FinanceAwardType, string> = {
  weekly_high_score: 'Weekly High Score',
  division_winner: 'Division Winner',
  champion: 'Champion',
  runner_up: 'Runner-Up',
  third_place: 'Third Place',
  adjustment: 'Adjustment',
};

type PayoutView = 'current' | 'history';
type EarningsHistoryMetric = 'net' | 'gross' | 'paid';
type EarningsHistorySeasonFilter = 'all' | number;
type OwnerStatusFilter = 'all' | 'active' | 'retired';

type EarningsHistoryRow = {
  ownerId: string;
  sourceLabels: string[];
  displayName: string;
  photo?: string | null;
  status?: OwnerProfileStatus;
  seasonsLabel: string;
  totalDuesPaid: number;
  totalGrossWon: number;
  totalNetEarnings: number;
  hasLiveData: boolean;
  seasonEntries: {
    season: number;
    duesPaid: number;
    grossWon: number;
    netEarnings: number;
    isLive: boolean;
  }[];
  notes?: string[];
};

const EARNINGS_HISTORY_METRICS: {
  key: EarningsHistoryMetric;
  label: string;
}[] = [
  { key: 'net', label: 'Net Earnings' },
  { key: 'gross', label: 'Gross Won' },
  { key: 'paid', label: 'Dues Paid' },
];

const OWNER_STATUS_FILTERS: {
  key: OwnerStatusFilter;
  label: string;
}[] = [
  { key: 'all', label: 'All Owners' },
  { key: 'active', label: 'Active Owners' },
  { key: 'retired', label: 'Retired Owners' },
];

const PAYOUT_OWNER_DISPLAY_NAMES: Record<string, string> = {
  'tommy-moore': 'Tommy Moore',
  'david-besedich': 'David Besedich',
  'jordan-maslyn': 'Jordan Maslyn',
  'jd-dowling': 'JD Dowling',
  'aaron-hawkins': 'Aaron Hawkins',
  'rashad-gresham': 'Rashad Gresham',
  'brian-stevens': 'Brian Stevens',
  'wade-cameron': 'Wade Cameron',
  'travis-miller': 'Travis Miller',
  'ray-long': 'Ray Long',
  'doug-fordham': 'Doug Fordham',
  'stan-schoppe': 'Stan Schoppe',
  'billy-biddle': 'Billy Biddle',
  'landon-elliott': 'Landon Elliott',
  'adam-lind': 'Adam Lind',
  'patrick-leahey': 'Patrick Leahey',
  'chris-barras': 'Chris Barras',
  'ricky-taylor': 'Ricky Taylor',
  'garet-prior': 'Garet Prior',
  'james-minnix': 'James Minnix',
  'gordie-gahagan': 'Gordie Gahagan',
  'bryan-doane': 'Bryan Doane',
};

const staticPayoutHistoryOwnerSeasons = getAllOwnerFinancialSeasons();
const staticPayoutHistorySeasons = [
  ...new Set(staticPayoutHistoryOwnerSeasons.map((entry) => entry.season)),
].sort((a, b) => b - a);
const staticPayoutHistoryHasCurrentSeason = staticPayoutHistorySeasons.includes(
  FINANCE_SEASON_YEAR
);

function formatCurrency(value: number) {
  return `${value < 0 ? '-' : ''}$${Math.abs(value).toLocaleString('en-US')}`;
}

function getPayoutOwnerDisplayName(ownerId: string, sourceLabels: string[]) {
  return (
    ownerProfilesById[ownerId]?.fullName ??
    PAYOUT_OWNER_DISPLAY_NAMES[ownerId] ??
    sourceLabels[0] ??
    ownerId
  );
}

function getMetricValue(row: EarningsHistoryRow, metric: EarningsHistoryMetric) {
  if (metric === 'gross') return row.totalGrossWon;
  if (metric === 'paid') return row.totalDuesPaid;
  return row.totalNetEarnings;
}

function getNetToneClass(value: number) {
  if (value > 0) {
    return 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300';
  }
  if (value < 0) {
    return 'border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-300';
  }
  return 'border-black/10 bg-black/5 text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50';
}

function getOwnerActivitySeasonCount(
  ownerId: string,
  entries: OwnerFinancialSeason[]
) {
  return entries.filter(
    (entry) =>
      entry.ownerId === ownerId && (entry.duesPaid > 0 || entry.grossWon > 0)
  ).length;
}

function getOwnerActiveFinancialSeasons(
  ownerId: string,
  entries: OwnerFinancialSeason[]
) {
  return entries
    .filter(
      (entry) =>
        entry.ownerId === ownerId && (entry.duesPaid > 0 || entry.grossWon > 0)
    )
    .sort((a, b) => b.season - a.season);
}

function getLivePayoutAttributionNotes(ownerId: string) {
  if (ownerId === 'ray-long') {
    return [RAY_JEFFREY_PAYOUT_ATTRIBUTION_NOTE];
  }

  if (ownerId === 'jordan-maslyn') {
    return [JORDAN_SHAKE_N_BAKERS_PAYOUT_ATTRIBUTION_NOTE];
  }

  if (ownerId === 'landon-elliott') {
    return [LANDON_SPECIAL_BROWNIES_PAYOUT_ATTRIBUTION_NOTE];
  }

  return undefined;
}

function ownerMatchesStatusFilter(
  ownerId: string,
  statusFilter: OwnerStatusFilter
) {
  if (statusFilter === 'all') return true;

  const status = ownerProfilesById[ownerId]?.status;
  if (statusFilter === 'active') return status === OwnerProfileStatus.Active;
  return status === OwnerProfileStatus.Retired;
}

function getOwnerStatusLabel(status?: OwnerProfileStatus) {
  if (status === OwnerProfileStatus.Active) return 'Active';
  if (status === OwnerProfileStatus.Retired) return 'Retired';
  if (status === OwnerProfileStatus.Staff) return 'Staff';
  return 'Owner';
}

export default function PayoutsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingOwnerIds, setUpdatingOwnerIds] = useState<string[]>([]);
  const [financeSeason, setFinanceSeason] = useState<FinanceSeason | null>(null);
  const [financeRules, setFinanceRules] = useState<FinanceRules | null>(null);
  const [managerData, setManagerData] = useState<FinanceOwnerLedgerEntry[]>([]);
  const [awardHistory, setAwardHistory] = useState<FinanceAward[]>([]);
  const [awardOwnerId, setAwardOwnerId] = useState('');
  const [awardType, setAwardType] = useState<FinanceAwardType>('weekly_high_score');
  const [awardAmount, setAwardAmount] = useState('10');
  const [awardLabel, setAwardLabel] = useState('');
  const [awardWeek, setAwardWeek] = useState('');
  const [isSubmittingAward, setIsSubmittingAward] = useState(false);
  const [payoutView, setPayoutView] = useState<PayoutView>('current');
  const [earningsHistoryMetric, setEarningsHistoryMetric] =
    useState<EarningsHistoryMetric>('net');
  const [earningsHistorySeason, setEarningsHistorySeason] =
    useState<EarningsHistorySeasonFilter>('all');
  const [ownerStatusFilter, setOwnerStatusFilter] =
    useState<OwnerStatusFilter>('all');
  const [expandedPayoutOwnerId, setExpandedPayoutOwnerId] = useState<
    string | null
  >(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!awardOwnerId && managerData.length > 0) {
      setAwardOwnerId(managerData[0].id);
    }
  }, [awardOwnerId, managerData]);

  useEffect(() => {
    setExpandedPayoutOwnerId(null);
  }, [earningsHistoryMetric, earningsHistorySeason, ownerStatusFilter]);

  useEffect(() => {
    async function fetchFinances() {
      setLoading(true);
      setLoadError(null);
      try {
        const [season, rules, owners, awards] = await Promise.all([
          getFinanceSeason(FINANCE_SEASON_YEAR),
          getFinanceRules(FINANCE_SEASON_YEAR),
          getFinanceOwnerLedger(FINANCE_SEASON_YEAR),
          getFinanceAwards(FINANCE_SEASON_YEAR),
        ]);

        if (!season) {
          throw new Error(`finance_seasons/${FINANCE_SEASON_YEAR} was not found.`);
        }
        if (!rules) {
          throw new Error(`finance_rules/${FINANCE_SEASON_YEAR} was not found.`);
        }

        setFinanceSeason(season);
        setFinanceRules(rules);
        setManagerData(owners);
        setAwardHistory(awards);
      } catch (err) {
        console.error("Finance Load Error:", err);
        setLoadError("The live 2026 finance ledger could not be loaded from Firestore.");
        setFinanceSeason(null);
        setFinanceRules(null);
        setManagerData([]);
        setAwardHistory([]);
      } finally {
        setLoading(false);
      }
    }
    fetchFinances();
  }, []);

  const entryFee = financeRules?.leagueFee ?? financeSeason?.entryFee ?? 50;
  const prizePool = financeSeason?.prizePool ?? entryFee * Math.max(managerData.length, financeSeason?.expectedManagers ?? 0);
  const totalPaid = managerData.reduce((sum, m) => 
    m.paid ? sum + m.entryFee : sum, 0
  );
  const totalOwed = managerData.reduce((sum, m) => 
    m.paid ? sum : sum + m.entryFee, 0
  );
  const visibleFinanceNotes = financeRules?.notes.filter(
    (note) => !note.toLowerCase().includes('nameplate')
  ) ?? [];
  const livePayoutHistoryRows = useMemo<OwnerFinancialSeason[]>(() => {
    if (staticPayoutHistoryHasCurrentSeason) return [];

    return managerData.map((owner) => {
      const duesPaid = owner.paid ? owner.entryFee : 0;
      const notes = getLivePayoutAttributionNotes(owner.managerId);

      return {
        season: FINANCE_SEASON_YEAR,
        ownerId: owner.managerId,
        sourceLabel: owner.displayName,
        duesPaid,
        grossWon: owner.winnings,
        netEarnings: owner.winnings - duesPaid,
        sourceSheet: 'Firestore_Current_Ledger',
        ...(notes ? { notes } : {}),
      };
    });
  }, [managerData]);
  const includesLivePayoutHistory = livePayoutHistoryRows.length > 0;
  const payoutHistoryOwnerSeasons = useMemo(
    () => [...staticPayoutHistoryOwnerSeasons, ...livePayoutHistoryRows],
    [livePayoutHistoryRows]
  );
  const payoutHistoryAllTimeSummaries = useMemo(
    () => getAllTimeOwnerFinancialSummaries(payoutHistoryOwnerSeasons),
    [payoutHistoryOwnerSeasons]
  );
  const payoutHistorySeasonOptions = useMemo(
    () =>
      [...new Set(payoutHistoryOwnerSeasons.map((entry) => entry.season))].sort(
        (a, b) => b - a
      ),
    [payoutHistoryOwnerSeasons]
  );
  const earningsHistoryRows = useMemo(() => {
    const rows: EarningsHistoryRow[] =
      earningsHistorySeason === 'all'
        ? payoutHistoryAllTimeSummaries.map((summary) => {
            const activeSeasonCount = getOwnerActivitySeasonCount(
              summary.ownerId,
              payoutHistoryOwnerSeasons
            );
            const ownerProfile = ownerProfilesById[summary.ownerId];
            const seasonEntries = getOwnerActiveFinancialSeasons(
              summary.ownerId,
              payoutHistoryOwnerSeasons
            ).map((entry) => ({
              season: entry.season,
              duesPaid: entry.duesPaid,
              grossWon: entry.grossWon,
              netEarnings: entry.netEarnings,
              isLive: entry.sourceSheet === 'Firestore_Current_Ledger',
            }));

            return {
              ownerId: summary.ownerId,
              sourceLabels: summary.sourceLabels,
              displayName: getPayoutOwnerDisplayName(
                summary.ownerId,
                summary.sourceLabels
              ),
              photo: ownerProfile?.photo,
              status: ownerProfile?.status,
              seasonsLabel: `${activeSeasonCount} season${
                activeSeasonCount === 1 ? '' : 's'
              } included`,
              totalDuesPaid: summary.totalDuesPaid,
              totalGrossWon: summary.totalGrossWon,
              totalNetEarnings: summary.totalNetEarnings,
              hasLiveData: seasonEntries.some((entry) => entry.isLive),
              seasonEntries,
              notes: summary.notes,
            };
          })
        : payoutHistoryOwnerSeasons
            .filter(
              (entry) =>
                entry.season === earningsHistorySeason &&
                (entry.duesPaid > 0 || entry.grossWon > 0)
            )
            .map((entry) => {
              const ownerProfile = ownerProfilesById[entry.ownerId];

              return {
                ownerId: entry.ownerId,
                sourceLabels: [entry.sourceLabel],
                displayName: getPayoutOwnerDisplayName(entry.ownerId, [
                  entry.sourceLabel,
                ]),
                photo: ownerProfile?.photo,
                status: ownerProfile?.status,
                seasonsLabel: `${entry.season} season`,
                totalDuesPaid: entry.duesPaid,
                totalGrossWon: entry.grossWon,
                totalNetEarnings: entry.netEarnings,
                hasLiveData: entry.sourceSheet === 'Firestore_Current_Ledger',
                seasonEntries: [
                  {
                    season: entry.season,
                    duesPaid: entry.duesPaid,
                    grossWon: entry.grossWon,
                    netEarnings: entry.netEarnings,
                    isLive: entry.sourceSheet === 'Firestore_Current_Ledger',
                  },
                ],
                notes: entry.notes,
              };
            });

    return rows
      .filter((row) => ownerMatchesStatusFilter(row.ownerId, ownerStatusFilter))
      .sort((a, b) => {
        const metricDifference =
          getMetricValue(b, earningsHistoryMetric) -
          getMetricValue(a, earningsHistoryMetric);

        if (metricDifference !== 0) return metricDifference;

        return a.displayName.localeCompare(b.displayName);
      });
  }, [
    earningsHistoryMetric,
    earningsHistorySeason,
    ownerStatusFilter,
    payoutHistoryAllTimeSummaries,
    payoutHistoryOwnerSeasons,
  ]);
  const selectedMetricLabel =
    EARNINGS_HISTORY_METRICS.find(
      (metric) => metric.key === earningsHistoryMetric
    )?.label ?? 'Net Earnings';

  const getAwardTime = (award: FinanceAward) => {
    const value = award.createdAt ?? award.updatedAt;
    if (!value) return 0;
    if (typeof value === 'string') {
      const timestamp = new Date(value).getTime();
      return Number.isNaN(timestamp) ? 0 : timestamp;
    }
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
      return value.toMillis();
    }
    return 0;
  };

  const sortedAwardHistory = [...awardHistory].sort(
    (a, b) => getAwardTime(b) - getAwardTime(a)
  );

  const getAwardOwner = (award: FinanceAward) => {
    return managerData.find((owner) => owner.managerId === award.managerId);
  };

  const getDuesAchievementTags = (
    tags: FinanceAchievementTag[],
    paid: boolean
  ) => {
    const preservedTags = tags.filter((tag) => tag !== 'Paid' && tag !== 'Owes Dues');
    return [paid ? 'Paid' : 'Owes Dues', ...preservedTags] as FinanceAchievementTag[];
  };

  const getAwardAchievementTag = (type: FinanceAwardType) => {
    const tagMap: Partial<Record<FinanceAwardType, FinanceAchievementTag>> = {
      weekly_high_score: 'Weekly Winner',
      division_winner: 'Division Winner',
      champion: 'Champion',
      runner_up: 'Runner-Up',
      third_place: '3rd Place',
    };

    return tagMap[type];
  };

  const getDefaultAwardAmount = (type: FinanceAwardType) => {
    if (!financeRules) return '';

    switch (type) {
      case 'weekly_high_score':
        return String(financeRules.weeklyHighScore);
      case 'division_winner':
        return String(financeRules.divisionWinner);
      case 'champion':
        return String(financeRules.champion);
      case 'runner_up':
        return String(financeRules.runnerUp);
      case 'third_place':
        return String(financeRules.thirdPlace);
      case 'adjustment':
        return '';
    }
  };

  const getAwardAchievementTags = (
    tags: FinanceAchievementTag[],
    type: FinanceAwardType
  ) => {
    const awardTag = getAwardAchievementTag(type);
    if (!awardTag || tags.includes(awardTag)) return tags;

    return [...tags, awardTag];
  };

  const updateAwardType = (type: FinanceAwardType) => {
    setAwardType(type);
    setAwardAmount(getDefaultAwardAmount(type));
  };

  const updateOwnerPaidStatus = async (
    owner: FinanceOwnerLedgerEntry,
    paid: boolean
  ) => {
    setActionError(null);
    setUpdatingOwnerIds((prev) => [...prev, owner.id]);

    const achievementTags = getDuesAchievementTags(owner.achievementTags, paid);
    const netPosition = owner.winnings - (paid ? owner.entryFee : 0);

    try {
      await updateDoc(
        doc(
          db,
          FINANCE_SEASONS_COLLECTION,
          String(FINANCE_SEASON_YEAR),
          FINANCE_OWNERS_SUBCOLLECTION,
          owner.id
        ),
        {
          paid,
          duesPaidAt: paid ? serverTimestamp() : null,
          achievementTags,
          netPosition,
          updatedAt: serverTimestamp(),
        }
      );

      setManagerData((prev) =>
        prev.map((entry) =>
          entry.id === owner.id
            ? {
                ...entry,
                paid,
                duesPaidAt: paid ? new Date().toISOString() : null,
                achievementTags,
                netPosition,
              }
            : entry
        )
      );
    } catch (err) {
      console.error("Paid status update failed:", err);
      setActionError(`Could not update ${owner.displayName}'s paid status.`);
    } finally {
      setUpdatingOwnerIds((prev) => prev.filter((id) => id !== owner.id));
    }
  };

  const addManualAward = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError(null);

    const owner = managerData.find((entry) => entry.id === awardOwnerId);
    const amount = Number(awardAmount);
    const week = awardWeek ? Number(awardWeek) : undefined;

    if (!owner) {
      setActionError("Choose an owner before adding an award.");
      return;
    }
    if (!Number.isFinite(amount)) {
      setActionError("Enter a valid award amount.");
      return;
    }
    if (!awardLabel.trim()) {
      setActionError("Enter an award label.");
      return;
    }
    if (week !== undefined && (!Number.isInteger(week) || week < 1)) {
      setActionError("Enter a valid week number or leave it blank.");
      return;
    }

    const newWinnings = owner.winnings + amount;
    const netPosition = newWinnings - (owner.paid ? owner.entryFee : 0);
    const achievementTags = getAwardAchievementTags(owner.achievementTags, awardType);
    const awardRef = doc(
      collection(
        db,
        FINANCE_SEASONS_COLLECTION,
        String(FINANCE_SEASON_YEAR),
        FINANCE_AWARDS_SUBCOLLECTION
      )
    );
    const ownerRef = doc(
      db,
      FINANCE_SEASONS_COLLECTION,
      String(FINANCE_SEASON_YEAR),
      FINANCE_OWNERS_SUBCOLLECTION,
      owner.id
    );

    setIsSubmittingAward(true);

    try {
      const batch = writeBatch(db);

      batch.set(awardRef, {
        type: awardType,
        managerId: owner.managerId,
        ownerDocId: owner.id,
        amount,
        label: awardLabel.trim(),
        source: 'manual',
        week: week ?? null,
        locked: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.update(ownerRef, {
        winnings: newWinnings,
        netPosition,
        achievementTags,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      const localAward: FinanceAward = {
        id: awardRef.id,
        type: awardType,
        managerId: owner.managerId,
        amount,
        label: awardLabel.trim(),
        source: 'manual',
        week,
        locked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setManagerData((prev) =>
        prev.map((entry) =>
          entry.id === owner.id
            ? {
                ...entry,
                winnings: newWinnings,
                netPosition,
                achievementTags,
                updatedAt: new Date().toISOString(),
              }
            : entry
        )
      );
      setAwardHistory((prev) => [localAward, ...prev]);
      setAwardLabel('');
      setAwardWeek('');
      setAwardAmount(getDefaultAwardAmount(awardType));
    } catch (err) {
      console.error("Manual award update failed:", err);
      setActionError(`Could not add award for ${owner.displayName}.`);
    } finally {
      setIsSubmittingAward(false);
    }
  };

  if (!mounted) return null;
  const activeTheme = theme;

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0a0a0a] text-center">
      <Loader2 className="w-12 h-12 animate-spin text-emerald-600 mb-6" />
      <p className="font-black uppercase tracking-widest text-[10px] opacity-40 italic animate-pulse">Auditing the Ledger...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-emerald-600 selection:text-white">
      
      {/* NAVIGATION BAR - Redirects back to Info Hub */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link 
            href="/league-info" 
            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all"
            title="Back to Info Hub"
          >
            <Home size={18} />
          </Link>
          
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${activeTheme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}><Sun size={14} /></button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${activeTheme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Moon size={14} /></button>
            <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-all ${activeTheme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Monitor size={14} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Landmark className="text-emerald-600 hidden sm:block" size={20} />
           <span className="text-xs font-black uppercase italic tracking-tighter">Payouts</span>
        </div>
      </nav>

      {/* HEADER SECTION */}
      <header className="px-6 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg text-emerald-600">
             <Landmark size={28} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            <span className="text-emerald-600">Payouts</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">League Money, Prizes & Distribution</p>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <div className="mb-8 grid grid-cols-1 gap-2 rounded-2xl border border-black/10 bg-black/5 p-1 dark:border-white/10 dark:bg-white/5 sm:grid-cols-2">
          {[
            { key: 'current' as PayoutView, label: 'Current Ledger' },
            { key: 'history' as PayoutView, label: 'Earnings History' },
          ].map((view) => (
            <button
              key={view.key}
              type="button"
              onClick={() => setPayoutView(view.key)}
              className={`rounded-xl px-5 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                payoutView === view.key
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                  : 'opacity-50 hover:opacity-100'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className={payoutView === 'current' ? 'block' : 'hidden'}>
        {loadError && (
          <div className="mb-8 rounded-2xl border border-red-600/20 bg-red-600/10 px-5 py-4 text-sm font-bold text-red-700 dark:text-red-300">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="mb-8 rounded-2xl border border-red-600/20 bg-red-600/10 px-5 py-4 text-sm font-bold text-red-700 dark:text-red-300">
            {actionError}
          </div>
        )}
        
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            <div className="bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 text-center shadow-xl">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2">Dues Collected</p>
                <div className="text-5xl font-black text-emerald-600 italic tracking-tighter">${totalPaid}</div>
                <p className="text-[9px] font-black opacity-20 mt-2 uppercase tracking-widest">Goal: ${prizePool}</p>
            </div>
            <div className="bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 text-center shadow-xl">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2">Total Owed</p>
                <div className={`text-5xl font-black italic tracking-tighter ${totalOwed > 0 ? 'text-red-600' : 'text-emerald-600 opacity-20'}`}>
                    ${totalOwed}
                </div>
                <p className="text-[9px] font-black opacity-20 mt-2 uppercase tracking-widest">Pending Collection</p>
            </div>
        </div>

        {/* FINANCIAL RULES */}
        {financeRules && (
          <section className="mb-12 rounded-[2.5rem] border border-emerald-600/20 bg-emerald-600/5 p-8 shadow-xl">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Official Policy</p>
                <h2 className="mt-2 text-3xl font-black uppercase italic tracking-tighter">Financial Rules</h2>
              </div>
              <div className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-emerald-600">
                {FINANCE_SEASON_YEAR} Season
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { label: 'League Fee', value: `$${financeRules.leagueFee}` },
                { label: 'Weekly High Score', value: `$${financeRules.weeklyHighScore}` },
                { label: 'Division Winner', value: `$${financeRules.divisionWinner}` },
                { label: 'Runner-Up', value: `$${financeRules.runnerUp}` },
                { label: 'Third Place', value: `$${financeRules.thirdPlace}` },
                {
                  label: 'Champion',
                  value: `~$${financeRules.champion}`,
                  note: financeRules.championIsApproximate ? 'Approximate' : undefined,
                  description: 'Remaining pool after fixed payouts and champion ring cost.',
                },
              ].map((rule) => (
                <div key={rule.label} className="rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-black/20">
                  <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{rule.label}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black italic tracking-tighter">{rule.value}</span>
                    {rule.note && (
                      <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-2 py-0.5 text-[8px] font-black uppercase text-emerald-600">
                        {rule.note}
                      </span>
                    )}
                  </div>
                  {rule.description && (
                    <p className="mt-2 text-xs font-bold leading-relaxed opacity-50">
                      {rule.description}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-black/20">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Champion Ring Deduction</p>
              <p className="mt-2 text-sm font-bold leading-relaxed opacity-70">
                Champion ring deduction is approximate until the final purchase cost is confirmed.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {financeRules.ringDeductionIsApproximate && (
                  <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                    Ring Approximate
                  </span>
                )}
              </div>
            </div>

            {visibleFinanceNotes.length > 0 && (
              <div className="mt-6 rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-black/20">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Policy Notes</p>
                <ul className="mt-3 space-y-2">
                  {visibleFinanceNotes.map((note) => (
                    <li key={note} className="text-sm font-bold leading-relaxed opacity-70">
                      {note}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* LEDGER HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                <CreditCard size={20} className="opacity-30" /> The Ledger
            </h2>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                <button
                    onClick={() => setIsAdmin((prev) => !prev)}
                    className={`w-full sm:w-auto px-6 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${
                        isAdmin ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/40' : 'opacity-40 border-black/10 dark:border-white/10'
                    }`}
                >
                    {isAdmin ? <Unlock className="w-3 h-3 inline mr-2" /> : <Lock className="w-3 h-3 inline mr-2" />}
                    {isAdmin ? 'Commissioner Controls On' : 'Commissioner Controls'}
                </button>
                <div className="w-full sm:w-auto px-6 py-2 rounded-full text-[10px] font-black uppercase border border-black/10 dark:border-white/10 opacity-40 text-center">
                    {FINANCE_SEASON_YEAR} Firestore Ledger
                </div>
            </div>
        </div>

        {isAdmin && (
          <section className="mb-8 rounded-[2.5rem] border border-red-600/20 bg-red-600/5 p-6 shadow-xl">
            <div className="mb-6">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-red-600">Commissioner Controls</p>
              <h3 className="mt-2 text-2xl font-black uppercase italic tracking-tighter">Manual Award Entry</h3>
              <p className="mt-3 rounded-2xl border border-red-600/20 bg-red-600/10 px-4 py-3 text-xs font-bold leading-relaxed text-red-700 dark:text-red-300">
                Commissioner controls are intended for league admin use only. Firestore/security rules should restrict writes before public production use.
              </p>
            </div>

            <form onSubmit={addManualAward} className="grid grid-cols-1 gap-4 lg:grid-cols-6">
              <label className="lg:col-span-2">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-widest opacity-40">Owner</span>
                <select
                  value={awardOwnerId}
                  onChange={(event) => setAwardOwnerId(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-black outline-none transition-all focus:border-emerald-600 dark:border-white/10 dark:bg-black/30"
                >
                  {managerData.map((owner) => (
                    <option key={owner.id} value={owner.id} className="text-black">
                      {owner.displayName} - {owner.teamName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="lg:col-span-2">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-widest opacity-40">Type</span>
                <select
                  value={awardType}
                  onChange={(event) => updateAwardType(event.target.value as FinanceAwardType)}
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-black outline-none transition-all focus:border-emerald-600 dark:border-white/10 dark:bg-black/30"
                >
                  {AWARD_TYPES.map((type) => (
                    <option key={type} value={type} className="text-black">
                      {AWARD_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-widest opacity-40">Amount</span>
                <input
                  type="number"
                  value={awardAmount}
                  onChange={(event) => setAwardAmount(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-black outline-none transition-all focus:border-emerald-600 dark:border-white/10 dark:bg-black/30"
                  placeholder="0"
                  step="1"
                />
              </label>

              <label>
                <span className="mb-2 block text-[9px] font-black uppercase tracking-widest opacity-40">Week</span>
                <input
                  type="number"
                  value={awardWeek}
                  onChange={(event) => setAwardWeek(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-black outline-none transition-all focus:border-emerald-600 dark:border-white/10 dark:bg-black/30"
                  placeholder="Optional"
                  min="1"
                  step="1"
                />
              </label>

              <label className="lg:col-span-4">
                <span className="mb-2 block text-[9px] font-black uppercase tracking-widest opacity-40">Label</span>
                <input
                  type="text"
                  value={awardLabel}
                  onChange={(event) => setAwardLabel(event.target.value)}
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-4 py-3 text-sm font-black outline-none transition-all focus:border-emerald-600 dark:border-white/10 dark:bg-black/30"
                  placeholder="Example: Week 1 High Score"
                />
              </label>

              <div className="flex items-end lg:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmittingAward}
                  className="w-full rounded-2xl border border-emerald-600/20 bg-emerald-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] disabled:opacity-40"
                >
                  {isSubmittingAward ? 'Adding Award...' : 'Add Manual Award'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* AWARD HISTORY */}
        <section className="mb-8 rounded-[2.5rem] border border-black/5 bg-black/5 p-6 shadow-xl dark:border-white/10 dark:bg-white/5">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Payout Activity</p>
              <h3 className="mt-2 text-2xl font-black uppercase italic tracking-tighter">Award History</h3>
            </div>
            <div className="rounded-full border border-black/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest opacity-40 dark:border-white/10">
              Newest First
            </div>
          </div>

          {sortedAwardHistory.length > 0 ? (
            <div className="space-y-3">
              {sortedAwardHistory.map((award) => {
                const owner = getAwardOwner(award);

                return (
                  <div key={award.id} className="rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-black/20">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-black uppercase italic tracking-tighter">
                            {owner?.teamName ?? award.managerId}
                          </span>
                          {owner && (
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-30">
                              {owner.displayName}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-bold opacity-70">{award.label}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                            {AWARD_TYPE_LABELS[award.type]}
                          </span>
                          {award.week && (
                            <span className="rounded-full border border-black/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest opacity-50 dark:border-white/10">
                              Week {award.week}
                            </span>
                          )}
                          <span className="rounded-full border border-black/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest opacity-50 dark:border-white/10">
                            {award.source}
                          </span>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Amount</p>
                        <p className={`text-3xl font-black italic tracking-tighter ${award.amount < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {award.amount < 0 ? '-' : ''}${Math.abs(award.amount)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-black/10 p-8 text-center dark:border-white/10">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">No payout activity yet</p>
            </div>
          )}
        </section>

        {/* DISTRIBUTION LIST */}
        <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 overflow-hidden shadow-2xl divide-y divide-black/5 dark:divide-white/5">
            {managerData.map((m) => {
                const isPaid = m.paid;
                const isUpdating = updatingOwnerIds.includes(m.id);
                
                return (
                    <div key={m.id} className="p-6 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-black/20 overflow-hidden relative shadow-md border border-black/10 dark:border-white/10">
                                {m.avatar ? (
                                    <Image src={m.avatar} alt={m.displayName} fill className="object-cover" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-sm font-black opacity-30">{m.displayName[0]}</div>
                                )}
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black uppercase italic tracking-tighter text-sm sm:text-base leading-none">{m.teamName}</span>
                                    <span className="text-[8px] font-black opacity-30 uppercase tracking-widest">{m.displayName}</span>
                                </div>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {m.achievementTags.map((tag) => (
                                        <span key={tag} className={`text-[8px] font-black px-2 py-0.5 rounded italic uppercase ${tag === 'Owes Dues' ? 'bg-red-600/10 text-red-600 border border-red-600/20' : 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20'}`}>
                                            {tag}
                                        </span>
                                    ))}
                                    <span className="text-[9px] font-black text-emerald-600 bg-emerald-600/10 px-2 py-0.5 rounded-full border border-emerald-600/20 italic">
                                        Winnings ${m.winnings}
                                    </span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border italic ${m.netPosition < 0 ? 'text-red-600 bg-red-600/10 border-red-600/20' : 'text-emerald-600 bg-emerald-600/10 border-emerald-600/20'}`}>
                                        Net ${m.netPosition}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="ml-4 flex flex-col items-end gap-2">
                            <div 
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase ${
                                    isPaid ? 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20' : 'bg-red-600/10 text-red-600 border border-red-600/20 animate-pulse'
                                }`}
                            >
                                {isPaid ? 'Paid' : 'Unpaid'}
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={() => updateOwnerPaidStatus(m, !isPaid)}
                                    disabled={isUpdating}
                                    className="px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 hover:border-emerald-600/40 disabled:opacity-40 transition-all"
                                >
                                    {isUpdating ? 'Updating...' : isPaid ? 'Mark Unpaid' : 'Mark Paid'}
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
        </div>

        {payoutView === 'history' && (
          <div className="space-y-8">
            <section className="rounded-[2.5rem] border border-emerald-600/20 bg-emerald-600/5 p-6 shadow-xl sm:p-8">
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Historical Ledger</p>
                <h2 className="mt-2 text-3xl font-black uppercase italic tracking-tighter">Earnings History</h2>
                <p className="mt-3 text-sm font-bold leading-relaxed opacity-60">
                  Historical payout data from the Paid_Earnings workbook tab. Data currently covers 2016-2025.
                  {includesLivePayoutHistory
                    ? ` ${FINANCE_SEASON_YEAR} values are live from the current Firestore ledger and may change.`
                    : ''}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[
                  { label: 'Paid', value: 'Dues paid' },
                  { label: 'Won', value: 'Gross payouts' },
                  { label: 'Net', value: 'Won - Paid' },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-black/20">
                    <p className="text-[9px] font-black uppercase tracking-widest opacity-40">{item.label}</p>
                    <p className="mt-2 text-sm font-black uppercase tracking-tight">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[2.5rem] border border-black/5 bg-black/5 p-6 shadow-xl dark:border-white/10 dark:bg-white/5 sm:p-8">
              <div className="mb-6 flex flex-col gap-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600">Leaderboard</p>
                    <h3 className="mt-2 text-2xl font-black uppercase italic tracking-tighter">
                      Ranked by {selectedMetricLabel}
                    </h3>
                  </div>
                  <div className="rounded-full border border-black/10 px-4 py-2 text-[9px] font-black uppercase tracking-widest opacity-40 dark:border-white/10">
                    {earningsHistoryRows.length} owner{earningsHistoryRows.length === 1 ? '' : 's'}
                  </div>
                </div>

                <div className="rounded-3xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-black/20">
                  <p className="mb-3 text-[9px] font-black uppercase tracking-widest opacity-40">Metric</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {EARNINGS_HISTORY_METRICS.map((metric) => (
                      <button
                        key={metric.key}
                        type="button"
                        onClick={() => setEarningsHistoryMetric(metric.key)}
                        className={`min-h-11 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                          earningsHistoryMetric === metric.key
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                            : 'border border-black/10 bg-black/5 opacity-60 hover:opacity-100 dark:border-white/10 dark:bg-white/5'
                        }`}
                      >
                        {metric.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_280px]">
                  <div className="rounded-3xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-black/20">
                    <p className="mb-3 text-[9px] font-black uppercase tracking-widest opacity-40">Owner Status</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {OWNER_STATUS_FILTERS.map((filter) => (
                        <button
                          key={filter.key}
                          type="button"
                          onClick={() => setOwnerStatusFilter(filter.key)}
                          className={`min-h-11 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                            ownerStatusFilter === filter.key
                              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                              : 'border border-black/10 bg-black/5 opacity-60 hover:opacity-100 dark:border-white/10 dark:bg-white/5'
                          }`}
                        >
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="rounded-3xl border border-black/10 bg-white/60 p-4 dark:border-white/10 dark:bg-black/20">
                    <span className="mb-3 block text-[9px] font-black uppercase tracking-widest opacity-40">Season</span>
                    <select
                      value={earningsHistorySeason}
                      onChange={(event) => {
                        const value = event.target.value;
                        setEarningsHistorySeason(
                          value === 'all' ? 'all' : Number(value)
                        );
                      }}
                      className="min-h-11 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-black uppercase outline-none transition-all focus:border-emerald-600 dark:border-white/10 dark:bg-black"
                    >
                      <option value="all">All Time</option>
                      {payoutHistorySeasonOptions.map((season) => (
                        <option key={season} value={season}>
                          {season}
                          {includesLivePayoutHistory &&
                          season === FINANCE_SEASON_YEAR
                            ? ' Live'
                            : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                {earningsHistoryRows.map((row, index) => {
                  const isExpanded = expandedPayoutOwnerId === row.ownerId;

                  return (
                    <article
                      key={`${row.ownerId}-${earningsHistorySeason}`}
                      className="overflow-hidden rounded-3xl border border-black/5 bg-white/70 shadow-sm dark:border-white/10 dark:bg-black/20"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedPayoutOwnerId((current) =>
                            current === row.ownerId ? null : row.ownerId
                          )
                        }
                        aria-expanded={isExpanded}
                        className="w-full p-5 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div className="flex min-w-0 gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-600/20 bg-emerald-600/10 text-sm font-black italic text-emerald-600">
                              #{index + 1}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <h4 className="text-lg font-black uppercase italic tracking-tighter">
                                  {row.displayName}
                                </h4>
                                <span className="rounded-full border border-black/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest opacity-40 dark:border-white/10">
                                  {getOwnerStatusLabel(row.status)}
                                </span>
                                <span className="rounded-full border border-black/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest opacity-40 dark:border-white/10">
                                  {row.seasonsLabel}
                                </span>
                                {row.hasLiveData && (
                                  <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                                    2026 Live
                                  </span>
                                )}
                              </div>
                              <p className="mt-1 text-[9px] font-black uppercase tracking-widest opacity-30">
                                Source: {row.sourceLabels.join(', ')} · {isExpanded ? 'Hide Details' : 'View Details'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:min-w-[360px]">
                            {[
                              {
                                key: 'paid' as EarningsHistoryMetric,
                                label: 'Paid',
                                value: row.totalDuesPaid,
                                className: 'border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5',
                              },
                              {
                                key: 'gross' as EarningsHistoryMetric,
                                label: 'Won',
                                value: row.totalGrossWon,
                                className: 'border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300',
                              },
                              {
                                key: 'net' as EarningsHistoryMetric,
                                label: 'Net',
                                value: row.totalNetEarnings,
                                className: getNetToneClass(row.totalNetEarnings),
                              },
                            ].map((item) => (
                              <div
                                key={item.key}
                                className={`rounded-2xl border px-4 py-3 ${
                                  item.className
                                } ${
                                  earningsHistoryMetric === item.key
                                    ? 'ring-2 ring-emerald-600/30'
                                    : ''
                                }`}
                              >
                                <p className="text-[8px] font-black uppercase tracking-widest opacity-50">{item.label}</p>
                                <p className="mt-1 text-xl font-black italic tracking-tighter">
                                  {formatCurrency(item.value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-black/5 bg-black/[0.03] p-5 dark:border-white/10 dark:bg-white/[0.03]">
                          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[160px_1fr]">
                            <div className="flex items-center gap-4 lg:block">
                              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-3xl border border-black/10 bg-black/10 shadow-sm dark:border-white/10 dark:bg-white/10 lg:h-36 lg:w-full">
                                {row.photo ? (
                                  <Image
                                    src={row.photo}
                                    alt={`${row.displayName} profile photo`}
                                    fill
                                    className="object-cover object-top"
                                    sizes="160px"
                                    unoptimized
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-3xl font-black opacity-30">
                                    {row.displayName[0]}
                                  </div>
                                )}
                              </div>
                              <div className="lg:mt-3">
                                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Expanded Owner</p>
                                <p className="mt-1 text-sm font-black uppercase italic tracking-tight">{row.displayName}</p>
                              </div>
                            </div>

                            <div className="min-w-0 space-y-4">
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                                {[
                                  { label: 'Total Paid', value: row.totalDuesPaid },
                                  { label: 'Total Won', value: row.totalGrossWon },
                                  { label: 'Total Net', value: row.totalNetEarnings },
                                ].map((item) => (
                                  <div key={item.label} className={`rounded-2xl border px-4 py-3 ${item.label === 'Total Net' ? getNetToneClass(item.value) : 'border-black/10 bg-white/60 dark:border-white/10 dark:bg-black/20'}`}>
                                    <p className="text-[8px] font-black uppercase tracking-widest opacity-50">{item.label}</p>
                                    <p className="mt-1 text-xl font-black italic tracking-tighter">{formatCurrency(item.value)}</p>
                                  </div>
                                ))}
                              </div>

                              {row.notes?.map((note) => (
                                <p key={note} className="rounded-2xl border border-emerald-600/20 bg-emerald-600/10 px-4 py-3 text-xs font-bold leading-relaxed text-emerald-700 dark:text-emerald-300">
                                  {note}
                                </p>
                              ))}

                              <div className="overflow-x-auto rounded-2xl border border-black/10 bg-white/60 dark:border-white/10 dark:bg-black/20">
                                <table className="w-full min-w-[460px] text-left">
                                  <thead>
                                    <tr className="border-b border-black/10 text-[8px] font-black uppercase tracking-widest opacity-40 dark:border-white/10">
                                      <th className="px-4 py-3">Season</th>
                                      <th className="px-4 py-3 text-right">Paid</th>
                                      <th className="px-4 py-3 text-right">Won</th>
                                      <th className="px-4 py-3 text-right">Net</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.seasonEntries.map((entry) => (
                                      <tr key={`${row.ownerId}-${entry.season}`} className="border-b border-black/5 last:border-0 dark:border-white/5">
                                        <td className="px-4 py-3 text-sm font-black">
                                          <span>{entry.season}</span>
                                          {entry.isLive && (
                                            <span className="ml-2 rounded-full border border-emerald-600/20 bg-emerald-600/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                                              Live
                                            </span>
                                          )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-bold">{formatCurrency(entry.duesPaid)}</td>
                                        <td className="px-4 py-3 text-right text-sm font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(entry.grossWon)}</td>
                                        <td className={`px-4 py-3 text-right text-sm font-black ${entry.netEarnings < 0 ? 'text-red-600 dark:text-red-300' : entry.netEarnings > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'opacity-50'}`}>
                                          {formatCurrency(entry.netEarnings)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
