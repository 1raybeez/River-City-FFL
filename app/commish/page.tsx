'use client';

import Link from 'next/link';
import { ArrowLeft, Gavel, Grid3X3, Home, Shield, Wrench } from 'lucide-react';
import { ModeToggle } from '@/components/ModeToggle';

const hubLinks = [
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

export default function CommishPage() {
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

        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
      </main>
    </div>
  );
}
