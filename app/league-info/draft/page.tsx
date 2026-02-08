'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Home, ChevronDown, Loader2, Sun, Moon, Monitor, Grid3X3
} from 'lucide-react';
import { useTheme } from "next-themes";

const COMMISH_ID = "342828350391230464"; 
const START_YEAR = 2018;
const CURRENT_YEAR = 2025;

export default function DraftBoardPage() {
  const [selectedYear, setSelectedYear] = useState<number>(CURRENT_YEAR);
  const [draftData, setDraftData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function fetchDraft() {
      setLoading(true);
      setDraftData(null); 
      try {
        const leagueRes = await fetch(`https://api.sleeper.app/v1/user/${COMMISH_ID}/leagues/nfl/${selectedYear}`);
        if (!leagueRes.ok) throw new Error('Failed to fetch leagues');
        const leagues = await leagueRes.json();
        const myLeague = leagues.find((l: any) => l.name.includes("River City"));
        if (!myLeague) { setDraftData(null); setLoading(false); return; }

        const draftId = myLeague.draft_id;
        const [picksRes, usersRes, draftInfoRes] = await Promise.all([
            fetch(`https://api.sleeper.app/v1/draft/${draftId}/picks`),
            fetch(`https://api.sleeper.app/v1/league/${myLeague.league_id}/users`),
            fetch(`https://api.sleeper.app/v1/draft/${draftId}`)
        ]);

        const picks = await picksRes.json();
        const users = await usersRes.json();
        const draftInfo = await draftInfoRes.json();

        const totalRounds = draftInfo.settings.rounds;
        const draftOrder = draftInfo.draft_order || {}; 
        const getUser = (id: string) => users.find((u: any) => u.user_id === id);

        let teams: any[] = [];
        if (Object.keys(draftOrder).length > 0) {
            const sortedUserIds = Object.keys(draftOrder).sort((a, b) => draftOrder[a] - draftOrder[b]);
            teams = sortedUserIds.map(userId => {
                const user = getUser(userId);
                const slot = draftOrder[userId];
                const teamPicks = picks.filter((p: any) => p.picked_by === userId);
                return {
                    id: userId,
                    slot: slot,
                    name: user?.metadata?.team_name || user?.display_name || `Team ${slot}`,
                    avatar: user?.avatar,
                    picks: teamPicks
                };
            });
        } 

        setDraftData({ teams, rounds: totalRounds, hasPicks: picks.length > 0 });
      } catch (err) { console.error(err); setDraftData(null); } finally { setLoading(false); }
    }
    fetchDraft();
  }, [selectedYear]);

  if (!mounted) return null;

  const getPositionColor = (pos: string) => {
    switch (pos) {
      case 'QB': return 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';
      case 'RB': return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100';
      case 'WR': return 'bg-sky-100 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100';
      case 'TE': return 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100';
      case 'K':  return 'bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100';
      case 'DEF': return 'bg-stone-200 dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100';
      default: return 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500';
    }
  };

  const getPlayerImage = (pick: any) => {
    if (pick.metadata.position === 'DEF') return `https://sleepercdn.com/images/team_logos/nfl/${pick.player_id.toLowerCase()}.png`;
    return `https://sleepercdn.com/content/nfl/players/${pick.player_id}.jpg`;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] transition-colors duration-300 font-sans pb-12 selection:bg-orange-500 text-black dark:text-white">
      
      {/* NAVIGATION BAR - Redirects to League Info */}
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
           <Grid3X3 className="text-orange-600 hidden sm:block" size={20} />
           <span className="text-xs font-black uppercase italic tracking-tighter">Draft Archives</span>
        </div>
      </nav>

      <header className="px-6 py-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 overflow-hidden relative shadow-lg">
                <Image src="/River City FFL Logo.JPG" alt="Logo" fill className="object-cover" priority unoptimized />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">Draft <span className="text-orange-600">Board</span></h1>
        </div>

        <div className="relative inline-block bg-black/5 dark:bg-white/5 rounded-full px-6 py-2 border border-black/5 dark:border-white/10">
            <select 
                value={selectedYear} 
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="appearance-none bg-transparent font-black uppercase italic text-xs pr-6 focus:outline-none cursor-pointer"
            >
                {Array.from({ length: CURRENT_YEAR - START_YEAR + 1 }, (_, i) => CURRENT_YEAR - i).map(year => (
                    <option key={year} value={year} className="text-black">{year} Season</option>
                ))}
            </select>
            <ChevronDown className="w-3 h-3 absolute right-4 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" />
        </div>
      </header>

      {/* DRAFT GRID */}
      <main className="w-full overflow-x-auto custom-scrollbar">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-32 opacity-50">
                <Loader2 className="w-10 h-10 animate-spin text-orange-600 mb-4" />
                <p className="font-black uppercase tracking-widest text-[10px] animate-pulse">Syncing Sleeper Data...</p>
            </div>
        ) : !draftData || !draftData.teams ? (
            <div className="text-center py-20 opacity-30 font-black uppercase italic text-xs">
                No draft record for {selectedYear}
            </div>
        ) : (
            <div className="p-6 inline-block min-w-full">
                <div className="flex gap-4">
                    {draftData.teams.map((team: any) => (
                        <div key={team.id} className="w-32 sm:w-40 shrink-0 flex flex-col gap-3">
                            
                            {/* TEAM HEADER */}
                            <div className="bg-black/5 dark:bg-white/5 p-3 rounded-2xl border-b-4 border-orange-600 text-center h-28 flex flex-col items-center justify-center relative shadow-md border border-black/5 dark:border-white/5">
                                <div className="absolute top-2 left-2 text-[8px] font-black opacity-20 uppercase tracking-tighter">#{team.slot}</div>
                                <div className="w-10 h-10 rounded-full bg-black/20 overflow-hidden relative mb-2 border border-black/10 dark:border-white/10">
                                    {team.avatar ? (
                                        <Image src={`https://sleepercdn.com/avatars/thumbs/${team.avatar}`} alt={team.name} fill className="object-cover" unoptimized />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold opacity-30">{team.name[0]}</div>
                                    )}
                                </div>
                                <h3 className="font-black text-[10px] leading-tight line-clamp-2 px-1 uppercase tracking-tighter italic">
                                    {team.name}
                                </h3>
                            </div>

                            {/* PICKS LIST */}
                            <div className="flex flex-col gap-2">
                                {team.picks.length > 0 ? (
                                    team.picks.map((pick: any) => (
                                        <div key={pick.pick_no} className={`relative rounded-2xl p-3 border shadow-sm transition-all hover:scale-[1.03] active:scale-95 ${getPositionColor(pick.metadata.position)}`}>
                                            <div className="absolute -top-1 -right-1 bg-black text-white text-[8px] font-black px-1.5 py-0.5 rounded-lg shadow-sm z-10 border border-white/10 uppercase italic">
                                                {pick.round}.{String(pick.draft_slot).padStart(2, '0')}
                                            </div>
                                            <div className="flex flex-col items-center text-center gap-1.5">
                                                <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-white/50 shadow-inner bg-black/10">
                                                    <Image 
                                                        src={getPlayerImage(pick)}
                                                        alt="P" fill unoptimized className="object-cover"
                                                        onError={(e: any) => { e.target.src = "https://sleepercdn.com/images/v2/icons/player_default.webp" }}
                                                    />
                                                </div>
                                                <div className="w-full">
                                                    <div className="text-[10px] font-black leading-none truncate uppercase tracking-tighter italic">
                                                        {pick.metadata.first_name[0]}. {pick.metadata.last_name}
                                                    </div>
                                                    <div className="text-[8px] font-black opacity-40 uppercase tracking-widest mt-1">
                                                        {pick.metadata.position} • {pick.metadata.team || 'FA'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="h-32 border-2 border-dashed border-black/5 dark:border-white/5 rounded-2xl flex items-center justify-center text-center p-4">
                                        <span className="text-[8px] opacity-20 font-black uppercase tracking-[0.2em]">
                                            {draftData.hasPicks ? "No Picks" : "Void"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(249, 115, 22, 0.3); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}