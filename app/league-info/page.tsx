'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Trophy, Swords,
  Scale, Grid3X3, DollarSign, FileText, Archive,
  Gavel, ArrowRightLeft, ArrowRight
} from 'lucide-react';

export default function LeagueInfoPage() {
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const cards = [
    { title: "Constitution", desc: "Official bylaws, scoring, and trade rules.", href: "/league-info/constitution", icon: Scale, color: "text-blue-600", bg: "bg-blue-600/10", linkText: "Read Rules" },
    { title: "Trade Analyzer", desc: "Multi-team auction value & power ranking simulator.", href: "/league-info/analyzer", icon: ArrowRightLeft, color: "text-orange-600", bg: "bg-orange-600/10", linkText: "Run Simulation" },
    { title: "Legislative Hub", desc: "Submit proposals and vote on 2026 rule changes.", href: "/commish/proposals", icon: Gavel, color: "text-orange-600", bg: "bg-orange-600/10", linkText: "Enter Chamber" },
    { title: "Draft Board", desc: "History of every pick (2018-Present).", href: "/league-info/draft", icon: Grid3X3, color: "text-green-600", bg: "bg-green-600/10", linkText: "View Board" },
    { title: "Trophy Room", desc: "Hall of Champions & The Shame Wall.", href: "/league-info/trophy-room", icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10", linkText: "Enter Hall" },
    { title: "Rivalry Hub", desc: "Head-to-head records and career stats.", href: "/league-info/rivalries", icon: Swords, color: "text-red-600", bg: "bg-red-600/10", linkText: "Scan Rivalry" },
    { title: "Resources", desc: "Helpful links, tools, and league documents.", href: "/league-info/resources", icon: FileText, color: "text-purple-600", bg: "bg-purple-600/10", linkText: "View Docs" },
    { title: "Archives", desc: "Past seasons, newsletters, and history.", href: "/league-info/archives", icon: Archive, color: "text-gray-500", bg: "bg-gray-500/10", linkText: "Open Archives" },
    { title: "Payouts", desc: "League finances and dues tracking.", href: "/league-info/payouts", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-600/10", linkText: "View Vault" }
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans selection:bg-orange-500">
      
      {/* NAVIGATION BAR - Consistent Header */}
      <nav className="border-b border-black/5 dark:border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="grid w-full grid-cols-4 bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10 sm:flex sm:w-auto">
          <Link href="/" className="min-w-0 px-2 sm:px-4 py-2 sm:py-1.5 rounded-md text-center text-[9px] sm:text-[10px] font-black uppercase transition-all opacity-40 hover:opacity-100">Home</Link>
          <Link href="/managers" className="min-w-0 px-2 sm:px-4 py-2 sm:py-1.5 rounded-md text-center text-[9px] sm:text-[10px] font-black uppercase transition-all opacity-40 hover:opacity-100">Managers</Link>
          <Link href="/league-info" aria-current="page" className="min-w-0 px-2 sm:px-4 py-2 sm:py-1.5 rounded-md text-center text-[9px] sm:text-[10px] font-black uppercase transition-all bg-orange-600 text-white shadow-lg shadow-orange-900/40">League Info</Link>
          <Link href="/matchups" className="min-w-0 px-2 sm:px-4 py-2 sm:py-1.5 rounded-md text-center text-[9px] sm:text-[10px] font-black uppercase transition-all opacity-40 hover:opacity-100">Matchups</Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <header className="px-6 pt-12 pb-6 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-black/5 dark:bg-white/5 shadow-xl border border-black/5 dark:border-white/10 overflow-hidden relative">
           <Image src="/River City FFL Logo.JPG" alt="Logo" fill className="object-cover" priority unoptimized />
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
          League <span className="text-orange-600">Info Hub</span>
        </h1>
        <p className="mt-4 text-xs font-bold opacity-40 uppercase tracking-[0.3em]">Central Command & Archives</p>
      </header>

      {/* INFO GRID */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card, idx) => (
            <Link key={idx} href={card.href} className="group relative overflow-hidden rounded-[2.5rem] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 p-8 hover:bg-black/[0.08] dark:hover:bg-white/[0.08] transition-all hover:scale-[1.02]">
              {/* Background Icon Watermark */}
              <div className="absolute -bottom-4 -right-4 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                  <card.icon size={160} />
              </div>

              <div className="relative z-10 flex flex-col h-full items-start">
                  <div className={`p-3 rounded-2xl ${card.bg} ${card.color} mb-6 shadow-sm`}>
                      <card.icon size={24} />
                  </div>
                  
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">{card.title}</h2>
                  <p className="text-sm opacity-50 font-medium mb-8 leading-relaxed">{card.desc}</p>
                  
                  <div className={`mt-auto flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${card.color}`}>
                    {card.linkText} <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
