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
  const searchMatchRefs = useRef(
    new Map<string, HTMLDivElement>()
  );

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
    <div className="min-h-screen bg-white pb-12 font-sans text-black selection:bg-orange-500 transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-black/5 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/80">
        <div className="flex items-center gap-4">
          <Link
            href="/league-info"
            className="inline-flex items-center gap-2 rounded-lg border border-black/10 bg-black/5 px-3 py-2 text-[10px] font-black uppercase italic tracking-tight transition-all hover:text-orange-600 dark:border-white/10 dark:bg-white/5"
            title="Back to League Info Hub"
          >
            <ArrowLeft size={16} />
            Back to League Info Hub
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Grid3X3
            className="hidden text-orange-600 sm:block"
            size={20}
          />

          <span className="text-xs font-black uppercase italic tracking-tighter">
            Draft Board
          </span>
        </div>
      </nav>

      <header className="px-6 pb-0 pt-12 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-black/5 bg-black/5 text-orange-600 shadow-lg dark:border-white/10 dark:bg-white/5">
          <Grid3X3 size={28} />
        </div>

        <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter md:text-6xl">
          Draft{' '}
          <span className="text-orange-600">
            Board
          </span>
        </h1>

        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.3em] opacity-40">
          Draft History &amp; Pick Archives
        </p>

        <div className="relative mt-8 inline-block rounded-full border border-black/5 bg-black/5 px-6 py-2 dark:border-white/10 dark:bg-white/5">
          <select
            value={selectedYear}
            onChange={(event) =>
              setSelectedYear(
                Number(event.target.value)
              )
            }
            className="cursor-pointer appearance-none bg-transparent pr-6 text-xs font-black uppercase italic focus:outline-none"
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

          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-3 w-3 -translate-y-1/2 opacity-40" />
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 pt-6">
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
            className="h-11 w-full rounded-2xl border border-black/10 bg-black/5 pl-11 pr-4 text-sm font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-white/5"
          />
        </label>
      </div>

      <main className="custom-scrollbar w-full overflow-x-auto overflow-y-clip">
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
          <div className="inline-block min-w-full p-6">
            <div className="flex gap-4">
              {draftData.teams.map(
                (team: any) => {
                  const ownerSearchKey = `owner:${team.id}`;
                  const ownerMatches =
                    searchMatches.ownerIds.has(
                      team.id
                    );
                  const totalAuctionSpent =
                    team.picks.reduce(
                      (
                        total: number,
                        pick: any
                      ) =>
                        total +
                        (getAuctionPrice(
                          pick
                        ) ?? 0),
                      0
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
                      className="sticky top-16 z-30 flex h-28 flex-col items-center justify-center rounded-2xl border border-black/5 border-b-4 border-b-orange-600 bg-[#f2f2f2] p-3 text-center shadow-md dark:border-white/5 dark:border-b-orange-600 dark:bg-[#161616]"
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
        )}
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
    </div>
  );
}
