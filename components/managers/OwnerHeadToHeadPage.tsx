"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  History,
  ShieldCheck,
  Swords,
  Trophy,
} from "lucide-react";
import type {
  OwnerHeadToHeadMeetingPresentation,
  OwnerHeadToHeadMetricPresentation,
  OwnerHeadToHeadOwnerPresentation,
  OwnerHeadToHeadPresentation,
} from "@/lib/managers/ownerHeadToHeadLoader";
import SiteShell from "@/components/SiteShell";

function OwnerIdentity({
  owner,
  priority,
}: {
  owner: OwnerHeadToHeadOwnerPresentation;
  priority?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white bg-black/10 shadow-lg ring-1 ring-black/10 dark:border-[#121212] dark:bg-white/10 dark:ring-white/15 sm:h-36 sm:w-36">
        {owner.photo ? (
          <Image
            src={owner.photo}
            alt={owner.fullName}
            fill
            sizes="(min-width: 640px) 144px, 112px"
            className="object-cover object-top"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl font-black text-black/25 dark:text-white/25">
            {owner.shortName[0]}
          </div>
        )}
      </div>
      <p className="mt-4 text-xl font-black uppercase italic sm:text-2xl">
        {owner.fullName}
      </p>
      <p className="mt-1 max-w-full break-words text-[10px] font-black uppercase tracking-[0.2em] text-black/45 dark:text-white/45">
        {owner.teamName}
      </p>
    </div>
  );
}

function MetricGrid({
  metrics,
}: {
  metrics: readonly OwnerHeadToHeadMetricPresentation[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
        >
          <p
            className="break-words text-lg font-black tabular-nums sm:text-xl"
            aria-label={metric.accessibleValue}
          >
            {metric.value}
          </p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
            {metric.label}
          </p>
        </div>
      ))}
    </div>
  );
}

function Section({
  title,
  icon,
  description,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121212] sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <div className="mt-0.5 text-orange-600">{icon}</div>
        <div>
          <h2 className="text-sm font-black uppercase italic tracking-wide">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-xs font-medium leading-5 text-slate-600 dark:text-white/50">
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  );
}

function resultClasses(
  tone: OwnerHeadToHeadMeetingPresentation["resultTone"]
) {
  if (tone === "positive") {
    return "border-emerald-600/20 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300";
  }
  if (tone === "negative") {
    return "border-red-600/20 bg-red-600/10 text-red-700 dark:text-red-300";
  }
  return "border-black/10 bg-black/[0.04] text-black/60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/60";
}

function MeetingCard({
  meeting,
  compact = false,
}: {
  meeting: OwnerHeadToHeadMeetingPresentation;
  compact?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[0.04] ${
        compact ? "p-4" : "p-4 sm:p-5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-lg font-black tabular-nums">{meeting.season}</p>
          <p className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            {meeting.contextLabel}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span className="rounded-full border border-black/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-black/55 dark:border-white/10 dark:text-white/55">
            {meeting.classificationLabel}
          </span>
          {meeting.isChampionshipGame && (
            <span className="rounded-full border border-yellow-500/25 bg-yellow-500/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-yellow-700 dark:text-yellow-300">
              Championship Game
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 border-y border-black/10 py-3 dark:border-white/10">
        <div>
          <p className="text-2xl font-black tabular-nums" aria-label={meeting.accessibleScore}>
            {meeting.scoreLabel}
          </p>
          <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            Margin {meeting.marginLabel}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${resultClasses(
            meeting.resultTone
          )}`}
        >
          {meeting.resultLabel}
        </span>
      </div>

      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <p className="min-w-0 font-semibold text-black/60 dark:text-white/60">
          <span className="block text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
            Owner franchise
          </span>
          <span className="mt-1 block break-words">{meeting.ownerFranchiseName}</span>
        </p>
        <p className="min-w-0 font-semibold text-black/60 dark:text-white/60 sm:text-right">
          <span className="block text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
            Opponent franchise
          </span>
          <span className="mt-1 block break-words">
            {meeting.opponentFranchiseName}
          </span>
        </p>
      </div>

      {meeting.ownerTeammateNames.length > 0 && (
        <p className="mt-3 text-xs font-medium text-black/50 dark:text-white/50">
          Same-side co-owner: {meeting.ownerTeammateNames.join(", ")}
        </p>
      )}
      {meeting.opponentCoOwnerNames.length > 0 && (
        <p className="mt-2 text-xs font-medium text-black/50 dark:text-white/50">
          Opponent-side co-owner: {meeting.opponentCoOwnerNames.join(", ")}
        </p>
      )}

      {meeting.scoringPeriods.length > 1 && (
        <div className="mt-4 rounded-md border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-black/20">
          <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            Scoring-period breakdown
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {meeting.scoringPeriods.map((period) => (
              <div
                key={period.weekLabel}
                className="flex items-center justify-between gap-3 text-xs font-bold"
              >
                <span className="text-black/50 dark:text-white/50">
                  {period.weekLabel}
                </span>
                <span className="tabular-nums">{period.scoreLabel}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}

export default function OwnerHeadToHeadPage({
  presentation,
}: {
  presentation: OwnerHeadToHeadPresentation;
}) {
  const [selectedFilter, setSelectedFilter] = useState(
    presentation.filters[0]?.value ?? "all"
  );
  const visibleMeetingKeys = useMemo(
    () =>
      new Set(
        presentation.filters.find((filter) => filter.value === selectedFilter)
          ?.meetingKeys ?? []
      ),
    [presentation.filters, selectedFilter]
  );
  const visibleMeetings = presentation.meetings.filter((meeting) =>
    visibleMeetingKeys.has(meeting.meetingKey)
  );

  return (
    <SiteShell activePath="/managers">
      <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#f7f8fa] px-4 py-8 text-slate-950 dark:bg-[#0a0a0a] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto min-w-0 max-w-7xl space-y-6">
        <section className="min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
          <div className="border-t-[5px] border-orange-600 p-5 sm:p-8">
            <Link
              href={presentation.backHref}
              className="inline-flex min-h-10 max-w-full items-center gap-2 whitespace-normal rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:border-orange-600 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:border-white/10 dark:bg-white/[0.06] dark:text-white/55 dark:hover:text-white"
            >
              <ArrowLeft size={13} />
              {presentation.backLabel}
            </Link>

            <div className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-center sm:gap-8 lg:gap-14">
              <OwnerIdentity owner={presentation.owner} priority />
              <div className="flex shrink-0 items-center self-center rounded-full border border-orange-600/20 bg-orange-600/10 px-5 py-3 text-xl font-black italic text-orange-700 dark:text-orange-300">
                VS
              </div>
              <OwnerIdentity owner={presentation.opponent} priority />
            </div>
            <div className="mt-8 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
                Head-to-Head
              </p>
              <h1 className="mx-auto mt-2 max-w-full break-words px-1 text-xl font-black uppercase italic [overflow-wrap:anywhere] sm:text-4xl">
                {presentation.perspectiveLabel}
              </h1>
            </div>
          </div>
        </section>

        <section
          className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-5"
          aria-labelledby="head-to-head-coverage"
        >
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 shrink-0 text-orange-600" size={18} />
            <div>
              <h2
                id="head-to-head-coverage"
                className="text-xs font-black uppercase tracking-widest"
              >
                {presentation.coverage.title}
              </h2>
              <p className="mt-1 break-words text-sm font-medium leading-6 text-slate-600 dark:text-white/55">
                {presentation.coverage.detail}
              </p>
            </div>
          </div>
        </section>

        {presentation.isSummarySupported ? (
          <>
            <Section
              title="Competitive Series Summary"
              icon={<Swords size={18} />}
              description="Competitive scope includes regular-season and championship-playoff meetings only."
            >
              <MetricGrid metrics={presentation.competitiveMetrics} />
            </Section>

            <Section
              title="All Completed Meetings"
              icon={<History size={18} />}
              description="Secondary classifications are shown separately and do not alter the competitive record."
            >
              <MetricGrid metrics={presentation.allMeetingMetrics} />
            </Section>

            <Section title="Series Context" icon={<CalendarDays size={18} />}>
              <div className="grid gap-3 lg:grid-cols-2">
                {presentation.seriesContext.firstMeeting && (
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                      First Meeting · {presentation.seriesContext.firstSeason}
                    </p>
                    <MeetingCard
                      meeting={presentation.seriesContext.firstMeeting}
                      compact
                    />
                  </div>
                )}
                {presentation.seriesContext.latestMeeting && (
                  <div>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                      Latest Meeting · {presentation.seriesContext.latestSeason}
                    </p>
                    <MeetingCard
                      meeting={presentation.seriesContext.latestMeeting}
                      compact
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div className="rounded-md border border-black/10 p-3 dark:border-white/10">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/35">
                    Owner franchise context
                  </p>
                  <p className="mt-1 font-bold">
                    {presentation.seriesContext.ownerFranchiseNames.join(", ")}
                  </p>
                </div>
                <div className="rounded-md border border-black/10 p-3 dark:border-white/10">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/35">
                    Opponent franchise context
                  </p>
                  <p className="mt-1 font-bold">
                    {presentation.seriesContext.opponentFranchiseNames.join(", ")}
                  </p>
                </div>
              </div>
            </Section>

            {presentation.notableMeetings.length > 0 && (
              <Section
                title="Notable Meetings"
                icon={<Trophy size={18} />}
                description="Selections come directly from the approved directional opponent summary."
              >
                <div className="grid gap-3 xl:grid-cols-3">
                  {presentation.notableMeetings.map((notable) => (
                    <div key={notable.title}>
                      <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                        {notable.title}
                      </p>
                      <MeetingCard meeting={notable.meeting} compact />
                    </div>
                  ))}
                </div>
              </Section>
            )}

            <Section
              title="Meeting History"
              icon={<History size={18} />}
              description="All completed classifications are shown newest-first by default."
            >
              <label className="mb-5 block max-w-sm" htmlFor="meeting-filter">
                  <span className="mb-2 block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-white/40">
                  Filter meetings
                </span>
                <select
                  id="meeting-filter"
                  value={selectedFilter}
                  onChange={(event) => setSelectedFilter(event.target.value as typeof selectedFilter)}
                  className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-black text-slate-950 outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20 dark:border-white/10 dark:bg-[#0a0a0a] dark:text-white"
                >
                  {presentation.filters.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label} · {filter.meetingKeys.length}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-3 lg:grid-cols-2">
                {visibleMeetings.map((meeting) => (
                  <MeetingCard key={meeting.meetingKey} meeting={meeting} />
                ))}
              </div>
            </Section>
          </>
        ) : (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
            <Swords className="mx-auto text-slate-300 dark:text-white/25" size={30} />
            <h2 className="mt-3 text-sm font-black uppercase italic">
              No supported completed meeting detail
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-slate-600 dark:text-white/50">
              The coverage statement above describes what the approved source can establish. No record or matchup statistics have been inferred.
            </p>
          </section>
        )}
      </div>
    </main>
    </SiteShell>
  );
}
