'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Trophy, Users, BookOpen, Swords, ArrowRight, 
  MessageCircle, TrendingUp, X, FileText, Calendar, Crown, Book,
  CalendarDays, MapPin, Vote, Video, Plus, Gavel
} from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';

// --- FIREBASE IMPORTS ---
import { db } from "@/lib/firebase"; 
import { doc, getDoc } from "firebase/firestore"; 

// --- CONFIGURATION ---
const COMMISH_ID = "342828350391230464"; 
const CURRENT_YEAR = 2025; 

export default function Home() {
  const [showRecap, setShowRecap] = useState(false);
  const [showProjections, setShowProjections] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false); 
  
  const [projections, setProjections] = useState<any[]>([]);
  const [loadingProjections, setLoadingProjections] = useState(true);
  const [liveRecap, setLiveRecap] = useState("Loading latest trash talk..."); 

  // --- ICAL GENERATOR ---
  const downloadICS = (title: string, desc: string, start: string, end: string) => {
    const calendarData = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:${title}`,
      `DESCRIPTION:${desc}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\n');

    const blob = new Blob([calendarData], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `${title.replace(/\s+/g, '_')}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- FETCH LIVE COMMISH RECAP FROM FIREBASE ---
  useEffect(() => {
    async function fetchRecap() {
      try {
        const docRef = doc(db, "siteContent", "recap"); 
        const docSnap = await getDoc(docRef); 
        if (docSnap.exists()) { 
          setLiveRecap(docSnap.data().text); 
        }
      } catch (err) { 
        console.error("Error fetching recap:", err);
        setLiveRecap("The 2025 campaign has concluded. Aaron Hawkins surged through the playoffs to claim the throne. Meanwhile, Commish Ray Long has claimed the Toilet Bowl—we await the apology letter.");
      }
    }
    fetchRecap();
  }, []);

  // --- FETCH SLEEPER DATA ---
  useEffect(() => {
    async function fetchPlayoffStatus() {
      try {
        const leagueRes = await fetch(`https://api.sleeper.app/v1/user/${COMMISH_ID}/leagues/nfl/${CURRENT_YEAR}`);
        const leagues = await leagueRes.json();
        const myLeague = leagues.find((l: any) => l.name.includes("River City"));
        if (!myLeague) return;

        const finalStandings = [
          { name: "Aaron Hawkins", pct: "100", status: "Champion", color: "bg-yellow-500", rank: 1 },
          { name: "Travis Miller", pct: "85.0", status: "Runner Up", color: "bg-gray-400", rank: 2 },
          { name: "JD Dowling", pct: "70.0", status: "3rd Place", color: "bg-orange-600", rank: 3 },
          { name: "Ray Long", pct: "0.0", status: "Toilet Bowl", color: "bg-red-800", rank: 12 }
        ];
        setProjections(finalStandings);
      } catch (err) { console.error(err); }
      finally { setLoadingProjections(false); }
    }
    fetchPlayoffStatus();
  }, []);

  // --- CALENDAR DATA ---
  const events = [
    { 
      date: "March 2, 2026", 
      event: "Spring Owners Meeting", 
      desc: "9:30 AM start. Debate 2026 rule proposals. Voting window opens.", 
      icon: Gavel, 
      color: "orange",
      location: "Google Meet",
      start: "20260320T203000",
      end: "20260320T220000",
      link: "https://meet.google.com/your-meeting-id", 
      gCalLink: "https://www.google.com/calendar/render?action=TEMPLATE&text=River+City+FFL+Spring+Meeting&dates=20260321T003000Z/20260321T020000Z&details=Debate+2026+proposals.&location=Google+Meet"
    },
    { 
      date: "Mar 21 - Mar 28", 
      event: "Official Voting Window", 
      desc: "7-day window to cast ballots in the Legislative Hub before results lock.", 
      icon: Vote, 
      color: "red",
      start: "20260320T220000",
      end: "20260327T235959",
      gCalLink: "https://www.google.com/calendar/render?action=TEMPLATE&text=FFL+Voting+Deadline&dates=20260321T020000Z/20260328T040000Z&details=Cast+final+ballots+in+the+Hub."
    },
    { 
      date: "Sept 4 - Sept 7", 
      event: "2026 Draft Weekend", 
      desc: "Labor Day Weekend Draft. Final location (RVA vs. Getaway) TBD at Spring Meeting.", 
      icon: MapPin, 
      color: "emerald",
      start: "20260904T090000",
      end: "20260907T235900",
      gCalLink: "https://www.google.com/calendar/render?action=TEMPLATE&text=River+City+FFL+Draft+Weekend&dates=20260904/20260908&details=Labor+Day+Weekend+Draft+Logistics."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#121212] transition-colors duration-300 font-sans selection:bg-orange-500 selection:text-white pb-20">
      
      <header className="border-b border-gray-200 dark:border-white/10 bg-linear-to-b from-gray-50 to-white dark:from-[#1a1a1a] dark:to-[#121212] pb-4 md:pb-8 pt-4 shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 text-center relative text-gray-900">
          <div className="absolute top-2 right-2 md:top-4 md:right-4 scale-75 md:scale-100"><ModeToggle /></div>
          <div className="mx-auto mb-4 md:mb-6 flex h-16 w-16 md:h-24 md:w-24 items-center justify-center rounded-full bg-white dark:bg-linear-to-br dark:from-[#2c2c2c] dark:to-[#1a1a1a] shadow-xl border-2 md:border-4 border-gray-100 dark:border-white/5 overflow-hidden relative">
             <Image src="/River City FFL Logo.JPG" alt="River City FFL Logo" fill className="object-cover" priority unoptimized />
          </div>
          <h1 className="mb-1 text-2xl font-extrabold tracking-tighter text-gray-900 dark:text-[#f0c340] md:text-5xl uppercase drop-shadow-sm">River City <span className="text-orange-600 dark:text-white">FFL</span></h1>
          <p className="text-[10px] md:text-xs font-bold text-gray-400 uppercase tracking-[0.2em] mb-4 md:mb-8 text-gray-900">Est. 2011 • Richmond, VA</p>
          <nav className="flex flex-wrap justify-center gap-2 md:gap-4 mb-4 md:mb-8 text-gray-900">
            <Link href="/" className="flex items-center gap-1 md:gap-2 rounded-full bg-orange-600 dark:bg-[#ff5722] text-white shadow-lg px-4 md:px-6 py-1.5 md:py-2 text-[10px] md:text-sm font-bold"><Trophy className="w-3 h-3 md:w-4 md:h-4" />Home</Link>
            <Link href="/managers" className="flex items-center gap-1 md:gap-2 rounded-full bg-white border border-gray-200 text-gray-700 dark:bg-[#2c2c2c] dark:border-white/10 dark:text-gray-300 px-4 md:px-6 py-1.5 md:py-2 text-[10px] md:text-sm transition"><Users className="w-3 h-3 md:w-4 md:h-4" />Managers</Link>
            <Link href="/league-info" className="flex items-center gap-1 md:gap-2 rounded-full bg-white border border-gray-200 text-gray-700 dark:bg-[#2c2c2c] dark:border-white/10 dark:text-gray-300 px-4 md:px-6 py-1.5 md:py-2 text-[10px] md:text-sm transition"><BookOpen className="w-3 h-3 md:w-4 md:h-4" />Info</Link>
            <Link href="/matchups" className="flex items-center gap-1 md:gap-2 rounded-full bg-white border border-gray-200 text-gray-700 dark:bg-[#2c2c2c] dark:border-white/10 dark:text-gray-300 px-4 md:px-6 py-1.5 md:py-2 text-[10px] md:text-sm transition"><Swords className="h-3 w-3 md:h-4 md:w-4" />Matchups</Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 md:py-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start mb-16">
          
          {/* HISTORY PREVIEW CARD */}
          <div className="lg:col-span-2 text-gray-900">
            <button onClick={() => setShowHistoryModal(true)} className="w-full group relative bg-white dark:bg-[#1e1e1e] rounded-3xl border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all p-8 md:p-12 text-left">
                <div className="absolute top-0 right-0 p-8 opacity-5"><Book className="w-32 h-32 md:w-48 md:h-48" /></div>
                <div className="relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 text-[10px] font-bold uppercase mb-6"><Calendar className="w-3 h-3" /> Since 2011</div>
                    <h2 className="text-3xl md:text-5xl font-black text-gray-900 dark:text-white mb-4 leading-tight">The History of <br/><span className="text-orange-600">River City FFL</span></h2>
                    <p className="text-sm md:text-lg text-gray-500 mb-8 max-w-md">Legacy, rivalries, and the roots of RVA's most enduring league.</p>
                    <div className="flex items-center gap-2 text-orange-600 font-bold group-hover:translate-x-2 transition-transform">Open the Book <ArrowRight className="w-5 h-5" /></div>
                </div>
            </button>
          </div>

          <div className="space-y-4 md:space-y-6">
            {/* REIGNING CHAMPION */}
            <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-sm border border-gray-200 dark:border-white/5 overflow-hidden text-center group transition-all text-gray-900">
                <div className="bg-gradient-to-r from-[#FF4500] to-[#FF0000] p-3"><h3 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Reigning Champion</h3></div>
                <div className="p-4 md:p-6">
                    <div className="relative w-20 h-20 md:w-28 md:h-28 mx-auto mb-4">
                        <Image src="/managers/Aaron.png" alt="Champion" fill className="object-cover rounded-full border-4 border-white dark:border-[#2a2a2a]" unoptimized />
                        <div className="absolute -bottom-1 -right-1 bg-yellow-400 text-yellow-900 p-1 md:p-1.5 rounded-full border-2 border-white dark:border-[#2a2a2a] shadow-sm"><Trophy className="w-4 h-4 md:w-5 md:h-5" /></div>
                    </div>
                    <h2 className="text-lg md:text-2xl font-black dark:text-white uppercase leading-none">Aaron Hawkins</h2>
                    <p className="text-[10px] md:text-xs text-gray-500 font-medium mb-4 uppercase tracking-widest">Official 2025 Winner</p>
                    <div className="flex border-t border-gray-100 dark:border-white/5 pt-3">
                        <div className="w-1/2 border-r border-gray-100 dark:border-white/5"><span className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-tight">Record</span><span className="block text-sm md:text-lg font-black dark:text-white">9-5</span></div>
                        <div className="w-1/2"><span className="text-[8px] md:text-[10px] text-gray-400 font-bold uppercase tracking-tight">Year</span><span className="block text-sm md:text-lg font-black dark:text-white">2025</span></div>
                    </div>
                </div>
            </div>

            {/* COMMISSIONER CORNER */}
            <div className="bg-[#0B1527] text-white p-5 md:p-6 rounded-2xl shadow-lg relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 p-4 opacity-10"><FileText className="w-16 h-16 md:w-24 md:h-24" /></div>
                <div className="flex items-center gap-3 mb-4 relative z-10"><MessageCircle className="w-5 h-5 text-blue-400" /><div><h3 className="text-xs font-bold uppercase text-white">Commissioner's Corner</h3><p className="text-[10px] text-blue-300 uppercase tracking-wider">Season Finale Recap</p></div></div>
                <h4 className="text-sm md:text-lg font-bold mb-2 relative z-10">2025: A New Era Begins</h4>
                <p className="text-xs text-gray-300 leading-relaxed mb-4 md:mb-6 relative z-10 line-clamp-3 md:line-clamp-5">{liveRecap}</p>
                <button onClick={() => setShowRecap(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-[10px] md:text-xs font-bold py-2 md:py-2.5 rounded-lg mb-3 transition-colors">Read Full Recap</button>
            </div>

            {/* AI PREDICTOR / STANDINGS */}
            <div className="bg-[#3b0764] text-white p-5 md:p-6 rounded-2xl shadow-lg relative overflow-hidden border border-white/5">
                <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-24 h-24 md:w-32 md:h-32" /></div>
                <div className="flex items-center gap-3 mb-4 md:mb-6 relative z-10">
                    <div className="p-2 bg-fuchsia-500/20 rounded-lg text-fuchsia-300"><TrendingUp className="w-5 h-5" /></div>
                    <div><h3 className="text-sm md:text-lg font-bold text-white">AI Season Predictor</h3><p className="text-[10px] text-fuchsia-300 uppercase tracking-wider">Final Standings</p></div>
                </div>
                <div className="relative z-10 mb-6 italic text-xs leading-relaxed text-fuchsia-100">
                    "The 2025 campaign belongs to **Aaron Hawkins**. After a solid 9-5 season, he proved unstoppable in the playoffs."
                </div>
                <button onClick={() => setShowProjections(true)} className="w-full bg-fuchsia-900/50 hover:bg-fuchsia-800 border border-fuchsia-500/30 text-white text-[10px] md:text-xs font-bold py-2 md:py-2.5 rounded-lg transition-colors relative z-10">View 2025 Standings</button>
            </div>
          </div>
        </div>

        {/* --- DYNAMIC CALENDAR SECTION --- */}
        <section className="mt-16 border-t dark:border-white/5 pt-12">
          <div className="flex items-center gap-3 mb-8">
            <CalendarDays className="text-orange-600 w-8 h-8" />
            <h2 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 dark:text-white">
              2026 Important Dates
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((item, idx) => (
              <div key={idx} className="bg-white dark:bg-[#1e1e1e] p-8 rounded-[2.5rem] border border-gray-100 dark:border-white/5 shadow-sm flex flex-col h-full hover:shadow-xl transition-all duration-300">
                <div className={`w-12 h-12 bg-${item.color}-100 dark:bg-${item.color}-900/20 rounded-2xl flex items-center justify-center text-${item.color}-600 mb-6`}>
                  <item.icon size={24} />
                </div>
                
                <p className="text-[11px] font-black uppercase text-gray-400 tracking-widest mb-1">{item.date}</p>
                <h3 className="text-xl font-black uppercase text-gray-900 dark:text-white mb-3 tracking-tight">{item.event}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed mb-8 flex-grow">{item.desc}</p>

                <div className="flex flex-col gap-2">
                  {item.link && (
                    <a href={item.link} target="_blank" rel="noopener noreferrer" className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold text-xs uppercase flex items-center justify-center gap-2 hover:bg-orange-700 transition">
                      <Video size={14} /> Join Meeting
                    </a>
                  )}
                  <a href={item.gCalLink} target="_blank" rel="noopener noreferrer" className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-blue-700 transition">
                    Add to Google
                  </a>
                  <button 
                    onClick={() => downloadICS(item.event, item.desc, item.start, item.end)}
                    className="w-full bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-white/10 transition"
                  >
                    Add to iCal / Outlook
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      {/* HISTORY MODAL WITH FULL STORY */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300 text-gray-900" onClick={() => setShowHistoryModal(false)}>
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-2xl rounded-3xl overflow-hidden relative p-8 md:p-12 shadow-2xl" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowHistoryModal(false)} className="absolute top-4 right-4 p-2 text-gray-500 hover:text-orange-600 transition-colors z-20"><X className="w-6 h-6" /></button>
                
                <div className="max-h-[85vh] overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                    <div className="flex items-center gap-3 mb-4">
                        <Book className="w-8 h-8 text-orange-600" />
                        <h3 className="text-3xl font-black dark:text-white uppercase tracking-tight italic">The League Annals</h3>
                    </div>
                    
                    <div className="prose prose-sm md:prose-base dark:prose-invert text-gray-600 dark:text-gray-300 leading-relaxed">
                        <section>
                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-3">Our History: From Roots to RVA</h4>
                            <p>
                                <strong>Area 10 FFL</strong> was born in 2011, founded by a small group from Area 10 church with a simple goal: to create a community beyond Sunday services and small groups. It was a space for new members and longtime attendees to connect over a shared passion for fantasy football.
                            </p>
                            <p>
                                As time passed, life happened. Core members moved away, but the bond forged over draft picks and weekly matchups held firm. In 2019, to keep our league together and honor our enduring friendships, we decided to rebrand. We shed the church affiliation and became <strong>River City FFL</strong>, a name that proudly ties us to the heart of Richmond, Virginia—the RVA.
                            </p>
                        </section>

                        <section className="bg-gray-50 dark:bg-white/5 p-6 rounded-2xl border border-gray-100 dark:border-white/5 my-8">
                            <h4 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-3 italic underline decoration-orange-600">The Stakes</h4>
                            <p>
                                Every season, our managers compete for a place in the record books. The ultimate champion walks away with a <strong>$219 payout</strong>, a custom championship ring, and all the bragging rights they can handle. So far, <strong>Tommy Moore</strong> is the one to beat, holding an impressive five league titles.
                            </p>
                            <p>
                                But not every story has a happy ending. Our league has its own unique form of punishment: the <strong>Toilet Bowl</strong>. The loser is tasked with writing a cringe-worthy apology letter to the league, a tradition that started in 2022. No one knows this struggle better than <strong>Landon Elliott</strong>, who has endured this particular brand of humiliation a record three times.
                            </p>
                        </section>

                        <section>
                            <p className="italic font-medium">
                                While the competition gets more intense each year, our core values of community and friendly rivalry remain the same. The trophy, the payout, and the shame are all just bonuses to the friendships we've built along the way.
                            </p>
                        </section>

                        <div className="pt-8 text-center">
                            <Link href="/league-info/trophy-room" className="inline-flex items-center justify-center w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-700 transition-all shadow-lg hover:scale-[1.02]">
                                <Trophy className="w-6 h-6 mr-3" /> Visit the Trophy Room
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* COMMISSIONER RECAP MODAL */}
      {showRecap && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowRecap(false)}>
            <div className="bg-[#0B1527] w-full max-w-lg rounded-2xl shadow-2xl border border-blue-500/30 overflow-hidden relative text-white" onClick={e => e.stopPropagation()}>
                <div className="absolute top-0 right-0 p-4"><button onClick={() => setShowRecap(false)} className="text-blue-300 hover:text-white transition-colors"><X className="w-6 h-6" /></button></div>
                <div className="p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6"><MessageCircle className="w-6 h-6 text-blue-400" /><div><h3 className="text-lg font-bold uppercase tracking-wide">Commissioner's Corner</h3><p className="text-xs text-blue-300 uppercase tracking-wider">The 2025 Story</p></div></div>
                    <div className="prose prose-sm prose-invert leading-relaxed text-gray-300 whitespace-pre-wrap max-h-[60vh] overflow-y-auto pr-2">{liveRecap}</div>
                </div>
            </div>
        </div>
      )}

      {/* STANDINGS MODAL */}
      {showProjections && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowProjections(false)}>
            <div className="bg-white dark:bg-[#1e1e1e] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-4 md:p-5 bg-gradient-to-r from-purple-900 to-indigo-900 flex justify-between items-center text-white">
                    <div className="flex items-center gap-2 md:gap-3"><TrendingUp className="w-4 h-4 md:w-5 md:h-5" /><div><h3 className="text-base md:text-lg font-black uppercase">Final 2025 Standings</h3><p className="text-[10px] text-purple-200 uppercase tracking-tighter">Season complete</p></div></div>
                    <button onClick={() => setShowProjections(false)} className="text-white/50 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    <table className="w-full text-left text-[10px] md:text-sm">
                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-bold uppercase"><tr><th className="px-3 py-3">Rank</th><th className="px-3 py-3">Owner</th><th className="px-3 py-3 text-right">Finish</th></tr></thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                            {projections.map((team) => (
                                <tr key={team.rank} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                    <td className="px-3 py-3 font-mono text-gray-400">#{team.rank}</td>
                                    <td className="px-3 py-3 font-bold text-gray-900 dark:text-white flex items-center gap-2">{team.rank <= 3 && <Crown className="w-3 h-3 text-yellow-500" />}<span>{team.name}</span></td>
                                    <td className="px-3 py-3 text-right font-mono text-gray-900 dark:text-white uppercase">{team.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* GLOBAL CUSTOM SCROLLBAR STYLE */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
}