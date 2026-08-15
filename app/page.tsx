"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Calendar, CalendarDays, Gavel, Menu, MessageCircle, TrendingUp, X } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { RSVP_ATTENDEES, resolveRsvpAttendee } from "@/lib/rsvpAttendees";

const RECAP_LOADING_TEXT = "Loading latest league note...";
const RECAP_FALLBACK_TEXT = "Commish recap could not be loaded. Check back soon for the latest league update.";
const DRAFT_START_AT = new Date("2026-08-29T10:00:00-04:00");
const PUBLIC_AUCTION_VALUE_STATUS = "Values ready";
const PUBLIC_ADP_STATUS = "ADP ready";

function getDraftCountdownLabel(now: Date) {
  const millisecondsUntilDraft = DRAFT_START_AT.getTime() - now.getTime();
  if (millisecondsUntilDraft <= 0) return "Draft window open";
  const days = Math.ceil(millisecondsUntilDraft / (1000 * 60 * 60 * 24));
  return `${days} day${days === 1 ? "" : "s"} to draft`;
}

const mobileNavLinks = [
  ["Home", "/"], ["Managers", "/managers"], ["League Info", "/league-info"], ["Commish", "/commish"], ["Matchups", "/matchups"],
  ["Power Rankings", "/predictor"], ["History", "/history"], ["Rivalries", "/league-info/rivalries"],
];

const managers = RSVP_ATTENDEES.map((attendee) => [attendee.name, attendee.id] as const);

type DashboardCardProps = { label: string; icon?: ReactNode; children: ReactNode; accent?: boolean };

function DashboardCard({ label, icon, children, accent = false }: DashboardCardProps) {
  return <section className={`min-w-0 rounded-2xl border bg-white p-5 shadow-sm dark:bg-[#121212] sm:p-6 md:col-span-1 lg:col-span-4 ${accent ? "border-blue-600/60 ring-1 ring-blue-600/20" : "border-slate-900/10 dark:border-white/10"}`}>
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60">{icon}<span>{label}</span></div>
    {children}
  </section>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return <div className="min-w-0 rounded-lg bg-slate-100 p-3 dark:bg-white/5"><p className="break-words text-[9px] font-black uppercase leading-4 tracking-widest text-slate-400">{label}</p><p className="mt-1 break-words text-sm font-black">{value}</p></div>;
}

export default function Home() {
  const [showRecap, setShowRecap] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [liveRecap, setLiveRecap] = useState(RECAP_LOADING_TEXT);
  const [predictorTeams, setPredictorTeams] = useState<any[]>([]);
  const [loadingPredictor, setLoadingPredictor] = useState(true);
  const [predictorError, setPredictorError] = useState<string | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [rsvpList, setRsvpList] = useState<any[]>([]);
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [publicFinance, setPublicFinance] = useState<{
    duesPool: string | null;
    duesCollected: string | null;
    duesOutstanding: string | null;
    paidCount: number;
    notPaidCount: number;
    championshipAllocation: string | null;
    projectedChampionCash: string | null;
  } | null>(null);

  useEffect(() => {
    const closeModalsOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowHistoryModal(false);
      setShowRecap(false);
    };
    window.addEventListener("keydown", closeModalsOnEscape);

    async function fetchRecap() {
      try {
        const snapshot = await getDoc(doc(db, "siteContent", "recap"));
        const text = snapshot.exists() ? snapshot.data().text : null;
        setLiveRecap(typeof text === "string" && text.trim() ? text : RECAP_FALLBACK_TEXT);
      } catch {
        setLiveRecap(RECAP_FALLBACK_TEXT);
      }
    }
    fetchRecap();
    fetch("/api/public-finance/summary")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Public finance unavailable")))
      .then(setPublicFinance)
      .catch(() => setPublicFinance(null));
    const unsubscribe = onSnapshot(collection(db, "rsvps"), (snapshot) => {
      const normalized = snapshot.docs.flatMap((entry) => {
        const attendee = resolveRsvpAttendee(entry.id);
        return attendee ? [{ id: attendee.id, ...entry.data() }] : [];
      });
      setRsvpList(Array.from(new Map(normalized.map((entry) => [entry.id, entry])).values()));
    });

    async function loadPredictorData() {
      try {
        const response = await fetch("/api/power-rankings");
        if (!response.ok) throw new Error("Power rankings data could not be loaded.");
        const payload = await response.json();
        if (!Array.isArray(payload.teams) || payload.teams.length === 0) throw new Error("Power rankings data could not be loaded.");
        setPredictorTeams(payload.teams);
      } catch (error) {
        console.error(error);
        setPredictorError("Power rankings data could not be loaded.");
      } finally {
        setLoadingPredictor(false);
      }
    }
    loadPredictorData();
    return () => {
      window.removeEventListener("keydown", closeModalsOnEscape);
      unsubscribe();
    };
  }, []);

  const handleRsvp = async () => {
    if (!selectedManagerId) return;
    setIsSubmittingRsvp(true);
    try {
      const response = await fetch("/api/rsvps", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ managerId: selectedManagerId }) });
      if (!response.ok) throw new Error("RSVP request failed.");
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingRsvp(false);
    }
  };

  const event = { date: "August 29, 2026", event: "2026 Draft Day", desc: "10:00 AM - 3:00 PM. Location: TBD.", gCalLink: "https://calendar.app.google/QYqFqoGATsB9rkxb8" };
  const hasSelectedRsvp = rsvpList.some((entry) => resolveRsvpAttendee(entry.id)?.id === selectedManagerId);
  const draftCountdownLabel = getDraftCountdownLabel(new Date());

  return <div className="min-h-screen bg-[#f7f8fa] text-slate-950 dark:bg-[#0a0a0a] dark:text-white">
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#071a33]/95 px-4 py-3 text-white backdrop-blur-md sm:px-6"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex min-w-0 items-center gap-3" aria-label="River City FFL home"><span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white"><Image src="/River City FFL Logo.JPG" alt="" fill className="object-cover" unoptimized /></span><span className="hidden min-w-0 sm:block"><span className="block text-lg font-black uppercase italic leading-none">River City FFL</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.18em] text-white/55">A tradition of competition</span></span></Link><div className="hidden items-center gap-1 lg:flex">{[["Home", "/"], ["Matchups", "/matchups"], ["Managers", "/managers"], ["Rivalries", "/league-info/rivalries"], ["History", "/history"], ["League Info", "/league-info"]].map(([label, href]) => <Link key={href} href={href} aria-current={href === "/" ? "page" : undefined} className={`rounded-md px-3 py-2 text-[10px] font-black uppercase transition ${href === "/" ? "border-b-2 border-amber-400 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>{label}</Link>)}<Link href="/commish" className="ml-3 rounded-md border border-white/35 px-4 py-2 text-[10px] font-black uppercase text-white transition hover:bg-white/10">Commissioner Hub</Link></div><button type="button" aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isMobileMenuOpen} aria-controls="home-mobile-navigation" onClick={() => setIsMobileMenuOpen((open) => !open)} className="rounded-lg border border-white/25 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:hidden">{isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}</button></div>{isMobileMenuOpen && <div id="home-mobile-navigation" className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-2 rounded-xl border border-white/15 bg-[#0b2444] p-3 lg:hidden">{mobileNavLinks.map(([label, href]) => <Link key={href} href={href} onClick={() => setIsMobileMenuOpen(false)} className="rounded-lg border border-white/10 px-3 py-3 text-[9px] font-black uppercase tracking-widest text-white/75 hover:bg-white/10">{label}</Link>)}</div>}</nav>
    <header className="mx-auto max-w-7xl px-4 pb-6 pt-8 sm:px-6 lg:px-8"><div className="flex items-center gap-4"><div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg"><Image src="/River City FFL Logo.JPG" alt="River City FFL logo" fill className="object-cover" priority unoptimized /></div><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">River City FFL</p><h1 className="mt-1 text-4xl font-black uppercase italic tracking-tighter sm:text-5xl">2026 League Dashboard</h1><p className="mt-1 text-xs font-medium text-slate-500 dark:text-white/50">Est. 2011 · Richmond, Virginia</p></div></div></header>
    <main className="mx-auto grid max-w-7xl gap-5 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:grid-cols-12 lg:px-8" aria-label="Home dashboard">
      <section className="contents" aria-label="Primary season status">
        <DashboardCard label="2026 League Event" icon={<CalendarDays size={17} className="text-orange-600" />}><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">2026 Draft Day</h2><p className="mt-4 text-sm font-semibold">{event.date}</p><p className="mt-1 text-sm text-slate-500 dark:text-white/55">10:00 AM ET · Location TBD</p><div className="mt-6 flex flex-col gap-3"><select aria-label="Select your name for RSVP" className="min-h-11 w-full rounded-lg border border-slate-900/10 bg-white px-3 text-xs font-bold dark:border-white/10 dark:bg-black/20" value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}><option value="">Select your name</option>{managers.map(([name, id]) => <option key={id} value={id}>{name}</option>)}</select><button type="button" onClick={handleRsvp} disabled={!selectedManagerId || hasSelectedRsvp || isSubmittingRsvp} className="min-h-11 rounded-lg bg-emerald-600 px-4 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:opacity-50">{hasSelectedRsvp ? "Attendance Confirmed" : `${rsvpList.length} confirmed · Confirm attendance`}</button>{event.gCalLink && <a href={event.gCalLink} target="_blank" rel="noopener noreferrer" className="text-center text-[10px] font-black uppercase tracking-widest text-orange-600 hover:underline">View calendar invite</a>}</div></DashboardCard>
        <DashboardCard label="Commissioner Corner" icon={<MessageCircle size={17} className="text-blue-600" />}><p className="mt-5 text-[10px] font-black uppercase tracking-widest text-blue-600">2026 virtual draft</p><h2 className="mt-2 text-2xl font-black uppercase italic leading-none">Virtual Draft HQ</h2><div className="mt-5 grid grid-cols-2 gap-2 text-xs"><MiniStat label="Countdown" value={draftCountdownLabel} /><MiniStat label="RSVP" value={`${rsvpList.length} confirmed`} /><MiniStat label="Values" value={PUBLIC_AUCTION_VALUE_STATUS} /><MiniStat label="ADP" value={PUBLIC_ADP_STATUS} /></div><p className="mt-5 text-xs leading-5 text-slate-500 dark:text-white/55">Draft day is virtual: August 29, 2026 at 10:00 AM ET. Keepers remain editable until the draft begins.</p><div className="mt-5 flex flex-wrap gap-2"><Link href="/commish/auction" className="min-h-10 rounded-lg bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">Open Your War Room</Link><a href="https://meet.google.com/hqg-cafx-mcs" target="_blank" rel="noopener noreferrer" className="min-h-10 rounded-lg bg-blue-700 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">Join Google Meet</a><Link href="/commish" className="min-h-10 rounded-lg border border-slate-900/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest dark:border-white/10">Commissioner Hub</Link><button type="button" onClick={() => setShowRecap(true)} className="min-h-10 rounded-lg border border-slate-900/10 px-4 py-3 text-[10px] font-black uppercase tracking-widest dark:border-white/10">Recent Recap</button></div></DashboardCard>
        <DashboardCard label="Reigning Champion" icon={<span className="text-xl text-amber-500">🏆</span>}><div className="mt-5 flex items-center gap-4"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-amber-500/20"><Image src="/managers/Aaron.png" alt="Aaron Hawkins" fill className="object-cover" unoptimized /></div><div><h2 className="text-xl font-black uppercase italic">Aaron Hawkins</h2><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50">Official 2025 winner</p></div></div><div className="mt-6 grid grid-cols-2 gap-2"><MiniStat label="Record" value="9-5" /><MiniStat label="Year" value="2025" /></div></DashboardCard>
      </section>
      <section className="contents" aria-label="League activity and finance">
        <DashboardCard label="2026 Power Rankings" icon={<TrendingUp size={17} className="text-fuchsia-600" />}><p className="mt-4 text-xs text-slate-500 dark:text-white/55">Preseason roster-strength outlook.</p><div className="mt-5 space-y-2">{loadingPredictor ? <p className="text-xs font-bold text-slate-500">Loading rankings...</p> : predictorError ? <p className="text-xs font-bold text-red-600">{predictorError}</p> : predictorTeams.length === 0 ? <p className="text-xs font-bold text-slate-500">Power rankings unavailable.</p> : predictorTeams.slice(0, 5).map((team: any) => <Link key={team.franchiseId} href="/predictor" className="flex min-w-0 items-center justify-between border-b border-slate-900/10 py-2 text-sm dark:border-white/10"><span className="min-w-0 truncate font-bold"><span className="mr-3 text-xs text-slate-400">{team.rank}</span>{team.teamName}</span><span className="ml-3 shrink-0 font-black text-fuchsia-600">{team.normalizedIndex.toFixed(1)}</span></Link>)}</div><p className="mt-4 rounded-lg bg-slate-100 p-3 text-[10px] leading-4 text-slate-500 dark:bg-white/5 dark:text-white/55">Power rankings reflect roster strength and schedule factors. They are not weekly matchup predictions.</p><Link href="/predictor" className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-600">View Full Power Rankings <ArrowRight size={14} /></Link></DashboardCard>
        <DashboardCard label="2026 Matchups" accent><h2 className="mt-8 text-3xl font-black uppercase italic leading-none">Follow Every Matchup</h2><p className="mt-5 text-sm leading-6 text-slate-600 dark:text-white/60">See weekly head-to-heads, starting lineups, projected scores, Series History, and the playoff bracket.</p><Link href="/matchups" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">Open 2026 Matchups <ArrowRight size={14} /></Link><div className="mt-8 text-center text-5xl font-black italic text-blue-700/15" aria-hidden="true">VS</div></DashboardCard>
        <DashboardCard label="Legislative Hub" icon={<Gavel size={17} className="text-orange-600" />}><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">Shape League Rules</h2><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-white/60">Submit league proposals, follow meeting business, and vote when the chamber is open.</p><Link href="/league-info/legislative" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">Open Legislative Hub <ArrowRight size={14} /></Link></DashboardCard>
        <DashboardCard label="2026 Payouts" icon={<span className="text-lg text-emerald-600">$</span>}><div className="mt-4"><p className="text-3xl font-black italic">{publicFinance?.duesPool ?? "—"}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Total prize pool</p></div><div className="mt-5 grid grid-cols-2 gap-2 text-xs"><MiniStat label="Dues Collected" value={publicFinance?.duesCollected ?? "—"} /><MiniStat label="Outstanding" value={publicFinance?.duesOutstanding ?? "—"} /><MiniStat label="Paid" value={publicFinance ? String(publicFinance.paidCount) : "—"} /><MiniStat label="Not Paid" value={publicFinance ? String(publicFinance.notPaidCount) : "—"} /><MiniStat label="Championship Allocation" value={publicFinance?.championshipAllocation ?? "—"} /><MiniStat label="Projected Champion Cash" value={publicFinance?.projectedChampionCash ?? "—"} /></div><Link href="/league-info/payouts" className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:underline">View 2026 Payouts <ArrowRight size={14} /></Link></DashboardCard>
      </section>
      <section className="contents" aria-label="League history and recent recap">
        <DashboardCard label="League History" icon={<Calendar size={17} className="text-slate-700" />}><p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60">River City FFL was founded on competition, friendship, and a commitment to keeping records that matter.</p><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60">For 2026, the championship allocation is $235. After the approved $13.77 ring expense, the projected champion cash portion is $221.23. No champion award has been approved.</p><button type="button" onClick={() => setShowHistoryModal(true)} className="mt-6 min-h-11 rounded-lg border border-orange-600/40 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-orange-700 hover:bg-orange-600/10">View Full League History</button></DashboardCard>
        <DashboardCard label="Recent Recap" icon={<MessageCircle size={17} className="text-blue-600" />}><h2 className="mt-5 text-2xl font-black uppercase italic">Latest Commissioner Briefing</h2><p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600 dark:text-white/60">{liveRecap}</p><button type="button" onClick={() => setShowRecap(true)} className="mt-6 min-h-11 text-[10px] font-black uppercase tracking-widest text-blue-700 hover:underline">Read Full Recap <ArrowRight className="ml-1 inline" size={14} /></button></DashboardCard>
      </section>
    </main>

    {showHistoryModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setShowHistoryModal(false)}><div role="dialog" aria-modal="true" aria-labelledby="history-dialog-title" className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 text-slate-950 shadow-2xl dark:bg-[#0a0a0a] dark:text-white sm:p-12" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Close league history" onClick={() => setShowHistoryModal(false)} className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"><X size={24} aria-hidden="true" /></button><h2 id="history-dialog-title" className="pr-10 text-3xl font-black uppercase italic">Our History: From Roots to RVA</h2><div className="mt-8 space-y-5 text-sm leading-7 text-slate-600 dark:text-white/65"><p>Area 10 FFL was born in 2011, founded by a small group from Area 10 church with a simple goal: to create a community beyond Sunday services and small groups.</p><p>In 2019, we became River City FFL, a name tied to the heart of Richmond, Virginia.</p><h3 className="text-xl font-black uppercase italic text-orange-600">The Stakes</h3><p>For 2026, the championship allocation is $235. After the approved $13.77 ring expense, the projected champion cash portion is $221.23. No champion award has been approved.</p><p>The Toilet Bowl tradition began in 2022, and the league's records preserve both the triumphs and the shame.</p></div></div></div>}
    {showRecap && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowRecap(false)}><div role="dialog" aria-modal="true" aria-labelledby="recap-dialog-title" className="relative w-full max-w-lg rounded-3xl bg-[#0b1527] p-8 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Close commissioner briefing" onClick={() => setShowRecap(false)} className="absolute right-5 top-5 rounded-lg p-2 opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><X size={22} aria-hidden="true" /></button><div className="flex items-center gap-3"><MessageCircle className="text-blue-400" size={25} aria-hidden="true" /><h2 id="recap-dialog-title" className="pr-8 text-xl font-black uppercase italic">Latest Commissioner Briefing</h2></div><p className="mt-6 max-h-[55vh] overflow-y-auto whitespace-pre-wrap text-sm leading-7 text-white/70">{liveRecap}</p></div></div>}
  </div>;
}
