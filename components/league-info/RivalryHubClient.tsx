"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Info,
  ShieldCheck,
  Swords,
  Trophy,
} from "lucide-react";
import {
  type KeyboardEvent,
  useId,
  useRef,
  useState,
} from "react";
import type {
  RivalryCardPresentation,
  RivalryExplorerCategoryId,
  RivalryHubPresentation,
} from "@/lib/managers/rivalryHubPresentation";
import {
  filterOrderedRivalryCards,
  limitRivalryCards,
} from "@/lib/managers/rivalryHubPresentation";

type RivalryScope = "all-time" | "active";
type CardContext = "top" | RivalryExplorerCategoryId;

function OwnerIdentity({
  owner,
}: {
  owner: RivalryCardPresentation["ownerA"];
}) {
  return (
    <div className="min-w-0 text-center">
      <div className="relative mx-auto h-16 w-16 overflow-hidden rounded-full border-2 border-black/10 bg-black/5 dark:border-white/10 dark:bg-white/5 sm:h-20 sm:w-20">
        {owner.photo ? (
          <Image
            src={owner.photo}
            alt={`${owner.fullName} profile photo`}
            fill
            sizes="80px"
            className="object-cover object-top"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xl font-black text-black/25 dark:text-white/25">
            {owner.fullName[0]}
          </div>
        )}
      </div>
      <p className="mt-2 truncate text-sm font-black uppercase italic sm:text-base">
        {owner.shortName}
      </p>
      <p className="mt-0.5 line-clamp-2 text-[9px] font-black uppercase tracking-wider text-black/40 dark:text-white/40">
        {owner.teamName}
      </p>
    </div>
  );
}

function ScoreDisclosure({ card }: { card: RivalryCardPresentation }) {
  const [expanded, setExpanded] = useState(false);
  const disclosureId = useId();

  if (card.scoreExplanation.length === 0) return null;

  return (
    <div className="border-t border-black/10 pt-3 dark:border-white/10">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={disclosureId}
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left text-[10px] font-black uppercase tracking-widest text-black/55 transition hover:text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:text-white/55 dark:hover:text-white"
      >
        Why this ranks here
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {expanded && (
        <div id={disclosureId} className="mt-3 space-y-3">
          {card.scoreExplanation.map((component) => (
            <div key={component.key}>
              <div className="flex items-end justify-between gap-3 text-[9px] font-black uppercase tracking-wider">
                <span>{component.label}</span>
                <span className="text-black/45 dark:text-white/45">
                  {component.normalizedLabel} · {component.weightLabel}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                role="meter"
                aria-label={`${component.label} normalized score`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={component.normalizedPercent}
                aria-valuetext={`${component.normalizedLabel}, ${component.weightLabel}, ${component.contributionLabel}`}
              >
                <div
                  className="h-full rounded-full bg-red-600"
                  style={{ width: `${component.normalizedPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RivalryCard({
  card,
  context,
}: {
  card: RivalryCardPresentation;
  context: CardContext;
}) {
  return (
    <article className="min-w-0 overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-[#121212]">
      <div className="border-t-4 border-red-600 p-4 sm:p-5">
        <div className="flex min-h-6 flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {card.rankLabel && (
              <span className="rounded-full bg-black px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white dark:bg-white dark:text-black">
                {card.rankLabel} Calculated
              </span>
            )}
            {card.coverage.badgeLabel && (
              <span
                className="rounded-full border border-amber-600/30 bg-amber-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-200"
                title={card.coverage.detail}
              >
                {card.coverage.badgeLabel}
              </span>
            )}
            {card.recognitionLabel && (
              <span className="rounded-full border border-red-600/25 bg-red-600/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-red-700 dark:text-red-300">
                {card.recognitionLabel}
              </span>
            )}
          </div>
          {card.scoreLabel && (
            <p className="text-[10px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">
              Score <span className="text-base text-red-600">{card.scoreLabel}</span>
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-3 sm:gap-5">
          <OwnerIdentity owner={card.ownerA} />
          <div className="mt-5 rounded-full border border-red-600/20 bg-red-600/10 px-2.5 py-2 text-xs font-black italic text-red-700 dark:text-red-300 sm:mt-7">
            VS
          </div>
          <OwnerIdentity owner={card.ownerB} />
        </div>

        <div className="mt-5 rounded-md bg-black/[0.035] p-3 text-center dark:bg-white/[0.05]">
          <p className="text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            {context === "top" ? "Top Calculated Rivalry" : "Category Focus"}
          </p>
          <p className="mt-1 text-sm font-black uppercase italic">
            {card.categoryHighlights[context]}
          </p>
          {card.seriesLeaderLabel && context !== "biggest-series-leads" && (
            <p
              className="mt-1 text-xs font-bold text-black/55 dark:text-white/55"
              aria-label={card.competitiveRecordAccessibleLabel ?? undefined}
            >
              {card.seriesLeaderLabel}
            </p>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-black/10 p-2.5 dark:border-white/10">
            <p className="text-[8px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              Competitive Meetings
            </p>
            <p className="mt-1 text-lg font-black">{card.competitiveMeetings}</p>
          </div>
          <div className="rounded-md border border-black/10 p-2.5 dark:border-white/10">
            <p className="text-[8px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              Latest Season
            </p>
            <p className="mt-1 text-lg font-black">
              {card.latestCompetitiveSeason ?? "—"}
            </p>
          </div>
        </div>

        {(card.championshipPlayoffMeetings > 0 ||
          card.championshipGameMeetings > 0) && (
          <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-wider">
            {card.championshipGameMeetings > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-600/10 px-2.5 py-1 text-red-700 dark:text-red-300">
                <Trophy size={11} /> {card.championshipGameMeetings} Championship Games
              </span>
            )}
            {card.championshipPlayoffMeetings > 0 && (
              <span className="rounded-full bg-black/5 px-2.5 py-1 text-black/55 dark:bg-white/10 dark:text-white/55">
                {card.championshipPlayoffMeetings} Championship Playoff Meetings
              </span>
            )}
          </div>
        )}

        {card.eligibilityLabel && (
          <p className="mt-3 text-xs font-bold text-black/50 dark:text-white/50">
            {card.eligibilityLabel}
          </p>
        )}

        <div className="mt-4 space-y-3">
          <ScoreDisclosure card={card} />
          {card.headToHeadHref && (
            <Link
              href={card.headToHeadHref}
              aria-label={`View ${card.ownerA.fullName} versus ${card.ownerB.fullName} head-to-head`}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-black px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2 dark:bg-white dark:text-black dark:hover:bg-red-600 dark:hover:text-white"
            >
              View Head-to-Head <ArrowRight size={13} />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}

function ShowMoreControl({
  expanded,
  total,
  initialCount,
  onToggle,
}: {
  expanded: boolean;
  total: number;
  initialCount: number;
  onToggle: () => void;
}) {
  if (total <= initialCount) return null;
  return (
    <div className="mt-5 text-center">
      <button
        type="button"
        onClick={onToggle}
        className="rounded-md border border-black/10 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition hover:border-red-600 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:border-white/10"
      >
        {expanded ? "Show Less" : `Show More · ${total - initialCount}`}
      </button>
    </div>
  );
}

export default function RivalryHubClient({
  presentation,
}: {
  presentation: RivalryHubPresentation;
}) {
  const router = useRouter();
  const [headToHeadOwnerId, setHeadToHeadOwnerId] = useState("");
  const [headToHeadOpponentId, setHeadToHeadOpponentId] = useState("");
  const [selectedOwnerId, setSelectedOwnerId] = useState("all");
  const [scope, setScope] = useState<RivalryScope>("all-time");
  const [selectedCategoryId, setSelectedCategoryId] =
    useState<RivalryExplorerCategoryId>("most-competitive");
  const [showAllTop, setShowAllTop] = useState(false);
  const [showAllCategory, setShowAllCategory] = useState(false);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedCategory =
    presentation.categories.find(
      (category) => category.id === selectedCategoryId
    ) ?? presentation.categories[0];
  const headToHeadOwner = presentation.headToHeadFinderOwners.find(
    (owner) => owner.ownerId === headToHeadOwnerId
  );
  const headToHeadOpponent = headToHeadOwner?.opponents.find(
    (opponent) => opponent.ownerId === headToHeadOpponentId
  );

  const cardFilter = {
    ownerId: selectedOwnerId === "all" ? null : selectedOwnerId,
    activeOwnersOnly: scope === "active",
  };
  const topCards = filterOrderedRivalryCards(
    presentation.cards,
    presentation.topRivalryKeys,
    cardFilter
  );
  const categoryCards = filterOrderedRivalryCards(
    presentation.cards,
    selectedCategory?.orderedRivalryKeys ?? [],
    cardFilter
  );
  const visibleTopCards = limitRivalryCards(
    topCards,
    showAllTop,
    presentation.initialCardCount
  );
  const visibleCategoryCards = limitRivalryCards(
    categoryCards,
    showAllCategory,
    presentation.initialCardCount
  );

  const selectCategory = (categoryId: RivalryExplorerCategoryId) => {
    setSelectedCategoryId(categoryId);
    setShowAllCategory(false);
  };

  const onTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight") {
      nextIndex = (index + 1) % presentation.categories.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (index - 1 + presentation.categories.length) %
        presentation.categories.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = presentation.categories.length - 1;
    }
    if (nextIndex === null) return;
    event.preventDefault();
    const nextCategory = presentation.categories[nextIndex];
    selectCategory(nextCategory.id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-white pb-24 text-black dark:bg-[#0a0a0a] dark:text-white">
      <nav className="sticky top-0 z-50 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/90 sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link
            href="/league-info"
            className="inline-flex items-center gap-2 rounded-md border border-black/10 bg-black/[0.03] px-3 py-2 text-[9px] font-black uppercase tracking-wider transition hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:border-white/10 dark:bg-white/[0.05]"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back to League Info</span>
            <span className="sm:hidden">League Info</span>
          </Link>
          <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase italic tracking-widest">
            <Swords className="text-red-600" size={17} /> Rivalry Hub
          </span>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
        <header className="rounded-lg border border-black/10 bg-black/[0.02] p-5 dark:border-white/10 dark:bg-white/[0.04] sm:p-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-red-600">
              <Swords size={16} /> Supported Matchup History
            </div>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-tighter sm:text-6xl">
              Rivalry <span className="text-red-600">Hub</span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-medium leading-6 text-black/60 dark:text-white/60">
              Explore calculated rivalries built from supported matchup history.
              Head-to-Head pages remain the source for complete meeting detail,
              while future recognized rivalries will be curated separately.
            </p>
          </div>
          <details className="mt-5 max-w-3xl rounded-md border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#121212]">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-[10px] font-black uppercase tracking-widest focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
              <Info size={15} className="text-red-600" /> How rankings work
            </summary>
            <p className="mt-3 text-sm font-medium leading-6 text-black/60 dark:text-white/60">
              {presentation.methodology.summary}
            </p>
            <ul className="mt-3 space-y-2 text-xs font-medium leading-5 text-black/55 dark:text-white/55">
              {presentation.methodology.requirements.map((requirement) => (
                <li key={requirement} className="flex gap-2">
                  <ShieldCheck size={13} className="mt-0.5 shrink-0 text-red-600" />
                  <span>{requirement}</span>
                </li>
              ))}
            </ul>
          </details>
        </header>

        <section
          aria-labelledby="head-to-head-finder-heading"
          className="rounded-lg border border-red-600/20 bg-red-600/[0.035] p-4 dark:bg-red-600/[0.06] sm:p-5"
        >
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-red-600">
              Matchup History
            </p>
            <h2
              id="head-to-head-finder-heading"
              className="mt-1 text-lg font-black uppercase italic sm:text-xl"
            >
              Find a Head-to-Head
            </h2>
            <p className="mt-1 text-sm font-medium text-black/55 dark:text-white/55">
              Choose a specific owner matchup to open its supported factual history.
            </p>
          </div>
          <form
            className="mt-4 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
            onSubmit={(event) => {
              event.preventDefault();
              if (headToHeadOpponent) router.push(headToHeadOpponent.href);
            }}
          >
            <label className="block min-w-0" htmlFor="head-to-head-owner">
              <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">
                Owner
              </span>
              <select
                id="head-to-head-owner"
                value={headToHeadOwnerId}
                onChange={(event) => {
                  setHeadToHeadOwnerId(event.target.value);
                  setHeadToHeadOpponentId("");
                }}
                className="w-full min-w-0 rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm font-black outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-white/10 dark:bg-[#121212]"
              >
                <option value="">Choose an owner</option>
                {presentation.headToHeadFinderOwners.map((owner) => (
                  <option key={owner.ownerId} value={owner.ownerId}>
                    {owner.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0" htmlFor="head-to-head-opponent">
              <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">
                Opponent
              </span>
              <select
                id="head-to-head-opponent"
                value={headToHeadOpponentId}
                disabled={!headToHeadOwner}
                aria-describedby="head-to-head-opponent-help"
                onChange={(event) => setHeadToHeadOpponentId(event.target.value)}
                className="w-full min-w-0 rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm font-black outline-none disabled:cursor-not-allowed disabled:opacity-50 focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-white/10 dark:bg-[#121212]"
              >
                <option value="">
                  {headToHeadOwner ? "Choose an opponent" : "Choose an owner first"}
                </option>
                {headToHeadOwner?.opponents.map((opponent) => (
                  <option key={opponent.ownerId} value={opponent.ownerId}>
                    {opponent.fullName}
                  </option>
                ))}
              </select>
              <span id="head-to-head-opponent-help" className="sr-only">
                Select an owner first. Only opponents with supported Head-to-Head history are available.
              </span>
            </label>
            <button
              type="submit"
              disabled={!headToHeadOpponent}
              className="w-full rounded-md bg-black px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-black dark:hover:bg-red-600 dark:hover:text-white md:w-auto"
            >
              View Head-to-Head
            </button>
          </form>
        </section>

        <section aria-labelledby="rivalry-filters" className="rounded-lg border border-black/10 p-4 dark:border-white/10 sm:p-5">
          <h2 id="rivalry-filters" className="text-xs font-black uppercase tracking-widest">
            Explore the League
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <label className="block min-w-0" htmlFor="rivalry-owner-filter">
              <span className="mb-2 block text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                Owner
              </span>
              <select
                id="rivalry-owner-filter"
                value={selectedOwnerId}
                onChange={(event) => {
                  setSelectedOwnerId(event.target.value);
                  setShowAllTop(false);
                  setShowAllCategory(false);
                }}
                className="w-full rounded-md border border-black/10 bg-white px-3 py-2.5 text-sm font-black outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/20 dark:border-white/10 dark:bg-[#121212]"
              >
                <option value="all">All Owners</option>
                {presentation.ownerOptions.map((owner) => (
                  <option key={owner.ownerId} value={owner.ownerId}>
                    {owner.fullName} · {owner.teamName}
                  </option>
                ))}
              </select>
            </label>
            <fieldset>
              <legend className="mb-2 text-[9px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
                Scope
              </legend>
              <div className="grid grid-cols-2 rounded-md border border-black/10 p-1 dark:border-white/10">
                {(["all-time", "active"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={scope === value}
                    onClick={() => {
                      setScope(value);
                      setShowAllTop(false);
                      setShowAllCategory(false);
                    }}
                    className={`rounded px-4 py-2 text-[9px] font-black uppercase tracking-wider transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                      scope === value
                        ? "bg-black text-white dark:bg-white dark:text-black"
                        : "text-black/45 hover:text-black dark:text-white/45 dark:hover:text-white"
                    }`}
                  >
                    {value === "all-time" ? "All-Time" : "Active Owners"}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <p
            className="mt-4 rounded-md bg-black/[0.035] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black/55 dark:bg-white/[0.05] dark:text-white/55"
            role="status"
            aria-live="polite"
          >
            {scope === "active" ? "Active Owners" : "All-Time"} scope ·{" "}
            {topCards.length} calculated rivalries · {categoryCards.length}{" "}
            {selectedCategory.label} results
            {selectedOwnerId !== "all" && " for selected owner"}
          </p>
        </section>

        <section aria-labelledby="top-rivalries-heading">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-red-600">
              League Ranking
            </p>
            <h2 id="top-rivalries-heading" className="mt-1 text-2xl font-black uppercase italic sm:text-3xl">
              Top Rivalries
            </h2>
            <p className="mt-2 text-sm font-medium text-black/50 dark:text-white/50">
              Highest calculated Rivalry Score v1 rankings in the selected scope.
            </p>
          </div>
          {visibleTopCards.length > 0 ? (
            <div className="mt-5 grid gap-4 lg:grid-cols-3">
              {visibleTopCards.map((card) => (
                <RivalryCard key={card.rivalryKey} card={card} context="top" />
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-lg border border-dashed border-black/15 p-6 text-sm font-medium text-black/50 dark:border-white/15 dark:text-white/50">
              No calculated rivalries match the selected owner and scope.
            </div>
          )}
          <ShowMoreControl
            expanded={showAllTop}
            total={topCards.length}
            initialCount={presentation.initialCardCount}
            onToggle={() => setShowAllTop((value) => !value)}
          />
        </section>

        <section aria-labelledby="explorer-heading">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-red-600">
              Alternate Lenses
            </p>
            <h2 id="explorer-heading" className="mt-1 text-2xl font-black uppercase italic sm:text-3xl">
              Rivalry Explorer
            </h2>
          </div>

          <div
            className="mt-5 max-w-full overflow-x-auto pb-2"
            role="tablist"
            aria-label="Rivalry explorer categories"
          >
            <div className="inline-flex min-w-max gap-2 rounded-lg border border-black/10 p-2 dark:border-white/10">
              {presentation.categories.map((category, index) => (
                <button
                  key={category.id}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  id={`rivalry-tab-${category.id}`}
                  aria-selected={selectedCategoryId === category.id}
                  aria-controls="rivalry-category-panel"
                  tabIndex={selectedCategoryId === category.id ? 0 : -1}
                  onClick={() => selectCategory(category.id)}
                  onKeyDown={(event) => onTabKeyDown(event, index)}
                  className={`whitespace-nowrap rounded-md px-3 py-2 text-[9px] font-black uppercase tracking-wider transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 ${
                    selectedCategoryId === category.id
                      ? "bg-red-600 text-white"
                      : "bg-black/[0.03] text-black/50 hover:text-black dark:bg-white/[0.05] dark:text-white/50 dark:hover:text-white"
                  }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          <div
            id="rivalry-category-panel"
            role="tabpanel"
            aria-labelledby={`rivalry-tab-${selectedCategory.id}`}
            tabIndex={0}
            className="mt-3 rounded-lg border border-black/10 bg-black/[0.015] p-4 outline-none focus-visible:ring-2 focus-visible:ring-red-600 dark:border-white/10 dark:bg-white/[0.025] sm:p-5"
          >
            <h3 className="text-lg font-black uppercase italic">
              {selectedCategory.label}
            </h3>
            <p className="mt-1 text-sm font-medium leading-6 text-black/50 dark:text-white/50">
              {selectedCategory.description}
            </p>

            {visibleCategoryCards.length > 0 ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {visibleCategoryCards.map((card) => (
                  <RivalryCard
                    key={card.rivalryKey}
                    card={card}
                    context={selectedCategory.id}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-md border border-dashed border-black/15 p-6 dark:border-white/15">
                <p className="text-sm font-bold">{selectedCategory.emptyMessage}</p>
                {selectedOwnerId !== "all" && (
                  <p className="mt-1 text-xs font-medium text-black/45 dark:text-white/45">
                    The current owner filter remains applied.
                  </p>
                )}
              </div>
            )}
            <ShowMoreControl
              expanded={showAllCategory}
              total={categoryCards.length}
              initialCount={presentation.initialCardCount}
              onToggle={() => setShowAllCategory((value) => !value)}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
