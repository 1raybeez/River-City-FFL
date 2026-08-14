'use client';

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ChevronDown,
  Grid3X3,
  Loader2,
  Search,
} from 'lucide-react';
import SiteShell from '@/components/SiteShell';

const COMMISH_ID = '342828350391230464';
const START_YEAR = 2018;
const MIN_SUPPORTED_CURRENT_YEAR = 2026;

type DraftStatus =
  | 'idle'
  | 'no-league'
  | 'no-draft'
  | 'waiting-picks'
  | 'ready'
  | 'error';

const getLatestDraftYear = () =>
  Math.max(new Date().getFullYear(), MIN_SUPPORTED_CURRENT_YEAR);

const isDraftActive = (status?: string) => status === 'drafting';

function getAuctionPrice(pick: any): number | null {
  const possiblePrice =
    pick?.metadata?.amount ??
    pick?.metadata?.price ??
    pick?.amount ??
    pick?.price ??
    null;

  if (
    typeof possiblePrice === 'number' &&
    Number.isFinite(possiblePrice)
  ) {
    return possiblePrice;
  }

  if (
    typeof possiblePrice === 'string' &&
    possiblePrice.trim() !== ''
  ) {
    const parsedPrice = Number(possiblePrice);

    return Number.isFinite(parsedPrice)
      ? parsedPrice
      : null;
  }

  return null;
}

function getDraftPickSearchKey(
  teamId: string,
  pick: any,
  pickIndex: number
) {
  return `player:${teamId}:${pick.pick_no ?? pick.player_id ?? pickIndex}`;
}

function getDraftPickSearchText(pick: any) {
  return [
    pick.metadata?.first_name,
    pick.metadata?.last_name,
    pick.metadata?.full_name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function getTeamAuctionSpent(team: any) {
  return team.picks.reduce(
    (total: number, pick: any) =>
      total + (getAuctionPrice(pick) ?? 0),
    0
  );
}

export default function DraftBoardPage() {
  const latestDraftYear = getLatestDraftYear();

  const draftYears = Array.from(
    { length: latestDraftYear - START_YEAR + 1 },
    (_, index) => latestDraftYear - index
  );

  const [selectedYear, setSelectedYear] =
    useState<number>(latestDraftYear);
  const [draftData, setDraftData] =
    useState<any>(null);
  const [draftStatus, setDraftStatus] =
    useState<DraftStatus>('idle');
  const [draftMessage, setDraftMessage] =
    useState('');
  const [loading, setLoading] =
    useState(false);
  const [mounted, setMounted] =
    useState(false);
  const [searchQuery, setSearchQuery] =
    useState('');
  const [isCompactOwnerHeaderVisible, setIsCompactOwnerHeaderVisible] =
    useState(false);
  const searchMatchRefs = useRef(
    new Map<string, HTMLDivElement>()
  );
  const ownerHeaderSentinelRef =
    useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    async function discoverDraftId(league: any) {
      if (league.draft_id) {
        return league.draft_id;
      }

      const draftsRes = await fetch(
        `https://api.sleeper.app/v1/league/${league.league_id}/drafts`
      );

      if (!draftsRes.ok) {
        return null;
      }

      const drafts = await draftsRes.json();

      if (
        !Array.isArray(drafts) ||
        drafts.length === 0
      ) {
        return null;
      }

      const activeDraft = drafts.find(
        (draft: any) => isDraftActive(draft.status)
      );

      return (
        activeDraft?.draft_id ??
        drafts[0]?.draft_id ??
        null
      );
    }

    async function fetchDraft(showLoading = true) {
      if (showLoading) {
        setLoading(true);
      }

      try {
        const leagueRes = await fetch(
          `https://api.sleeper.app/v1/user/${COMMISH_ID}/leagues/nfl/${selectedYear}`
        );

        if (!leagueRes.ok) {
          throw new Error('Failed to fetch leagues');
        }

        const leagues = await leagueRes.json();

        const myLeague = leagues.find((league: any) =>
          league.name
            ?.toLowerCase()
            .includes('river city')
        );

        if (!myLeague) {
          if (!isCancelled) {
            setDraftData(null);
            setDraftStatus('no-league');
            setDraftMessage(
              `No River City league found for ${selectedYear}.`
            );
          }

          return false;
        }

        const draftId =
          await discoverDraftId(myLeague);

        if (!draftId) {
          if (!isCancelled) {
            setDraftData(null);
            setDraftStatus('no-draft');
            setDraftMessage(
              'Draft has not been created yet.'
            );
          }

          return false;
        }

        const [
          picksRes,
          usersRes,
          draftInfoRes,
        ] = await Promise.all([
          fetch(
            `https://api.sleeper.app/v1/draft/${draftId}/picks`
          ),
          fetch(
            `https://api.sleeper.app/v1/league/${myLeague.league_id}/users`
          ),
          fetch(
            `https://api.sleeper.app/v1/draft/${draftId}`
          ),
        ]);

        if (
          !picksRes.ok ||
          !usersRes.ok ||
          !draftInfoRes.ok
        ) {
          throw new Error(
            'Failed to fetch Sleeper draft data'
          );
        }

        const picks = await picksRes.json();
        const users = await usersRes.json();
        const draftInfo =
          await draftInfoRes.json();

        const totalRounds =
          draftInfo.settings?.rounds ?? 0;

        const draftOrder =
          draftInfo.draft_order || {};

        const getUser = (id: string) =>
          users.find(
            (user: any) => user.user_id === id
          );

        const shouldPoll =
          isDraftActive(draftInfo.status);

        if (
          !Array.isArray(picks) ||
          picks.length === 0
        ) {
          if (!isCancelled) {
            setDraftData(null);
            setDraftStatus('waiting-picks');
            setDraftMessage(
              'Draft created. Waiting for picks.'
            );
          }

          return shouldPoll;
        }

        let teams: any[] = [];

        if (Object.keys(draftOrder).length > 0) {
          const sortedUserIds = Object.keys(
            draftOrder
          ).sort(
            (firstId, secondId) =>
              draftOrder[firstId] -
              draftOrder[secondId]
          );

          teams = sortedUserIds.map((userId) => {
            const user = getUser(userId);
            const slot = draftOrder[userId];

            const teamPicks = picks.filter(
              (pick: any) =>
                pick.picked_by === userId
            );

            return {
              id: userId,
              slot,
              name:
                user?.metadata?.team_name ||
                user?.display_name ||
                `Team ${slot}`,
              avatar: user?.avatar,
              picks: teamPicks,
            };
          });
        } else {
          const pickedByIds = Array.from(
            new Set(
              picks
                .map(
                  (pick: any) =>
                    pick.picked_by
                )
                .filter(Boolean)
            )
          ) as string[];

          teams = pickedByIds.map(
            (userId, index) => {
              const user = getUser(userId);

              const teamPicks = picks.filter(
                (pick: any) =>
                  pick.picked_by === userId
              );

              return {
                id: userId,
                slot: index + 1,
                name:
                  user?.metadata?.team_name ||
                  user?.display_name ||
                  `Team ${index + 1}`,
                avatar: user?.avatar,
                picks: teamPicks,
              };
            }
          );
        }

        if (!isCancelled) {
          setDraftData({
            teams,
            rounds: totalRounds,
            hasPicks: true,
          });

          setDraftStatus('ready');
          setDraftMessage('');
        }

        return shouldPoll;
      } catch (error) {
        console.error(
          'Unable to load draft data:',
          error
        );

        if (!isCancelled) {
          setDraftData(null);
          setDraftStatus('error');
          setDraftMessage(
            `Unable to load draft data for ${selectedYear}.`
          );
        }

        return false;
      } finally {
        if (!isCancelled && showLoading) {
          setLoading(false);
        }
      }
    }

    async function loadAndMaybePoll() {
      const shouldPoll = await fetchDraft();

      if (shouldPoll && !pollId) {
        pollId = setInterval(() => {
          fetchDraft(false).then(
            (stillActive) => {
              if (!stillActive && pollId) {
                clearInterval(pollId);
                pollId = null;
              }
            }
          );
        }, 30000);
      }
    }

    setDraftData(null);
    setDraftStatus('idle');
    setDraftMessage('');

    loadAndMaybePoll();

    return () => {
      isCancelled = true;

      if (pollId) {
        clearInterval(pollId);
      }
    };
  }, [selectedYear]);

  const normalizedSearchQuery =
    searchQuery.trim().toLowerCase();
  const searchMatches = useMemo(() => {
    const ownerIds = new Set<string>();
    const playerKeys = new Set<string>();
    let firstMatchKey: string | null = null;

    if (
      !normalizedSearchQuery ||
      !Array.isArray(draftData?.teams)
    ) {
      return {
        ownerIds,
        playerKeys,
        firstMatchKey,
      };
    }

    draftData.teams.forEach((team: any) => {
      const ownerKey = `owner:${team.id}`;
      const ownerMatches = String(
        team.name ?? ''
      )
        .toLowerCase()
        .includes(normalizedSearchQuery);

      if (ownerMatches) {
        ownerIds.add(team.id);
        firstMatchKey ??= ownerKey;
      }

      team.picks.forEach(
        (pick: any, pickIndex: number) => {
          if (
            !getDraftPickSearchText(
              pick
            ).includes(normalizedSearchQuery)
          ) {
            return;
          }

          const playerKey =
            getDraftPickSearchKey(
              team.id,
              pick,
              pickIndex
            );

          playerKeys.add(playerKey);
          firstMatchKey ??= playerKey;
        }
      );
    });

    return {
      ownerIds,
      playerKeys,
      firstMatchKey,
    };
  }, [draftData, normalizedSearchQuery]);

  useEffect(() => {
    if (!searchMatches.firstMatchKey) {
      return;
    }

    const animationFrame =
      window.requestAnimationFrame(() => {
        searchMatchRefs.current
          .get(searchMatches.firstMatchKey!)
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'center',
          });
      });

    return () =>
      window.cancelAnimationFrame(
        animationFrame
      );
  }, [searchMatches.firstMatchKey]);

  useEffect(() => {
    const sentinel =
      ownerHeaderSentinelRef.current;

    if (!sentinel) {
      setIsCompactOwnerHeaderVisible(
        false
      );
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsCompactOwnerHeaderVisible(
          entry.boundingClientRect.top <= 64
        );
      },
      {
        rootMargin:
          '-64px 0px 0px 0px',
        threshold: 0,
      }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [draftData]);

  if (!mounted) {
    return null;
  }

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'QB':
        return 'bg-red-100 dark:bg-red-900/40 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100';

      case 'RB':
        return 'bg-emerald-100 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100';

      case 'WR':
        return 'bg-sky-100 dark:bg-sky-900/40 border-sky-200 dark:border-sky-800 text-sky-900 dark:text-sky-100';

      case 'TE':
        return 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100';

      case 'K':
        return 'bg-purple-100 dark:bg-purple-900/40 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-100';

      case 'DEF':
        return 'bg-stone-200 dark:bg-stone-700 border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100';

      default:
        return 'bg-gray-100 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500';
    }
  };

  const getPlayerImage = (pick: any) => {
    if (pick.metadata?.position === 'DEF') {
      return `https://sleepercdn.com/images/team_logos/nfl/${String(
        pick.player_id
      ).toLowerCase()}.png`;
    }

    return `https://sleepercdn.com/content/nfl/players/${pick.player_id}.jpg`;
  };

  return (
    <SiteShell activePath="/league-info">
      <main className="w-full overflow-x-hidden pb-12">
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" aria-labelledby="draft-title">
          <Link href="/league-info" className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-bold uppercase tracking-wider text-slate-600 transition hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2">
            <ArrowLeft size={14} aria-hidden="true" /> Back to League Info
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-orange-600">League Info</p>
          <h1 id="draft-title" className="mt-2 font-sans text-4xl font-black italic uppercase tracking-tight text-slate-950 sm:text-5xl">River City Draft Board</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">Draft history and pick archives powered by the league&apos;s Sleeper draft data.</p>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="draft-season" className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Draft season</label>
          <div className="relative w-full sm:w-auto">
          <select
            id="draft-season"
            value={selectedYear}
            onChange={(event) =>
              setSelectedYear(
                Number(event.target.value)
              )
            }
            aria-label="Draft season"
            className="h-11 w-full cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-xs font-black uppercase italic text-slate-800 shadow-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-600/20 sm:w-auto"
          >
            {draftYears.map((year) => (
              <option
                key={year}
                value={year}
                className="text-black"
              >
                {year} Season
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" aria-hidden="true" />
        </div>
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4 pt-5 sm:px-6 lg:px-8">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-600" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) =>
              setSearchQuery(
                event.target.value
              )
            }
            placeholder="Search player or owner..."
            aria-label="Search player or owner"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-bold text-slate-900 shadow-sm outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-600/20"
          />
        </label>
      </div>

      <section className="w-full px-4 pt-6 sm:px-6 lg:px-8" aria-label="Draft board">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 opacity-50">
            <Loader2 className="mb-4 h-10 w-10 animate-spin text-orange-600" />

            <p className="animate-pulse text-[10px] font-black uppercase tracking-widest">
              Syncing Sleeper Data...
            </p>
          </div>
        ) : !draftData || !draftData.teams ? (
          <div className="mx-auto max-w-xl px-6 py-20 text-center">
            <div className="rounded-[2rem] border border-dashed border-black/10 bg-black/5 px-6 py-10 dark:border-white/10 dark:bg-white/5">
              <Grid3X3
                size={36}
                className="mx-auto mb-4 text-orange-600 opacity-50"
              />

              <p className="text-xs font-black uppercase italic opacity-50">
                {draftMessage ||
                  `No draft record for ${selectedYear}.`}
              </p>

              {draftStatus ===
                'waiting-picks' && (
                <p className="mt-3 text-[9px] font-black uppercase tracking-[0.25em] opacity-30">
                  Live draft board will update
                  automatically when picks arrive.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="custom-scrollbar max-w-full overflow-x-auto overflow-y-clip rounded-2xl border border-slate-200 bg-white shadow-sm" role="region" aria-label="Scrollable draft board">
          <div className="inline-block min-w-full p-6">
            <div
              ref={ownerHeaderSentinelRef}
              className="h-px"
            />

            <div className="sticky top-16 z-40 h-0">
              <div
                aria-hidden={
                  !isCompactOwnerHeaderVisible
                }
                className={`flex h-12 gap-4 border-y border-black/10 bg-white shadow-md transition-opacity dark:border-white/10 dark:bg-[#0a0a0a] ${
                  isCompactOwnerHeaderVisible
                    ? 'visible opacity-100'
                    : 'invisible opacity-0'
                }`}
              >
                {draftData.teams.map(
                  (team: any) => {
                    const ownerMatches =
                      searchMatches.ownerIds.has(
                        team.id
                      );

                    return (
                      <div
                        key={`compact-${team.id}`}
                        className={`flex h-12 w-32 shrink-0 items-center gap-2 border-r border-black/10 px-2 dark:border-white/10 sm:w-40 ${
                          ownerMatches
                            ? 'bg-orange-500/10 ring-2 ring-inset ring-orange-500'
                            : ''
                        }`}
                      >
                        <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10">
                          {team.avatar ? (
                            <Image
                              src={`https://sleepercdn.com/avatars/thumbs/${team.avatar}`}
                              alt=""
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[9px] font-black opacity-40">
                              {team.name[0]}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[9px] font-black uppercase italic leading-tight tracking-tighter">
                            {team.name}
                          </p>
                          <p className="mt-0.5 whitespace-nowrap text-[8px] font-black uppercase tracking-wider opacity-40">
                            $
                            {getTeamAuctionSpent(
                              team
                            )}{' '}
                            · {team.picks.length}
                          </p>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </div>

            <div className="flex gap-4">
              {draftData.teams.map(
                (team: any) => {
                  const ownerSearchKey = `owner:${team.id}`;
                  const ownerMatches =
                    searchMatches.ownerIds.has(
                      team.id
                    );
                  const totalAuctionSpent =
                    getTeamAuctionSpent(
                      team
                    );

                  return (
                  <div
                    key={team.id}
                    className={`flex w-32 shrink-0 flex-col gap-3 sm:w-40 ${
                      ownerMatches
                        ? 'rounded-2xl bg-orange-500/5 ring-2 ring-orange-500/70 ring-offset-4 ring-offset-white dark:ring-offset-[#0a0a0a]'
                        : ''
                    }`}
                  >
                    <div
                      ref={(element) => {
                        if (element) {
                          searchMatchRefs.current.set(
                            ownerSearchKey,
                            element
                          );
                        } else {
                          searchMatchRefs.current.delete(
                            ownerSearchKey
                          );
                        }
                      }}
                      className="relative flex h-28 flex-col items-center justify-center rounded-2xl border border-black/5 border-b-4 border-b-orange-600 bg-[#f2f2f2] p-3 text-center shadow-md dark:border-white/5 dark:border-b-orange-600 dark:bg-[#161616]"
                    >
                      <div className="absolute left-2 top-2 text-[8px] font-black uppercase tracking-tighter opacity-20">
                        #{team.slot}
                      </div>

                      <div className="relative mb-2 h-10 w-10 overflow-hidden rounded-full border border-black/10 bg-black/20 dark:border-white/10">
                        {team.avatar ? (
                          <Image
                            src={`https://sleepercdn.com/avatars/thumbs/${team.avatar}`}
                            alt={team.name}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold opacity-30">
                            {team.name[0]}
                          </div>
                        )}
                      </div>

                      <h3 className="line-clamp-2 px-1 text-[10px] font-black uppercase italic leading-tight tracking-tighter">
                        {team.name}
                      </h3>

                      <p className="mt-1 text-[8px] font-black uppercase tracking-wider opacity-40">
                        ${totalAuctionSpent} spent ·{' '}
                        {team.picks.length} players
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      {team.picks.length > 0 ? (
                        team.picks.map(
                          (
                            pick: any,
                            pickIndex: number
                          ) => {
                            const playerSearchKey =
                              getDraftPickSearchKey(
                                team.id,
                                pick,
                                pickIndex
                              );
                            const playerMatches =
                              searchMatches.playerKeys.has(
                                playerSearchKey
                              );
                            const auctionPrice =
                              getAuctionPrice(
                                pick
                              );

                            const firstName =
                              pick.metadata
                                ?.first_name ||
                              '';

                            const lastName =
                              pick.metadata
                                ?.last_name ||
                              'Unknown';

                            const position =
                              pick.metadata
                                ?.position ||
                              'N/A';

                            const nflTeam =
                              pick.metadata?.team ||
                              'FA';

                            return (
                              <div
                                key={pick.pick_no}
                                ref={(element) => {
                                  if (element) {
                                    searchMatchRefs.current.set(
                                      playerSearchKey,
                                      element
                                    );
                                  } else {
                                    searchMatchRefs.current.delete(
                                      playerSearchKey
                                    );
                                  }
                                }}
                                className={`relative rounded-2xl border p-3 shadow-sm transition-all hover:scale-[1.03] active:scale-95 ${getPositionColor(
                                  position
                                )} ${
                                  playerMatches
                                    ? 'ring-4 ring-orange-500 ring-offset-2 ring-offset-white dark:ring-offset-[#0a0a0a]'
                                    : ''
                                }`}
                              >
                                <div className="absolute left-2 top-1.5 text-[8px] font-black uppercase italic opacity-30">
                                  {pick.round}.
                                  {String(
                                    pick.draft_slot
                                  ).padStart(
                                    2,
                                    '0'
                                  )}
                                </div>

                                <div className="absolute -right-1 -top-1 z-10 rounded-lg border border-white/10 bg-black px-2 py-0.5 text-[9px] font-black uppercase italic text-white shadow-sm">
                                  {auctionPrice !== null
                                    ? `$${auctionPrice}`
                                    : 'N/A'}
                                </div>

                                <div className="flex flex-col items-center gap-1.5 text-center">
                                  <div className="relative h-12 w-12 overflow-hidden rounded-full border-2 border-white/50 bg-black/10 shadow-inner">
                                    <Image
                                      src={getPlayerImage(
                                        pick
                                      )}
                                      alt={`${firstName} ${lastName}`}
                                      fill
                                      unoptimized
                                      className="object-cover"
                                      onError={(
                                        event: any
                                      ) => {
                                        event.target.src =
                                          'https://sleepercdn.com/images/v2/icons/player_default.webp';
                                      }}
                                    />
                                  </div>

                                  <div className="w-full">
                                    <div className="truncate text-[10px] font-black uppercase italic leading-none tracking-tighter">
                                      {firstName
                                        ? `${firstName[0]}. ${lastName}`
                                        : lastName}
                                    </div>

                                    <div className="mt-1 text-[8px] font-black uppercase tracking-widest opacity-40">
                                      {position} •{' '}
                                      {nflTeam}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        )
                      ) : (
                        <div className="flex h-32 items-center justify-center rounded-2xl border-2 border-dashed border-black/5 p-4 text-center dark:border-white/5">
                          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-20">
                            {draftData.hasPicks
                              ? 'No Picks'
                              : 'Void'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  );
                }
              )}
            </div>
          </div>
          </div>
        )}
      </section>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(249, 115, 22, 0.3);
          border-radius: 20px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
      `}</style>
    </SiteShell>
  );
}
