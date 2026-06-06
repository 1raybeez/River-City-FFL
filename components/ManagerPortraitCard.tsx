"use client";

import Image from "next/image";
import { Award, Crown, ShieldCheck, Skull } from "lucide-react";
import { teamColors } from "@/lib/themes/teamColors";

type ManagerPortraitCardProps = {
  manager: any;
  group: "active" | "retired" | "staff";
};

function getLegacyLabel(group: ManagerPortraitCardProps["group"], manager: any) {
  if (group === "staff") return manager.role || "League Staff";
  if (group === "retired") return "Hall of Fame";
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

  return (
    <article
      className="group overflow-hidden rounded-3xl border border-black/10 bg-white shadow-xl transition-all hover:-translate-y-1 hover:shadow-2xl dark:border-white/10 dark:bg-[#121212]"
      style={{ borderTopColor: colors.primary, borderTopWidth: 6 }}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-black/10 dark:bg-white/5">
        {manager.photo ? (
          <Image
            src={manager.photo}
            alt={manager.fullName}
            fill
            sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl font-black uppercase text-black/20 dark:text-white/20">
            {manager.shortName?.[0] || "?"}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5 text-white">
          <p className="mb-2 inline-flex rounded-full bg-white/15 px-3 py-1 text-[9px] font-black uppercase tracking-widest backdrop-blur">
            {getLegacyLabel(group, manager)}
          </p>
          <h3 className="text-2xl font-black uppercase italic leading-none">
            {manager.fullName}
          </h3>
          <p className="mt-2 text-xs font-black uppercase tracking-widest text-white/65">
            {manager.teamName}
          </p>
        </div>
      </div>

      <div className="p-5">
        {manager.coOwner?.fullName && (
          <div className="mb-4 rounded-2xl border border-black/10 bg-black/[0.03] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-black/50 dark:border-white/10 dark:bg-white/5 dark:text-white/50">
            Co-owner:{" "}
            <span className="text-black dark:text-white">
              {manager.coOwner.fullName}
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
            <Crown
              className="mx-auto mb-2 h-4 w-4"
              style={{ color: colors.primary }}
            />
            <p className="text-lg font-black">{manager.championships ?? 0}</p>
            <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
              Titles
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
            <Award
              className="mx-auto mb-2 h-4 w-4"
              style={{ color: colors.primary }}
            />
            <p className="text-lg font-black">{manager.podiums ?? 0}</p>
            <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
              Podiums
            </p>
          </div>
          <div className="rounded-2xl border border-black/10 bg-black/[0.03] p-3 text-center dark:border-white/10 dark:bg-white/5">
            {isStaff ? (
              <ShieldCheck
                className="mx-auto mb-2 h-4 w-4"
                style={{ color: colors.primary }}
              />
            ) : (
              <Skull
                className="mx-auto mb-2 h-4 w-4"
                style={{ color: colors.primary }}
              />
            )}
            <p className="text-lg font-black">
              {isStaff ? manager.fantasyStart || "N/A" : manager.toiletBowls ?? 0}
            </p>
            <p className="text-[8px] font-black uppercase text-black/40 dark:text-white/40">
              {isStaff ? "Since" : "Toilets"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/10 pt-4 dark:border-white/10">
          <span className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
            {footerLabel}
          </span>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-black uppercase"
            style={{ backgroundColor: `${colors.primary}20`, color: colors.primary }}
          >
            {footerValue}
          </span>
        </div>
      </div>
    </article>
  );
}
