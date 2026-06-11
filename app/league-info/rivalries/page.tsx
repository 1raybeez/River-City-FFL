'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Home, Loader2, Swords, X, Calendar, 
  TrendingUp, TrendingDown, Trophy,
  ChevronDown, ChevronUp, Flame
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

type RivalryGame = {
  year: number;
  week: number;
  a: any;
  b: any;
  diff: number;
};

const getWinnerSide = (game: RivalryGame) => {
  if (game.a.points > game.b.points) return 'a';
  if (game.b.points > game.a.points) return 'b';
  return 'tie';
};

const getIntensityLabel = (totalGames: number, aWins: number, bWins: number) => {
  const recordGap = Math.abs(aWins - bWins);

  if (totalGames >= 10 && recordGap <= 2) return 'Blood Feud';
  if (totalGames >= 6 && recordGap <= 2) return 'Heated';
  if (totalGames >= 3 && recordGap <= 4) return 'Competitive';
  return 'Cold';
};

export default function RivalryHub() {
  const [mounted, setMounted] = useState(false);
  const [playerA, setPlayerA] = useState('');
  const [playerB, setPlayerB] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [showFullHistory, setShowFullHistory] = useState(false);
  const [matchupHistory, setMatchupHistory] = useState<RivalryGame[]>([]);
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
    setShowFullHistory(false);
    setScanError(null);
    setHasScanned(false);

    if (!playerA || !playerB) {
      setLoading(false);
      setMatchupHistory([]);
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
          setMatchupHistory(games);
        } else {
          setMatchupHistory([]);
          setStats({ aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0, blowout: null, shave: null });
        }
        setHasScanned(true);
      } catch (err) {
        console.error("Rivalry scan failed:", err);
        if (scanIdRef.current !== scanId) return;
        setMatchupHistory([]);
        setStats({ aWins: 0, bWins: 0, aPoints: 0, bPoints: 0, totalGames: 0, blowout: null, shave: null });
        setScanError("Sleeper rivalry data could not be loaded. Please try again later.");
        setHasScanned(true);
      } finally {
        if (scanIdRef.current === scanId) setLoading(false);
      }
    }

    scanHistory();
  }, [playerA, playerB]);

  const managerA = MANAGER_MAP[playerA];
  const managerB = MANAGER_MAP[playerB];
  const aWinPct = stats.totalGames > 0 ? (stats.aWins / stats.totalGames) * 100 : 50;
  const sortedHistory = useMemo(
    () => [...matchupHistory].sort((a, b) => b.year - a.year || b.week - a.week),
    [matchupHistory]
  );
  const lastFiveMeetings = sortedHistory.slice(0, 5);
  const lastMeeting = sortedHistory[0];
  const currentStreak = useMemo(() => {
    if (sortedHistory.length === 0 || !managerA || !managerB) return 'No current streak';

    const firstWinner = getWinnerSide(sortedHistory[0]);
    if (firstWinner === 'tie') return 'No current streak';

    const streakCount = sortedHistory.findIndex((game) => getWinnerSide(game) !== firstWinner);
    const count = streakCount === -1 ? sortedHistory.length : streakCount;
    const winnerName = firstWinner === 'a' ? managerA.name : managerB.name;
    return `${winnerName} has won ${count} straight.`;
  }, [managerA, managerB, sortedHistory]);
  const seriesLeader = stats.aWins === stats.bWins
    ? 'Series tied'
    : `${stats.aWins > stats.bWins ? managerA?.name : managerB?.name} leads ${Math.max(stats.aWins, stats.bWins)}-${Math.min(stats.aWins, stats.bWins)}`;
  const lastMeetingWinner = lastMeeting && managerA && managerB
    ? getWinnerSide(lastMeeting) === 'tie'
      ? 'Tie'
      : getWinnerSide(lastMeeting) === 'a'
        ? managerA.name
        : managerB.name
    : 'Unavailable';
  const rivalryIntensity = getIntensityLabel(stats.totalGames, stats.aWins, stats.bWins);

  const getGameWinnerName = (game: RivalryGame) => {
    const winner = getWinnerSide(game);
    if (winner === 'tie') return 'Tie';
    return winner === 'a' ? managerA?.name : managerB?.name;
  };

  const formatScore = (score: number) => score.toFixed(2);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-32 selection:bg-red-600">
      
      {/* NAVIGATION BAR - Consistent Header */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link href="/league-info" className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all">
            <Home size={18} />
          </Link>
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

            <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] p-6 sm:p-8 border border-black/5 dark:border-white/10 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Rivalry Summary</p>
                  <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">Tale of the Tape</h2>
                </div>
                <div className="inline-flex items-center gap-2 self-start rounded-full bg-red-600 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white shadow-lg">
                  <Flame size={14} /> {rivalryIntensity}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <SummaryStat label="All-Time Series" value={seriesLeader} />
                <SummaryStat label="Current Streak" value={currentStreak} />
                <SummaryStat label="Last Meeting Winner" value={lastMeetingWinner} />
                <SummaryStat label="Biggest Blowout" value={`${stats.blowout?.diff.toFixed(1)} pts`} />
                <SummaryStat label="Closest Matchup" value={`${stats.shave?.diff.toFixed(1)} pts`} />
                <SummaryStat label="Playoff Record" value="Playoff record unavailable" />
              </div>
            </div>

            <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] p-6 sm:p-8 border border-black/5 dark:border-white/10 shadow-xl">
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Recent Heat</p>
                <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter">Last 5 Meetings</h2>
              </div>
              <div className="space-y-3">
                {lastFiveMeetings.map((game) => (
                  <MatchupRow
                    key={`${game.year}-${game.week}-${game.a.roster_id}-${game.b.roster_id}`}
                    game={game}
                    managerA={managerA}
                    managerB={managerB}
                    winnerName={getGameWinnerName(game)}
                    formatScore={formatScore}
                    onSelect={() => setSelectedMatch(game)}
                  />
                ))}
              </div>
              <button
                onClick={() => setShowFullHistory(true)}
                className="mt-6 w-full rounded-full bg-red-600 px-5 py-3 text-[10px] font-black uppercase tracking-[0.25em] text-white shadow-lg shadow-red-900/20 transition-all hover:scale-[1.01] hover:bg-red-700"
              >
                View All Matchups
              </button>
            </div>

            <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-xl overflow-hidden">
              <button
                onClick={() => setShowFullHistory(prev => !prev)}
                className="w-full p-6 sm:p-8 flex items-center justify-between gap-4 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] opacity-40">Receipts</p>
                  <h2 className="text-2xl sm:text-4xl font-black uppercase italic tracking-tighter">Full Matchup History</h2>
                </div>
                {showFullHistory ? <ChevronUp className="shrink-0 opacity-40" /> : <ChevronDown className="shrink-0 opacity-40" />}
              </button>

              {showFullHistory && (
                <div className="px-6 sm:px-8 pb-8 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  {sortedHistory.map((game) => (
                    <MatchupRow
                      key={`full-${game.year}-${game.week}-${game.a.roster_id}-${game.b.roster_id}`}
                      game={game}
                      managerA={managerA}
                      managerB={managerB}
                      winnerName={getGameWinnerName(game)}
                      formatScore={formatScore}
                      onSelect={() => setSelectedMatch(game)}
                    />
                  ))}
                </div>
              )}
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

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/60 dark:bg-black/20 border border-black/5 dark:border-white/10 p-4">
      <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40 mb-2">{label}</p>
      <p className="text-sm sm:text-base font-black uppercase italic tracking-tight leading-tight">{value}</p>
    </div>
  );
}

function MatchupRow({ game, managerA, managerB, winnerName, formatScore, onSelect }: any) {
  return (
    <button
      onClick={onSelect}
      className="w-full rounded-2xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/20 p-4 text-left hover:border-red-600/30 hover:bg-red-600/5 transition-all"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.25em] opacity-40">
            {game.year} Week {game.week}
          </p>
          <p className="mt-1 text-xs sm:text-sm font-black uppercase italic">
            Winner: <span className="text-red-600">{winnerName}</span>
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 sm:items-center text-sm">
          <div className="font-black uppercase italic tracking-tight">
            {managerA?.name}: {formatScore(game.a.points)}
          </div>
          <div className="hidden sm:block text-[10px] font-black opacity-20">VS</div>
          <div className="font-black uppercase italic tracking-tight sm:text-right">
            {managerB?.name}: {formatScore(game.b.points)}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[9px] font-black uppercase tracking-[0.2em] opacity-30">
        Margin: {game.diff.toFixed(2)} pts
      </p>
    </button>
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
