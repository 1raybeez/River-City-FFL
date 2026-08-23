'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  FEEDBACK_AREAS,
  feedbackAreaForPath,
  type FeedbackArea,
  type FeedbackType,
} from '@/lib/feedback';

const areaLabels: Record<FeedbackArea, string> = {
  HOME: 'Home',
  MATCHUPS: 'Matchups',
  MANAGERS: 'Managers',
  LEAGUE_INFO: 'League Info',
  CONSTITUTION: 'Constitution',
  LEGISLATION: 'Legislation',
  PAYOUTS: 'Payouts',
  HISTORY: 'History',
  RIVALRIES: 'Rivalries',
  DRAFT: 'Draft',
  TRADE_ANALYZER: 'Trade Analyzer',
  RESOURCES: 'Resources',
  WAR_ROOM: 'War Room',
  COMMISSIONER: 'Commissioner',
  OTHER: 'Other',
};

function fieldClass() {
  return 'mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/15 dark:bg-[#171717] dark:text-white';
}

export default function FeedbackForm({ pagePath }: { pagePath: string }) {
  const [type, setType] = useState<FeedbackType>('BUG');
  const [area, setArea] = useState<FeedbackArea>(feedbackAreaForPath(pagePath));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [reproductionSteps, setReproductionSteps] = useState('');
  const [suggestionRationale, setSuggestionRationale] = useState('');
  const [state, setState] = useState<'READY' | 'SUBMITTING' | 'SUCCESS' | 'ERROR'>('READY');
  const [message, setMessage] = useState<string | null>(null);

  const switchType = (nextType: FeedbackType) => {
    setType(nextType);
    setExpectedBehavior('');
    setReproductionSteps('');
    setSuggestionRationale('');
    setMessage(null);
    setState('READY');
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === 'SUBMITTING') return;
    setState('SUBMITTING');
    setMessage(null);
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          description,
          expectedBehavior: type === 'BUG' ? expectedBehavior : undefined,
          reproductionSteps: type === 'BUG' ? reproductionSteps : undefined,
          suggestionRationale: type === 'SUGGESTION' ? suggestionRationale : undefined,
          pagePath,
          area,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error ?? 'Feedback could not be submitted.');
      setState('SUCCESS');
      setMessage('Thanks — your feedback was sent to the commissioner.');
    } catch (error) {
      setState('ERROR');
      setMessage(error instanceof Error ? error.message : 'Feedback could not be submitted.');
    }
  };

  if (state === 'SUCCESS') {
    return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 shadow-sm dark:border-emerald-900/50 dark:bg-emerald-950/20 sm:p-8" aria-live="polite">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">Feedback received</p>
      <h2 className="mt-2 text-2xl font-black uppercase italic text-slate-950 dark:text-white">Thanks, we’ve got it.</h2>
      <p className="mt-3 text-sm leading-6 text-slate-700 dark:text-gray-300">{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        {pagePath !== '/feedback' && <Link href={pagePath} className="inline-flex min-h-11 items-center rounded-xl bg-orange-600 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">Return to previous page</Link>}
        <Link href="/" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/15 dark:text-white">Return home</Link>
      </div>
    </section>;
  }

  return <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212] sm:p-8">
    <fieldset>
      <legend className="text-xs font-black uppercase tracking-[0.22em] text-slate-500 dark:text-gray-400">What would you like to send?</legend>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <button type="button" aria-pressed={type === 'BUG'} onClick={() => switchType('BUG')} className={`min-h-16 rounded-2xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${type === 'BUG' ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/20' : 'border-slate-200 dark:border-white/10'}`}><span className="block text-sm font-black uppercase italic text-slate-950 dark:text-white">Report a bug</span><span className="mt-1 block text-xs text-slate-600 dark:text-gray-400">Something isn’t working as expected.</span></button>
        <button type="button" aria-pressed={type === 'SUGGESTION'} onClick={() => switchType('SUGGESTION')} className={`min-h-16 rounded-2xl border p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 ${type === 'SUGGESTION' ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/20' : 'border-slate-200 dark:border-white/10'}`}><span className="block text-sm font-black uppercase italic text-slate-950 dark:text-white">Suggest an improvement</span><span className="mt-1 block text-xs text-slate-600 dark:text-gray-400">Have an idea that would make River City better?</span></button>
      </div>
    </fieldset>

    <div className="mt-6 space-y-5">
      <div><label htmlFor="feedback-title" className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-gray-300">Title <span aria-hidden="true" className="text-orange-600">*</span></label><input id="feedback-title" required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} className={fieldClass()} aria-describedby="feedback-title-help" /><p id="feedback-title-help" className="mt-1 text-xs text-slate-500">Keep it short and specific.</p></div>
      <div><label htmlFor="feedback-description" className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-gray-300">{type === 'BUG' ? 'What happened?' : 'Tell us about your idea'} <span aria-hidden="true" className="text-orange-600">*</span></label><textarea id="feedback-description" required maxLength={2000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} className={`${fieldClass()} py-3`} /></div>
      {type === 'BUG' ? <>
        <div><label htmlFor="feedback-expected" className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-gray-300">What did you expect to happen?</label><textarea id="feedback-expected" maxLength={1000} rows={3} value={expectedBehavior} onChange={(event) => setExpectedBehavior(event.target.value)} className={`${fieldClass()} py-3`} /></div>
        <div><label htmlFor="feedback-steps" className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-gray-300">Steps to reproduce</label><textarea id="feedback-steps" maxLength={1500} rows={4} value={reproductionSteps} onChange={(event) => setReproductionSteps(event.target.value)} className={`${fieldClass()} py-3`} /></div>
      </> : <div><label htmlFor="feedback-rationale" className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-gray-300">Why would this help?</label><textarea id="feedback-rationale" maxLength={1000} rows={3} value={suggestionRationale} onChange={(event) => setSuggestionRationale(event.target.value)} className={`${fieldClass()} py-3`} /></div>}
      <div><label htmlFor="feedback-area" className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-gray-300">Site area</label><select id="feedback-area" value={area} onChange={(event) => setArea(event.target.value as FeedbackArea)} className={fieldClass()}>{FEEDBACK_AREAS.map((item) => <option key={item} value={item}>{areaLabels[item]}</option>)}</select><p className="mt-1 text-xs text-slate-500">This helps the commissioner find the right context.</p></div>
      <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600 dark:bg-white/5 dark:text-gray-400"><span className="font-black uppercase tracking-widest">Page context</span><span className="mt-1 block break-all font-mono">{pagePath}</span></div>
    </div>

    {message && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-300">{message}</p>}
    <button type="submit" disabled={state === 'SUBMITTING'} className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-orange-600 px-5 py-3 text-[10px] font-black uppercase tracking-widest text-white hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:cursor-not-allowed disabled:opacity-60">{state === 'SUBMITTING' ? 'Sending feedback…' : 'Send feedback'}</button>
  </form>;
}
