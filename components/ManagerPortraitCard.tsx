"use client";

import Image from "next/image";
import Link from "next/link";
import { Award, Crown, ShieldCheck, Skull } from "lucide-react";
import { teamColors } from "@/lib/themes/teamColors";
import {
  getOwnerCurrentTeamNameByFullName,
  getOwnerProfilePathByFullName,
} from "@/lib/managers/identitySelectors";

type ManagerPortraitCardProps = {
  manager: any;
  group: "active" | "retired" | "staff";
};

function getLegacyLabel(group: ManagerPortraitCardProps["group"], manager: any) {
  if (group === "staff") return manager.role || "League Staff";
  if (group === "retired") return "Retired Owner";
  return manager.mode || "Active Owner";
}

export default function ManagerPortraitCard({
  manager,
  group,
}: ManagerPortraitCardProps) {
  const colors = teamColors[manager.favoriteTeam] || {
    primary: "#ea580c",
    secondary: "#111111",
  };
  const isStaff = group === "staff";
  const footerLabel = isStaff ? "League Role" : "Best Finish";
  const footerValue = isStaff ? manager.role || "Staff" : manager.bestFinish || "N/A";
  const profilePath = getOwnerProfilePathByFullName(manager.fullName);
  const displayTeamName =
    group === "active"
      ? getOwnerCurrentTeamNameByFullName(manager.fullName) ?? manager.teamName
      : manager.teamName;
  const staffSince = manager.fantasyStart || manager.tookOver;
  const hasCoOwner = Boolean(manager.coOwner?.fullName);

  const card = (
    <article
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-[#121212]"
      style={{ borderTopColor: colors.primary, borderTopWidth: 6 }}
    >
      <div className="relative h-60 overflow-hidden bg-black/10 sm:h-56 lg:h-64 dark:bg-white/5">
        {manager.photo ? (
          <Image
            src={manager.photo}
            alt={manager.fullName}
            fill
            sizes="(min-width: 1536px) 25vw, (min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover object-[center_30%] transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl font-black uppercase text-black/20 dark:text-white/20">
            {manager.shortName?.[0] || "?"}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 text-white">
          <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest backdrop-blur">
            {getLegacyLabel(group, manager)}
          </p>
          <h3 className="text-xl font-black uppercase italic leading-none sm:text-2xl">
            {manager.fullName}
          </h3>
          <p className="mt-2 line-clamp-2 text-xs font-black uppercase tracking-widest text-white/65">
            {displayTeamName}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {group === "active" && (
          <div
            aria-hidden={!hasCoOwner}
            className={`mb-4 flex h-10 items-center rounded-2xl border border-black/10 bg-black/[0.03] px-4 text-[10px] font-black uppercase tracking-widest text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50 ${
              hasCoOwner ? "" : "invisible"
            }`}
          >
            <span className="shrink-0">Co-owner:&nbsp;</span>
            <span className="truncate text-black dark:text-white">
              {manager.coOwner?.fullName || "Reserved"}
            </span>
          </div>
        )}

        {isStaff ? (
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="min-h-[76px] rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
              <ShieldCheck
                className="mx-auto mb-2 h-4 w-4"
                style={{ color: colors.primary }}
              />
              <p className="text-sm font-black uppercase">Staff</p>
              <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
                Role
              </p>
            </div>
            <div className="min-h-[76px] rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
              <Award
                className="mx-auto mb-2 h-4 w-4"
                style={{ color: colors.primary }}
              />
              <p className="text-sm font-black">{staffSince || "League"}</p>
              <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
                Since
              </p>
            </div>
            <div className="min-h-[76px] rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
              <ShieldCheck
                className="mx-auto mb-2 h-4 w-4"
                style={{ color: colors.primary }}
              />
              <p className="text-sm font-black uppercase">
                {manager.favoriteTeam || "RC"}
              </p>
              <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
                NFL
              </p>
            </div>
          </div>
        ) : (
          <div className="mb-4 grid grid-cols-3 gap-2">
            <div className="min-h-[76px] rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
              <Crown
                className="mx-auto mb-2 h-4 w-4"
                style={{ color: colors.primary }}
              />
              <p className="text-lg font-black">{manager.championships ?? 0}</p>
              <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
                Titles
              </p>
            </div>
            <div className="min-h-[76px] rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
              <Award
                className="mx-auto mb-2 h-4 w-4"
                style={{ color: colors.primary }}
              />
              <p className="text-lg font-black">{manager.podiums ?? 0}</p>
              <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
                Podiums
              </p>
            </div>
            <div className="min-h-[76px] rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
              <Skull
                className="mx-auto mb-2 h-4 w-4"
                style={{ color: colors.primary }}
              />
              <p className="text-lg font-black">{manager.toiletBowls ?? 0}</p>
              <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
                Toilets
              </p>
            </div>
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          <span className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
            {footerLabel}
          </span>
          <span
            className="max-w-[65%] truncate rounded-full px-3 py-1 text-right text-[10px] font-black uppercase"
            style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
          >
            {footerValue}
          </span>
        </div>
      </div>
    </article>
  );

  if (!profilePath) return card;

  return (
    <Link
      href={profilePath}
      aria-label={`View ${manager.fullName} profile`}
      className="block h-full rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0a0a0a]"
    >
      {card}
    </Link>
  );
}
