'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Trophy, Home
} from 'lucide-react';

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
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-500">
      
      {/* NAVIGATION BAR - Consistent with Hub Style */}
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex items-center gap-4">
          <Link 
            href="/league-info" 
            className="p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 hover:scale-105 transition-all"
            title="Back to Info Hub"
          >
            <Home size={18} />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Trophy className="text-orange-600 hidden sm:block" size={20} />
          <span className="text-xs font-black uppercase italic tracking-tighter">Trophy Room</span>
        </div>
      </nav>

      {/* HEADER SECTION */}
      <header className="px-6 py-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 shadow-lg text-orange-600">
          <Trophy size={28} />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            Trophy <span className="text-orange-600">Room</span>
        </h1>
        <p className="mt-4 text-[10px] font-bold opacity-40 uppercase tracking-[0.3em]">Hall of Legends & Walls of Shame</p>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10 flex justify-center">
          <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
              <button 
                  onClick={() => setActiveTab('champions')} 
                  className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${activeTab === 'champions' ? 'bg-yellow-500 text-black shadow-lg' : 'opacity-40'}`}
              >
                  Champions
              </button>
              <button 
                  onClick={() => setActiveTab('leaderboard')} 
                  className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${activeTab === 'leaderboard' ? 'bg-orange-600 text-white shadow-lg' : 'opacity-40'}`}
              >
                  Podiums
              </button>
              <button 
                  onClick={() => setActiveTab('shame')} 
                  className={`px-3 sm:px-4 py-1.5 rounded-md text-[10px] font-black uppercase transition-all ${activeTab === 'shame' ? 'bg-gray-800 text-white shadow-lg' : 'opacity-40'}`}
              >
                  Shame
              </button>
          </div>
        </div>
        
        {activeTab === 'champions' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 overflow-hidden shadow-2xl animate-in fade-in duration-500">
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 animate-in fade-in duration-500 text-center">
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

      </main>
    </div>
  );
}
