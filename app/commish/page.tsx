import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileText, Gavel, Grid3X3, Home, MessageSquare, WalletCards, Wrench } from 'lucide-react';
import SiteShell from '@/components/SiteShell';
import CommissionerHubOverview from '@/components/CommissionerHubOverview';
import { getCommissionerHubModel } from '@/lib/commissionerHub';
import {
  AuctionAccessError,
  requireAuctionAccess,
} from '@/lib/auth/auctionAccess';

const hubLinks = [
  {
    title: '2026 Finance',
    description: 'Manage the operational ledger, expenses, reconciliation, awards, season close, archive, and exports.',
    href: '/commish/finance/2026',
    icon: WalletCards,
  },
  {
    title: 'Legislative Hub',
    description: 'Review proposals, session status, and rule-change workflow.',
    href: '/commish/proposals',
    icon: Gavel,
  },
  {
    title: 'Maintenance',
    description: 'Refresh current-season trades and maintain published auction values and ADP.',
    href: '/commish/maintenance',
    icon: Wrench,
  },
  {
    title: 'Auction War Room',
    description: 'Open the 2026 Auction War Room and draft-day tools.',
    href: '/commish/auction',
    icon: Grid3X3,
  },
  {
    title: 'Post-Draft Intelligence',
    description: 'Review Draft Grades, Team Outlook, and League Recap; approve, publish, roll back, or unpublish public intelligence.',
    href: '/commish/post-draft',
    icon: FileText,
  },
  {
    title: 'Site Feedback',
    description: 'Review owner bug reports and site improvement suggestions.',
    href: '/commish/feedback',
    icon: MessageSquare,
  },
  {
    title: 'Home',
    description: 'Return to the public league homepage and latest briefing.',
    href: '/',
    icon: Home,
  },
];

export default async function CommishPage() {
  let session;
  try {
    session = await requireAuctionAccess("maintenance");
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect('/commish/login?returnTo=%2Fcommish');
    }

    throw error;
  }

  const hubModel = await getCommissionerHubModel({
    viewer: {
      canViewHub: true,
      canViewFinance: true,
      canViewLegislativeHub: true,
      canViewSeasonOperations: true,
      canViewWarRoom: session.access.canAccessWarRoom,
      warRoomScope: session.access.role === "commissioner" ? "COMMISSIONER" : session.access.canAccessWarRoom ? "OWNER" : "NONE",
      canViewLeagueIntelligence: true,
      canViewOwnerFeedback: true,
      canViewSystemHealth: true,
    },
  });

  return (
      <SiteShell activePath="/commish">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <CommissionerHubOverview model={hubModel} />

          <section aria-labelledby="commissioner-destinations-heading" className="mt-10">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">
                  Commissioner Tools
                </p>
                <h2 id="commissioner-destinations-heading" className="mt-1 text-2xl font-black uppercase italic tracking-tight text-[#071a33] dark:text-white">
                  League Operations
                </h2>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {hubLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-orange-600/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-[#121212]"
              >
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600/10 text-orange-600 transition-colors group-hover:bg-orange-600 group-hover:text-white">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="text-xl font-black uppercase italic tracking-tight text-[#071a33] dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-gray-400">
                  {item.description}
                </p>
                <span className="mt-5 inline-flex text-[10px] font-black uppercase tracking-[0.2em] text-orange-600">
                  Open destination <span aria-hidden="true" className="ml-2">→</span>
                </span>
              </Link>
            );
          })}
            </div>
          </section>

        </main>
      </SiteShell>
  );
}
