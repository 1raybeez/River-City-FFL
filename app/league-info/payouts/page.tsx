'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { 
  Home, Landmark, CreditCard, Lock, Unlock, Loader2, 
  Sun, Moon, Monitor, ArrowRight, DollarSign
} from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';
import { 
  calculateWeeklyHighScores, 
  getDivisionWinners, 
  calculatePayout 
} from '@/lib/finance/paymentHandles';

// --- CONFIGURATION ---
const COMMISH_ID = "342828350391230464"; // Ray Long
const TOTAL_POT = 600; 

export default function PayoutsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [managerData, setManagerData] = useState<any[]>([]);
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function fetchFinances() {
      setLoading(true);
      try {
        const year = 2025;
        // 1. Get League ID
        const leagueRes = await fetch(`https://api.sleeper.app/v1/user/${COMMISH_ID}/leagues/nfl/${year}`);
        const leagues = await leagueRes.json();
        const myLeague = leagues.find((l: any) => l.name.includes("River City"));
        
        // 2. Fetch Rosters and Users
        const [rostersRes, usersRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${myLeague.league_id}/rosters`),
          fetch(`https://api.sleeper.app/v1/league/${myLeague.league_id}/users`)
        ]);
        const rosters = await rostersRes.json();
        const users = await usersRes.json();

        // 3. Engine Logic (Weekly Highs & Division Winners)
        const weeklyWinnerCounts = await calculateWeeklyHighScores(myLeague.league_id);
        const divWinners = getDivisionWinners(rosters);

        // 4. Map Data to UI
        const initialPaid: Record<string, boolean> = {};
        const mapped = rosters.map((r: any) => {
          const user = users.find((u: any) => u.user_id === r.owner_id);
          const teamName = user?.metadata?.team_name || user?.display_name || "Unknown Team";
          
          // Manual Overrides for Season Ranks
          let manualRank = 0;
          if (user?.display_name === "Aaron Dogg") manualRank = 1; 
          else if (user?.display_name === "Travis Miller") manualRank = 2;
          else if (user?.display_name === "JD Dowling") manualRank = 3;

          const statusKey = r.roster_id.toString();
          initialPaid[statusKey] = true; // Default all to paid

          return {
            name: teamName,
            statusKey,
            avatar: user?.avatar,
            roster_id: r.roster_id,
            isDivWinner: divWinners.includes(r.roster_id),
            weeklyWins: weeklyWinnerCounts[r.roster_id] || 0,
            rank: manualRank,
            dues: 50 
          };
        });

        setManagerData(mapped);
        setPaidStatus(initialPaid);
      } catch (err) {
        console.error("Finance Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFinances();
  }, []);

  const totalPaid = managerData.reduce((sum, m) => 
    paidStatus[m.statusKey] ? sum + m.dues : sum, 0
  );

  if (!mounted) return null;

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
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}><Sun size={14} /></button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Moon size={14} /></button>
            <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Monitor size={14} /></button>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Landmark className="text-emerald-600 hidden sm:block" size={20} />
           <span className="text-xs font-black uppercase italic tracking-tighter">Owner's Money</span>
        </div>
      </nav>

      {/* HEADER SECTION */}
      <header className="px-6 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 overflow-hidden relative shadow-lg">
             <Image src="/River City FFL Logo.JPG" alt="Logo" fill className="object-cover" priority unoptimized />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            The <span className="text-emerald-600">Vault</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Treasury & Payout Distribution</p>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
            <div className="bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 text-center shadow-xl">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2">Dues Collected</p>
                <div className="text-5xl font-black text-emerald-600 italic tracking-tighter">${totalPaid}</div>
                <p className="text-[9px] font-black opacity-20 mt-2 uppercase tracking-widest">Goal: ${TOTAL_POT}</p>
            </div>
            <div className="bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 text-center shadow-xl">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-2">Total Owed</p>
                <div className={`text-5xl font-black italic tracking-tighter ${TOTAL_POT - totalPaid > 0 ? 'text-red-600' : 'text-emerald-600 opacity-20'}`}>
                    ${Math.max(0, TOTAL_POT - totalPaid)}
                </div>
                <p className="text-[9px] font-black opacity-20 mt-2 uppercase tracking-widest">Pending Collection</p>
            </div>
        </div>

        {/* LEDGER HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                <CreditCard size={20} className="opacity-30" /> The Ledger
            </h2>
            <button onClick={() => setIsAdmin(!isAdmin)} className={`w-full sm:w-auto px-6 py-2 rounded-full text-[10px] font-black uppercase border transition-all ${isAdmin ? 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-900/40' : 'opacity-30 border-black/10 dark:border-white/10'}`}>
                {isAdmin ? <Unlock className="w-3 h-3 inline mr-2" /> : <Lock className="w-3 h-3 inline mr-2" />}
                {isAdmin ? 'Admin Mode On' : 'Admin Mode Off'}
            </button>
        </div>

        {/* DISTRIBUTION LIST */}
        <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 overflow-hidden shadow-2xl divide-y divide-black/5 dark:divide-white/5">
            {managerData.map((m) => {
                const isPaid = paidStatus[m.statusKey];
                const winnings = calculatePayout(m);
                
                return (
                    <div key={m.statusKey} className="p-6 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-black/20 overflow-hidden relative shadow-md border border-black/10 dark:border-white/10">
                                <Image src={`https://sleepercdn.com/avatars/thumbs/${m.avatar}`} alt={m.name} fill className="object-cover" unoptimized />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-black uppercase italic tracking-tighter text-sm sm:text-base leading-none">{m.name}</span>
                                    {m.isDivWinner && <span className="text-[8px] font-black bg-blue-600 text-white px-2 py-0.5 rounded italic">DIV KING</span>}
                                </div>
                                <div className="flex gap-2 mt-2 flex-wrap">
                                    {m.rank === 1 && <span className="text-[8px] font-black bg-yellow-500 text-black px-2 py-0.5 rounded italic uppercase">Champ</span>}
                                    {m.rank === 2 && <span className="text-[8px] font-black bg-gray-400 text-white px-2 py-0.5 rounded italic uppercase">Silver</span>}
                                    {m.rank === 3 && <span className="text-[8px] font-black bg-orange-800 text-white px-2 py-0.5 rounded italic uppercase">Bronze</span>}
                                    <span className="text-[8px] font-black opacity-30 uppercase tracking-widest">{m.weeklyWins} Highs</span>
                                    {winnings > 0 && (
                                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-600/10 px-2 py-0.5 rounded-full border border-emerald-600/20 italic">
                                            Won ${winnings}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="ml-4">
                            <button 
                                onClick={() => isAdmin && setPaidStatus(prev => ({ ...prev, [m.statusKey]: !prev[m.statusKey] }))}
                                className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all ${
                                    isPaid ? 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20' : 'bg-red-600/10 text-red-600 border border-red-600/20 animate-pulse'
                                } ${isAdmin ? 'cursor-pointer hover:scale-105 active:scale-95' : 'cursor-default opacity-100'}`}
                            >
                                {isPaid ? 'Paid' : 'Unpaid'}
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
      </main>
    </div>
  );
}