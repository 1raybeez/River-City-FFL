'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { 
  Home, ArrowRightLeft, Search, Zap, BarChart3, 
  RefreshCw, Loader2, Sun, Moon, Monitor, TrendingUp, ShieldAlert
} from 'lucide-react';

const COMMISH_ID = "342828350391230464"; 

export default function TradeAnalyzerPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rosters, setRosters] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    async function fetchLeagueData() {
      setLoading(true);
      try {
        const year = 2025;
        const leagueRes = await fetch(`https://api.sleeper.app/v1/user/${COMMISH_ID}/leagues/nfl/${year}`);
        const leagues = await leagueRes.json();
        const myLeague = leagues.find((l: any) => l.name.includes("River City"));
        
        const [rosRes, usrRes] = await Promise.all([
          fetch(`https://api.sleeper.app/v1/league/${myLeague.league_id}/rosters`),
          fetch(`https://api.sleeper.app/v1/league/${myLeague.league_id}/users`)
        ]);
        
        setRosters(await rosRes.json());
        setUsers(await usrRes.json());
      } catch (err) {
        console.error("Analyzer Load Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeagueData();
  }, []);

  if (!mounted) return null;

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0a0a0a]">
      <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-6" />
      <p className="font-black uppercase tracking-widest text-[10px] opacity-40 italic animate-pulse">Scanning League Rosters...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-600">
      
      {/* NAVIGATION BAR */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/league-info" className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all">
            <Home size={18} />
          </Link>
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}><Sun size={14} /></button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Moon size={14} /></button>
            <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Monitor size={14} /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <ArrowRightLeft className="text-orange-600 hidden sm:block" size={20} />
           <span className="text-xs font-black uppercase italic tracking-tighter">Trade Analyzer</span>
        </div>
      </nav>

      {/* HEADER */}
      <header className="px-6 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 overflow-hidden relative shadow-lg">
             <Image src="/River City FFL Logo.JPG" alt="Logo" fill className="object-cover" priority unoptimized />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Value <span className="text-orange-600">Analyzer</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Power Rankings & Roster Valuation</p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        
        {/* SIMULATION CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="md:col-span-2 bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <Zap className="text-yellow-500" size={24} />
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Quick Sim</h2>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                    <select className="flex-1 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-2xl font-black uppercase italic text-xs outline-none">
                        <option>Select Team A</option>
                        {users.map(u => <option key={u.user_id}>{u.metadata?.team_name || u.display_name}</option>)}
                    </select>
                    <div className="flex items-center justify-center italic font-black opacity-20">VS</div>
                    <select className="flex-1 bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-2xl font-black uppercase italic text-xs outline-none">
                        <option>Select Team B</option>
                        {users.map(u => <option key={u.user_id}>{u.metadata?.team_name || u.display_name}</option>)}
                    </select>
                </div>
                <button className="w-full mt-6 py-4 bg-orange-600 text-white rounded-2xl font-black uppercase italic tracking-widest shadow-lg shadow-orange-900/40 hover:scale-[1.02] transition-all">
                    Run Trade Simulation
                </button>
            </div>

            <div className="bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-xl flex flex-col justify-center items-center text-center">
                <TrendingUp className="text-green-600 mb-4" size={40} />
                <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Power Rank</h3>
                <p className="text-xs opacity-40 font-bold uppercase tracking-widest leading-loose">Algorithmic analysis of current rosters and bench depth.</p>
            </div>
        </div>

        {/* ROSTER OVERVIEW */}
        <div className="flex items-center justify-between mb-8 px-2">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                <BarChart3 size={20} className="opacity-30" /> League Intelligence
            </h2>
            <div className="flex items-center gap-2 opacity-30 text-[10px] font-black uppercase">
                <RefreshCw size={12} className="animate-spin-slow" /> Data Live
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {users.slice(0, 12).map((user) => (
                <div key={user.user_id} className="bg-black/5 dark:bg-white/5 p-6 rounded-[2rem] border border-black/5 dark:border-white/10 hover:border-orange-600/50 transition-all group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-black/20 overflow-hidden relative border border-black/10">
                            <Image src={`https://sleepercdn.com/avatars/thumbs/${user.avatar}`} alt="Avatar" fill className="object-cover" unoptimized />
                        </div>
                        <span className="font-black uppercase italic tracking-tighter text-xs truncate">{user.metadata?.team_name || user.display_name}</span>
                    </div>
                    <div className="space-y-2">
                        <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-600 w-[75%]"></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-black uppercase opacity-40 tracking-widest">
                            <span>Roster Strength</span>
                            <span>75%</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </main>
    </div>
  );
}