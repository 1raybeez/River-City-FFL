'use client';

import React, { useState, useEffect } from 'react';
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
  getFinanceOwnerLedger,
  getFinanceRules,
  getFinanceSeason,
  type FinanceAchievementTag,
  type FinanceAwardType,
  type FinanceOwnerLedgerEntry,
  type FinanceRules,
  type FinanceSeason,
} from '@/lib/finance/firestoreFinance';
import { db } from '@/lib/firebase';

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
  const [awardOwnerId, setAwardOwnerId] = useState('');
  const [awardType, setAwardType] = useState<FinanceAwardType>('weekly_high_score');
  const [awardAmount, setAwardAmount] = useState('10');
  const [awardLabel, setAwardLabel] = useState('');
  const [awardWeek, setAwardWeek] = useState('');
  const [isSubmittingAward, setIsSubmittingAward] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!awardOwnerId && managerData.length > 0) {
      setAwardOwnerId(managerData[0].id);
    }
  }, [awardOwnerId, managerData]);

  useEffect(() => {
    async function fetchFinances() {
      setLoading(true);
      setLoadError(null);
      try {
        const [season, rules, owners] = await Promise.all([
          getFinanceSeason(FINANCE_SEASON_YEAR),
          getFinanceRules(FINANCE_SEASON_YEAR),
          getFinanceOwnerLedger(FINANCE_SEASON_YEAR),
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
      } catch (err) {
        console.error("Finance Load Error:", err);
        setLoadError("The live 2026 finance ledger could not be loaded from Firestore.");
        setFinanceSeason(null);
        setFinanceRules(null);
        setManagerData([]);
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
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-black/20">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Ring / Nameplate Deductions</p>
              <p className="mt-2 text-sm font-bold leading-relaxed opacity-70">
                Trophy, ring, and nameplate deductions are approximate until final purchase costs are confirmed.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {financeRules.ringDeductionIsApproximate && (
                  <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                    Ring Approximate
                  </span>
                )}
                {financeRules.nameplateDeductionIsApproximate && (
                  <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-3 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-600">
                    Nameplate Approximate
                  </span>
                )}
              </div>
            </div>

            {financeRules.notes.length > 0 && (
              <div className="mt-6 rounded-3xl border border-black/5 bg-white/60 p-5 dark:border-white/10 dark:bg-black/20">
                <p className="text-[9px] font-black uppercase tracking-widest opacity-40">Policy Notes</p>
                <ul className="mt-3 space-y-2">
                  {financeRules.notes.map((note) => (
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
      </main>
    </div>
  );
}
