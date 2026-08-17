'use client';

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteShell from "@/components/SiteShell";
import TradeComparison from "@/components/TradeComparison";

export default function AnalyzerPage() {
  return (
    <SiteShell activePath="/league-info">
      <main className="min-h-screen overflow-x-clip bg-[#f7f8fa] pb-12 text-slate-950">
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="analyzer-title">
            <Link href="/league-info" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2">
              <ArrowLeft size={14} aria-hidden="true" /> Back to League Info
            </Link>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">League Info</p>
            <h1 id="analyzer-title" className="mt-2 text-4xl font-black uppercase italic tracking-tight text-slate-950 sm:text-5xl">River City Trade Analyzer</h1>
            <p className="mt-4 max-w-2xl text-base font-medium leading-7 text-slate-600">Compare existing player and team valuation inputs using the league&apos;s Trade Analyzer.</p>
          </div>
        </section>
        <section aria-label="Trade Comparison" className="mx-auto w-full max-w-7xl px-2 sm:px-6 lg:px-8">
          <TradeComparison />
        </section>
      </main>
    </SiteShell>
  );
}
