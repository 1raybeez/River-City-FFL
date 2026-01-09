'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, Loader2, Swords, X, Calendar, 
  TrendingUp, TrendingDown, Trophy
} from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';

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
  "73400761740312576": { name: "Doug Fordham", image: "/managers/Doug.jpg" },
  "341412060426436608": { name: "Jordan Maslyn", image: "/managers/Jordan.jpg" },
  "469199353672626176": { name: "Landon Elliott", image: "/managers/Landon.png" },
  "342828350391230464": { name: "Ray Long", image: "/managers/Ray.png" },
  "356621920969555968": { name: "Jeffrey Hudgins", image: "/managers/Jeffrey.png" },
  "342831451382841344": { name: "Travis Miller", image: "/managers/Travis.png" },
  "342838548870762496": { name: "Wade Cameron", image: "/managers/Wade.png" },
  "342849293037608960": { name: "Tommy Moore", image: "/managers/Tommy.png" },
  "342850391018356736": { name: "JD Dowling", image: "/managers/JD.png" },
  "343129212162523136": { name: "Brian Stevens", image: "/managers/Brian.png" },
  "466663208728391680": { name: "David Besedich", image: "/managers/Dave.png" },
  "583513420586848256": { name: "Aaron Dogg", image: "/managers/Aaron.png" },
  "864186418971418624": { name: "Rashad Gresham", image: "/managers/Rashad.png" },
  "1260048448384667648": { name: "Stan Schoppe", image: "/managers/Stan.jpg" }
};

export default function RivalryHub() {
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [stats, setStats] = useState<any>({
    aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0,
    blowout: null, shave: null
  });

  const scanHistory = async () => {
    if (!playerA || !playerB) return;
    setLoading(true);
    let h2h = { aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0 };
    let games: any[] = [];

    for (const season of LEAGUE_HISTORY) {
      try {
        const rosterRes = await fetch(`https://api.sleeper.app/v1/league/${season.id}/rosters`);
        const rosters = await rosterRes.json();
        const ridA = rosters.find((r: any) => r.owner_id === playerA)?.roster_id;
        const ridB = rosters.find((r: any) => r.owner_id === playerB)?.roster_id;
        if (!ridA || !ridB) continue;

        for (let w = 1; w <= 17; w++) {
          const mRes = await fetch(`https://api.sleeper.app/v1/league/${season.id}/matchups/${w}`);
          const matchups = await mRes.json();
          const matchA = matchups.find((m: any) => m.roster_id === ridA);
          const matchB = matchups.find((m: any) => m.roster_id === ridB);

          if (matchA?.matchup_id === matchB?.matchup_id && matchA && matchB && matchA.points !== null) {
            const diff = Math.abs(matchA.points - matchB.points);
            games.push({ year: season.year, week: w, a: matchA, b: matchB, diff });
            h2h.totalGames++;
            h2h.aPoints += (matchA.points || 0);
            h2h.bPoints += (matchB.points || 0);
            if (matchA.points > matchB.points) h2h.aWins++;
            else if (matchB.points > matchA.points) h2h.bWins++;
          }
        }
      } catch (err) { console.error(err); }
    }

    const blowout = games.reduce((prev, curr) => (prev.diff > curr.diff) ? prev : curr, games[0]);
    const shave = games.reduce((prev, curr) => (prev.diff < curr.diff) ? prev : curr, games[0]);

    setStats({ ...h2h, blowout, shave });
    setLoading(false);
  };

  useEffect(() => { scanHistory(); }, [playerA, playerB]);

  const managerA = MANAGER_MAP[playerA];
  const managerB = MANAGER_MAP[playerB];
  const aWinPct = stats.totalGames > 0 ? (stats.aWins / stats.totalGames) * 100 : 50;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] transition-colors duration-300 font-sans pb-32">
      <header className="bg-white dark:bg-[#1e1e1e] border-b border-gray-200 dark:border-white/5 pb-8 pt-4 sticky top-0 z-50 shadow-sm text-center text-gray-900 dark:text-white">
        <Link href="/league-info" className="absolute top-4 left-4 flex items-center gap-2 text-gray-500 hover:text-orange-600 transition-colors font-bold text-xs uppercase tracking-tight">
          <ArrowLeft className="w-4 h-4" /> Back to Hub
        </Link>
        <div className="absolute top-4 right-4"><ModeToggle /></div>
        <h1 className="mt-2 text-3xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 italic">
          <span className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl text-orange-600 dark:text-orange-400"><Swords className="w-8 h-8" /></span>
          Rivalry Hub
        </h1>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 mb-16">
          <ManagerProfile id={playerA} manager={managerA} setPlayer={setPlayerA} hasLead={stats.aWins > stats.bWins} />
          <div className="flex flex-col items-center"><span className="text-4xl font-black italic text-gray-300 dark:text-white/10 select-none">VS</span></div>
          <ManagerProfile id={playerB} manager={managerB} setPlayer={setPlayerB} hasLead={stats.bWins > stats.aWins} />
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-20 opacity-50">
            <Loader2 className="animate-spin text-orange-600 mb-4" size={48} />
            <p className="font-black uppercase tracking-widest text-[10px] text-gray-500">Scanning History...</p>
          </div>
        ) : stats.totalGames > 0 && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="bg-white dark:bg-[#1e1e1e] rounded-[2.5rem] p-10 shadow-xl border border-gray-100 dark:border-white/5">
              <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden flex border border-gray-200 dark:border-white/5 shadow-inner">
                <div className="h-full bg-orange-600 transition-all duration-1000" style={{ width: `${aWinPct}%` }} />
                <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${100 - aWinPct}%` }} />
              </div>
              <div className="grid grid-cols-2 gap-12 text-center mt-12 text-gray-900 dark:text-white">
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center justify-center gap-1">
                    H2H Wins {stats.aWins > stats.bWins && <span className="text-sm">💪</span>}
                  </p>
                  <h4 className="text-6xl font-black italic">{stats.aWins}</h4>
                  <p className="text-xs font-bold mt-4 text-orange-600 uppercase tracking-tighter">Avg: {(stats.aPoints / stats.totalGames).toFixed(1)} PPG</p>
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2 flex items-center justify-center gap-1">
                    H2H Wins {stats.bWins > stats.aWins && <span className="text-sm">💪</span>}
                  </p>
                  <h4 className="text-6xl font-black italic">{stats.bWins}</h4>
                  <p className="text-xs font-bold mt-4 text-blue-600 uppercase tracking-tighter">Avg: {(stats.bPoints / stats.totalGames).toFixed(1)} PPG</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <button onClick={() => setSelectedMatch(stats.blowout)} className="group bg-white dark:bg-[#1e1e1e] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-md text-center hover:scale-[1.02] transition-all text-gray-900 dark:text-white">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2"><TrendingUp className="inline w-3 h-3 text-red-500 mr-2" /> Biggest Blowout</p>
                  <p className="text-3xl font-black italic">± {stats.blowout?.diff.toFixed(1)} Pts</p>
               </button>
               <button onClick={() => setSelectedMatch(stats.shave)} className="group bg-white dark:bg-[#1e1e1e] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-md text-center hover:scale-[1.02] transition-all text-gray-900 dark:text-white">
                  <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest mb-2"><TrendingDown className="inline w-3 h-3 text-emerald-500 mr-2" /> Closest Shave</p>
                  <p className="text-3xl font-black italic">± {stats.shave?.diff.toFixed(1)} Pts</p>
               </button>
            </div>
          </div>
        )}
      </main>

      {/* MATCH MODAL */}
      {selectedMatch && managerA && managerB && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setSelectedMatch(null)}>
          <div className="bg-white dark:bg-[#1e1e1e] rounded-[3rem] w-full max-w-lg p-10 relative shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedMatch(null)} className="absolute top-8 right-8 text-gray-400 hover:text-orange-600 transition-colors"><X /></button>
            <h2 className="text-xl font-black italic uppercase mb-8 border-b dark:border-white/10 pb-4 text-center text-gray-900 dark:text-white flex items-center justify-center gap-2">
                <Calendar className="w-5 h-5" /> {selectedMatch.year} Week {selectedMatch.week}
            </h2>
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-orange-500 shrink-0 relative">
                            <Image src={managerA.image} alt={managerA.name} fill className="object-cover" unoptimized />
                        </div>
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                          <span className={`text-lg font-black uppercase tracking-tighter ${selectedMatch.a.points > selectedMatch.b.points ? 'text-orange-600' : 'text-gray-400'}`}>
                            {managerA.name}
                          </span>
                          {selectedMatch.a.points > selectedMatch.b.points && <span className="text-xl">💪</span>}
                        </div>
                    </div>
                    <span className="text-2xl font-black italic text-gray-900 dark:text-white">{selectedMatch.a.points.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-blue-500 shrink-0 relative">
                            <Image src={managerB.image} alt={managerB.name} fill className="object-cover" unoptimized />
                        </div>
                        <div className="flex items-center gap-2 text-gray-900 dark:text-white">
                          <span className={`text-lg font-black uppercase tracking-tighter ${selectedMatch.b.points > selectedMatch.a.points ? 'text-blue-600' : 'text-gray-400'}`}>
                            {managerB.name}
                          </span>
                          {selectedMatch.b.points > selectedMatch.a.points && <span className="text-xl">💪</span>}
                        </div>
                    </div>
                    <span className="text-2xl font-black italic text-gray-900 dark:text-white">{selectedMatch.b.points.toFixed(2)}</span>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ManagerProfile({ manager, id, setPlayer, hasLead }: any) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 shadow-2xl overflow-hidden relative ${hasLead ? 'border-orange-500' : 'border-white dark:border-white/10'}`}>
        {manager?.image ? (
            <Image src={manager.image} alt={manager.name} fill className="object-cover" unoptimized />
        ) : (
            <div className="w-full h-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-300 font-black">?</div>
        )}
        {hasLead && (
            <div className="absolute -top-1 -right-1 bg-orange-600 text-white p-1.5 rounded-full shadow-lg">
                <Trophy className="w-4 h-4" />
            </div>
        )}
      </div>
      <div className="text-center text-gray-900 dark:text-white">
        {/* BICEP ICON ADDED HERE NEXT TO NAME */}
        <h3 className="text-lg font-black italic uppercase tracking-tighter mb-4 leading-none flex items-center justify-center gap-2">
            {manager?.name || "Select Manager"}
            {hasLead && <span className="text-xl not-italic">💪</span>}
        </h3>
        <select value={id} onChange={(e) => setPlayer(e.target.value)} className="bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 p-3 rounded-xl font-black uppercase italic text-[9px] outline-none cursor-pointer text-gray-500 hover:border-orange-500 transition-colors shadow-sm">
          <option value="">Choose Manager</option>
          {Object.entries(MANAGER_MAP).map(([uid, info]) => <option key={uid} value={uid}>{info.name}</option>)}
        </select>
      </div>
    </div>
  );
}