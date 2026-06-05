'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { 
  Home, Loader2, Swords, X, Calendar, 
  TrendingUp, TrendingDown, Trophy, Sun, Moon, Monitor
} from 'lucide-react';

// --- CONFIGURATION: RIVER CITY DATA ---
const LEAGUE_HISTORY = [
  { year: 2026, id: "1312149033254416384" },
  { year: 2025, id: "1199749375539027968" },
  { year: 2024, id: "1072545817749331968" },
  { year: 2023, id: "997510104398315520" },
  { year: 2022, id: "784542934581256192" },
  { year: 2021, id: "677751457528762368" },
  { year: 2020, id: "530115541505298432" },
  { year: 2019, id: "466632190273253376" },
  { year: 2018, id: "342868033913540608" },
];

const MANAGER_MAP: Record<string, { name: string; image: string }> = {
  "73400761740312576": { name: "Doug", image: "/managers/Doug.jpg" },
  "341412060426436608": { name: "Jordan", image: "/managers/Jordan.jpg" },
  "469199353672626176": { name: "Landon", image: "/managers/Landon.png" },
  "342828350391230464": { name: "Ray & Jeffrey", image: "/managers/Ray.png" },
  "342831451382841344": { name: "Travis", image: "/managers/Travis.png" },
  "342838548870762496": { name: "Wade", image: "/managers/Wade.png" },
  "342849293037608960": { name: "Tommy", image: "/managers/Tommy.png" },
  "342850391018356736": { name: "JD", image: "/managers/JD.png" },
  "343129212162523136": { name: "Brian", image: "/managers/Brian.png" },
  "466663208728391680": { name: "Dave", image: "/managers/Dave.png" },
  "583513420586848256": { name: "Aaron", image: "/managers/Aaron.png" },
  "864186418971418624": { name: "Rashad", image: "/managers/Rashad.png" },
  "1260048448384667648": { name: "Stan", image: "/managers/Stan.jpg" }
};

export default function RivalryHub() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [stats, setStats] = useState<any>({
    aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0,
    blowout: null, shave: null
  });
  const scanIdRef = useRef(0);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const scanId = scanIdRef.current + 1;
    scanIdRef.current = scanId;
    setSelectedMatch(null);
    setScanError(null);
    setHasScanned(false);

    if (!playerA || !playerB) {
      setLoading(false);
      setStats({ aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0, blowout: null, shave: null });
      return;
    }

    async function scanHistory() {
      setLoading(true);
      const h2h = { aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0 };
      const games: any[] = [];

      try {
        for (const season of LEAGUE_HISTORY) {
          const rosterRes = await fetch(`https://api.sleeper.app/v1/league/${season.id}/rosters`);
          if (!rosterRes.ok) throw new Error(`Failed to load rosters for ${season.year}`);

          const rosters = await rosterRes.json();
          
          const ridA = rosters.find((r: any) => r.owner_id === playerA || r.co_owners?.includes(playerA))?.roster_id;
          const ridB = rosters.find((r: any) => r.owner_id === playerB || r.co_owners?.includes(playerB))?.roster_id;
          
          if (!ridA || !ridB || ridA === ridB) continue;

          for (let w = 1; w <= 17; w++) {
            const mRes = await fetch(`https://api.sleeper.app/v1/league/${season.id}/matchups/${w}`);
            if (!mRes.ok) throw new Error(`Failed to load ${season.year} week ${w} matchups`);

            const matchups = await mRes.json();
            const matchA = matchups.find((m: any) => m.roster_id === ridA);
            const matchB = matchups.find((m: any) => m.roster_id === ridB);

            if (matchA?.matchup_id === matchB?.matchup_id && matchA && matchB && matchA.points !== undefined) {
              const diff = Math.abs(matchA.points - matchB.points);
              games.push({ year: season.year, week: w, a: matchA, b: matchB, diff });
              h2h.totalGames++;
              h2h.aPoints += (matchA.points || 0);
              h2h.bPoints += (matchB.points || 0);
              if (matchA.points > matchB.points) h2h.aWins++;
              else if (matchB.points > matchA.points) h2h.bWins++;
            }
          }
        }

        if (scanIdRef.current !== scanId) return;

        if (games.length > 0) {
          const blowout = games.reduce((prev, curr) => (prev.diff > curr.diff) ? prev : curr, games[0]);
          const shave = games.reduce((prev, curr) => (prev.diff < curr.diff) ? prev : curr, games[0]);
          setStats({ ...h2h, blowout, shave });
        } else {
          setStats({ aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0, blowout: null, shave: null });
        }
        setHasScanned(true);
      } catch (err) {
        console.error("Rivalry scan failed:", err);
        if (scanIdRef.current !== scanId) return;
        setStats({ aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0, blowout: null, shave: null });
        setScanError("Sleeper rivalry data could not be loaded. Please try again later.");
        setHasScanned(true);
      } finally {
        if (scanIdRef.current === scanId) setLoading(false);
      }
    }

    scanHistory();
  }, [playerA, playerB]);

  if (!mounted) return null;

  const managerA = MANAGER_MAP[playerA];
  const managerB = MANAGER_MAP[playerB];
  const aWinPct = stats.totalGames > 0 ? (stats.aWins / stats.totalGames) * 100 : 50;
  const activeTheme = mounted ? theme : undefined;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-32 selection:bg-red-600">
      
      {/* NAVIGATION BAR - Consistent Header */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/league-info" className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all">
            <Home size={18} />
          </Link>
          
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${activeTheme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}><Sun size={14} /></button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${activeTheme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Moon size={14} /></button>
            <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-all ${activeTheme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Monitor size={14} /></button>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
           <Swords className="text-red-600 hidden sm:block" size={20} />
           <span className="text-xs font-black uppercase italic tracking-tighter">Rivalry Hub</span>
        </div>
      </nav>

      <header className="px-6 py-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg text-red-600">
             <Swords size={28} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Rivalry <span className="text-red-600">Hub</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Head-To-Head History & Rivalries</p>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 mb-20">
          <ManagerProfile id={playerA} manager={managerA} setPlayer={setPlayerA} hasLead={stats.aWins > stats.bWins} side="left" />
          <div className="text-5xl font-black italic opacity-10 select-none">VS</div>
          <ManagerProfile id={playerB} manager={managerB} setPlayer={setPlayerB} hasLead={stats.bWins > stats.aWins} side="right" />
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 animate-pulse">
            <Loader2 className="animate-spin text-red-600 mb-4" size={48} />
            <p className="font-black uppercase tracking-widest text-[10px] opacity-40">Scanning archives...</p>
          </div>
        ) : scanError ? (
          <div className="mx-auto max-w-xl rounded-[2rem] border border-red-600/20 bg-red-600/10 px-6 py-10 text-center text-red-700 dark:text-red-300">
            <Swords className="mx-auto mb-4 text-red-600" size={36} />
            <p className="font-black uppercase italic text-xs">{scanError}</p>
          </div>
        ) : !playerA || !playerB ? (
          <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-black/10 bg-black/5 px-6 py-10 text-center dark:border-white/10 dark:bg-white/5">
            <Swords className="mx-auto mb-4 text-red-600 opacity-50" size={36} />
            <p className="font-black uppercase italic text-xs opacity-50">Select two managers to scan their rivalry history.</p>
          </div>
        ) : hasScanned && stats.totalGames === 0 ? (
          <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-black/10 bg-black/5 px-6 py-10 text-center dark:border-white/10 dark:bg-white/5">
            <Swords className="mx-auto mb-4 text-red-600 opacity-50" size={36} />
            <p className="font-black uppercase italic text-xs opacity-50">
              No head-to-head matchups found for {managerA?.name} and {managerB?.name}.
            </p>
          </div>
        ) : stats.totalGames > 0 && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Stat Bar and Numbers */}
            <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] p-6 sm:p-10 border border-black/5 dark:border-white/10 shadow-2xl relative overflow-hidden">
              <div className="h-5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden flex border border-black/5 dark:border-white/5 shadow-inner">
                <div className="h-full bg-red-600 transition-all duration-1000 ease-out" style={{ width: `${aWinPct}%` }} />
                <div className="h-full bg-blue-600 transition-all duration-1000 ease-out" style={{ width: `${100 - aWinPct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-4 sm:gap-12 text-center mt-10 sm:mt-12">
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-2 flex items-center justify-center gap-2">
                    {managerA.name} Wins {stats.aWins > stats.bWins && <Trophy size={12} className="text-yellow-500" />}
                  </p>
                  <h4 className="text-5xl sm:text-7xl font-black italic">{stats.aWins}</h4>
                  <p className="text-xs font-black mt-4 text-red-600 uppercase italic">Avg: {(stats.aPoints / stats.totalGames).toFixed(1)} PPG</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-2 flex items-center justify-center gap-2">
                    {managerB.name} Wins {stats.bWins > stats.aWins && <Trophy size={12} className="text-yellow-500" />}
                  </p>
                  <h4 className="text-5xl sm:text-7xl font-black italic">{stats.bWins}</h4>
                  <p className="text-xs font-black mt-4 text-blue-600 uppercase italic">Avg: {(stats.bPoints / stats.totalGames).toFixed(1)} PPG</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <button onClick={() => setSelectedMatch(stats.blowout)} className="group bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-lg text-center hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-2"><TrendingUp className="inline w-3 h-3 text-red-600 mr-2" /> Biggest Blowout</p>
                  <p className="text-4xl font-black italic tracking-tighter">± {stats.blowout?.diff.toFixed(1)} Pts</p>
               </button>
               <button onClick={() => setSelectedMatch(stats.shave)} className="group bg-black/5 dark:bg-white/5 p-8 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-lg text-center hover:bg-black/10 dark:hover:bg-white/10 transition-all">
                  <p className="text-[10px] font-black uppercase opacity-40 tracking-widest mb-2"><TrendingDown className="inline w-3 h-3 text-blue-600 mr-2" /> Closest Shave</p>
                  <p className="text-4xl font-black italic tracking-tighter">± {stats.shave?.diff.toFixed(1)} Pts</p>
               </button>
            </div>
          </div>
        )}
      </main>

      {/* MATCH MODAL */}
      {selectedMatch && managerA && managerB && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6" onClick={() => setSelectedMatch(null)}>
          <div className="bg-white dark:bg-[#1a1a1a] rounded-[2rem] sm:rounded-[3rem] w-full max-w-lg p-6 sm:p-10 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedMatch(null)} className="absolute top-8 right-8 opacity-40 hover:opacity-100 hover:text-red-600 transition-all"><X /></button>
            <h2 className="text-xl font-black italic uppercase mb-8 border-b border-black/5 dark:border-white/10 pb-4 text-center flex items-center justify-center gap-3 tracking-tighter">
                <Calendar className="w-5 h-5 opacity-40" /> {selectedMatch.year} Week {selectedMatch.week}
            </h2>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-red-600 relative bg-black/20">
                            <Image src={managerA.image} alt={managerA.name} fill className="object-cover" unoptimized />
                        </div>
                        <span className={`text-xl font-black uppercase italic tracking-tighter ${selectedMatch.a.points > selectedMatch.b.points ? 'text-red-600' : 'opacity-40'}`}>
                          {managerA.name}
                        </span>
                    </div>
                    <span className="text-3xl font-black italic tracking-tighter">{selectedMatch.a.points.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-600 relative bg-black/20">
                            <Image src={managerB.image} alt={managerB.name} fill className="object-cover" unoptimized />
                        </div>
                        <span className={`text-xl font-black uppercase italic tracking-tighter ${selectedMatch.b.points > selectedMatch.a.points ? 'text-blue-600' : 'opacity-40'}`}>
                          {managerB.name}
                        </span>
                    </div>
                    <span className="text-3xl font-black italic tracking-tighter">{selectedMatch.b.points.toFixed(2)}</span>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerProfile({ manager, id, setPlayer, hasLead, side }: any) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className={`w-32 h-32 sm:w-44 sm:h-44 rounded-full border-4 shadow-2xl overflow-hidden relative transition-all duration-500 ${hasLead ? (side === 'left' ? 'border-red-600 scale-105' : 'border-blue-600 scale-105') : 'border-black/5 dark:border-white/10'}`}>
        {manager?.image ? (
            <Image src={manager.image} alt={manager.name} fill className="object-cover" unoptimized />
        ) : (
            <div className="w-full h-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-black/20 dark:text-white/20 font-black text-2xl">?</div>
        )}
        {hasLead && (
            <div className={`absolute -top-1 -right-1 p-2 rounded-full shadow-lg border-2 border-white dark:border-[#0a0a0a] ${side === 'left' ? 'bg-red-600' : 'bg-blue-600'}`}>
                <Trophy className="w-4 h-4 text-white" />
            </div>
        )}
      </div>
      <div className="text-center">
        <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-4 leading-none flex items-center justify-center gap-2">
            {manager?.name || "Select Opponent"}
            {hasLead && <span className="text-2xl not-italic">💪</span>}
        </h3>
        <select value={id} onChange={(e) => setPlayer(e.target.value)} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 p-4 rounded-2xl font-black uppercase italic text-[10px] outline-none cursor-pointer hover:border-red-600 transition-all shadow-sm">
          <option value="">Choose Manager</option>
          {Object.entries(MANAGER_MAP).map(([uid, info]) => <option key={uid} value={uid}>{info.name}</option>)}
        </select>
      </div>
    </div>
  );
}
