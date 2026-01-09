'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Trophy, Users, BookOpen, Swords, ArrowLeft, RotateCw, 
  X, UserPlus, Medal, BarChart3 
} from 'lucide-react';
import { managers, retiredManagers } from '@/lib/managersData';
import { ModeToggle } from '@/components/ModeToggle';
import { getLeagueRosters, getLeagueUsers } from '@/lib/sleeper';

// --- LEAGUE HISTORY IDS FOR SCANNING ---
const LEAGUE_HISTORY_IDS = [
  "1312149033254416384", "1199749375539027968", "1072545817749331968",
  "997510104398315520", "784542934581256192", "677751457528762368",
  "530115541505298432", "466632190273253376", "342868033913540608"
];

// --- 1. MASTER HISTORY (Updated with 2025 Results) ---
const MASTER_HISTORY = [
  { year: 2025, type: 'champion', manager: 'Aaron Dogg' },
  { year: 2025, type: 'runner_up', manager: 'Travis Miller' },
  { year: 2025, type: 'third_place', manager: 'JD Dowling' },
  { year: 2025, type: 'toilet_bowl', manager: 'Ray Long' },
  { year: 2024, type: 'champion', manager: 'Jordan Maslyn' }, { year: 2024, type: 'runner_up', manager: 'Wade Cameron' }, { year: 2024, type: 'third_place', manager: 'Doug Fordham' }, { year: 2024, type: 'toilet_bowl', manager: 'Rashad Gresham' },
  { year: 2023, type: 'champion', manager: 'Tommy Moore' }, { year: 2023, type: 'runner_up', manager: 'Brian Stevens' }, { year: 2023, type: 'third_place', manager: 'Ray Long' }, { year: 2023, type: 'toilet_bowl', manager: 'Landon Elliott' },
  { year: 2022, type: 'champion', manager: 'Tommy Moore' }, { year: 2022, type: 'runner_up', manager: 'David Besedich' }, { year: 2022, type: 'third_place', manager: 'Brian Stevens' }, { year: 2022, type: 'toilet_bowl', manager: 'JD Dowling' },
  { year: 2021, type: 'champion', manager: 'David Besedich' }, { year: 2021, type: 'runner_up', manager: 'JD Dowling' }, { year: 2021, type: 'third_place', manager: 'Adam Lind' }, { year: 2021, type: 'toilet_bowl', manager: 'Jordan Maslyn' },
  { year: 2020, type: 'champion', manager: 'JD Dowling' }, { year: 2020, type: 'runner_up', manager: 'Landon Elliott' }, { year: 2020, type: 'third_place', manager: 'David Besedich' }, { year: 2020, type: 'toilet_bowl', manager: 'Tommy Moore' },
  { year: 2019, type: 'champion', manager: 'Wade Cameron' }, { year: 2019, type: 'runner_up', manager: 'Travis Miller' }, { year: 2019, type: 'third_place', manager: 'Brian Stevens' }, { year: 2019, type: 'toilet_bowl', manager: 'David Besedich' },
  { year: 2018, type: 'champion', manager: 'Brian Stevens' }, { year: 2018, type: 'runner_up', manager: 'Tommy Moore' }, { year: 2018, type: 'third_place', manager: 'Ray Long' }, { year: 2018, type: 'toilet_bowl', manager: 'Wade Cameron' },
  { year: 2017, type: 'champion', manager: 'Tommy Moore' }, { year: 2017, type: 'runner_up', manager: 'JD Dowling' }, { year: 2017, type: 'third_place', manager: 'James Minnix' }, { year: 2017, type: 'toilet_bowl', manager: 'Brian Stevens' },
  { year: 2016, type: 'champion', manager: 'Tommy Moore' }, { year: 2016, type: 'runner_up', manager: 'James Minnix' }, { year: 2016, type: 'third_place', manager: 'Ray Long' }, { year: 2016, type: 'toilet_bowl', manager: 'Wade Cameron' },
  { year: 2015, type: 'champion', manager: 'Keith' }, { year: 2015, type: 'runner_up', manager: 'JD Dowling' }, { year: 2015, type: 'third_place', manager: 'Tommy Moore' }, { year: 2015, type: 'toilet_bowl', manager: 'Travis Miller' },
  { year: 2014, type: 'champion', manager: 'Garet Prior' }, { year: 2014, type: 'runner_up', manager: 'Gordie Gahagan' }, { year: 2014, type: 'third_place', manager: 'Keith' }, { year: 2014, type: 'toilet_bowl', manager: 'Landon Elliott' },
  { year: 2013, type: 'champion', manager: 'Tommy Moore' }, { year: 2013, type: 'runner_up', manager: 'James Minnix' }, { year: 2013, type: 'third_place', manager: 'Bryan' }, { year: 2013, type: 'toilet_bowl', manager: 'Travis Miller' },
  { year: 2012, type: 'champion', manager: 'Bryan' }, { year: 2012, type: 'runner_up', manager: 'Chris Barras' }, { year: 2012, type: 'third_place', manager: 'Nicholas' }, { year: 2012, type: 'toilet_bowl', manager: 'Zach' },
  { year: 2011, type: 'champion', manager: 'Gordie Gahagan' }, { year: 2011, type: 'runner_up', manager: 'Wade Cameron' }, { year: 2011, type: 'third_place', manager: 'Zach' }, { year: 2011, type: 'toilet_bowl', manager: 'Darren' }
];

// --- MAPPINGS ---
const RETIRED_TRADE_SCORES: Record<string, number> = { "Landon": 6, "Gordie": 0, "Chris": 6, "Garet": 7, "James": 6, "Rachel": 9.5, "Zach": 10.5, "Ricky": 4, "Patrick": 7, "Bryan": 6, "Keith": 4, "Darren": 2, "Nicholas": 3, "Billy": 7, "Adam": 6 };
const NORM_NAME: Record<string, string> = { "Aaron": "Aaron Dogg", "Minnix": "James Minnix", "Gordie": "Gordie Gahagan", "Chris": "Chris Barras", "Tommy": "Tommy Moore", "Travis": "Travis Miller", "Landon": "Landon Elliott", "Wade": "Wade Cameron", "Ray": "Ray Long", "Brian": "Brian Stevens", "JD": "JD Dowling", "Zach": "Zach", "Bryan": "Bryan", "Keith": "Keith", "Nicholas": "Nicholas", "Garet": "Garet Prior", "Darren": "Darren", "Rachel": "Rachel Woolard", "Dave": "David Besedich", "Doug": "Doug Fordham", "Adam": "Adam Lind", "Billy": "Billy Biddle", "Patrick": "Patrick Leahey", "Jordan": "Jordan Maslyn", "Rashad": "Rashad Gresham", "Ricky": "Ricky Taylor" };
const HIST_MAP: Record<string, string> = { "Aaron": "Aaron Dogg", "Ray": "Ray Long", "JD": "JD Dowling", "Tommy": "Tommy Moore", "Travis": "Travis Miller", "Wade": "Wade Cameron", "Brian": "Brian Stevens", "Doug": "Doug Fordham", "Jordan": "Jordan Maslyn", "David": "David Besedich", "Landon": "Landon Elliott", "Chris": "Chris Barras", "Gordie": "Gordie Gahagan", "James": "James Minnix", "Garet": "Garet Prior", "Adam": "Adam Lind", "Billy": "Billy Biddle", "Patrick": "Patrick Leahey", "Ricky": "Ricky Taylor", "Rachel": "Rachel Woolard", "Rashad": "Rashad Gresham", "Stan": "Stan Schoppe" };
const SLEEPER_ID_MAP: Record<string, string> = { "73400761740312576": "Doug Fordham", "341412060426436608": "Jordan Maslyn", "469199353672626176": "Landon Elliott", "342828350391230464": "Ray Long", "356621920969555968": "Jeffrey Hudgins", "342831451382841344": "Travis Miller", "342838548870762496": "Wade Cameron", "342849293037608960": "Tommy Moore", "342850391018356736": "JD Dowling", "343129212162523136": "Brian Stevens", "466663208728391680": "David Besedich", "583513420586848256": "Aaron Dogg", "864186418971418624": "Rashad Gresham", "1260048448384667648": "Stan Schoppe", "737878619958947840": "Damon Davis", "556676922517524480": "Adam Lind", "470428278931320832": "Billy Biddle", "345934777502699520": "Chris Barras", "98907192333582336":  "Ricky Taylor", "342831898403377152": "Patrick Leahey" };

const TEAM_THEMES: Record<string, string> = { atl: "bg-gradient-to-br from-[#a71930] to-[#000000]", nyj: "bg-gradient-to-br from-[#125740] to-[#0b3326]", min: "bg-gradient-to-br from-[#4f2683] to-[#250e42]", no: "bg-gradient-to-br from-[#d3bc8d] to-[#8e7846]", gb: "bg-gradient-to-br from-[#203731] to-[#101e1a]", car: "bg-gradient-to-br from-[#0085ca] to-[#00466c]", nyg: "bg-gradient-to-br from-[#0b2265] to-[#030b21]", was: "bg-gradient-to-br from-[#5a1414] to-[#2b0808]", cle: "bg-gradient-to-br from-[#311d00] to-[#1a0f00]", sf: "bg-gradient-to-br from-[#aa0000] to-[#4d0000]", det: "bg-gradient-to-br from-[#0076b6] to-[#002f4a]", tb: "bg-gradient-to-br from-[#d50a0a] to-[#520303]", dal: "bg-gradient-to-br from-[#003594] to-[#041e42]", pit: "bg-gradient-to-br from-black to-[#101820]" };

export default function ManagersPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'retired'>('active');
  const [flippedId, setFlippedId] = useState<number | null>(null);
  const [teamNames, setTeamNames] = useState<Record<number, string>>({});
  const [careerStats, setCareerStats] = useState<Record<string, { w: number, l: number, t: number }>>({});
  
  let fullRet = [...retiredManagers];
  if (!fullRet.find(m => m.name === "Adam Lind")) {
    fullRet.push({ roster: 999, name: "Adam Lind", teamName: "Hotub Jellyfish", photo: "/managers/Adam.png", location: "Richmond", fantasyStart: 2012, favoriteTeam: "min", mode: "Retired", bio: "The Jellyfish legend.", rival: { name: "Everyone" }, tradingScale: 6, valuePosition: "RB", rookieOrVets: "Vets", philosophy: "Sting like a jellyfish.", preferredContact: "Sleeper" } as any);
  }
  const awards = MASTER_HISTORY.map(a => ({ ...a, manager: NORM_NAME[a.manager] || a.manager }));
  const displayed = activeTab === 'active' ? managers : fullRet;

  useEffect(() => {
    async function fetchData() {
      const statsMap: Record<string, { w: number, l: number, t: number }> = {};
      Object.keys(SLEEPER_ID_MAP).forEach(id => {
        statsMap[id] = { w: 0, l: 0, t: 0 };
      });

      try {
        const [u, r] = await Promise.all([getLeagueUsers(), getLeagueRosters()]);
        const uMap: Record<string, string> = { ...SLEEPER_ID_MAP };
        u.forEach((user: any) => { if (!uMap[user.user_id]) uMap[user.user_id] = user.metadata?.team_name || user.display_name; });
        const rNames: Record<number, string> = {};
        r.forEach((ros: any) => { rNames[ros.roster_id] = uMap[ros.owner_id] || "Unknown Team"; });
        setTeamNames(rNames);

        // Fetch Career Records
        for (const leagueId of LEAGUE_HISTORY_IDS) {
          const res = await fetch(`https://api.sleeper.app/v1/league/${leagueId}/rosters`);
          const rosters = await res.json();
          rosters.forEach((ros: any) => {
            if (statsMap[ros.owner_id]) {
              statsMap[ros.owner_id].w += (ros.settings?.wins || 0);
              statsMap[ros.owner_id].l += (ros.settings?.losses || 0);
              statsMap[ros.owner_id].t += (ros.settings?.ties || 0);
            }
          });
        }
        setCareerStats(statsMap);
      } catch (e) { console.error(e); }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] pb-20 font-sans transition-colors">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md pt-4 pb-6 dark:bg-[#121212]/80 dark:border-white/10 text-center text-gray-900 dark:text-white">
        <div className="container mx-auto px-4 relative">
          <Link href="/" className="absolute top-4 left-2 md:left-4 flex items-center gap-1 md:gap-2 text-[10px] md:text-sm font-bold text-gray-500 hover:text-orange-600 transition-colors uppercase tracking-widest">
            <ArrowLeft className="h-3 w-3 md:h-4 md:w-4" /> Back
          </Link>
          <div className="absolute top-4 right-2 md:right-4"><ModeToggle /></div>
          <div className="relative mx-auto mb-4 h-16 w-16 md:h-24 md:w-24 overflow-hidden rounded-full border-2 md:border-4 bg-white shadow-xl dark:border-white/5">
            <Image src="/River City FFL Logo.JPG" alt="Logo" fill className="object-cover" priority unoptimized />
          </div>
          <h1 className="mb-4 text-2xl md:text-4xl font-extrabold uppercase dark:text-[#f0c340]">League <span className="text-orange-600 dark:text-white">Managers</span></h1>
          
          <nav className="mb-6 flex flex-wrap justify-center gap-2 md:gap-4 px-2">
            {[
              { label: 'Home', href: '/', icon: Trophy },
              { label: 'Managers', href: '/managers', icon: Users },
              { label: 'League Info', href: '/league-info', icon: BookOpen },
              { label: 'Matchups', href: '/matchups', icon: Swords }
            ].map((item, i) => (
              <Link key={i} href={item.href} className={`flex items-center gap-1 md:gap-2 rounded-full px-4 md:px-6 py-1.5 md:py-2 text-[10px] md:text-xs transition ${item.label === 'Managers' ? 'bg-orange-600 text-white font-bold shadow-lg' : 'border border-gray-200 bg-white text-gray-700 dark:bg-[#2c2c2c] dark:text-gray-300'}`}>
                <item.icon className="w-3 h-3 md:w-4 md:h-4" />{item.label}
              </Link>
            ))}
          </nav>
          
          <div className="flex justify-center gap-2">
            <button onClick={() => setActiveTab('active')} className={`rounded-full px-5 py-1.5 text-[10px] md:text-sm font-bold transition ${activeTab === 'active' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-gray-500 dark:bg-white/5'}`}>Active</button>
            <button onClick={() => setActiveTab('retired')} className={`rounded-full px-5 py-1.5 text-[10px] md:text-sm font-bold transition ${activeTab === 'retired' ? 'bg-gray-800 text-white shadow-lg' : 'bg-white text-gray-500 dark:bg-white/5'}`}>Retired</button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {displayed.map((m) => {
            const isF = flippedId === m.roster;
            const resName = HIST_MAP[m.name] || m.name;
            const myA = awards.filter(a => a.manager === resName);
            const co = m.name === 'Ray' ? "Jeffrey" : (m.name === 'Jordan' ? "Landon" : null);
            const tradeScore = activeTab === 'retired' ? (RETIRED_TRADE_SCORES[m.name] ?? m.tradingScale) : m.tradingScale;
            
            // Map Sleeper ID to Career Stats
            const sleeperId = Object.keys(SLEEPER_ID_MAP).find(key => SLEEPER_ID_MAP[key] === resName);
            const stats = careerStats[sleeperId || ""] || { w: 0, l: 0, t: 0 };

            return (
              <div key={m.roster} className="relative h-[580px] md:h-[640px] w-full group [perspective:1000px]">
                <div className={`relative w-full h-full transition-all duration-700 [transform-style:preserve-3d] ${isF ? '[transform:rotateY(180deg)]' : ''}`}>
                  <div className={`absolute inset-0 [backface-visibility:hidden] flex flex-col overflow-hidden rounded-[2rem] shadow-xl border-4 ${TEAM_THEMES[m.favoriteTeam] || "bg-gray-900"} text-white ${isF ? 'pointer-events-none' : ''}`}>
                    <div className="absolute top-0 right-0 p-4 font-black text-4xl md:text-6xl uppercase opacity-20 select-none tracking-tighter">{m.favoriteTeam}</div>
                    <div className="absolute top-4 right-4 z-20"><button onClick={(e) => { e.stopPropagation(); setFlippedId(isF ? null : m.roster); }} className="p-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20"><RotateCw className="w-4 h-4 md:w-5 md:h-5" /></button></div>
                    
                    <div className="relative p-6 md:p-8 pb-0 mt-4 md:mt-8 flex flex-col text-white">
                      <h2 className="text-2xl md:text-3xl font-black leading-tight truncate mb-1 uppercase tracking-tight">{teamNames[m.roster] || m.teamName}</h2>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-base md:text-lg font-medium opacity-90">{m.name}</div>
                        {co && <div className="flex items-center gap-1.5"><span className="text-white/40 text-[10px] font-bold uppercase">w/</span><div className="text-base md:text-lg font-medium text-orange-400">{co}</div><UserPlus className="h-3 w-3 md:h-4 md:w-4 text-orange-400/80" /></div>}
                      </div>
                      
                      {/* LOCATION & CAREER RECORD */}
                      <div className="mt-2 space-y-1">
                        <div className="text-[10px] font-bold uppercase opacity-50 tracking-widest">{m.location} • Est {m.fantasyStart}</div>
                        {activeTab === 'active' && stats.w + stats.l > 0 && (
                          <div className="flex items-center gap-2">
                             <div className="px-2 py-0.5 bg-white/10 rounded-md border border-white/10 flex items-center gap-1.5">
                                <BarChart3 className="w-3 h-3 text-orange-400" />
                                <span className="text-[10px] font-black tracking-wider uppercase">
                                  Record: {stats.w}-{stats.l}{stats.t > 0 ? `-${stats.t}` : ''}
                                </span>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 md:gap-5 px-6 md:px-8 py-4 md:py-6">
                      <div className="flex shrink-0 flex-col items-center gap-2 md:gap-3">
                        <div className="relative h-16 w-16 md:h-20 md:w-20 rounded-full border-2 overflow-hidden bg-gray-800 shadow-xl"><Image src={m.photo || "/River City FFL Logo.JPG"} alt={m.name} fill className="object-cover" unoptimized /></div>
                        {myA.filter(a => a.type === 'champion').length > 0 && <div className="bg-yellow-400 text-yellow-900 border border-white px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black z-30 shadow-lg">x{myA.filter(a => a.type === 'champion').length}🏆</div>}
                      </div>
                      <div className="w-full rounded-2xl bg-white/10 p-3 italic text-[10px] md:text-xs leading-relaxed border border-white/5">"{m.bio}"</div>
                    </div>

                    <div className="px-6 md:px-8 mb-4">
                      <div className="flex justify-between text-[8px] md:text-[10px] font-black uppercase mb-1 tracking-widest"><span>Trade Aggression</span><span>{tradeScore}/10</span></div>
                      <div className="h-2 w-full rounded-full bg-black/40 border border-white/10"><div className="h-full rounded-full bg-gradient-to-r from-red-500 via-yellow-400 to-green-500" style={{ width: `${tradeScore * 10}%` }}></div></div>
                    </div>

                    <div className="px-6 md:px-8 grid grid-cols-4 gap-2 mb-4 h-14 md:h-16 text-center">
                        {[
                          { label: 'Value Pos', val: m.valuePosition },
                          { label: 'Draft', val: m.rookieOrVets === 'Rookies' ? 'Rook' : 'Vet' },
                          { label: 'Team', val: m.favoriteTeam.toUpperCase() }
                        ].map((stat, idx) => (
                          <div key={idx} className="bg-black/30 backdrop-blur-md rounded-xl border border-white/5 flex flex-col justify-center"><span className="text-[6px] md:text-[7px] uppercase opacity-50 font-bold">{stat.label}</span><span className="text-[9px] md:text-[10px] font-black uppercase">{stat.val}</span></div>
                        ))}
                        <div className="bg-black/30 rounded-xl border border-white/5 overflow-hidden relative">{m.favoritePlayer ? <Image src={`https://sleepercdn.com/content/nfl/players/${m.favoritePlayer}.jpg`} alt="P" fill className="object-cover opacity-90 grayscale hover:grayscale-0 transition-all" unoptimized /> : <div className="text-[8px] flex items-center justify-center h-full opacity-30">N/A</div>}</div>
                    </div>

                    <div className="px-6 md:px-8 grow mb-4 relative">
                        <div className="h-full rounded-[1.5rem] bg-white/5 p-4 border border-white/5 relative flex items-center text-white"><div className="absolute -top-2 left-4 rounded-lg bg-gray-200 px-2 py-0.5 text-[8px] font-black text-black uppercase shadow-sm">Philosophy</div><p className="mt-1 text-[10px] md:text-xs italic opacity-80 leading-relaxed font-medium">"{m.philosophy}"</p></div>
                    </div>

                    <div className="mt-auto bg-black/40 p-4 md:p-6 border-t border-white/10 flex items-center justify-between backdrop-blur-lg">
                        <div className="flex items-center gap-2 text-white"><Swords className="h-4 w-4 text-red-400" /><span className="text-[10px] font-black uppercase opacity-80 tracking-widest">Rival</span></div>
                        <div className="flex items-center gap-3 text-white"><span className="text-xs md:text-sm font-black text-right leading-tight tracking-tight">{m.rival.name || "River City FFL"}</span><div className="relative h-8 w-8 md:h-10 md:w-10 overflow-hidden rounded-full bg-gray-700 shadow-lg border border-white/20">{m.rival.image ? <Image src={m.rival.image} alt="R" fill className="object-cover" unoptimized /> : <Image src="/River City FFL Logo.JPG" alt="L" fill className="object-cover" unoptimized />}</div></div>
                    </div>
                  </div>

                  <div className={`absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] flex flex-col overflow-hidden rounded-[2rem] shadow-xl bg-[#0f0f0f] text-white border-2 border-white/10 ${isF ? '' : 'pointer-events-none'}`}>
                     <div className="flex items-center justify-between p-6 md:p-8 border-b border-white/10">
                         <div className="flex items-center gap-2 text-orange-500 uppercase tracking-[0.2em] font-black text-xs md:text-sm"><BookOpen className="h-4 w-4 md:h-5 md:w-5" /> History & Legacy</div>
                         <button onClick={(e) => { e.stopPropagation(); setFlippedId(null); }} className="rounded-full bg-white/10 p-2 transition hover:bg-white/20"><X className="h-4 w-4" /></button>
                     </div>
                     <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar">
                        {[
                          { t: 'League Champion', l: myA.filter(a=>a.type==='champion').map(a=>a.year), c: 'yellow', i: Trophy },
                          { t: 'Runner Up', l: myA.filter(a => a.type === 'runner_up').map(a => a.year), c: 'gray', i: Medal },
                          { t: 'Third Place', l: myA.filter(a => a.type === 'third_place').map(a => a.year), c: 'orange', i: Medal },
                          { t: 'Toilet Bowl', l: myA.filter(a => a.type === 'toilet_bowl').map(a => a.year), c: 'red', i: null }
                        ].map((g, i) => (
                           g.l.length > 0 && (
                             <div key={i} className={`bg-white/5 border border-white/10 p-4 md:p-5 rounded-[1.5rem] transition-all hover:bg-white/10 text-white`}>
                               <div className="flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-orange-500">{g.i && <g.i className="w-4 h-4 text-orange-500"/>}{g.t}</div>
                               <div className="flex flex-wrap gap-2">{g.l.sort((a,b)=>b-a).map(y => <span key={y} className="px-3 py-1 bg-white/10 text-white text-[10px] md:text-xs font-black rounded-lg border border-white/10">{y}</span>)}</div>
                             </div>
                           )
                        ))}
                        {myA.length === 0 && <div className="py-20 text-center opacity-20 text-xs font-black uppercase tracking-widest">NO TITLES YET</div>}
                     </div>
                     <div className="grid grid-cols-2 gap-4 border-t border-white/10 bg-black/40 p-6 md:p-8 text-center backdrop-blur-xl">
                         <div><div className="mb-1 text-[8px] md:text-[10px] font-black uppercase opacity-40 tracking-widest text-orange-400">Best Finish</div><div className="text-xl md:text-2xl font-black text-green-400">{myA.filter(a=>a.type==='champion').length>0?'1st':(myA.filter(a=>a.type==='runner_up').length>0?'2nd':'N/A')}</div></div>
                         <div><div className="mb-1 text-[8px] md:text-[10px] font-black uppercase opacity-40 tracking-widest text-orange-400">Podiums</div><div className="text-xl md:text-2xl font-black text-orange-500">{myA.filter(a=>['champion','runner_up','third_place'].includes(a.type)).length}</div></div>
                     </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar{width:4px}.custom-scrollbar::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:10px}.perspective-1000{perspective:1000px}.preserve-3d{transform-style:preserve-3d}.backface-hidden{backface-visibility:hidden}.rotate-y-180{transform:rotateY(180deg)}`}</style>
    </div>
  );
}