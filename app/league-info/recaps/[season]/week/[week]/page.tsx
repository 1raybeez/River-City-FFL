import Link from "next/link";
import SiteShell from "@/components/SiteShell";
import WeeklyRecapPresentation from "@/components/WeeklyRecapPresentation";
import { buildWeeklyCommissionerRecap } from "@/lib/weeklyCommissionerRecap";
import { buildWeeklyLeagueRecap, getWeeklyRecap } from "@/lib/weeklyRecapPublication";

export const dynamic = "force-dynamic";

export default async function WeeklyRecapPage({ params, searchParams }: { params: Promise<{ season: string; week: string }>; searchParams: Promise<{ preview?: string }> }) {
  const { season: seasonValue, week: weekValue } = await params;
  const { preview } = await searchParams;
  const season = Number(seasonValue); const week = Number(weekValue);
  const recap = preview === "1" && season === 2026 && week === 1 ? buildWeeklyLeagueRecap(await buildWeeklyCommissionerRecap()) : await getWeeklyRecap(season, week);
  return <SiteShell activePath="/league-info"><main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><div className="flex flex-wrap items-center justify-between gap-3"><Link href="/league-info/recaps" className="text-xs font-black uppercase tracking-widest text-orange-700 hover:underline">← Weekly Recap Archive</Link>{preview === "1" && <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-800">Local preview · not published</span>}</div>{recap ? <WeeklyRecapPresentation recap={recap} /> : <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h1 className="text-2xl font-black uppercase italic">Weekly recap unavailable</h1><p className="mt-3 text-sm leading-7 text-slate-600">This weekly recap has not been published.</p></section>}</main></SiteShell>;
}
