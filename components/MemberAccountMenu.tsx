"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CurrentMember } from "@/lib/auth/currentMemberContract";

type MemberAccountMenuProps = {
  member: CurrentMember;
  signOutControl: ReactNode;
  mobile?: boolean;
  onNavigate?: () => void;
};

function MemberIdentity({ member }: { member: CurrentMember }) {
  return <div className="min-w-0"><p className="truncate text-xs font-black uppercase">{member.displayName ?? "League member"}</p>{member.franchiseName && <p className="mt-1 truncate text-[10px] text-white/60">{member.franchiseName}</p>}</div>;
}

export default function MemberAccountMenu({ member, signOutControl, mobile = false, onNavigate }: MemberAccountMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstActionRef = useRef<HTMLAnchorElement>(null);
  const menuId = mobile ? undefined : "member-account-menu";

  useEffect(() => {
    if (!open || mobile) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !triggerRef.current?.parentElement?.contains(event.target)) setOpen(false);
    };

    firstActionRef.current?.focus();
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open, mobile]);

  if (!member.authenticated) return null;

  const closeMenu = () => {
    setOpen(false);
    onNavigate?.();
  };

  const actions = <>
    {member.canAccessWarRoom && <Link ref={firstActionRef} href="/commish/auction" role="menuitem" onClick={closeMenu} className="block rounded-lg px-3 py-2 text-[10px] font-black uppercase text-white/85 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">My War Room</Link>}
    {member.canAccessMaintenance && <Link ref={member.canAccessWarRoom ? undefined : firstActionRef} href="/commish" role="menuitem" onClick={closeMenu} className="block rounded-lg px-3 py-2 text-[10px] font-black uppercase text-amber-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">Commissioner Hub</Link>}
    <div role="menuitem" className="pt-1">{signOutControl}</div>
  </>;

  if (mobile) return <section className="col-span-2 border-t border-white/15 pt-3" aria-label="Member account"><div className="px-1"><p className="text-[9px] font-black uppercase tracking-widest text-white/50">Member</p><MemberIdentity member={member} /></div><div role="menu" aria-label="Member account actions" className="mt-3 flex flex-wrap gap-2">{actions}</div></section>;

  return <div className="relative ml-3 border-l border-white/20 pl-3"><button ref={triggerRef} type="button" aria-label="Open member account menu" aria-haspopup="menu" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen((value) => !value)} className="flex max-w-44 items-center gap-2 rounded-lg px-2 py-2 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"><MemberIdentity member={member} /><span aria-hidden="true" className="text-xs text-white/60">▾</span></button>{open && <div id={menuId} role="menu" aria-label="Member account menu" className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-white/15 bg-[#0b2444] p-2 shadow-2xl"><div className="border-b border-white/15 px-3 pb-3"><MemberIdentity member={member} /></div><div className="mt-2 space-y-1">{actions}</div></div>}</div>;
}
