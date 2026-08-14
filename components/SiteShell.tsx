"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const links = [
  ["Home", "/"],
  ["Matchups", "/matchups"],
  ["Managers", "/managers"],
  ["Rivalries", "/league-info/rivalries"],
  ["History", "/history"],
  ["League Info", "/league-info"],
] as const;

const mobileLinks = [...links, ["Commissioner Hub", "/commish"], ["Power Rankings", "/predictor"]] as const;

export default function SiteShell({ children, activePath }: { children: React.ReactNode; activePath?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950 dark:bg-[#0a0a0a] dark:text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#071a33]/95 px-4 py-3 text-white backdrop-blur-md sm:px-6" aria-label="River City site navigation">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="River City FFL home">
            <span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white"><Image src="/River City FFL Logo.JPG" alt="" fill className="object-cover" unoptimized /></span>
            <span className="hidden min-w-0 sm:block"><span className="block text-lg font-black uppercase italic leading-none">River City FFL</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.18em] text-white/55">A tradition of competition</span></span>
          </Link>
          <div className="hidden items-center gap-1 lg:flex">
            {links.map(([label, href]) => <Link key={href} href={href} aria-current={activePath === href ? "page" : undefined} className={`rounded-md px-3 py-2 text-[10px] font-black uppercase transition ${activePath === href ? "border-b-2 border-amber-400 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>{label}</Link>)}
            <Link href="/commish" className="ml-3 rounded-md border border-white/35 px-4 py-2 text-[10px] font-black uppercase text-white transition hover:bg-white/10">Commissioner Hub</Link>
          </div>
          <button type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="site-mobile-navigation" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-white/25 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
        {open && <div id="site-mobile-navigation" className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-2 rounded-xl border border-white/15 bg-[#0b2444] p-3 lg:hidden">{mobileLinks.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={activePath === href ? "page" : undefined} className={`rounded-lg border px-3 py-3 text-[9px] font-black uppercase tracking-widest ${activePath === href ? "border-amber-400 text-white" : "border-white/10 text-white/75 hover:bg-white/10"}`}>{label}</Link>)}</div>}
      </nav>
      {children}
    </div>
  );
}
