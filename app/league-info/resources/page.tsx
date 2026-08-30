'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Music, Mic2, Globe, BarChart3,
  ChevronRight
} from 'lucide-react';
import SiteShell from '@/components/SiteShell';

const BROADCAST_FEED = [
  {
    year: "2026",
    label: "Draft Playlist",
    title: "2026 River City FFL Draft Playlist",
    appleMusicUrl: "https://music.apple.com/us/playlist/2026-river-city-ffl/pl.u-JPAZDjmIWljak5",
    spotifyUrl: "https://open.spotify.com/playlist/6yypu2jaGs5thA8C9eYvLE?si=nWVd8w2STbuI5Ov1GdiDrA",
  },
  {
    year: "2025",
    label: "Draft Kit",
    appleMusicUrl: "https://music.apple.com/us/playlist/2025-river-city-ffl/pl.u-mJy88LDtBYqpd1",
    spotifyUrl: "https://open.spotify.com/playlist/0MJdpr3IjESWqlCIN1e5zr?si=cY2k0tUsTJWfncFPUk14mg&pi=KT9-SpxsSTOm1",
  },
  {
    year: "2024",
    label: "Archive",
    appleMusicUrl: "https://music.apple.com/us/playlist/2024-river-city-ffl/pl.u-11zBXZouZKBzgm",
    spotifyUrl: "https://open.spotify.com/playlist/6Ui2V4cha4SHpaLbcHzm5t?si=zCW7bEbFQHG8hLZxHsQipw&pi=Vamd4QHCTfmjq",
  },
  {
    year: "2023",
    label: "Archive",
    appleMusicUrl: "https://music.apple.com/us/playlist/2023-river-city-ffl/pl.u-V9D7mXEH1jgmDJ",
    spotifyUrl: "https://open.spotify.com/playlist/0QdyNRHcwNu1YbApaXYQ9j?si=LwgE0hsRSgO1uphiT_clTQ&pi=3KFtJWhOR3qwE",
  },
  {
    year: "2022",
    label: "Archive",
    appleMusicUrl: "https://music.apple.com/us/playlist/2022-river-city-ffl/pl.u-11zBJWySZKBzgm",
    spotifyUrl: "https://open.spotify.com/playlist/7vXEJwrFZDiTXwseuCpzYF?si=PWl3ZyCFQBeS5kw24mNPDw&pi=yKzWAf4rRL-Bz",
  },
];

const PODCASTS = [
  {
    name: "The Fantasy Footballers",
    desc: "Award-winning analysis and entertaining start/sit advice.",
    applePodcastUrl: "https://podcasts.apple.com/us/podcast/fantasy-footballers-fantasy-football-podcast/id917453719",
    spotifyUrl: "https://open.spotify.com/show/5RaNsb5sKEBleahQa4MVC5",
    type: "Free",
  },
  {
    name: "The Ringer Fantasy Show",
    desc: "High-energy draft strategy and weekly waiver wire deep dives.",
    applePodcastUrl: "https://podcasts.apple.com/us/podcast/the-ringer-fantasy-football-show/id1523722173",
    spotifyUrl: "https://open.spotify.com/show/0XLPhMzcKmxoNziHkVkYpR",
    type: "Free",
  },
  {
    name: "Fantasy Pros Podcast",
    desc: "Consensus rankings and expert advice hub in audio form.",
    applePodcastUrl: "https://podcasts.apple.com/us/podcast/fantasypros-fantasy-football-podcast/id1138942145",
    spotifyUrl: "https://open.spotify.com/show/1YM5ymt3vWVfdHzVAEzq2w",
    type: "Free",
  },
  {
    name: "Fantasy Football Focus",
    desc: "Daily news and strategic advice from the ESPN crew.",
    applePodcastUrl: "https://podcasts.apple.com/us/podcast/fantasy-focus-football/id260537420",
    spotifyUrl: "https://open.spotify.com/show/55toF30GeLKhJYGr3JPQpG",
    type: "Free",
  },
  {
    name: "Fantasy Football Today",
    desc: "CBS Sports' daily breakdown of every game and every player.",
    applePodcastUrl: "https://podcasts.apple.com/us/podcast/fantasy-football-today/id261735167",
    spotifyUrl: "https://open.spotify.com/show/2fEvGGxwXqSM8xuSNgxjFR",
    type: "Free",
  },
  {
    name: "Establish the Run",
    desc: "Elite analytics and projections from Evan Silva and Adam Levitan.",
    applePodcastUrl: "https://podcasts.apple.com/us/podcast/establish-the-run-fantasy-football/id1473055758",
    type: "Free",
  },
  {
    name: "The Late-Round Podcast",
    desc: "JJ Zachariason's data-driven approach to finding sleepers.",
    applePodcastUrl: "https://podcasts.apple.com/us/podcast/the-late-round-fantasy-football-podcast/id1224965828",
    type: "Free",
  },
];

const WEBSITES = [
  { name: "Fantasy Footballers", desc: "Expert rankings and high-quality draft/in-season tools.", type: "Premium", url: "https://www.thefantasyfootballers.com" },
  { name: "Fantasy Pros", desc: "Consensus rankings and the MyPlaybook tool suite.", type: "Freemium", url: "https://www.fantasypros.com" },
  { name: "DraftSharks", desc: "Fantasy football rankings, projections, draft tools, and analysis for preseason and in-season research.", type: "Free", url: "https://www.draftsharks.com/" },
  { name: "Fantasy Genius", desc: "Advanced league insights and custom Power Rankings.", type: "Free", url: "https://www.fantasygenius.io" },
  { name: "Rotowire", desc: "Real-time news updates and comprehensive stat tracking.", type: "Premium", url: "https://www.rotowire.com/football" },
  { name: "FTN Fantasy", desc: "Proprietary stats and elite betting/fantasy data.", type: "Premium", url: "https://ftnfantasy.com/nfl" },
  { name: "Reddit DynastyFF", desc: "The definitive community for dynasty league discussions.", type: "Free", url: "https://www.reddit.com/r/DynastyFF" },
  { name: "ESPN Fantasy", desc: "Standard league platform with news from the industry's biggest names.", type: "Free", url: "https://www.espn.com/fantasy/football" },
  { name: "CBS Sports", desc: "Expert draft prep and veteran fantasy analysis.", type: "Free", url: "https://www.cbssports.com/fantasy/football" },
  { name: "Yahoo Fantasy", desc: "Classic fantasy platform with deep analytical tools.", type: "Free", url: "https://football.fantasysports.yahoo.com" },
];

const ANALYZERS = [
  { name: "Fantasy Pros Trade", desc: "Syncs your Sleeper league for evaluation.", type: "Freemium", url: "https://www.fantasypros.com/nfl/myplaybook/trade-analyzer.php" },
  { name: "Rotowire Trade", desc: "Deep analytical breakdown of value exchanges.", type: "Premium", url: "https://www.rotowire.com/myleagues/nfl/trade-analyzer.php?id=338093" },
  { name: "FFBallers Trade", desc: "The FootClan's exclusive trade sanity checks.", type: "Premium", url: "https://www.thefantasyfootballers.com/footclan/trade-analyzer/" },
  { name: "KeepTradeCut", desc: "The market standard for dynasty values.", type: "Free", url: "https://keeptradecut.com/trade-calculator" },
  { name: "PFN Analyzer", desc: "Comprehensive trade tool from Pro Football Network.", type: "Free", url: "https://www.profootballnetwork.com/fantasy-football-trade-analyzer" },
  { name: "Fantasy Nerds", desc: "Aggregated trade advice from across the web.", type: "Freemium", url: "https://www.fantasynerds.com/nfl/trades" },
  { name: "Fantasy SP", desc: "Dynamic analyzer using real-time player trends.", type: "Freemium", url: "https://www.fantasysp.com/nfl_trade_analyzer" },
  { name: "FantasyCalc", desc: "Real trade data from thousands of actual leagues.", type: "Free", url: "https://www.fantasycalc.com/trade-calculator" },
  { name: "Reddit Analyzer", desc: "Community-driven trade feedback and discussion.", type: "Free", url: "https://www.reddit.com/r/TradeAnalyzerFF" },
];

export default function ResourcesPage() {
  const [activeTab, setActiveTab] = useState('playlists');
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const ResourceCard = ({ title, desc, url, type }: any) => (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md focus-within:ring-2 focus-within:ring-purple-600 sm:p-6"
    >
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none pr-12">
          {title}
        </h3>
        {type && (
          <span className={`absolute top-6 right-6 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm tracking-[0.2em] ${
            type === 'Premium' ? 'bg-orange-600 text-white border-orange-500' : 
            type === 'Freemium' ? 'bg-blue-600 text-white border-blue-500' :
            'bg-emerald-600 text-white border-emerald-500'
          }`}>
            {type}
          </span>
        )}
      </div>
      <p className="text-sm font-medium opacity-50 leading-relaxed flex-grow">{desc}</p>
      <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-orange-600 uppercase tracking-widest group-hover:gap-3 transition-all italic">
        Open Resource <ChevronRight size={14} />
      </div>
    </a>
  );

  const BroadcastCard = ({ name, desc, applePodcastUrl, spotifyUrl, type }: any) => (
    <div className="group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md sm:p-6">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-black uppercase italic tracking-tighter leading-none pr-12">
          {name}
        </h3>
        {type && (
          <span className="absolute top-6 right-6 text-[8px] font-black uppercase px-2 py-0.5 rounded-full border shadow-sm tracking-[0.2em] bg-emerald-600 text-white border-emerald-500">
            {type}
          </span>
        )}
      </div>
      <p className="text-sm font-medium opacity-50 leading-relaxed flex-grow">{desc}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <a
          href={applePodcastUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-black text-white px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-orange-600 dark:bg-white dark:text-black dark:hover:bg-orange-600 dark:hover:text-white"
        >
          Apple Podcasts
        </a>
        {spotifyUrl && (
          <a
            href={spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-emerald-600 text-white px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-emerald-500"
          >
            Spotify
          </a>
        )}
      </div>
    </div>
  );

  if (!mounted) return null;

  return (
    <SiteShell activePath="/league-info">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="resources-title">
          <Link href="/league-info" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:text-purple-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2">
            <ArrowLeft size={14} aria-hidden="true" /> Back to League Info
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-purple-700">League Info</p>
          <h1 id="resources-title" className="mt-2 font-sans text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl">River City Resources</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Broadcasts, reference sites, podcasts, and existing tools for the league.</p>
        </section>
        
        {/* TAB NAV */}
        <div className="mb-16">
          <div className="flex justify-center">
          <div role="tablist" aria-label="Resource categories" className="flex max-w-full flex-wrap justify-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            {[
              { id: 'playlists', icon: Music, label: 'Playlists', color: 'bg-red-600' },
              { id: 'podcasts', icon: Mic2, label: 'Broadcasts', color: 'bg-orange-600' },
              { id: 'websites', icon: Globe, label: 'Intelligence', color: 'bg-blue-600' },
              { id: 'analyzers', icon: BarChart3, label: 'Simulators', color: 'bg-emerald-600' }
            ].map((tab) => (
              <button 
                key={tab.id}
                type="button"
                role="tab"
                id={`resources-tab-${tab.id}`}
                aria-selected={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)} 
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2 ${
                  activeTab === tab.id ? `${tab.color} text-white shadow-sm` : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <tab.icon size={14} /> {tab.label}
              </button>
            ))}
          </div>
          </div>
          <p className="mt-3 text-center text-[9px] font-black uppercase tracking-[0.25em] opacity-30 sm:hidden">
            Swipe tabs for more
          </p>
        </div>

        {/* Playlists */}
        {activeTab === 'playlists' && (
          <div role="tabpanel" aria-labelledby={`resources-tab-${activeTab}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 border-l-4 border-red-600 pl-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">Draft Day <span className="text-red-600">Feed</span></h2>
                <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">Official War Room Audio</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {BROADCAST_FEED.map((p) => (
                <div key={p.year} className="relative overflow-hidden p-10 rounded-[2.5rem] shadow-xl flex items-center justify-between gap-6 transition-all hover:scale-[1.02] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 group">
                  <div className="relative z-10">
                    <span className="text-6xl font-black tracking-tighter italic uppercase">{p.year}</span>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] mt-1 text-red-600">{p.label}</p>
                    {p.title && <p className="mt-2 max-w-xs text-sm font-bold leading-5">{p.title}</p>}
                    <div className="mt-6 flex flex-wrap gap-2">
                      <a
                        href={p.appleMusicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-black text-white px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-red-600 dark:bg-white dark:text-black dark:hover:bg-red-600 dark:hover:text-white"
                      >
                        Apple Music
                      </a>
                      {p.spotifyUrl && (
                        <a
                          href={p.spotifyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-emerald-600 text-white px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all hover:bg-emerald-500"
                        >
                          Spotify
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="p-5 rounded-2xl bg-black/10 dark:bg-white/5 group-hover:bg-red-600 group-hover:text-white transition-colors">
                     <Music size={32} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Broadcasts/Podcasts */}
        {activeTab === 'podcasts' && (
          <div role="tabpanel" aria-labelledby={`resources-tab-${activeTab}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 border-l-4 border-orange-600 pl-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">Weekly <span className="text-orange-600">Broadcasts</span></h2>
                <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">In-Season Analysis</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {PODCASTS.map(pod => <BroadcastCard key={pod.name} {...pod} />)}
            </div>
          </div>
        )}

        {/* Intelligence Centers */}
        {activeTab === 'websites' && (
          <div role="tabpanel" aria-labelledby={`resources-tab-${activeTab}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 border-l-4 border-blue-600 pl-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">Intelligence <span className="text-blue-600">Centers</span></h2>
                <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">Expert Consensus & Data</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {WEBSITES.map(site => <ResourceCard key={site.name} title={site.name} desc={site.desc} url={site.url} type={site.type} />)}
            </div>
          </div>
        )}

        {/* Simulators */}
        {activeTab === 'analyzers' && (
          <div role="tabpanel" aria-labelledby={`resources-tab-${activeTab}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-10 border-l-4 border-emerald-600 pl-6">
                <h2 className="text-4xl font-black tracking-tighter uppercase italic">Scenario <span className="text-emerald-600">Analytics</span></h2>
                <p className="text-[10px] font-black opacity-30 uppercase tracking-widest mt-1">Trade Simulators & Calculators</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {ANALYZERS.map(tool => <ResourceCard key={tool.name} title={tool.name} desc={tool.desc} url={tool.url} type={tool.type} />)}
            </div>
          </div>
        )}

      </main>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </SiteShell>
  );
}
