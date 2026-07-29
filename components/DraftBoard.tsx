'use client';

import React from 'react';
import Image from 'next/image';

// SLEEPER-STYLE FULL CELL COLORS
const POS_COLORS: Record<string, string> = {
  QB: 'bg-[#ff6b8e] text-black',
  RB: 'bg-[#29bf7f] text-black',
  WR: 'bg-[#40b3ff] text-black',
  TE: 'bg-[#ffae58] text-black',
  K: 'bg-[#bd66ff] text-black',
  DEF: 'bg-[#bf944e] text-black',
};

interface DraftBoardProps {
  data: any;
}

function getAuctionPrice(pick: any): number | null {
  const possiblePrice =
    pick?.metadata?.amount ??
    pick?.metadata?.price ??
    pick?.amount ??
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

    return Number.isFinite(parsedPrice) ? parsedPrice : null;
  }

  return null;
}

export default function DraftBoard({ data }: DraftBoardProps) {
  if (!data) {
    return (
      <div className="py-10 text-center text-gray-500">
        Loading Draft...
      </div>
    );
  }

  const { picks, teams, slot_to_roster, settings } = data;

console.log(picks[0]);

const numTeams = settings.teams;
const numRounds = settings.rounds;

  const grid: any[][] = Array.from(
    { length: numRounds },
    () => Array(numTeams).fill(null)
  );

  picks.forEach((pick: any) => {
    const roundIdx = pick.round - 1;
    const slotIdx = pick.draft_slot - 1;

    if (grid[roundIdx]) {
      grid[roundIdx][slotIdx] = pick;
    }
  });

  return (
    <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
      <table className="w-full min-w-max border-collapse">
        <thead>
          <tr>
            {Array.from({ length: numTeams }).map((_, index) => {
              const slot = index + 1;
              const rosterId = slot_to_roster
                ? slot_to_roster[slot]
                : null;
              const teamData = rosterId ? teams[rosterId] : null;
              const teamName = teamData?.name || `Team ${slot}`;
              const teamAvatar = teamData?.avatar;

              return (
                <th
                  key={`head-${index}`}
                  className="sticky top-0 z-20 w-[140px] border-b-2 border-gray-200 bg-white p-2 dark:border-white/10 dark:bg-[#121212]"
                >
                  <div className="mb-1 flex flex-col items-center gap-2">
                    <div className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-300 bg-gray-200 shadow-sm dark:border-white/20 dark:bg-white/10">
                      {teamAvatar ? (
                        <Image
                          src={teamAvatar}
                          alt={teamName}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-500">
                          {teamName.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="line-clamp-2 flex h-6 max-w-[120px] items-center justify-center text-center text-[10px] font-bold uppercase leading-tight text-gray-900 dark:text-white">
                      {teamName}
                    </div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {grid.map((row, roundIdx) => (
            <tr key={`round-${roundIdx}`}>
              {row.map((pick, colIdx) => {
                if (!pick) {
                  return (
                    <td
                      key={`empty-${roundIdx}-${colIdx}`}
                      className="h-24 w-[140px] border border-white/20 bg-gray-50/10"
                    />
                  );
                }

                const position = pick.metadata?.position;
                const colorClass =
                  POS_COLORS[position] ||
                  'bg-gray-200 text-gray-800';

                const firstName =
                  pick.metadata?.first_name || '';
                const lastName =
                  pick.metadata?.last_name || 'Unknown';
                const nflTeam =
                  pick.metadata?.team || 'FA';
                const auctionPrice = getAuctionPrice(pick);

                return (
                  <td
                    key={pick.pick_no}
                    className={`h-24 w-[140px] border border-white/10 p-0.5 align-top ${colorClass}`}
                  >
                    <div className="relative flex h-full w-full flex-col items-center justify-center">
                      <div className="absolute left-1 top-1 text-[8px] font-black opacity-50">
                        {pick.round}.
                        {pick.draft_slot < 10
                          ? `0${pick.draft_slot}`
                          : pick.draft_slot}
                      </div>

                      {auctionPrice !== null ? (
                        <div className="absolute right-1 top-1 rounded-full bg-black/75 px-1.5 py-0.5 text-[9px] font-black text-white shadow-sm">
                          ${auctionPrice}
                        </div>
                      ) : null}

                      <div className="relative mb-0.5 h-9 w-9">
                        <img
                          src={`https://sleepercdn.com/content/nfl/players/${pick.player_id}.jpg`}
                          alt={lastName}
                          className="h-full w-full rounded-full border border-black/10 bg-white/20 object-cover"
                          onError={(event) => {
                            event.currentTarget.src =
                              'https://sleepercdn.com/images/v2/icons/player_default.webp';
                          }}
                        />
                      </div>

                      <div className="line-clamp-1 w-full truncate px-1 text-center text-[10px] font-black leading-none">
                        {firstName
                          ? `${firstName.charAt(0)}. ${lastName}`
                          : lastName}
                      </div>

                      <div className="text-[8px] font-bold uppercase tracking-wide opacity-70">
                        {position} • {nflTeam}
                      </div>

                      <div className="mt-1 text-[11px] font-black">
                        {auctionPrice !== null
                          ? `$${auctionPrice}`
                          : 'Price N/A'}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}