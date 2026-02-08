"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { 
  Trophy, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Home,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { 
  getMatchups, 
  getLeagueRosters, 
  getLeagueUsers, 
  getWinnersBracket, 
  getLosersBracket 
} from '@/lib/sleeper';

export default function MatchupsPage() {
  const [activeTab, setActiveTab] = useState<'regular' | 'playoffs'>('regular');
  const [week, setWeek] = useState(1);
  const [matchups, setMatchups] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [rosters, setRosters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [userData, rosterData, matchupData] = await Promise.all([
          getLeagueUsers(),
          getLeagueRosters(),
          getMatchups(week)
        ]);
        setUsers(userData);
        setRosters(rosterData);
        setMatchups(matchupData);
      } catch (error) {
        console.error("Error loading matchups:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [week]);

  if (!mounted) return null;

  const getTeam = (rosterId: number) => {
    const r = rosters.find(roster => roster.roster_id === rosterId);
    const u = users.find(user => user.user_id === r?.owner_id);
    return {
      name: u?.metadata?.team_name || u?.display_name || `Team ${rosterId}`,
      avatar: u?.avatar ? `https://sleepercdn.com/avatars/thumbs/${u.avatar}` : null
    };
  };

  const grouped = matchups.reduce((acc: any, m: any) => {
    if (!acc[m.matchup_id]) acc[m.matchup_id] = [];
    acc[m.matchup_id].push(m);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300">
      {/* NAVIGATION BAR */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          {/* HOME BUTTON */}
          <Link href="/" className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all">
            <Home size={18} />
          </Link>
          
          {/* THEME SWITCHER (Light, Dark, Auto) */}
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
            <button 
              onClick={() => setTheme('light')} 
              className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}
            >
              <Sun size={14} />
            </button>
            <button 
              onClick={() => setTheme('dark')} 
              className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}
            >
              <Moon size={14} />
            </button>
            <button 
              onClick={() => setTheme('system')} 
              className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}
            >
              <Monitor size={14} />
            </button>
          </div>
        </div>

        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
          <button 
            onClick={() => setActiveTab('regular')} 
            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${activeTab === 'regular' ? 'bg-red-600 text-white shadow-lg shadow-red-900/40' : 'opacity-40'}`}
          >
            Regular Season
          </button>
          <button 
            onClick={() => setActiveTab('playoffs')} 
            className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${activeTab === 'playoffs' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-900/40' : 'opacity-40'}`}
          >
            Playoffs
          </button>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-10 text-center">Matchup Center</h1>

        {activeTab === 'regular' ? (
          <>
            {/* WEEK SELECTOR */}
            <div className="flex items-center justify-between mb-10 bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/10 dark:border-white/10">
              <button 
                onClick={() => setWeek(Math.max(1, week - 1))} 
                className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-all"
              >
                <ChevronLeft />
              </button>
              <div className="text-center">
                <span className="block text-[10px] font-black opacity-50 uppercase tracking-widest">Sleeper Season 2026</span>
                <span className="text-2xl font-black italic">WEEK {week}</span>
              </div>
              <button 
                onClick={() => setWeek(Math.min(18, week + 1))} 
                className="p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-all"
              >
                <ChevronRight />
              </button>
            </div>

            {loading ? (
              <div className="text-center py-20 font-black uppercase italic animate-pulse opacity-50">Loading Scores...</div>
            ) : (
              <div className="grid gap-6">
                {Object.values(grouped).map((pair: any, idx: number) => (
                  <div key={idx} className="bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl p-6 flex items-center justify-between shadow-xl">
                    {/* Team 1 */}
                    <div className="flex flex-col items-center w-1/3 text-center">
                      <div className="relative">
                        <img 
                          src={getTeam(pair[0].roster_id).avatar || "/managers/default.png"} 
                          className="w-16 h-16 rounded-full border-2 border-red-600 mb-2 shadow-lg" 
                        />
                      </div>
                      <span className="text-[10px] font-black uppercase truncate w-full">{getTeam(pair[0].roster_id).name}</span>
                      <span className="text-2xl font-black text-red-600">{pair[0].points || "0.00"}</span>
                    </div>

                    <div className="text-4xl font-black italic opacity-5 pointer-events-none">VS</div>

                    {/* Team 2 */}
                    <div className="flex flex-col items-center w-1/3 text-center">
                      <div className="relative">
                        <img 
                          src={getTeam(pair[1].roster_id).avatar || "/managers/default.png"} 
                          className="w-16 h-16 rounded-full border-2 border-blue-600 mb-2 shadow-lg" 
                        />
                      </div>
                      <span className="text-[10px] font-black uppercase truncate w-full">{getTeam(pair[1].roster_id).name}</span>
                      <span className="text-2xl font-black text-blue-600">{pair[1].points || "0.00"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 border-2 border-dashed border-black/10 dark:border-white/10 rounded-3xl opacity-30">
            <Trophy size={48} className="mx-auto mb-4" />
            <p className="font-black uppercase italic">Playoff Bracket Retrieving...</p>
            <p className="text-xs font-bold mt-2">Connecting to Sleeper API...</p>
          </div>
        )}
      </main>
    </div>
  );
}