import { redirect } from 'next/navigation';
import SiteShell from '@/components/SiteShell';
import FeedbackForm from '@/app/feedback/FeedbackForm';
import { getLegislativeOwnerSession } from '@/lib/auth/legislativeAccess';
import { feedbackAreaForPath, normalizeFeedbackPagePath } from '@/lib/feedback';

type FeedbackPageProps = {
  searchParams: Promise<{ from?: string }>;
};

export default async function FeedbackPage({ searchParams }: FeedbackPageProps) {
  const params = await searchParams;
  const pagePath = normalizeFeedbackPagePath(params.from, '/feedback');
  const session = await getLegislativeOwnerSession();
  if (!session) {
    redirect(`/member/login?returnTo=${encodeURIComponent(pagePath === '/feedback' ? '/feedback' : `/feedback?from=${encodeURIComponent(pagePath)}`)}`);
  }

  return <SiteShell activePath="/feedback"><main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
    <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121212] sm:p-8">
      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">River City owner input</p>
      <h1 className="mt-2 text-4xl font-black uppercase italic tracking-tighter text-[#071a33] dark:text-white sm:text-5xl">Feedback</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600 dark:text-gray-400">Help us keep River City useful. Send a focused bug report or an idea for a site improvement.</p>
      <p className="mt-3 text-xs font-bold text-slate-500 dark:text-gray-500">Current area: {feedbackAreaForPath(pagePath).replaceAll('_', ' ')}</p>
    </section>
    <FeedbackForm pagePath={pagePath} />
  </main></SiteShell>;
}
