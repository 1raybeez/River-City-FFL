import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Gavel, Grid3X3, Home, Shield, Users, WalletCards, Wrench } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';
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
    description: 'Prepare draft-day auction boards and commissioner-only views.',
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
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-black dark:text-white transition-colors duration-300 font-sans pb-20 selection:bg-orange-600">
      <nav className="border-b border-black/5 dark:border-white/10 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md z-50">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-orange-600 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
        <ModeToggle />
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <section className="mb-8 rounded-3xl border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="h-14 w-14 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-lg">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
                Commissioner Hub
              </p>
              <h1 className="text-4xl sm:text-6xl font-black uppercase italic tracking-tighter leading-none">
                Commish Tools
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium text-gray-500 dark:text-gray-400">
                Operational links for league administration. The public Commish Corner briefing is currently a manually maintained recap on the Home page.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {hubLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-3xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#121212] p-6 shadow-xl transition-all hover:border-orange-600/40 hover:-translate-y-1"
              >
                <div className="mb-6 h-12 w-12 rounded-2xl bg-orange-600/10 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-black uppercase italic tracking-tight">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </section>

        <section className="mt-8 rounded-3xl border border-black/10 bg-white p-6 shadow-xl dark:border-white/10 dark:bg-[#121212]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
                Pilot Foundation
              </p>
              <h2 className="mt-1 text-2xl font-black uppercase italic tracking-tight">
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
                    <h3 className="truncate text-lg font-black uppercase italic tracking-tight">
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
    </div>
  );
}
