'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Gavel, Lock, ThumbsDown, ThumbsUp } from 'lucide-react';
import SiteShell from '@/components/SiteShell';
import { getArchiveSession, LEGISLATIVE_ARCHIVE_YEARS } from '@/lib/legislativeArchive';

type Proposal = {
  id: string;
  submittedBy?: string;
  managerImage?: string;
  section?: string;
  title?: string;
  description?: string;
  status?: string;
  voteTotals: { yes: number; no: number };
  viewerVote: 'yes' | 'no' | null;
};
type State = {
  sessionYear: number;
  meetingDate: string;
  votingDeadline: string;
  isVotingOpen: boolean;
  isVotingFinished: boolean;
  isPreMeeting: boolean;
  authenticatedOwner: boolean;
  proposals: Proposal[];
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', { dateStyle: 'long' });
}

export default function LegislativeHubPage() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyVote, setBusyVote] = useState<string | null>(null);
  const [archiveYear, setArchiveYear] = useState<number>(LEGISLATIVE_ARCHIVE_YEARS[0]);
  const archive = useMemo(() => getArchiveSession(archiveYear), [archiveYear]);

  const load = async () => {
    try {
      const response = await fetch('/api/league-info/legislative', { cache: 'no-store' });
      if (!response.ok) throw new Error('Legislative Hub is unavailable.');
      setState((await response.json()) as State);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Legislative Hub is unavailable.');
    }
  };

  useEffect(() => { void load(); }, []);

  const vote = async (proposalId: string, voteType: 'yes' | 'no') => {
    setBusyVote(proposalId);
    setError(null);
    try {
      const response = await fetch('/api/league-info/legislative/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, voteType }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Vote could not be recorded.');
      await load();
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : 'Vote could not be recorded.');
    } finally {
      setBusyVote(null);
    }
  };

  const authenticated = state?.authenticatedOwner === true;
  return (
    <SiteShell activePath="/league-info" authenticated={authenticated}>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/league-info" className="inline-flex min-h-10 items-center gap-2 text-xs font-black uppercase tracking-widest text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600"><ArrowLeft size={15} /> League Info</Link>
        <section className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="legislative-title">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">League Info · Governance</p><h1 id="legislative-title" className="mt-2 flex items-center gap-3 text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl"><Gavel className="h-9 w-9 shrink-0 text-orange-600" aria-hidden="true" /> Legislative Hub</h1><p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Submit proposals, follow league meeting business, vote when eligible, and review session history.</p></div>
            <Link href={authenticated ? '/league-info/legislative/new' : '/league-info/legislative/login?returnTo=%2Fleague-info%2Flegislative'} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">Submit Proposal</Link>
          </div>
        </section>

        {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</p>}
        {state && <section className="mt-6 grid gap-5 lg:grid-cols-[1fr_2fr]" aria-label="Current legislative session">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-widest text-blue-700">{state.sessionYear} Session</p><h2 className="mt-2 text-2xl font-black italic uppercase">{state.isVotingOpen ? 'Floor is open' : state.isPreMeeting ? 'Chamber is closed' : 'Voting is closed'}</h2><p className="mt-4 text-sm leading-6 text-slate-600">Meeting date: {formatDate(state.meetingDate)}. Voting closes {formatDate(state.votingDeadline)}.</p>{!authenticated && <Link href="/league-info/legislative/login?returnTo=%2Fleague-info%2Flegislative" className="mt-5 inline-flex min-h-10 items-center gap-2 text-[10px] font-black uppercase tracking-widest text-orange-700 hover:underline"><Lock size={14} /> Sign in to participate</Link>}</div>
          <div className="space-y-4"><h2 className="text-2xl font-black italic uppercase text-slate-950">Active Floor</h2>{state.proposals.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No proposals are currently on the floor.</div> : state.proposals.map((proposal) => <article key={proposal.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-widest text-orange-600">{proposal.section || 'Rule proposal'}</p><h3 className="mt-1 text-xl font-black italic uppercase">{proposal.title}</h3><p className="mt-2 text-xs font-bold text-slate-500">Sponsored by {proposal.submittedBy}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600">{proposal.status}</span></div><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{proposal.description}</p><div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-bold text-slate-500" aria-live="polite">Votes: {proposal.voteTotals.yes} yes · {proposal.voteTotals.no} no{proposal.viewerVote ? ` · Your vote: ${proposal.viewerVote}` : ''}</p>{authenticated && state.isVotingOpen && proposal.status === 'active' ? <div className="flex flex-wrap gap-2"><button type="button" onClick={() => vote(proposal.id, 'yes')} disabled={busyVote === proposal.id} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-60"><ThumbsUp size={14} /> Yes</button><button type="button" onClick={() => vote(proposal.id, 'no')} disabled={busyVote === proposal.id} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-rose-300 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-rose-700 disabled:opacity-60"><ThumbsDown size={14} /> No</button></div> : <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500"><Check size={14} /> {proposal.status === 'active' ? 'Voting unavailable' : 'Finalized proposal'}</span>}</div></article>)}</div>
        </section>}

        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="archive-title"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-blue-700">Governance record</p><h2 id="archive-title" className="mt-1 text-2xl font-black italic uppercase">Session Archive</h2></div><label className="text-xs font-bold text-slate-600">Year <select value={archiveYear} onChange={(event) => setArchiveYear(Number(event.target.value))} className="ml-2 min-h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-bold focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">{LEGISLATIVE_ARCHIVE_YEARS.map((year) => <option key={year} value={year}>{year}</option>)}</select></label></div><div className="mt-5 grid gap-3 md:grid-cols-2">{archive.proposals.map((proposal) => <article key={proposal.id} className="rounded-xl border border-slate-200 p-4"><div className="flex justify-between gap-3"><h3 className="font-black">{proposal.title}</h3><span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{proposal.status}</span></div><p className="mt-2 text-sm leading-6 text-slate-600">{proposal.description}</p></article>)}</div></section>
      </main>
    </SiteShell>
  );
}
