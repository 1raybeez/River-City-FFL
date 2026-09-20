/* eslint-disable @next/next/no-img-element */
"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { ArrowRight, BarChart3, Calendar, CalendarDays, DollarSign, FileText, Gavel, Menu, MessageCircle, SlidersHorizontal, Swords, Target, Trophy, TrendingUp, X } from "lucide-react";
import { SignOutControl } from "@/components/SiteShell";
import OwnerFeedbackFooter from "@/components/OwnerFeedbackFooter";
import MemberAccountMenu from "@/components/MemberAccountMenu";
import { db } from "@/lib/firebase";
import { getCountdownParts, type BoxOneState } from "@/lib/home/boxOneState";
import type { CurrentMember } from "@/lib/auth/currentMemberContract";
import type { PublicLeagueRecap } from "@/lib/postDraftNarrativeTypes";
import { isSiteNavItemActive, MOBILE_SITE_NAV_ITEMS, PRIMARY_SITE_NAV_ITEMS } from "@/lib/navigation/siteNavigation";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { RSVP_ATTENDEES, resolveRsvpAttendee } from "@/lib/rsvpAttendees";
import { getHomePowerRankingTeams, type CanonicalPowerRankings } from "@/lib/powerRankings/types";
import type { HomeLiveSeasonState } from "@/lib/home/liveSeasonState";
import { getWeeklySpotlightLabel } from "@/lib/home/weeklySpotlight";
import type { WeeklyLeagueRecap } from "@/lib/weeklyRecapPublication";
import type { NflGameCenterState } from "@/lib/nflGameCenter";
import type { PredictorCalibrationProgress } from "@/lib/predictor/predictorContract";

const RECAP_LOADING_TEXT = "Loading latest league note...";
const RECAP_FALLBACK_TEXT = "Commish recap could not be loaded. Check back soon for the latest league update.";
const managers = RSVP_ATTENDEES.map((attendee) => [attendee.name, attendee.id] as const);

type DashboardCardProps = { label: string; icon?: ReactNode; children: ReactNode; accent?: boolean };

function DashboardCard({ label, icon, children, accent = false }: DashboardCardProps) {
  if (label === "League History") return null;
  const desktopOrder = { "NFL Game Center": "lg:order-1", "Reigning Champion": "lg:order-2", "2026 WEEKLY SPOTLIGHT": "lg:order-3", "WEEKLY HIGH SCORE": "lg:order-3", "PLAYOFF SPOTLIGHT": "lg:order-3", "CHAMPIONSHIP SPOTLIGHT": "lg:order-3", "2026 Power Rankings": "lg:order-4", "2026 Matchups": "lg:order-5", Predictor: "lg:order-6", "Legislative Hub": "lg:order-7", "2026 Payouts": "lg:order-8", "Recent Recap": "lg:order-9" }[label] ?? "";
  const cardIcon = label === "NFL Game Center" ? <Calendar size={17} className="text-orange-600" />
    : label === "Reigning Champion" ? <Trophy size={17} className="text-amber-500" />
      : label.includes("SPOTLIGHT") ? <Target size={17} className="text-orange-600" />
        : label === "2026 Power Rankings" ? <BarChart3 size={17} className="text-fuchsia-600" />
          : label === "2026 Matchups" ? <Swords size={17} className="text-orange-600" />
            : label === "Predictor" ? <SlidersHorizontal size={17} className="text-blue-600" />
              : label === "Legislative Hub" ? <Gavel size={17} className="text-orange-600" />
                : label === "2026 Payouts" ? <DollarSign size={17} className="text-emerald-600" />
                  : label === "Recent Recap" ? <FileText size={17} className="text-blue-600" /> : icon;
  return <section className={`min-w-0 rounded-2xl border bg-white p-5 shadow-sm dark:bg-[#121212] sm:p-6 md:col-span-1 lg:col-span-4 ${desktopOrder} ${accent ? "border-blue-600/60 ring-1 ring-blue-600/20" : "border-slate-900/10 dark:border-white/10"}`}>
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-white/60">{cardIcon && <span aria-hidden="true" className="inline-flex shrink-0">{cardIcon}</span>}<span>{label}</span></div>
    {children}{label === "WEEKLY HIGH SCORE" && <p className="mt-1 text-sm font-black uppercase tracking-widest text-amber-700 dark:text-amber-300">$10 WEEKLY WINNER</p>}{label === "Reigning Champion" && <Link href="/history" className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700 hover:underline">View Championship History <ArrowRight size={14} /></Link>}
  </section>;
}

function MiniStat({ label, value }: { label: string; value: string }) {
  const icon = label === "Projected Standings" ? <BarChart3 size={13} /> : label === "Playoff Odds" ? <Target size={13} /> : label === "Championship Odds" ? <Trophy size={13} /> : null;
  return <div className="min-w-0 rounded-lg bg-slate-100 p-3 dark:bg-white/5"><p className="flex items-center gap-1 break-words text-[9px] font-black uppercase leading-4 tracking-widest text-slate-400">{icon && <span aria-hidden="true">{icon}</span>}{label}</p><p className="mt-1 break-words text-sm font-black">{value}</p></div>;
}

function RecapList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">{title}</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6 text-white/75">{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

function PublishedRecapDetail({ recap }: { recap: PublicLeagueRecap }) {
  return <div className="mt-6 max-h-[65vh] space-y-6 overflow-y-auto pr-2">
    {recap.openingCommissionerTake && <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">Commissioner Take</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/75">{recap.openingCommissionerTake}</p></section>}
    {recap.draftGradeLeaderboard.length > 0 && <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">Draft Grade Leaderboard</h3><div className="mt-2 overflow-x-auto rounded-lg border border-white/10"><table className="min-w-full text-left text-sm"><thead className="text-[10px] uppercase tracking-widest text-white/50"><tr><th className="px-3 py-2">Team</th><th className="px-3 py-2">Draft Score</th><th className="px-3 py-2">Grade</th></tr></thead><tbody>{recap.draftGradeLeaderboard.map((row) => <tr key={row.franchiseId} className="border-t border-white/10"><td className="px-3 py-2">{row.teamName}</td><td className="px-3 py-2">{row.draftScore ?? "N/A"}</td><td className="px-3 py-2 font-black">{row.grade ?? "N/A"}</td></tr>)}</tbody></table></div></section>}
    {recap.biggestBargains.length > 0 && <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">Biggest Bargains</h3><div className="mt-2 space-y-2 text-sm text-white/75">{recap.biggestBargains.map((item) => <p key={`${item.franchiseId}-${item.playerName}`}><strong>{item.teamName}</strong> · {item.playerName}</p>)}</div></section>}
    {recap.biggestReaches.length > 0 && <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">Biggest Reaches</h3><div className="mt-2 space-y-2 text-sm text-white/75">{recap.biggestReaches.map((item) => <p key={`${item.franchiseId}-${item.playerName}`}><strong>{item.teamName}</strong> · {item.playerName}</p>)}</div></section>}
    <RecapList title="Spending Trends" items={recap.spendingTrends} />
    <RecapList title="Position Trends" items={recap.positionTrends} />
    {recap.earlyPowerRankings.length > 0 && <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">Early Power Rankings</h3><ol className="mt-2 space-y-1 text-sm text-white/75">{recap.earlyPowerRankings.map((item) => <li key={item.franchiseId}><strong>#{item.rank ?? "—"}</strong> {item.teamName} <span className="text-white/50">· roster-strength context, not odds</span></li>)}</ol></section>}
    {recap.teamOneLiners.length > 0 && <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">Team One-Liners</h3><div className="mt-2 space-y-2 text-sm text-white/75">{recap.teamOneLiners.map((item) => <p key={item.franchiseId}><strong>{item.teamName}:</strong> {item.text}</p>)}</div></section>}
    <RecapList title="Notable Draft Decisions" items={recap.notableDraftDecisions} />
    {recap.closingTake && <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">Closing Commissioner Take</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-white/75">{recap.closingTake}</p></section>}
    {recap.teamOutlookLinks.length > 0 && <section><h3 className="text-xs font-black uppercase tracking-widest text-blue-300">Team Outlooks</h3><div className="mt-2 flex flex-wrap gap-2">{recap.teamOutlookLinks.map((link) => <Link key={link.href} href={link.href} className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-blue-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300">View {link.teamName} outlook</Link>)}</div></section>}
  </div>;
}

function formatEasternDateTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    date: new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(date),
    time: `${new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit" }).format(date)} ET`,
  };
}

function formatCountdown(state: BoxOneState, now: Date | null) {
  const target = state.state === "DRAFT_UPCOMING" ? state.draftStartAt : state.openingEvent?.startsAt ?? null;
  if (!target || !now) return null;
  return getCountdownParts(now, target);
}

function useModalFocusTrap(
  open: boolean,
  dialogRef: RefObject<HTMLElement | null>,
  triggerRef: RefObject<HTMLElement | null>
) {
  const wasOpen = useRef(false);

  useEffect(() => {
    if (!open) {
      if (wasOpen.current) triggerRef.current?.focus();
      wasOpen.current = false;
      return;
    }

    wasOpen.current = true;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const selector = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(selector));
    (focusable[0] ?? dialog).focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    dialog.addEventListener("keydown", handleKeyDown);
    return () => dialog.removeEventListener("keydown", handleKeyDown);
  }, [dialogRef, open, triggerRef]);
}

export default function HomeClient({ initialMember, initialPublishedRecap, initialPublishedWeeklyRecap, initialBoxOneState, initialLiveSeasonState, initialNflGameCenter }: { initialMember: CurrentMember; initialPublishedRecap: PublicLeagueRecap | null; initialPublishedWeeklyRecap: WeeklyLeagueRecap | null; initialBoxOneState: BoxOneState; initialLiveSeasonState: HomeLiveSeasonState; initialNflGameCenter: NflGameCenterState }) {
  const [showRecap, setShowRecap] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const recapTriggerRef = useRef<HTMLButtonElement | null>(null);
  const historyTriggerRef = useRef<HTMLButtonElement | null>(null);
  const recapDialogRef = useRef<HTMLDivElement | null>(null);
  const historyDialogRef = useRef<HTMLDivElement | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [liveRecap, setLiveRecap] = useState(RECAP_LOADING_TEXT);
  const publishedRecap = initialPublishedRecap;
  const publishedWeeklyRecap = initialPublishedWeeklyRecap;
  const [predictorTeams, setPredictorTeams] = useState<CanonicalPowerRankings["teams"]>([]);
  const [loadingPredictor, setLoadingPredictor] = useState(true);
  const [predictorError, setPredictorError] = useState<string | null>(null);
  const [predictorProgress, setPredictorProgress] = useState<PredictorCalibrationProgress | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [rsvpList, setRsvpList] = useState<any[]>([]);
  const [isSubmittingRsvp, setIsSubmittingRsvp] = useState(false);
  const [publicFinance, setPublicFinance] = useState<{
    duesPool: string | null;
    duesCollected: string | null;
    duesOutstanding: string | null;
    paidCount: number;
    owedCount: number;
    championshipAllocation: string | null;
    projectedChampionCash: string | null;
  } | null>(null);
  const [countdownNow, setCountdownNow] = useState<Date | null>(null);
  const boxOneState = initialBoxOneState;
  const liveSeasonState = initialLiveSeasonState;
  const [nflGameCenter, setNflGameCenter] = useState(initialNflGameCenter);
  const showRsvp = boxOneState.state === "DRAFT_UPCOMING";
  const boxOneCountdown = formatCountdown(boxOneState, countdownNow);

  useModalFocusTrap(showRecap, recapDialogRef, recapTriggerRef);
  useModalFocusTrap(showHistoryModal, historyDialogRef, historyTriggerRef);

  useEffect(() => {
    const closeModalsOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setShowHistoryModal(false);
      setShowRecap(false);
    };
    window.addEventListener("keydown", closeModalsOnEscape);

    async function fetchLegacyRecap() {
      try {
        const snapshot = await getDoc(doc(db, "siteContent", "recap"));
        const text = snapshot.exists() ? snapshot.data().text : null;
        setLiveRecap(typeof text === "string" && text.trim() ? text : RECAP_FALLBACK_TEXT);
      } catch {
        setLiveRecap(RECAP_FALLBACK_TEXT);
      }
    }
    if (!initialPublishedRecap) fetchLegacyRecap();
    fetch("/api/public-finance/summary")
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Public finance unavailable")))
      .then(setPublicFinance)
      .catch(() => setPublicFinance(null));
    const unsubscribe = showRsvp ? onSnapshot(collection(db, "rsvps"), (snapshot) => {
      const normalized = snapshot.docs.flatMap((entry) => {
        const attendee = resolveRsvpAttendee(entry.id);
        return attendee ? [{ id: attendee.id, ...entry.data() }] : [];
      });
      setRsvpList(Array.from(new Map(normalized.map((entry) => [entry.id, entry])).values()));
    }) : undefined;

    async function loadPredictorData() {
      try {
        const [response, statusResponse] = await Promise.all([fetch("/api/power-rankings"), fetch("/api/predictor/status", { cache: "no-store" })]);
        if (!response.ok) throw new Error("Power rankings data could not be loaded.");
        const payload = await response.json();
        if (!Array.isArray(payload.teams) || payload.teams.length === 0) throw new Error("Power rankings data could not be loaded.");
        setPredictorTeams(payload.teams);
        if (statusResponse.ok) setPredictorProgress(await statusResponse.json() as PredictorCalibrationProgress);
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
      unsubscribe?.();
    };
  }, [initialPublishedRecap, showRsvp]);

  useEffect(() => {
    let active = true;
    const refreshPredictorStatus = async () => {
      try {
        const response = await fetch("/api/predictor/status", { cache: "no-store" });
        if (active && response.ok) setPredictorProgress(await response.json() as PredictorCalibrationProgress);
      } catch {
        // Keep the last factual status visible when the read-only status route is unavailable.
      }
    };
    const interval = window.setInterval(refreshPredictorStatus, 300_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const response = await fetch("/api/nfl-game-center", { cache: "no-store" });
        if (!response.ok) return;
        const next = await response.json() as NflGameCenterState;
        if (active) setNflGameCenter(next);
      } catch {
        // Keep the last successful card visible when the provider is unavailable.
      }
    };
    const interval = window.setInterval(refresh, 60_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (boxOneState.state !== "DRAFT_UPCOMING" && boxOneState.state !== "POST_DRAFT_PRESEASON") {
      setCountdownNow(null);
      return;
    }
    const update = () => setCountdownNow(new Date());
    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [boxOneState.state, boxOneState.draftStartAt, boxOneState.seasonStartAt]);

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

  const event = { gCalLink: "https://calendar.app.google/QYqFqoGATsB9rkxb8", meetLink: "https://meet.google.com/hqg-cafx-mcs" };
  const draftDateTime = formatEasternDateTime(boxOneState.draftStartAt);
  const seasonDateTime = formatEasternDateTime(boxOneState.openingEvent?.startsAt ?? null);
  const hasSelectedRsvp = rsvpList.some((entry) => resolveRsvpAttendee(entry.id)?.id === selectedManagerId);
  const draftCountdownLabel = boxOneCountdown ? boxOneCountdown.reached ? "Draft window open" : `${boxOneCountdown.days}d ${boxOneCountdown.hours}h ${boxOneCountdown.minutes}m` : "Unavailable";
  const isDraftPhase = boxOneState.state === "DRAFT_UPCOMING" || boxOneState.state === "DRAFT_LIVE";
  const showDraftRecap = boxOneState.state === "POST_DRAFT_PRESEASON";
  const liveSeasonSpotlightLabel = getWeeklySpotlightLabel(liveSeasonState.phase, liveSeasonState.weeklyHighScorePrizeCents !== null);
  const historyFinanceText = publicFinance
    ? `For 2026, the public finance summary reports a championship allocation of ${publicFinance.championshipAllocation ?? "—"} and projected champion cash of ${publicFinance.projectedChampionCash ?? "—"}.`
    : "Current 2026 finance details are temporarily unavailable.";

  const visibleMobileNavLinks = initialMember.canAccessMaintenance
    ? [...MOBILE_SITE_NAV_ITEMS, { label: "Commissioner Hub", href: "/commish", match: "exact" as const }]
    : MOBILE_SITE_NAV_ITEMS;

  return <div className="min-h-screen bg-[#f7f8fa] text-slate-950 dark:bg-[#0a0a0a] dark:text-white">
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#071a33]/95 px-4 py-3 text-white backdrop-blur-md sm:px-6" aria-label="River City site navigation">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="River City FFL home"><span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white"><Image src="/River City FFL Logo.JPG" alt="" fill className="object-cover" unoptimized /></span><span className="hidden min-w-0 sm:block"><span className="block text-lg font-black uppercase italic leading-none">River City FFL</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.18em] text-white/55">A tradition of competition</span></span></Link>
        <div className="hidden min-w-0 items-center gap-1 lg:flex">{PRIMARY_SITE_NAV_ITEMS.map((item) => { const active = isSiteNavItemActive(item, "/"); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`rounded-md px-3 py-2 text-[10px] font-black uppercase transition ${active ? "border-b-2 border-amber-400 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>{item.label}</Link>; })}{initialMember.authenticated ? <MemberAccountMenu member={initialMember} signOutControl={<SignOutControl />} /> : <Link href="/member/login?returnTo=%2F" className="ml-3 rounded-md border border-white/35 px-3 py-2 text-[10px] font-black uppercase text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">League Member Login</Link>}</div>
        <button type="button" aria-label={isMobileMenuOpen ? "Close navigation menu" : "Open navigation menu"} aria-expanded={isMobileMenuOpen} aria-controls="home-mobile-navigation" onClick={() => setIsMobileMenuOpen((open) => !open)} className="rounded-lg border border-white/25 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:hidden">{isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}</button>
      </div>
      {isMobileMenuOpen && <div id="home-mobile-navigation" className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-2 rounded-xl border border-white/15 bg-[#0b2444] p-3 lg:hidden">{visibleMobileNavLinks.map((item) => { const active = isSiteNavItemActive(item, "/"); return <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} aria-current={active ? "page" : undefined} className={`rounded-lg border px-3 py-3 text-[9px] font-black uppercase tracking-widest ${active ? "border-amber-400 text-white" : "border-white/10 text-white/75 hover:bg-white/10"}`}>{item.label}</Link>; })}{initialMember.authenticated ? <MemberAccountMenu member={initialMember} mobile onNavigate={() => setIsMobileMenuOpen(false)} signOutControl={<SignOutControl className="min-h-10" />} /> : <Link href="/member/login?returnTo=%2F" onClick={() => setIsMobileMenuOpen(false)} className="col-span-2 min-h-11 rounded-lg border border-amber-300/60 px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">League Member Login</Link>}</div>}
    </nav>
    <header className="relative isolate mx-auto max-w-7xl overflow-hidden px-4 pb-6 pt-8 sm:px-6 lg:px-8"><div className="relative z-10 flex items-center gap-4"><div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white bg-white shadow-lg"><Image src="/River City FFL Logo.JPG" alt="River City FFL logo" fill className="object-cover" priority unoptimized /></div><div><p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">River City FFL</p><h1 className="mt-1 text-4xl font-black uppercase italic tracking-tighter sm:text-5xl">2026 League Dashboard</h1><p className="mt-1 text-xs font-medium text-slate-500 dark:text-white/50">Est. 2011 · Richmond, Virginia</p></div></div><div className="pointer-events-none absolute right-4 top-5 z-0 hidden text-right sm:block lg:right-8"><p className="text-[11px] font-black uppercase italic tracking-[0.18em] text-slate-500/70">Same league.<br /><span className="text-orange-600">Higher standards.</span></p><span className="mt-1 ml-auto block h-0.5 w-20 rotate-[-3deg] rounded-full bg-orange-500/80" /></div><svg aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 z-0 h-24 w-[min(60vw,40rem)] text-[#071a33]/[0.07] sm:h-32" viewBox="0 0 640 150" fill="currentColor" preserveAspectRatio="xMidYMax meet"><path d="M0 150V124h24v-17h13v17h16V91h9v33h18V112h13v12h15V82h8v42h13v-28h9v28h13v-42h8v-18h4v18h8v42h13V94h12v30h13V75h8v49h12v-30h8v-11h5v11h8v30h12V96h11v28h11V82h7v42h12V64h6v-9h4v-8h4v8h4v9h6v58h14V91h9v33h12V73h8v51h13V102h10v22h12V86h9v38h14V67h7v-8h5v8h7v59h13V99h10v26h13V78h8v47h16V112h13v13h15V92h9v33h15V105h14v20h16V117h10v8h24v25H0Z" /><path d="M0 150v-9h29v-8h18v8h19v-13h13v13h20v-7h18v7h17v-11h14v11h20v-6h16v6h19v-10h15v10h20v-5h18v5h22v-8h14v8h24v-6h16v6h22v-11h13v11h25v-7h16v7h22v-5h18v5h21v-9h14v9h24v-7h15v7h22v-6h18v6h24v-8h17v8h26v25H0Z" /></svg></header>
    <main className="mx-auto grid max-w-7xl gap-5 px-4 pb-12 sm:px-6 md:grid-cols-2 lg:grid-cols-12 lg:px-8" aria-label="Home dashboard">
      <section className="contents" aria-label="Primary season status">
        {boxOneState.state === "DRAFT_UPCOMING" && <><DashboardCard label="2026 League Event" icon={<CalendarDays size={17} className="text-orange-600" />}><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">{boxOneState.title}</h2><p className="mt-4 text-sm font-semibold">{draftDateTime?.date ?? "Draft date unavailable"}</p><p className="mt-1 text-sm text-slate-500 dark:text-white/55">{draftDateTime?.time ?? "Draft time unavailable"} · Location TBD</p><div className="mt-5"><MiniStat label="Draft countdown" value={draftCountdownLabel} /></div><div className="mt-6 flex flex-col gap-3"><select aria-label="Select your name for RSVP" className="min-h-11 w-full rounded-lg border border-slate-900/10 bg-white px-3 text-xs font-bold dark:border-white/10 dark:bg-black/20" value={selectedManagerId} onChange={(e) => setSelectedManagerId(e.target.value)}><option value="">Select your name</option>{managers.map(([name, id]) => <option key={id} value={id}>{name}</option>)}</select><button type="button" onClick={handleRsvp} disabled={!selectedManagerId || hasSelectedRsvp || isSubmittingRsvp} className="min-h-11 rounded-lg bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:opacity-50">{hasSelectedRsvp ? "Attendance Confirmed" : `${rsvpList.length} confirmed · Confirm attendance`}</button><div className="flex flex-wrap items-center justify-center gap-3">{event.gCalLink && <a href={event.gCalLink} target="_blank" rel="noopener noreferrer" className="min-h-10 px-2 py-2 text-center text-[10px] font-black uppercase tracking-widest text-orange-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">View calendar invite</a>}{event.meetLink && <a href={event.meetLink} target="_blank" rel="noopener noreferrer" className="min-h-10 px-2 py-2 text-center text-[10px] font-black uppercase tracking-widest text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">Join Google Meet</a>}</div></div></DashboardCard></>}
        <DashboardCard label="NFL Game Center"><p className="mt-5 text-[10px] font-black uppercase tracking-widest text-orange-600">{nflGameCenter.card?.isFavoriteTeamGame ? "Your team next up" : "Next up"}</p>{nflGameCenter.card ? <><h2 className="mt-2 text-2xl font-black uppercase italic leading-none">{nflGameCenter.card.status === "LIVE" ? "Live now" : nflGameCenter.card.status === "FINAL" ? "Final" : "NFL Game Center"}</h2><div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center"><div className="min-w-0"><div className="flex justify-center">{nflGameCenter.card.awayLogo ? <img src={nflGameCenter.card.awayLogo} alt="" className="h-10 w-10 object-contain" /> : <span className="text-lg font-black">{nflGameCenter.card.awayAbbreviation}</span>}</div><p className="mt-2 truncate text-sm font-black">{nflGameCenter.card.awayAbbreviation}</p>{nflGameCenter.card.awayScore !== null && <p className="text-xl font-black">{nflGameCenter.card.awayScore}</p>}</div><span className="text-xs font-black uppercase tracking-widest text-slate-400">at</span><div className="min-w-0"><div className="flex justify-center">{nflGameCenter.card.homeLogo ? <img src={nflGameCenter.card.homeLogo} alt="" className="h-10 w-10 object-contain" /> : <span className="text-lg font-black">{nflGameCenter.card.homeAbbreviation}</span>}</div><p className="mt-2 truncate text-sm font-black">{nflGameCenter.card.homeAbbreviation}</p>{nflGameCenter.card.homeScore !== null && <p className="text-xl font-black">{nflGameCenter.card.homeScore}</p>}</div></div><p className="mt-5 text-sm font-semibold">{nflGameCenter.card.kickoffLabel}</p>{nflGameCenter.card.network && <p className="mt-1 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-white/55">{nflGameCenter.card.network}</p>}{nflGameCenter.card.isFavoriteTeamGame && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-orange-600">Favorite team game</p>}</> : <><h2 className="mt-2 text-2xl font-black uppercase italic leading-none">{nflGameCenter.unavailable ? "NFL Game Center" : "Offseason / Next NFL Action"}</h2><p className="mt-5 text-sm leading-6 text-slate-500 dark:text-white/55">{nflGameCenter.unavailable ? "Schedule temporarily unavailable. Check back soon." : "No NFL game is currently available."}</p></>}{isDraftPhase && <Link href="/commish/auction" className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">Open Your War Room</Link>}{boxOneState.state === "DRAFT_LIVE" && <a href={event.meetLink} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">Join Google Meet</a>}{boxOneState.state === "SEASON_LIVE" && <Link href={`/matchups?week=${liveSeasonState.activeWeek}`} className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-blue-700 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white">View Week {liveSeasonState.activeWeek} Matchups</Link>}{showDraftRecap && <Link href="/league-info/draft-report/overview" className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-orange-600/40 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-orange-700 dark:text-orange-300">2026 Draft Recap</Link>}{initialMember.canAccessMaintenance && <Link href="/commish" className="mt-5 inline-flex min-h-10 items-center rounded-lg border border-slate-900/10 px-4 py-3 text-[10px] font-black tracking-widest dark:border-white/10">Commissioner Hub</Link>}</DashboardCard>
        <DashboardCard label="Reigning Champion" icon={<span className="text-xl text-amber-500">🏆</span>}><div className="mt-5 flex items-center gap-4"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-amber-500/20"><Image src="/managers/Aaron.png" alt="Aaron Hawkins" fill className="object-cover" unoptimized /></div><div><h2 className="text-xl font-black uppercase italic">Aaron Hawkins</h2><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50">Official 2025 winner</p></div></div><div className="mt-6 grid grid-cols-2 gap-2"><MiniStat label="Record" value="9-5" /><MiniStat label="Year" value="2025" /></div></DashboardCard>
        {boxOneState.state !== "DRAFT_UPCOMING" && <DashboardCard label={liveSeasonSpotlightLabel} icon={<CalendarDays size={17} className="text-orange-600" />}>
          {liveSeasonState.weeklyHighScore.length > 0 ? <><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">Week {liveSeasonState.weeklyHighScore[0].week} High Score</h2><div className="mt-5 flex items-center gap-4"><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-amber-500/20"><Image src={liveSeasonState.weeklyHighScore[0].ownerPhoto ?? liveSeasonState.weeklyHighScore[0].sleeperAvatar ?? "/River City FFL Logo.JPG"} alt={liveSeasonState.weeklyHighScore.map((winner) => winner.ownerNames.join(" and ")).join("; ")} fill className="object-cover" unoptimized /><span className="absolute -bottom-1 -right-1 rounded-full bg-amber-400 p-1 text-amber-950" aria-label="Weekly high score"><span aria-hidden="true">🏆</span></span></div><div><p className="text-lg font-black uppercase italic">{liveSeasonState.weeklyHighScore.map((winner) => winner.teamName).join(" / ")}</p><p className="mt-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/50">{liveSeasonState.weeklyHighScore.flatMap((winner) => winner.ownerNames).join(" / ")}</p></div></div><p className="mt-5 text-sm font-semibold">{liveSeasonState.weeklyHighScore[0].points.toFixed(2)} PTS{liveSeasonState.weeklyHighScore.length > 1 ? " · TIE" : ""}</p><p className="mt-1 text-sm text-slate-500 dark:text-white/55">Highest score in River City this week.</p><Link href={`/matchups?week=${liveSeasonState.weeklyHighScore[0].week}`} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white">View Week {liveSeasonState.weeklyHighScore[0].week} Results <ArrowRight size={14} /></Link></> : boxOneState.state === "POST_DRAFT_PRESEASON" ? <><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">NFL KICKOFF</h2><p className="mt-4 text-sm font-black uppercase italic">{boxOneState.openingEvent?.matchupLabel}</p><p className="mt-4 text-sm font-semibold">{seasonDateTime?.date ?? "Kickoff date unavailable"}</p><p className="mt-1 text-sm text-slate-500 dark:text-white/55">{seasonDateTime?.time ?? "Kickoff time unavailable"}</p><div className="mt-6"><MiniStat label="Kickoff countdown" value={boxOneCountdown ? `${boxOneCountdown.days} DAYS · ${boxOneCountdown.hours} HRS · ${boxOneCountdown.minutes} MIN` : "Unavailable"} /></div><Link href="/matchups" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white">View Matchups <ArrowRight size={14} /></Link></> : boxOneState.state === "DRAFT_LIVE" ? <><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">{boxOneState.title}</h2><p className="mt-4 text-sm font-semibold">Drafting now</p><p className="mt-1 text-sm text-slate-500 dark:text-white/55">{draftDateTime?.time ?? "Live draft"} · Location TBD</p></> : <><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">Week {liveSeasonState.activeWeek} Underway</h2><p className="mt-4 text-sm font-semibold">River City football is back.</p><p className="mt-1 text-sm text-slate-500 dark:text-white/55">No finalized weekly high score yet.</p></>}
        </DashboardCard>}
      </section>
      <section className="contents" aria-label="League activity and finance">
        <DashboardCard label="Predictor" icon={<TrendingUp size={17} className="text-blue-600" />}><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">What Are My Chances?</h2><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-white/60">{predictorProgress?.readiness === "SHADOW_READY" ? "Projected standings are available while probability output is validated privately." : "Season projections are being calibrated with real projection-vs-actual evidence."}</p><div className="mt-5 grid grid-cols-2 gap-2 text-xs"><MiniStat label="Projection Baseline" value={predictorProgress?.projectionBaselines.find(row => row.week === 2)?.status === "CAPTURED" ? "Week 2 · Captured" : "Waiting"} /><MiniStat label="Player Samples" value={`${predictorProgress?.playerSamples ?? 0} / 50`} /><MiniStat label="Team Samples" value={`${predictorProgress?.teamSamples ?? 0} / 12`} /><MiniStat label="Eligible Weeks" value={String(predictorProgress?.eligibleWeeks.length ?? 0)} /></div><p className="mt-4 rounded-lg bg-slate-100 p-3 text-[10px] leading-4 text-slate-500 dark:bg-white/5 dark:text-white/55"><strong>Next:</strong> {predictorProgress?.nextEvent ?? "Loading calibration status..."}<br /><strong>Status:</strong> {predictorProgress?.readiness ?? "CALIBRATING"}</p><Link href="/predictor" className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-700">Open Predictor <ArrowRight size={14} /></Link></DashboardCard>
        <DashboardCard label="2026 Power Rankings" icon={<TrendingUp size={17} className="text-fuchsia-600" />}><p className="mt-4 text-xs text-slate-500 dark:text-white/55">Current roster-strength ranking.</p><div className="mt-5 space-y-2">{loadingPredictor ? <p className="text-xs font-bold text-slate-500">Loading rankings...</p> : predictorError ? <p className="text-xs font-bold text-red-600">{predictorError}</p> : predictorTeams.length === 0 ? <p className="text-xs font-bold text-slate-500">Power rankings unavailable.</p> : getHomePowerRankingTeams(predictorTeams).map((team) => <Link key={team.franchiseId} href="/power-rankings" className="flex min-w-0 items-center justify-between border-b border-slate-900/10 py-2 text-sm dark:border-white/10"><span className="min-w-0 truncate font-bold"><span className="mr-3 text-xs text-slate-400">#{team.leagueRelativeRank}</span>{team.teamName}</span><span className="ml-3 shrink-0 text-[9px] font-black uppercase tracking-widest text-fuchsia-600">{team.tier}</span></Link>)}</div><p className="mt-4 rounded-lg bg-slate-100 p-3 text-[10px] leading-4 text-slate-500 dark:bg-white/5 dark:text-white/55">This uses the preseason-strength-v1 model on current rosters. It is not a projected record or win probability.</p><Link href="/power-rankings" className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-fuchsia-600">View Full Power Rankings <ArrowRight size={14} /></Link></DashboardCard>
        <DashboardCard label="2026 Matchups" accent><h2 className="mt-8 text-3xl font-black uppercase italic leading-none">Follow Every Matchup</h2><p className="mt-5 text-sm leading-6 text-slate-600 dark:text-white/60">See weekly head-to-heads, starting lineups, projected scores, Series History, and the playoff bracket.</p><Link href="/matchups" className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-blue-700 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">Open 2026 Matchups <ArrowRight size={14} /></Link><div className="mt-8 text-center text-5xl font-black italic text-blue-700/15" aria-hidden="true">VS</div></DashboardCard>
        <DashboardCard label="Legislative Hub" icon={<Gavel size={17} className="text-orange-600" />}><h2 className="mt-5 text-2xl font-black uppercase italic leading-none">Shape League Rules</h2><p className="mt-4 text-sm leading-6 text-slate-600 dark:text-white/60">Submit league proposals, follow meeting business, and vote when the chamber is open.</p><Link href="/league-info/legislative" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-orange-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">Open Legislative Hub <ArrowRight size={14} /></Link></DashboardCard>
        <DashboardCard label="2026 Payouts" icon={<span className="text-lg text-emerald-600">$</span>}><div className="mt-4"><p className="text-3xl font-black italic">{publicFinance?.duesPool ?? "—"}</p><p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-400">Total prize pool</p></div><div className="mt-5 grid grid-cols-2 gap-2 text-xs"><MiniStat label="Dues Collected" value={publicFinance?.duesCollected ?? "—"} /><MiniStat label="Outstanding" value={publicFinance?.duesOutstanding ?? "—"} /><MiniStat label="Paid" value={publicFinance ? String(publicFinance.paidCount) : "—"} /><MiniStat label="Not Paid" value={publicFinance ? String(publicFinance.owedCount) : "—"} /><MiniStat label="Championship Allocation" value={publicFinance?.championshipAllocation ?? "—"} /><MiniStat label="Projected Champion Cash" value={publicFinance?.projectedChampionCash ?? "—"} /></div><Link href="/league-info/payouts" className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 hover:underline">View 2026 Payouts <ArrowRight size={14} /></Link></DashboardCard>
      </section>
      <section className="contents" aria-label="League history and recent recap">
        <DashboardCard label="League History" icon={<Calendar size={17} className="text-slate-700" />}><p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60">River City FFL was founded on competition, friendship, and a commitment to keeping records that matter.</p><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-white/60">{historyFinanceText}</p><button ref={historyTriggerRef} type="button" onClick={() => setShowHistoryModal(true)} className="mt-6 min-h-11 rounded-lg border border-orange-600/40 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-orange-700 hover:bg-orange-600/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">View Full League History</button></DashboardCard>
        <DashboardCard label="Recent Recap" icon={<MessageCircle size={17} className="text-blue-600" />}><h2 className="mt-5 text-2xl font-black uppercase italic">{publishedWeeklyRecap?.title ?? publishedRecap?.title ?? "Latest Commissioner Briefing"}</h2><p className="mt-4 line-clamp-4 text-sm leading-6 text-slate-600 dark:text-white/60">{publishedWeeklyRecap?.excerpt ?? publishedRecap?.dek ?? publishedRecap?.openingCommissionerTake ?? liveRecap}</p>{publishedWeeklyRecap ? <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Published Week {publishedWeeklyRecap.week}</p> : publishedRecap && <p className="mt-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Published {new Date(publishedRecap.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}{publishedWeeklyRecap ? <Link href={`/league-info/recaps/${publishedWeeklyRecap.season}/week/${publishedWeeklyRecap.week}`} className="mt-6 inline-flex min-h-11 items-center text-[10px] font-black uppercase tracking-widest text-blue-700 hover:underline">Read Full Recap <ArrowRight className="ml-1 inline" size={14} /></Link> : <button ref={recapTriggerRef} type="button" onClick={() => setShowRecap(true)} className="mt-6 min-h-11 text-[10px] font-black uppercase tracking-widest text-blue-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700">Read Recap <ArrowRight className="ml-1 inline" size={14} /></button>}</DashboardCard>
      </section>
    </main>

    {showHistoryModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md" onClick={() => setShowHistoryModal(false)}><div ref={historyDialogRef} role="dialog" aria-modal="true" aria-labelledby="history-dialog-title" tabIndex={-1} className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-8 text-slate-950 shadow-2xl dark:bg-[#0a0a0a] dark:text-white sm:p-12" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Close league history" onClick={() => setShowHistoryModal(false)} className="absolute right-5 top-5 rounded-lg p-2 text-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"><X size={24} aria-hidden="true" /></button><h2 id="history-dialog-title" className="pr-10 text-3xl font-black uppercase italic">Our History: From Roots to RVA</h2><div className="mt-8 space-y-5 text-sm leading-7 text-slate-600 dark:text-white/65"><p>Area 10 FFL was born in 2011, founded by a small group from Area 10 church with a simple goal: to create a community beyond Sunday services and small groups.</p><p>In 2019, we became River City FFL, a name tied to the heart of Richmond, Virginia.</p><h3 className="text-xl font-black uppercase italic text-orange-600">The Stakes</h3><p>{historyFinanceText}</p><p>The Toilet Bowl tradition began in 2022, and the league's records preserve both the triumphs and the shame.</p></div></div></div>}
    {showRecap && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onClick={() => setShowRecap(false)}><div ref={recapDialogRef} role="dialog" aria-modal="true" aria-labelledby="recap-dialog-title" tabIndex={-1} className="relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-[#0b1527] p-8 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}><button type="button" aria-label="Close commissioner briefing" className="absolute right-5 top-5 rounded-lg p-2 opacity-70 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400" onClick={() => setShowRecap(false)}><X size={22} aria-hidden="true" /></button><div className="flex items-center gap-3"><MessageCircle className="text-blue-400" size={25} aria-hidden="true" /><h2 id="recap-dialog-title" className="pr-8 text-xl font-black uppercase italic">{publishedRecap?.title ?? "Latest Commissioner Briefing"}</h2></div>{publishedRecap ? <><p className="mt-3 text-sm leading-6 text-white/60">{publishedRecap.dek ?? `Published ${new Date(publishedRecap.publishedAt).toLocaleDateString("en-US")}`}</p><PublishedRecapDetail recap={publishedRecap} /></> : <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-white/70">{liveRecap}</p>}</div></div>}
    <footer className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-slate-900/10 px-4 py-6 text-[9px] font-black uppercase tracking-[0.18em] text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8" aria-label="River City FFL branding"><span>River City FFL <span className="text-orange-600/80">|</span> A tradition of competition</span><span>Est. 2011 <span className="text-orange-600/80">•</span> Richmond, VA</span></footer>
    <OwnerFeedbackFooter />
  </div>;
}
