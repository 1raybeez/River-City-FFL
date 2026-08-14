"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useRouter } from "next/navigation";
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

export function SignOutControl({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);

    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Sign out failed.");
      }
      router.replace("/");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={isSigningOut}
      aria-label="Sign out"
      className={`inline-flex min-h-10 items-center justify-center rounded-lg border border-white/25 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {isSigningOut ? "Signing out" : "Sign out"}
    </button>
  );
}

export default function SiteShell({ children, activePath, authenticated = false }: { children: React.ReactNode; activePath?: string; authenticated?: boolean }) {
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
            <Link href="/commish" aria-current={activePath === "/commish" ? "page" : undefined} className={`ml-3 rounded-md border px-4 py-2 text-[10px] font-black uppercase transition hover:bg-white/10 ${activePath === "/commish" ? "border-amber-400 text-white" : "border-white/35 text-white"}`}>Commissioner Hub</Link>
            {authenticated ? <SignOutControl className="ml-2" /> : null}
          </div>
          <button type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="site-mobile-navigation" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-white/25 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
        </div>
        {open && <div id="site-mobile-navigation" className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-2 rounded-xl border border-white/15 bg-[#0b2444] p-3 lg:hidden">{mobileLinks.map(([label, href]) => <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={activePath === href ? "page" : undefined} className={`rounded-lg border px-3 py-3 text-[9px] font-black uppercase tracking-widest ${activePath === href ? "border-amber-400 text-white" : "border-white/10 text-white/75 hover:bg-white/10"}`}>{label}</Link>)}{authenticated ? <SignOutControl className="col-span-2 w-full" /> : null}</div>}
      </nav>
      {children}
    </div>
  );
}
