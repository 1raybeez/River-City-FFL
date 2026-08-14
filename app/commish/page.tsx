import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Gavel, Grid3X3, Home, Shield, Users, WalletCards, Wrench } from 'lucide-react';
import SiteShell from '@/components/SiteShell';
import {
  AuctionAccessError,
  requireAuctionAccess,
} from '@/lib/auth/auctionAccess';
import { getAuctionPilotProfiles } from '@/lib/auction/ownerProfiles';
import { readAuctionOwnerProfileSettings } from '@/lib/auction/ownerProfileSettings';

const hubLinks = [
  {
    title: '2026 Finance',
    description: 'Review dues status, record Venmo payments, and inspect ledger activity.',
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
    description: 'Run protected commissioner data operations.',
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
    title: 'Home',
    description: 'Return to the public league homepage and latest briefing.',
    href: '/',
    icon: Home,
  },
];

export default async function CommishPage() {
  try {
    await requireAuctionAccess();
  } catch (error) {
    if (error instanceof AuctionAccessError) {
      redirect('/commish/login?returnTo=%2Fcommish');
    }

    throw error;
  }

  const pilotProfiles = await Promise.all(
    getAuctionPilotProfiles().map(async (profile) => {
      const settings = await readAuctionOwnerProfileSettings({
        ownerProfileId: profile.ownerProfileId,
      }).catch(() => null);

      return {
        profile,
        settings,
        mappingStatus:
          profile.sleeperRosterId && profile.sleeperUserId ? 'Mapped' : 'Needs Review',
      };
    })
  );

  return (
      <SiteShell activePath="/commish">
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-white/10 dark:bg-[#121212]">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-lg">
                <Shield className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-orange-600">
                  Commissioner Hub
                </p>
                <h1 className="text-4xl font-black uppercase italic tracking-tighter text-[#071a33] sm:text-5xl dark:text-white">
                  River City Commissioner Hub
                </h1>
                <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-gray-400">
                  League administration, finance, governance, maintenance, and draft operations.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="commissioner-destinations-heading">
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

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121212]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
                Pilot Foundation
              </p>
                <h2 className="mt-1 text-2xl font-black uppercase italic tracking-tight text-[#071a33] dark:text-white">
                Owner Access Profiles
              </h2>
              <p className="mt-2 max-w-2xl text-sm font-medium text-gray-500 dark:text-gray-400">
                Commissioner-only view of pilot owner mappings. Authentication remains separate from commissioner maintenance access.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600/10 text-orange-600">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {pilotProfiles.map(({ profile, settings, mappingStatus }) => (
              <div
                key={profile.ownerProfileId}
                className="rounded-2xl border border-black/10 bg-black/[0.03] p-4 dark:border-white/10 dark:bg-white/[0.03]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-black uppercase italic tracking-tight text-[#071a33] dark:text-white">
                      {profile.displayName}
                    </h3>
                    <p className="mt-1 truncate text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                      {profile.email}
                    </p>
                  </div>
                  <span className="rounded-full border border-emerald-600/20 bg-emerald-600/10 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    {profile.pilotEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
                  <p>Profile: {profile.ownerProfileId}</p>
                  <p>Team: {profile.teamName}</p>
                  <p>Roster: {profile.sleeperRosterId ?? 'Unmapped'}</p>
                  <p>Sleeper: {profile.sleeperUserId ?? 'Unmapped'}</p>
                  <p>Mapping: {mappingStatus}</p>
                  <p>
                    Onboarding:{' '}
                    {settings?.onboardingCompleted
                      ? 'Completed'
                      : profile.onboardingStatus}
                  </p>
                  <p>Last Login: Not tracked</p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {['Enable', 'Map', 'Reset'].map((label) => (
                    <button
                      key={label}
                      type="button"
                      disabled
                      className="h-8 rounded-lg border border-black/10 bg-white px-2 text-[8px] font-black uppercase tracking-widest text-gray-400 disabled:cursor-not-allowed dark:border-white/10 dark:bg-black/30"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
        </main>
      </SiteShell>
  );
}
