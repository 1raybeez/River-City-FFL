'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, Gavel } from 'lucide-react';
import { useRouter } from 'next/navigation';
import SiteShell from '@/components/SiteShell';

export default function NewLegislativeProposalPage() {
  const router = useRouter();
  const [checkingMember, setCheckingMember] = useState(true);
  const [form, setForm] = useState({ section: '', title: '', description: '' });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/current-member', { cache: 'no-store' })
      .then((response) => response.json())
      .then((member: { authenticated?: boolean }) => {
        if (cancelled) return;
        if (!member.authenticated) {
          router.replace('/member/login?returnTo=%2Fleague-info%2Flegislative%2Fnew');
          return;
        }
        setCheckingMember(false);
      })
      .catch(() => {
        if (!cancelled) router.replace('/member/login?returnTo=%2Fleague-info%2Flegislative%2Fnew');
      });
    return () => { cancelled = true; };
  }, [router]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSubmitting(true); setError(null); setMessage(null);
    try {
      const response = await fetch('/api/league-info/legislative', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const responseText = await response.text();
      let payload: { ok?: boolean; error?: string; proposalId?: string } | null = null;
      if (responseText && response.headers.get('content-type')?.toLowerCase().includes('application/json')) {
        try { payload = JSON.parse(responseText) as { ok?: boolean; error?: string; proposalId?: string }; } catch { payload = null; }
      }
      if (!response.ok || !payload?.ok || !payload.proposalId) {
        throw new Error(payload?.error ?? "We couldn't submit your proposal. Your draft is still here. Please try again.");
      }
      setMessage('Proposal submitted for the current legislative session.'); setForm({ section: '', title: '', description: '' });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : '';
      const isUserFacing = message === 'Authenticated River City owner access is required.' || message.startsWith('A valid ') || message.startsWith('A new legislative session');
      setError(isUserFacing ? message : "We couldn't submit your proposal. Your draft is still here. Please try again.");
    }
    finally { setSubmitting(false); }
  };

  if (checkingMember) return <SiteShell activePath="/league-info"><main className="relative z-0 mx-auto max-w-3xl scroll-mt-24 px-4 py-8 sm:scroll-mt-8 sm:px-6"><p className="rounded-2xl border border-slate-200 bg-white p-6 text-sm font-bold text-slate-600">Checking member access…</p></main></SiteShell>;

  return <SiteShell activePath="/league-info"><main className="relative z-0 mx-auto max-w-3xl scroll-mt-24 px-4 py-8 sm:scroll-mt-8 sm:px-6"><Link href="/league-info/legislative" className="inline-flex min-h-10 items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"><ArrowLeft size={15} /> Legislative Hub</Link><section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">Legislative Hub</p><h1 className="mt-2 flex items-center gap-3 text-4xl font-black italic uppercase tracking-tight text-slate-950"><Gavel className="h-8 w-8 text-orange-600" aria-hidden="true" /> Submit Proposal</h1><p className="mt-4 text-sm leading-6 text-slate-600">Your verified River City owner identity will be used as the proposer. No owner selector is available.</p>{message && <p role="status" className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{message}</p>}{error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}<form onSubmit={submit} className="legislative-proposal-form mt-6 space-y-5"><div><label htmlFor="proposal-section" className="text-xs font-black uppercase tracking-widest text-slate-700">Section reference</label><input id="proposal-section" value={form.section} onChange={(event) => setForm({ ...form, section: event.target.value })} required className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600" /></div><div><label htmlFor="proposal-title" className="text-xs font-black uppercase tracking-widest text-slate-700">Short title</label><input id="proposal-title" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required className="mt-2 min-h-12 w-full rounded-lg border border-slate-300 px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600" /></div><div><label htmlFor="proposal-description" className="text-xs font-black uppercase tracking-widest text-slate-700">Detailed rule change</label><textarea id="proposal-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} required rows={8} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3 text-sm leading-6 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600" /></div><button type="submit" disabled={submitting} className="min-h-11 rounded-lg bg-orange-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60">{submitting ? 'Submitting...' : 'Submit Proposal'}</button></form></section></main></SiteShell>;
}
