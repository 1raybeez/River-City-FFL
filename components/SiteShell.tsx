"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import MemberAccountMenu from "@/components/MemberAccountMenu";
import LeagueInfoShell from "@/components/LeagueInfoShell";
import { anonymousCurrentMember, type CurrentMember } from "@/lib/auth/currentMemberContract";
import { getSafeReturnTo } from "@/lib/auth/safeReturnTo";
import {
  isSiteNavItemActive,
  MOBILE_SITE_NAV_ITEMS,
  PRIMARY_SITE_NAV_ITEMS,
} from "@/lib/navigation/siteNavigation";
import { isLeagueInfoDestination } from "@/lib/navigation/leagueInfoNavigation";

export function SignOutControl({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const signOut = async () => {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Sign out failed.");
      router.replace("/");
      router.refresh();
    } catch {
      setIsSigningOut(false);
    }
  };
  return <button type="button" onClick={signOut} disabled={isSigningOut} aria-label="Sign out" className={`inline-flex min-h-10 items-center justify-center rounded-lg border border-white/25 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}>{isSigningOut ? "Signing out" : "Sign out"}</button>;
}

export default function SiteShell({ children, activePath }: { children: React.ReactNode; activePath?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [member, setMember] = useState<CurrentMember>(anonymousCurrentMember);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/current-member", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Member state unavailable")))
      .then((payload: CurrentMember) => { if (!cancelled && payload && typeof payload.authenticated === "boolean") setMember(payload); })
      .catch(() => { if (!cancelled) setMember(anonymousCurrentMember); });
    return () => { cancelled = true; };
  }, []);
  const safeCurrentPath = getSafeReturnTo(pathname ?? "/");
  const loginHref = `/member/login?returnTo=${encodeURIComponent(safeCurrentPath)}`;
  const visibleMobileLinks = member.canAccessMaintenance
    ? [...MOBILE_SITE_NAV_ITEMS, { label: "Commissioner Hub", href: "/commish", match: "exact" as const }]
    : MOBILE_SITE_NAV_ITEMS;
  const currentPath = activePath ?? pathname ?? "/";
  const pageContent = isLeagueInfoDestination(pathname ?? currentPath)
    ? <LeagueInfoShell>{children}</LeagueInfoShell>
    : children;
  return <div className="min-h-screen bg-[#f7f8fa] text-slate-950 dark:bg-[#0a0a0a] dark:text-white">
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#071a33]/95 px-4 py-3 text-white backdrop-blur-md sm:px-6" aria-label="River City site navigation">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <Link href="/" className="flex min-w-0 items-center gap-3" aria-label="River City FFL home"><span className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/20 bg-white"><Image src="/River City FFL Logo.JPG" alt="" fill className="object-cover" unoptimized /></span><span className="hidden min-w-0 sm:block"><span className="block text-lg font-black uppercase italic leading-none">River City FFL</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.18em] text-white/55">A tradition of competition</span></span></Link>
        <div className="hidden min-w-0 items-center gap-1 lg:flex">{PRIMARY_SITE_NAV_ITEMS.map((item) => { const active = isSiteNavItemActive(item, currentPath); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`rounded-md px-3 py-2 text-[10px] font-black uppercase transition ${active ? "border-b-2 border-amber-400 text-white" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>{item.label}</Link>; })}{member.authenticated ? <MemberAccountMenu member={member} signOutControl={<SignOutControl />} /> : <Link href={loginHref} className="ml-3 rounded-md border border-white/35 px-3 py-2 text-[10px] font-black uppercase text-white transition hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">League Member Login</Link>}</div>
        <button type="button" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="site-mobile-navigation" onClick={() => setOpen((value) => !value)} className="rounded-lg border border-white/25 p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 lg:hidden">{open ? <X size={18} /> : <Menu size={18} />}</button>
      </div>
      {open && <div id="site-mobile-navigation" className="mx-auto mt-3 grid max-w-7xl grid-cols-2 gap-2 rounded-xl border border-white/15 bg-[#0b2444] p-3 lg:hidden">{visibleMobileLinks.map((item) => { const active = isSiteNavItemActive(item, currentPath); return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined} className={`rounded-lg border px-3 py-3 text-[9px] font-black uppercase tracking-widest ${active ? "border-amber-400 text-white" : "border-white/10 text-white/75 hover:bg-white/10"}`}>{item.label}</Link>; })}{member.authenticated ? <MemberAccountMenu member={member} mobile onNavigate={() => setOpen(false)} signOutControl={<SignOutControl className="min-h-10" />} /> : <Link href={loginHref} onClick={() => setOpen(false)} className="col-span-2 min-h-11 rounded-lg border border-amber-300/60 px-3 py-3 text-center text-[10px] font-black uppercase tracking-widest text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">League Member Login</Link>}</div>}
    </nav>
    {pageContent}
  </div>;
}
