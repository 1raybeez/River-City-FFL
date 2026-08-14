'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Trophy, ArrowLeft
} from 'lucide-react';
import SiteShell from '@/components/SiteShell';

/**
 * DATA: Verified Historical Champions (2011-2025)
 */
const CHAMPIONS = [
  { year: 2025, name: "Aaron Hawkins", team: "Nudas Priest", avatar: "/managers/Aaron.png", league: "River City FFL" },
  { year: 2024, name: "Jordan Maslyn", team: "Get.Your.Guy", avatar: "/managers/Jordan.jpg", league: "River City FFL" },
  { year: 2023, name: "Tommy Moore", team: "The Ship of Theseus", avatar: "/managers/Tommy.png", league: "River City FFL" },
  { year: 2022, name: "Tommy Moore", team: "The Hellfire Club", avatar: "/managers/Tommy.png", league: "River City FFL" },
  { year: 2021, name: "David Besedich", team: "The Schmendricks", avatar: "/managers/Dave.png", league: "River City FFL" },
  { year: 2020, name: "JD Dowling", team: "F U Minshew", avatar: "/managers/JD.png", league: "River City FFL" },
  { year: 2019, name: "Wade Cameron", team: "Witchdoctors", avatar: "/managers/Wade.png", league: "River City FFL" },
  { year: 2018, name: "Brian Stevens", team: "kerryon my wayward son", avatar: "/managers/Brian.png", league: "Area 10 FFL" },
  { year: 2017, name: "Tommy Moore", team: "Deez Lutz", avatar: "/managers/Tommy.png", league: "Area 10 FFL" },
  { year: 2016, name: "Tommy Moore", team: "Breesus Take the Wheel", avatar: "/managers/Tommy.png", league: "Area 10 FFL" },
  { year: 2015, name: "Keith Polarek", team: "Team Polarek", avatar: "/managers/Keith.png", league: "Area 10 FFL" },
  { year: 2014, name: "Garet Prior", team: "McCowen Town", avatar: "/managers/Garet.png", league: "Area 10 FFL" },
  { year: 2013, name: "Tommy Moore", team: "The Not That Great CornJulio", avatar: "/managers/Tommy.png", league: "Area 10 FFL" },
  { year: 2012, name: "Bryan Doane", team: "Drinkin' Irish", avatar: "/managers/Bryan.png", league: "Area 10 FFL" },
  { year: 2011, name: "Gordie Gahagan", team: "Freakshow Freaks", avatar: "/managers/Gordie.png", league: "Area 10 FFL" },
];

const PODIUMS = [
  { rank: 1, name: "Tommy Moore", avatar: "/managers/Tommy.png", gold: 5, silver: 1, bronze: 1, total: 7 },
  { rank: 2, name: "JD Dowling", avatar: "/managers/JD.png", gold: 1, silver: 3, bronze: 1, total: 5 },
  { rank: 3, name: "Brian Stevens", avatar: "/managers/Brian.png", gold: 1, silver: 1, bronze: 2, total: 4 },
  { rank: 4, name: "Travis Miller", avatar: "/managers/Travis.png", gold: 0, silver: 3, bronze: 0, total: 3 },
  { rank: 5, name: "Wade Cameron", avatar: "/managers/Wade.png", gold: 1, silver: 2, bronze: 0, total: 3 },
  { rank: 6, name: "David Besedich", avatar: "/managers/Dave.png", gold: 1, silver: 1, bronze: 1, total: 3 },
  { rank: 7, name: "Ray Long", avatar: "/managers/Ray.png", gold: 0, silver: 0, bronze: 3, total: 3 },
  { rank: 8, name: "James Minnix", avatar: "/managers/James.png", gold: 0, silver: 2, bronze: 1, total: 3 },
  { rank: 9, name: "Keith Polarek", avatar: "/managers/Keith.png", gold: 1, silver: 0, bronze: 1, total: 2 },
  { rank: 10, name: "Gordie Gahagan", avatar: "/managers/Gordie.png", gold: 1, silver: 1, bronze: 0, total: 2 },
  { rank: 11, name: "Bryan Doane", avatar: "/managers/Bryan.png", gold: 1, silver: 0, bronze: 1, total: 2 },
  { rank: 12, name: "Aaron Hawkins", avatar: "/managers/Aaron.png", gold: 1, silver: 0, bronze: 0, total: 1 },
  { rank: 13, name: "Jordan Maslyn", avatar: "/managers/Jordan.jpg", gold: 1, silver: 0, bronze: 0, total: 1 },
  { rank: 14, name: "Garet Prior", avatar: "/managers/Garet.png", gold: 1, silver: 0, bronze: 0, total: 1 },
  { rank: 15, name: "Doug Fordham", avatar: "/managers/Doug.jpg", gold: 0, silver: 0, bronze: 1, total: 1 },
];

const LOSERS = [
  { year: 2025, name: "Ray Long", avatar: "/managers/Ray.png" },
  { year: 2024, name: "Rashad Gresham", avatar: "/managers/Rashad.png" },
  { year: 2023, name: "Landon Elliott", avatar: "/managers/Landon.png" },
  { year: 2022, name: "JD Dowling", avatar: "/managers/JD.png" },
  { year: 2021, name: "Jordan Maslyn", avatar: "/managers/Jordan.jpg" },
  { year: 2020, name: "Tommy Moore", avatar: "/managers/Tommy.png" },
  { year: 2019, name: "Tommy Moore", avatar: "/managers/Tommy.png" },
  { year: 2018, name: "Wade Cameron", avatar: "/managers/Wade.png" },
  { year: 2017, name: "Brian Stevens", avatar: "/managers/Brian.png" },
  { year: 2016, name: "Wade Cameron", avatar: "/managers/Wade.png" },
  { year: 2015, name: "Travis Miller", avatar: "/managers/Travis.png" },
  { year: 2014, name: "Landon Elliott", avatar: "/managers/Landon.png" },
  { year: 2013, name: "Travis Miller", avatar: "/managers/Travis.png" },
  { year: 2012, name: "Zach Woolard", avatar: "/managers/Zach.png" },
  { year: 2011, name: "Darren Kusaj", avatar: null },
];

export default function TrophyRoomPage() {
  const [activeTab, setActiveTab] = useState<'champions' | 'leaderboard' | 'shame'>('champions');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <SiteShell activePath="/league-info">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="trophy-room-title">
          <Link href="/league-info" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:text-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2">
            <ArrowLeft size={14} aria-hidden="true" /> Back to League Info
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-amber-700">League Info</p>
          <h1 id="trophy-room-title" className="mt-2 font-sans text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl">River City Trophy Room</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Champions, podium finishes, and existing league honors from River City FFL history.</p>
        </section>

        <section className="mt-6" aria-labelledby="trophy-categories-title">
          <h2 id="trophy-categories-title" className="sr-only">Trophy Room categories</h2>
        <div className="mb-10 flex justify-center">
          <div role="tablist" aria-label="Trophy Room categories" className="flex max-w-full flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
              <button 
                  type="button"
                  role="tab"
                  id="trophy-tab-champions"
                  aria-selected={activeTab === 'champions'}
                  onClick={() => setActiveTab('champions')} 
                  className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 ${activeTab === 'champions' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                  Champions
              </button>
              <button 
                  type="button"
                  role="tab"
                  id="trophy-tab-leaderboard"
                  aria-selected={activeTab === 'leaderboard'}
                  onClick={() => setActiveTab('leaderboard')} 
                  className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2 ${activeTab === 'leaderboard' ? 'bg-orange-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                  Podiums
              </button>
              <button 
                  type="button"
                  role="tab"
                  id="trophy-tab-shame"
                  aria-selected={activeTab === 'shame'}
                  onClick={() => setActiveTab('shame')} 
                  className={`rounded-xl px-4 py-2.5 text-[10px] font-black uppercase transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-700 focus-visible:ring-offset-2 ${activeTab === 'shame' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                  Shame
              </button>
          </div>
        </div>
        
        {activeTab === 'champions' && (
            <div role="tabpanel" aria-labelledby="trophy-tab-champions" className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 sm:grid-cols-2 lg:grid-cols-3">
                {CHAMPIONS.map((champ) => (
                    <div key={`${champ.year}-${champ.name}`} className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 overflow-hidden group transition-all duration-300 relative shadow-xl">
                        {/* Hero Header for Card */}
                        <div className="h-32 bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 flex items-center justify-center relative overflow-hidden">
                            <div className="text-8xl font-black text-white/20 absolute -bottom-4 italic select-none">{champ.year}</div>
                            <Trophy className="w-12 h-12 text-white drop-shadow-lg relative z-10" />
                        </div>
                        
                        <div className="p-8 text-center -mt-14 relative z-10">
                            <div className="w-24 h-24 mx-auto rounded-full border-4 border-white dark:border-[#0a0a0a] shadow-2xl overflow-hidden bg-black/20 relative">
                                {champ.avatar ? (
                                    <Image src={champ.avatar} alt={champ.name} fill className="object-cover" unoptimized />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold text-xl">{champ.name[0]}</div>
                                )}
                            </div>
                            
                            <h2 className="text-3xl font-black mt-4 italic tracking-tighter uppercase">{champ.year}</h2>
                            <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-4">{champ.name}</h3>
                            
                            <div className="flex flex-col gap-1 items-center">
                              <div className="text-[10px] font-black opacity-60 uppercase tracking-widest bg-black/5 dark:bg-white/5 py-2 px-4 rounded-full border border-black/5 dark:border-white/5 truncate max-w-full italic">
                                {champ.team}
                              </div>
                              <span className="text-[8px] font-black opacity-30 uppercase tracking-[0.2em] mt-1">{champ.league}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {activeTab === 'leaderboard' && (
            <div role="tabpanel" aria-labelledby="trophy-tab-leaderboard" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm animate-in fade-in duration-500">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/5 dark:bg-white/5 border-b border-black/5 dark:border-white/10">
                            <tr className="text-[10px] font-black opacity-40 uppercase tracking-[0.2em]">
                                <th className="px-8 py-6">Rank</th>
                                <th className="px-8 py-6">Manager</th>
                                <th className="px-8 py-6 text-center text-yellow-500">Gold</th>
                                <th className="px-8 py-6 text-center opacity-50">Silver</th>
                                <th className="px-8 py-6 text-center text-orange-800">Bronze</th>
                                <th className="px-8 py-6 text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-black/5 dark:divide-white/5">
                            {PODIUMS.map((p) => (
                                <tr key={p.name} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors group">
                                    <td className="px-8 py-6 font-black italic opacity-20 text-xl group-hover:opacity-100 group-hover:text-orange-600 transition-all">#{p.rank}</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-black/20 overflow-hidden relative shadow-md border border-black/10 dark:border-white/10">
                                                {p.avatar ? (
                                                    <Image src={p.avatar} alt={p.name} fill className="object-cover" unoptimized />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">{p.name[0]}</div>
                                                )}
                                            </div>
                                            <span className="font-black uppercase italic tracking-tighter">{p.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center font-black text-xl text-yellow-600 dark:text-yellow-500">{p.gold}</td>
                                    <td className="px-8 py-6 text-center font-black text-xl opacity-40">{p.silver}</td>
                                    <td className="px-8 py-6 text-center font-black text-xl text-orange-800">{p.bronze}</td>
                                    <td className="px-8 py-6 text-right font-black text-3xl italic">{p.total}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'shame' && (
            <div role="tabpanel" aria-labelledby="trophy-tab-shame" className="grid grid-cols-1 gap-5 text-center animate-in fade-in duration-500 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {LOSERS.map((loser) => (
                    <div key={loser.year} className="group bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 p-8 flex flex-col items-center hover:border-red-600 transition-all shadow-xl">
                        <div className="w-20 h-20 rounded-full bg-black/20 mb-6 relative overflow-hidden grayscale group-hover:grayscale-0 transition-all duration-700 border-2 border-black/5 dark:border-white/10">
                            {loser.avatar ? (
                                <Image src={loser.avatar} alt={loser.name} fill className="object-cover" unoptimized />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500">{loser.name[0]}</div>
                            )}
                            <div className="absolute bottom-0 right-0 bg-red-600 text-white text-[10px] w-7 h-7 flex items-center justify-center rounded-full border-2 border-white dark:border-[#0a0a0a] shadow-lg">💩</div>
                        </div>
                        <h3 className="text-3xl font-black italic tracking-tighter leading-none mb-2">{loser.year}</h3>
                        <p className="text-[10px] font-black opacity-40 uppercase tracking-widest truncate w-full px-2">{loser.name}</p>
                    </div>
                ))}
            </div>
        )}

        </section>
      </main>
    </SiteShell>
  );
}
