'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Trophy, Users, BookOpen, Swords, ArrowLeft, 
  Scale, Grid3X3, DollarSign, FileText, Archive
} from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';

export default function LeagueInfoPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] transition-colors duration-300 font-sans selection:bg-orange-500 selection:text-white pb-12">
      
      {/* HEADER: RESPONSIVE PADDING & SCALING */}
      <header className="border-b border-gray-200 dark:border-white/10 bg-linear-to-b from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#121212] pb-6 md:pb-8 pt-4 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 text-center relative">
          {/* BACK BUTTON: Smaller on mobile */}
          <Link href="/" className="absolute top-4 left-2 md:left-4 flex items-center gap-1 md:gap-2 text-gray-500 hover:text-orange-600 transition-colors font-bold text-[10px] md:text-sm uppercase tracking-widest">
             <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> Home
          </Link>
          <div className="absolute top-4 right-2 md:right-4"><ModeToggle /></div>
          
          {/* LOGO: Scaled for phone */}
          <div className="mx-auto mb-4 md:mb-6 flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-full bg-white dark:bg-linear-to-br dark:from-[#2c2c2c] dark:to-[#1a1a1a] shadow-xl border-2 md:border-4 border-gray-100 dark:border-white/5 overflow-hidden relative">
             <Image src="/River City FFL Logo.JPG" alt="Logo" fill className="object-cover" priority unoptimized />
          </div>
          
          <h1 className="mb-4 text-2xl md:text-4xl lg:text-5xl font-extrabold tracking-tighter text-gray-900 dark:text-[#f0c340] uppercase drop-shadow-sm leading-none">
            League <span className="text-orange-600 dark:text-white">Info Hub</span>
          </h1>

          {/* NAV: FLEX-WRAP FOR MOBILE */}
          <nav className="flex flex-wrap justify-center gap-2 md:gap-4 mb-4 md:mb-8 px-2">
            {[
              { label: 'Home', href: '/', icon: Trophy },
              { label: 'Managers', href: '/managers', icon: Users },
              { label: 'League Info', href: '/league-info', icon: BookOpen },
              { label: 'Matchups', href: '/matchups', icon: Swords }
            ].map((item, i) => (
              <Link key={i} href={item.href} className={`flex items-center gap-1.5 md:gap-2 rounded-full px-4 md:px-6 py-1.5 md:py-2 text-[10px] md:text-xs transition ${item.label === 'League Info' ? 'bg-orange-600 text-white font-bold shadow-lg' : 'bg-white border border-gray-200 text-gray-700 dark:bg-[#2c2c2c] dark:border-white/10 dark:text-gray-300'}`}>
                <item.icon className="w-3 h-3 md:w-4 md:h-4" />{item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* --- INFO GRID: 1 COL PHONE / 2 COL TABLET / 3 COL DESKTOP --- */}
      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          
          {[
            { title: "Constitution", desc: "Official bylaws, scoring, and trade rules.", href: "/league-info/constitution", icon: Scale, color: "blue", linkText: "Read Rules" },
            { title: "Draft Board", desc: "History of every pick (2018-Present).", href: "/league-info/draft", icon: Grid3X3, color: "green", linkText: "View Board" },
            { title: "Trophy Room", desc: "Hall of Champions & The Shame Wall.", href: "/league-info/trophy-room", icon: Trophy, color: "yellow", linkText: "Enter Hall" },
            { title: "Rivalry Hub", desc: "Head-to-head records and career stats.", href: "/league-info/rivalries", icon: Swords, color: "red", linkText: "Scan Rivalry" },
            { title: "Resources", desc: "Helpful links, tools, and league documents.", href: "/league-info/resources", icon: FileText, color: "purple", linkText: "View Docs" },
            { title: "Archives", desc: "Past seasons, newsletters, and history.", href: "/league-info/archives", icon: Archive, color: "orange", linkText: "Open Archives" },
            { title: "Payouts", desc: "League finances and dues tracking.", href: "/league-info/payouts", icon: DollarSign, color: "emerald", linkText: "View Vault" }
          ].map((card, idx) => (
            <Link key={idx} href={card.href} className="group relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#1e1e1e] border border-gray-200 dark:border-white/10 shadow-md hover:shadow-xl transition-all hover:scale-[1.02]">
              <div className="absolute top-0 right-0 p-6 md:p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <card.icon className="w-24 h-24 md:w-32 md:h-32 text-gray-900 dark:text-white" />
              </div>
              <div className="p-6 md:p-8 relative z-10 flex flex-col h-full text-left">
                  <div className={`w-10 h-10 md:w-12 md:h-12 bg-${card.color}-100 dark:bg-${card.color}-900/30 rounded-xl flex items-center justify-center mb-4 text-${card.color}-600 dark:text-${card.color}-400 group-hover:bg-${card.color}-600 group-hover:text-white transition-colors shadow-sm`}>
                      <card.icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2 uppercase tracking-tight">{card.title}</h2>
                  <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 font-medium mb-6 flex-grow">{card.desc}</p>
                  <span className={`inline-flex items-center text-[10px] md:text-xs font-black text-${card.color}-600 dark:text-${card.color}-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform`}>
                    {card.linkText} <ArrowLeft className="w-3 h-3 ml-1 rotate-180" />
                  </span>
              </div>
            </Link>
          ))}

        </div>
      </main>
    </div>
  );
}