'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { 
  Trophy, Users, BookOpen, Swords, ArrowRight, 
  MessageCircle, TrendingUp, X, FileText, Calendar, Crown, Book,
  CalendarDays, MapPin, Vote, Video, Gavel, UserCheck, Sun, Moon, Monitor, BrainCircuit
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { db } from "@/lib/firebase"; 
import { doc, getDoc, collection, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore"; 
import { getAllPlayers } from '@/lib/sleeper'; 

// --- CONFIGURATION ---
const COMMISH_ID = "342828350391230464"; 
const CURRENT_YEAR = 2025; 
const LEAGUE_ID_2026 = "1312149033254416384";

// UPDATED: Removed Jeffrey Hudgins and Landon Elliott (Co-owners)
const managers = [
  { name: "Aaron Dogg", id: "583513420586848256" },
  { name: "Brian Stevens", id: "343129212162523136" },
  { name: "David Besedich", id: "466663208728391680" },
  { name: "Doug Fordham", id: "73400761740312576" },
  { name: "JD Dowling", id: "342850391018356736" },
  { name: "Jordan Maslyn", id: "341412060426436608" },
  { name: "Rashad Gresham", id: "864186418971418624" },
  { name: "Ray Long", id: "342828350391230464" },
  { name: "Stan Schoppe", id: "1260048448384667648" },
  { name: "Tommy Moore", id: "342849293037608960" },
  { name: "Travis Miller", id: "342831451382841344" },
  { name: "Wade Cameron", id: "342838548870762496" }
];

export default function Home() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [showProjections, setShowProjections] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false); 
  const [projections, setProjections] = useState<any[]>([]);
  const [liveRecap, setLiveRecap] = useState("Loading latest trash talk..."); 

  // --- AI PREDICTOR STATE ---
  const [predictorTeams, setPredictorTeams] = useState<any[]>([]);
  const [loadingPredictor, setLoadingPredictor] = useState(true);

  // --- RSVP STATE ---
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [rsvpList, setRsvpList] = useState<any[]>([]);
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);

  // --- ICAL GENERATOR ---
  const downloadICS = (title: string, desc: string, start: string, end: string) => {
    const calendarData = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `SUMMARY:${title}`, `DESCRIPTION:${desc}`, `DTSTART:${start}`, `DTEND:${end}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\n');
    const blob = new Blob([calendarData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    setMounted(true);
    async function fetchRecap() {
      try {
        const docSnap = await getDoc(doc(db, "siteContent", "recap")); 
        if (docSnap.exists()) setLiveRecap(docSnap.data().text); 
      } catch (err) { console.error(err); }
    }
    fetchRecap();
    
    const unsubRsvp = onSnapshot(collection(db, "rsvps"), (snap) => {
      setRsvpList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    async function loadPredictorData() {
        try {
            const [uRes, rRes, players] = await Promise.all([
                fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID_2026}/users`),
                fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID_2026}/rosters`),
                getAllPlayers()
            ]);
            const users = await uRes.json();
            const rosters = await rRes.json();
            let total = 0;
            const scores = rosters.map((r: any) => {
                const val = r.players?.reduce((acc: number, pId: string) => acc + (players[pId]?.totalValueScore || 0), 0) || 0;
                const wins = r.settings.wins || 0;
                const losses = r.settings.losses || 0;
                const winPct = (wins + losses) > 0 ? wins / (wins + losses) : 0.5;
                const score = (val * 0.5) + (r.settings.fpts * 0.3) + (winPct * 1000);
                total += score;
                const user = users.find((u: any) => u.user_id === r.owner_id);
                return { name: user?.metadata?.team_name || user?.display_name || 'Team', score };
            });
            setPredictorTeams(scores.map((s: any) => ({ ...s, winProb: total > 0 ? (s.score / total) * 100 : 0 })).sort((a: any, b: any) => b.winProb - a.winProb));
            setLoadingPredictor(false);
        } catch (e) { console.error(e); }
    }
    loadPredictorData();

    setProjections([
      { name: "Aaron Hawkins", status: "Champion", rank: 1 },
      { name: "Travis Miller", status: "Runner Up", rank: 2 },
      { name: "JD Dowling", status: "3rd Place", rank: 3 },
      { name: "Ray Long", status: "Toilet Bowl", rank: 12 }
    ]);

    return () => unsubRsvp();
  }, []);

  const handleRsvp = async () => {
    if (!selectedManagerId) return;
    setIsSubmittingRsvp(true);
    const manager = managers.find(m => m.id === selectedManagerId);
    try {
      await setDoc(doc(db, "rsvps", selectedManagerId), {
        name: manager?.name,
        timestamp: serverTimestamp(),
        status: "Attending"
      });
    } catch (err) { console.error(err); } finally { setIsSubmittingRsvp(false); }
  };

  const events = [
    { 
      date: "March 21, 2026", event: "Spring Owners Meeting", desc: "9:30 AM start. Zoom Passcode: r727dL. Rule debates & Draft planning.", 
      icon: Gavel, color: "orange", start: "20260321T093000", end: "20260321T110000",
      link: "https://us04web.zoom.us/j/79182897961?pwd=fEGKPcKevhR5utbDk0K30nZzSI4yRg.1",
      gCalLink: "https://www.google.com/calendar/render?action=TEMPLATE&text=River+City+FFL+Spring+Meeting&dates=20260321T143000Z/20260321T160000Z"
    },
    { 
      date: "Mar 21 - Mar 28", event: "Official Voting Window", desc: "7-day window to cast ballots in the Legislative Hub before results lock.", 
      icon: Vote, color: "red", start: "20260321T110000", end: "20260328T235959",
      gCalLink: "https://www.google.com/calendar/render?action=TEMPLATE&text=FFL+Voting+Deadline&dates=20260321T160000Z/20260329T040000Z"
    },
    { 
      date: "Sept 4 - Sept 7", event: "2026 Draft Weekend", desc: "Labor Day Weekend Draft. Final location TBD at Spring Meeting.", 
      icon: MapPin, color: "emerald", start: "20260904T090000", end: "20260907T235900",
      gCalLink: "https://www.google.com/calendar/render?action=TEMPLATE&text=River+City+FFL+Draft+Weekend&dates=20260904/20260908"
    }
  ];

  if (!mounted) return null;

  const hasSelectedRsvp = rsvpList.some(r => r.id === selectedManagerId);

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-500">
      
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <div className="flex bg-black/5 dark:bg-white/5 p-1 rounded-lg border border-black/10 dark:border-white/10">
          <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-all ${theme === 'light' ? 'bg-white text-black shadow-sm' : 'opacity-40'}`}><Sun size={14} /></button>
          <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-all ${theme === 'dark' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Moon size={14} /></button>
          <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-all ${theme === 'system' ? 'bg-white/10 text-white shadow-sm' : 'opacity-40'}`}><Monitor size={14} /></button>
        </div>

        <div className="hidden sm:flex bg-black/5 dark:bg-white/5 p-1 rounded-xl border border-black/10 dark:border-white/10">
          <Link href="/managers" className="px-4 py-1.5 text-[10px] font-black uppercase italic opacity-40 hover:opacity-100 transition-all">Managers</Link>
          <Link href="/league-info" className="px-4 py-1.5 bg-orange-600 text-white rounded-lg text-[10px] font-black uppercase italic shadow-lg shadow-orange-900/20">Info Hub</Link>
          <Link href="/matchups" className="px-4 py-1.5 text-[10px] font-black uppercase italic opacity-40 hover:opacity-100 transition-all">Matchups</Link>
        </div>
      </nav>

      <header className="px-4 pt-12 pb-8 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full bg-white dark:bg-black shadow-xl border-2 border-black/5 dark:border-white/10 overflow-hidden relative">
            <Image src="/River City FFL Logo.JPG" alt="Logo" fill className="object-cover" priority unoptimized />
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">
            River City <span className="text-orange-600">FFL</span>
        </h1>
        <p className="mt-2 text-[10px] font-bold opacity-30 uppercase tracking-[0.4em]">Est. 2011 • Richmond, VA</p>
      </header>

      <main className="container mx-auto px-6 py-8 md:py-12 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mb-20">
          
          <div className="lg:col-span-2 space-y-6">
            {/* MAIN HERO CARD */}
            <button onClick={() => setShowHistoryModal(true)} className="w-full group relative bg-black/5 dark:bg-white/5 rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-2xl transition-all p-10 md:p-14 text-left overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Book size={180} /></div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/10 text-orange-600 text-[10px] font-black uppercase mb-6 italic tracking-widest"><Calendar size={12} /> Since 2011</div>
                    <h2 className="text-4xl md:text-7xl font-black text-black dark:text-white mb-6 leading-none uppercase italic tracking-tighter">The History of <br/><span className="text-orange-600">River City FFL</span></h2>
                    <p className="text-sm md:text-xl opacity-60 font-medium mb-10 max-w-lg leading-relaxed italic">Legacy, rivalries, and the roots of RVA's institution.</p>
                    <div className="flex items-center gap-2 text-orange-600 font-black uppercase italic tracking-widest group-hover:translate-x-2 transition-transform">Enter the Vault <ArrowRight size={24} /></div>
                </div>
            </button>

            {/* COMMISH CORNER UNDER HISTORY */}
            <div className="bg-[#0b1527] text-white p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/10 group">
                <MessageCircle size={100} className="absolute -top-4 -right-4 opacity-5 group-hover:scale-110 transition-transform" />
                <h3 className="text-xs font-black uppercase italic tracking-widest text-blue-400 mb-4">Commish Corner</h3>
                <h4 className="text-3xl font-black uppercase italic mb-4 leading-none">2026: The New Era</h4>
                <p className="text-sm text-white/50 italic mb-8 leading-relaxed line-clamp-3">{liveRecap}</p>
                <button onClick={() => setShowRecap(true)} className="w-full bg-blue-600 text-white text-[10px] font-black uppercase py-4 rounded-2xl hover:bg-blue-500 transition-all italic tracking-widest">Read Full Story</button>
            </div>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-black/5 dark:bg-white/5 rounded-[2.5rem] shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden text-center">
                <div className="bg-orange-600 p-3"><h3 className="text-[10px] font-black text-white uppercase tracking-widest italic">Reigning Champion</h3></div>
                <div className="p-8">
                    <div className="relative w-32 h-32 mx-auto mb-4 border-4 border-white dark:border-white/10 rounded-full shadow-xl overflow-hidden bg-black/20">
                        <Image src="/managers/Aaron.png" alt="Champ" fill className="object-cover" unoptimized />
                    </div>
                    <h2 className="text-2xl font-black dark:text-white uppercase italic tracking-tighter">Aaron Hawkins</h2>
                    <p className="text-[10px] opacity-40 font-black uppercase tracking-widest mt-1">Official 2025 Winner</p>
                    <div className="flex border-t border-black/5 dark:border-white/10 mt-6 pt-4">
                        <div className="w-1/2 border-r border-black/5 dark:border-white/10"><span className="text-[10px] opacity-30 font-black uppercase block mb-1">Record</span><span className="text-xl font-black italic">9-5</span></div>
                        <div className="w-1/2"><span className="text-[10px] opacity-30 font-black uppercase block mb-1">Year</span><span className="text-xl font-black italic">2025</span></div>
                    </div>
                </div>
            </div>

            <div className="bg-[#1e0a2e] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/10 group">
                <BrainCircuit size={100} className="absolute -top-4 -right-4 opacity-5 group-hover:scale-110 transition-transform duration-500" />
                
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-xs font-black uppercase italic tracking-widest text-fuchsia-400">AI Predictor</h3>
                        <p className="text-[10px] font-black uppercase opacity-40 italic">Championship Odds</p>
                    </div>
                    <TrendingUp size={16} className="text-fuchsia-500" />
                </div>

                <div className="space-y-4 mb-8">
                    {loadingPredictor ? (
                        <div className="animate-pulse flex items-center gap-2 opacity-20 font-black uppercase text-[10px]">Crunching Odds...</div>
                    ) : (
                        predictorTeams.slice(0, 5).map((team: any, idx: number) => (
                            <Link key={idx} href="/predictor" className="flex items-center justify-between border-b border-white/5 pb-2 hover:bg-white/5 transition-colors group/row">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black opacity-30 italic">#{idx + 1}</span>
                                    <span className="text-xs font-black uppercase italic truncate max-w-[140px] group-hover/row:text-fuchsia-400 transition-colors">{team.name}</span>
                                </div>
                                <span className="text-xs font-black text-fuchsia-400">{team.winProb.toFixed(1)}%</span>
                            </Link>
                        ))
                    )}
                </div>

                <Link href="/predictor" className="flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-fuchsia-400 transition-colors">
                    See Full League Odds <ArrowRight size={14} />
                </Link>
            </div>
          </div>
        </div>

        <section className="mt-24 border-t border-black/5 dark:border-white/10 pt-16">
          <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-12 px-2">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <CalendarDays className="text-orange-600" size={40} />
                    <h2 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">2026 Schedule</h2>
                </div>
                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.4em] ml-1">The Legislative & Draft Cycle</p>
            </div>

            <div className="bg-black/5 dark:bg-white/5 p-5 rounded-[2.5rem] border border-black/5 dark:border-white/10 flex flex-col lg:flex-row items-center gap-5 w-full md:w-auto shadow-xl">
                <div className="flex items-center gap-2 px-2 text-emerald-600">
                    <UserCheck size={20} />
                    <span className="text-[11px] font-black uppercase italic">{rsvpList.length} Confirmed for Draft</span>
                </div>
                <select className="bg-white dark:bg-black/40 text-[10px] font-black uppercase italic px-5 py-3 rounded-2xl outline-none border border-black/5 dark:border-white/10 w-full lg:w-60" value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}>
                    <option value="">Verify Manager Identity</option>
                    {managers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
                <button onClick={handleRsvp} disabled={!selectedManagerId || hasSelectedRsvp || isSubmittingRsvp} className={`w-full lg:w-auto px-8 py-3 rounded-2xl text-[10px] font-black uppercase italic tracking-widest transition-all ${hasSelectedRsvp ? 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20' : 'bg-emerald-600 text-white shadow-xl hover:scale-105 active:scale-95'} disabled:opacity-50`}>
                    {hasSelectedRsvp ? "Attendance Confirmed" : "Confirm Attendance"}
                </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {events.map((item, idx) => (
              <div key={idx} className="bg-black/5 dark:bg-white/5 p-10 rounded-[3rem] border border-black/5 dark:border-white/10 shadow-xl flex flex-col h-full group hover:border-orange-600/30 transition-all">
                <div className="w-16 h-16 bg-white dark:bg-white/5 rounded-[1.5rem] flex items-center justify-center text-orange-600 mb-8 shadow-md group-hover:scale-110 transition-all duration-500"><item.icon size={32} /></div>
                <p className="text-[11px] font-black uppercase opacity-30 tracking-[0.3em] mb-2">{item.date}</p>
                <h3 className="text-2xl font-black uppercase italic mb-4 tracking-tighter">{item.event}</h3>
                <p className="text-sm opacity-50 font-medium leading-relaxed mb-12 flex-grow italic">{item.desc}</p>
                <div className="flex flex-col gap-3">
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 italic shadow-lg shadow-orange-900/20 hover:bg-orange-500 transition-colors"><Video size={16} /> Enter Zoom Chamber</a>
                  )}
                  <a href={item.gCalLink} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 italic shadow-lg shadow-blue-900/20 hover:bg-blue-500 transition-colors">Add to Google</a>
                  <button onClick={() => downloadICS(item.event, item.desc, item.start, item.end)} className="w-full bg-black/10 dark:bg-white/5 text-black dark:text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 italic hover:bg-black/20 transition-all opacity-40 hover:opacity-100">Export .ics</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {showHistoryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in" onClick={() => setShowHistoryModal(false)}>
            <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-2xl rounded-[3rem] p-10 md:p-14 relative shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowHistoryModal(false)} className="absolute top-8 right-8 text-gray-400 hover:text-orange-600 transition-colors"><X size={32} /></button>
                <div className="max-h-[75vh] overflow-y-auto space-y-8 pr-4 custom-scrollbar">
                    <h3 className="text-4xl font-black uppercase italic tracking-tighter underline decoration-orange-600 decoration-8 underline-offset-4 mb-10">The Annals</h3>
                    <div className="space-y-6 text-lg leading-relaxed opacity-70 italic font-medium">
                        <p>Area 10 FFL was born in 2011, founded by a small group from Area 10 church with a simple goal: connect over fantasy football. As members moved, the bond held firm, leading to the 2019 rebrand to River City FFL.</p>
                        <p>Tommy Moore reigns as the five-time king, while Landon Elliott holds the infamous record of three Toilet Bowl apologies. To this day, the league remains a testament to enduring Richmond friendships.</p>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showRecap && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in" onClick={() => setShowRecap(false)}>
            <div className="bg-[#0b1527] w-full max-w-lg rounded-[2.5rem] p-10 border border-blue-500/30 text-white relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowRecap(false)} className="absolute top-6 right-6 opacity-40 hover:opacity-100"><X size={24} /></button>
                <div className="flex items-center gap-3 mb-8"><MessageCircle className="text-blue-400" size={32} /><h3 className="text-2xl font-black uppercase italic tracking-tighter">Commish Recap</h3></div>
                <div className="text-sm italic text-white/70 whitespace-pre-wrap leading-loose max-h-[50vh] overflow-y-auto pr-4 custom-scrollbar">{liveRecap}</div>
            </div>
        </div>
      )}

      {showProjections && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 animate-in fade-in" onClick={() => setShowProjections(false)}>
            <div className="bg-white dark:bg-[#0a0a0a] w-full max-w-lg rounded-[2.5rem] overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
                <div className="p-6 bg-purple-900 text-white flex justify-between items-center"><h3 className="text-xl font-black uppercase italic tracking-widest">2025 Final Standings</h3><button onClick={() => setShowProjections(false)}><X size={24} /></button></div>
                <div className="p-4"><table className="w-full text-left text-sm"><tbody className="divide-y divide-black/5 dark:divide-white/5">{projections.map(team => (<tr key={team.rank} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors"><td className="py-4 font-mono opacity-40">#{team.rank}</td><td className="py-4 font-black uppercase italic text-orange-600">{team.name}</td><td className="py-4 text-right uppercase font-black text-xs opacity-60 tracking-widest">{team.status}</td></tr>))}</tbody></table></div>
            </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}