'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, Trophy, Loader2, Crown, TrendingUp, Zap, ChevronDown, ChevronUp,
  ArrowDown, History, Archive
} from 'lucide-react';

// --- CONFIGURATION ---
const COMMISH_ID = "342828350391230464"; 
const START_YEAR = 2018;
const MIN_SUPPORTED_CURRENT_YEAR = 2026;

const getLatestArchiveYear = () => Math.max(new Date().getFullYear(), MIN_SUPPORTED_CURRENT_YEAR);
const getArchiveYears = () => {
  const latestYear = getLatestArchiveYear();
  return Array.from({ length: latestYear - START_YEAR + 1 }, (_, i) => latestYear - i);
};

// --- REAL NAME MAPPING ---
const REAL_NAMES: Record<string, string> = {
  "73400761740312576": "Doug Fordham",
  "341412060426436608": "Jordan Maslyn",
  "469199353672626176": "Landon Elliott",
  "342828350391230464": "Ray Long",
  "356621920969555968": "Jeffrey Hudgins",
  "342831451382841344": "Travis Miller",
  "342838548870762496": "Wade Cameron",
  "342849293037608960": "Tommy Moore",
  "342850391018356736": "JD Dowling",
  "343129212162523136": "Brian Stevens",
  "466663208728391680": "David Besedich",
  "583513420586848256": "Aaron Dogg",
  "864186418971418624": "Rashad Gresham",
  "1260048448384667648": "Stan Schoppe",
  "556676922517524480": "Adam Lind",
  "470428278931320832": "Billy Biddle",
  "345934777502699520": "Chris Barras",
  "98907192333582336": "Ricky Taylor",
  "342831898403377152": "Patrick Leahey"
};

// --- TYPES ---
interface ManagerStats {
  id: string;
  realName: string;
  teamName: string;
  avatar: string | null;
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fpts_against: number;
  ppts: number;
  seasons: number;
}

interface SeasonRecord {
    id: string;
    realName: string;
    teamName: string;
    avatar: string | null;
    year: number;
    fpts: number;
}

const LeaderboardCard = ({ id, title, icon: Icon, data, valueKey, label, colorClass, expandedCard, setExpandedCard }: any) => {
    const isExpanded = expandedCard === id;
    const displayData = isExpanded ? data : data.slice(0, 5);

    return (
      <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 overflow-hidden shadow-xl flex flex-col h-full transition-all">
        <div className={`p-6 ${colorClass} bg-opacity-10 dark:bg-opacity-20 flex items-center justify-between border-b border-black/5 dark:border-white/10`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${colorClass} text-white shadow-lg`}>
                <Icon size={20} />
            </div>
            <h3 className="font-black text-black dark:text-white uppercase italic tracking-tighter text-sm sm:text-base">{title}</h3>
          </div>
        </div>
        
        <div className="divide-y divide-black/5 dark:divide-white/5 flex-grow">
          {displayData.map((manager: any, i: number) => (
            <div key={`${manager.id}-${manager.year || 'all'}`} className="p-4 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-3 overflow-hidden">
                 <span className={`font-black italic text-sm w-5 text-center shrink-0 ${i === 0 ? 'text-yellow-500' : 'opacity-20'}`}>{i + 1}</span>
                 <div className="w-10 h-10 rounded-full bg-black/20 overflow-hidden relative border border-black/10 dark:border-white/10 shrink-0">
                    {manager.avatar ? (
                        <Image src={`https://sleepercdn.com/avatars/thumbs/${manager.avatar}`} alt={manager.teamName} fill className="object-cover" unoptimized />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-black text-xs opacity-30">{manager.realName.charAt(0)}</div>
                    )}
                 </div>
                 <div className="flex flex-col min-w-0">
                    <span className="font-black text-black dark:text-white text-xs sm:text-sm leading-tight uppercase italic truncate">{manager.realName}</span>
                    <div className="flex items-center gap-1">
                        <span className="text-[10px] opacity-40 uppercase truncate font-bold">{manager.teamName}</span>
                        {manager.year && <span className="text-[8px] px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 font-black shrink-0">{manager.year}</span>}
                    </div>
                 </div>
              </div>
              <div className="text-right shrink-0 ml-2">
                 <span className="block font-black text-base sm:text-lg italic leading-none">{valueKey(manager)}</span>
                 <span className="text-[8px] opacity-30 uppercase font-black tracking-widest">{label}</span>
              </div>
            </div>
          ))}
        </div>

        <button 
            onClick={() => setExpandedCard(isExpanded ? null : id)}
            className="w-full py-4 bg-black/5 dark:bg-white/5 text-[10px] font-black opacity-40 hover:opacity-100 uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 border-t border-black/5 dark:border-white/10 italic"
        >
            {isExpanded ? (
                <>Collapse <ChevronUp size={14} /></>
            ) : (
                <>View Rankings <ChevronDown size={14} /></>
            )}
        </button>
      </div>
    );
};

export default function ArchivesPage() {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<ManagerStats[]>([]);
  const [seasonRecords, setSeasonRecords] = useState<SeasonRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [archiveMessage, setArchiveMessage] = useState("");
  const [archiveNotice, setArchiveNotice] = useState("");
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => { setMounted(true); }, []);
  const archiveYears = useMemo(() => getArchiveYears(), []);
  const latestArchiveYear = archiveYears[0] ?? MIN_SUPPORTED_CURRENT_YEAR;

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true);
      setArchiveError(null);
      setArchiveMessage("");
      setArchiveNotice("");
      const aggregated: Record<string, ManagerStats> = {};
      const allSeasonsList: SeasonRecord[] = [];
      const masterUserMap: Record<string, { name: string, avatar: string }> = {};
      const yearsWithoutLeague: number[] = [];
      let foundLeague = false;
      let foundHistoricalData = false;
      
      try {
        for (const year of archiveYears) {
            setProgress(`${year} Data Sync...`);
            
            const leagueRes = await fetch(`https://api.sleeper.app/v1/user/${COMMISH_ID}/leagues/nfl/${year}`);
            if (!leagueRes.ok) throw new Error(`Sleeper leagues request failed for ${year}`);

            const leagues = await leagueRes.json();
            const myLeague = leagues.find((l: any) => l.name?.toLowerCase().includes("river city"));

            if (!myLeague) {
                yearsWithoutLeague.push(year);
                continue;
            }

            foundLeague = true;

            const [rostersRes, usersRes] = await Promise.all([
                fetch(`https://api.sleeper.app/v1/league/${myLeague.league_id}/rosters`),
                fetch(`https://api.sleeper.app/v1/league/${myLeague.league_id}/users`)
            ]);

            if (!rostersRes.ok || !usersRes.ok) throw new Error(`Sleeper archive request failed for ${year}`);

            const rosters = await rostersRes.json();
            const users = await usersRes.json();

            users.forEach((u: any) => {
                if (!masterUserMap[u.user_id]) {
                    masterUserMap[u.user_id] = {
                        name: u.metadata?.team_name || u.display_name,
                        avatar: u.avatar
                    };
                }
            });

            rosters.forEach((r: any) => {
                const uid = r.owner_id;
                if (!uid) return;
                foundHistoricalData = true;

                const userProfile = masterUserMap[uid] || { name: "Unknown", avatar: null };
                const teamName = userProfile.name;
                const realName = REAL_NAMES[uid] || teamName; 

                if (!aggregated[uid]) {
                    aggregated[uid] = {
                        id: uid, realName, teamName, avatar: userProfile.avatar,
                        wins: 0, losses: 0, ties: 0, fpts: 0, fpts_against: 0, ppts: 0, seasons: 0
                    };
                } else {
                    if (userProfile.avatar) aggregated[uid].avatar = userProfile.avatar;
                    if (teamName !== "Unknown") aggregated[uid].teamName = teamName;
                }

                aggregated[uid].wins += r.settings.wins;
                aggregated[uid].losses += r.settings.losses;
                aggregated[uid].ties += r.settings.ties;
                aggregated[uid].fpts += r.settings.fpts + (r.settings.fpts_decimal || 0) / 100;
                aggregated[uid].fpts_against += r.settings.fpts_against + (r.settings.fpts_against_decimal || 0) / 100;
                aggregated[uid].ppts += r.settings.ppts + (r.settings.ppts_decimal || 0) / 100;
                aggregated[uid].seasons += 1;
                
                if (r.settings.fpts > 0) {
                    allSeasonsList.push({
                        id: uid,
                        realName: realName,
                        teamName: teamName,
                        avatar: userProfile.avatar,
                        year: year,
                        fpts: r.settings.fpts + (r.settings.fpts_decimal || 0) / 100
                    });
                }
            });
        }

        setStats(Object.values(aggregated));
        setSeasonRecords(allSeasonsList);

        if (!foundLeague) {
          setArchiveMessage("No archive data available.");
        } else if (yearsWithoutLeague.includes(latestArchiveYear)) {
          setArchiveNotice(`No league found for selected year ${latestArchiveYear}.`);
        } else if (!foundHistoricalData) {
          setArchiveMessage("No historical data available yet.");
        }
      } catch (error) {
        console.error("Archive Fetch Error:", error);
        setStats([]);
        setSeasonRecords([]);
        setArchiveNotice("");
        setArchiveError("Sleeper archive data could not be loaded. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [archiveYears, latestArchiveYear]);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-600">
      
      {/* NAVIGATION BAR - Consistent with Hub Style */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link 
            href="/league-info" 
            className="inline-flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-[10px] font-black uppercase italic tracking-tight transition-all hover:text-orange-600 dark:bg-white/5 border border-black/10 dark:border-white/10"
            title="Back to League Info Hub"
          >
            <ArrowLeft size={16} />
            Back to League Info Hub
          </Link>
        </div>
        <div className="flex items-center gap-2">
           <Archive className="text-orange-600 hidden sm:block" size={20} />
           <span className="text-xs font-black uppercase italic tracking-tighter">Archives</span>
        </div>
      </nav>

      {/* HEADER */}
      <header className="px-6 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg text-orange-600">
             <Archive size={28} />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            League <span className="text-orange-600">Archives</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Sleeper Intelligence Data ({START_YEAR}-{latestArchiveYear})</p>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <Loader2 className="w-12 h-12 animate-spin text-orange-600 mb-6" />
              <p className="font-black opacity-40 uppercase tracking-widest text-[10px] italic">{progress}</p>
            </div>
        ) : archiveError ? (
            <div className="mx-auto max-w-xl rounded-[2rem] border border-red-600/20 bg-red-600/10 px-6 py-10 text-center text-red-700 dark:text-red-300">
              <Archive className="mx-auto mb-4 text-red-600" size={36} />
              <p className="font-black uppercase italic text-xs">{archiveError}</p>
            </div>
        ) : archiveMessage ? (
            <div className="mx-auto max-w-xl rounded-[2rem] border border-dashed border-black/10 bg-black/5 px-6 py-10 text-center dark:border-white/10 dark:bg-white/5">
              <Archive className="mx-auto mb-4 text-orange-600 opacity-50" size={36} />
              <p className="font-black uppercase italic text-xs opacity-50">{archiveMessage}</p>
            </div>
        ) : (
          <>
            {archiveNotice && (
              <div className="mb-8 rounded-2xl border border-orange-600/20 bg-orange-600/10 px-5 py-4 text-center text-xs font-black uppercase italic tracking-widest text-orange-700 dark:text-orange-300">
                {archiveNotice}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
                
                <LeaderboardCard 
                    id="wins" title="All-Time Wins" icon={Trophy} colorClass="bg-yellow-500"
                    data={[...stats].sort((a,b) => b.wins - a.wins)}
                    valueKey={(m: any) => m.wins} label="Wins"
                    expandedCard={expandedCard} setExpandedCard={setExpandedCard}
                />

                <LeaderboardCard 
                    id="points" title="Career Points" icon={TrendingUp} colorClass="bg-green-500"
                    data={[...stats].sort((a,b) => b.fpts - a.fpts)}
                    valueKey={(m: any) => m.fpts.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    label="Points"
                    expandedCard={expandedCard} setExpandedCard={setExpandedCard}
                />

                <LeaderboardCard 
                    id="best_season" title="Best Season" icon={History} colorClass="bg-orange-500"
                    data={[...seasonRecords].sort((a,b) => b.fpts - a.fpts)}
                    valueKey={(m: any) => m.fpts.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    label="Points"
                    expandedCard={expandedCard} setExpandedCard={setExpandedCard}
                />

                <LeaderboardCard 
                    id="worst_season" title="Worst Season" icon={ArrowDown} colorClass="bg-red-500"
                    data={[...seasonRecords].filter(m => m.fpts > 500).sort((a,b) => a.fpts - b.fpts)} 
                    valueKey={(m: any) => m.fpts.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    label="Points"
                    expandedCard={expandedCard} setExpandedCard={setExpandedCard}
                />

                <LeaderboardCard 
                    id="winpct" title="Winning %" icon={Crown} colorClass="bg-purple-500"
                    data={[...stats].filter(s => s.seasons >= 2).sort((a,b) => {
                        const pctA = a.wins / (a.wins + a.losses + a.ties);
                        const pctB = b.wins / (b.wins + b.losses + b.ties);
                        return pctB - pctA;
                    })}
                    valueKey={(m: any) => ((m.wins / (m.wins + m.losses + m.ties)) * 100).toFixed(1) + "%"}
                    label="Win Pct"
                    expandedCard={expandedCard} setExpandedCard={setExpandedCard}
                />

                <LeaderboardCard 
                    id="efficiency" title="Lineup Start %" icon={Zap} colorClass="bg-blue-500"
                    data={[...stats].filter(s => s.ppts > 0).sort((a,b) => (b.fpts/b.ppts) - (a.fpts/a.ppts))}
                    valueKey={(m: any) => ((m.fpts / m.ppts) * 100).toFixed(1) + "%"}
                    label="Efficiency"
                    expandedCard={expandedCard} setExpandedCard={setExpandedCard}
                />

            </div>
          </>
        )}
      </main>
    </div>
  );
}
