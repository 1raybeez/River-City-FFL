import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Crown,
  Flame,
  History,
  Medal,
  Quote,
  Shield,
  Skull,
  Swords,
  Trophy,
  UserRound,
} from "lucide-react";
import { teamColors } from "@/lib/themes/teamColors";
import {
  AccomplishmentAttribution,
  type FranchiseStatSummary,
  type OwnerSurveyProfile,
} from "@/lib/managers/identityTypes";
import type {
  OwnerProfileViewModel,
  ProfileRelationship,
  ProfileTenure,
} from "@/lib/managers/identitySelectors";

const NFL_TEAM_NAMES: Record<string, string> = {
  ATL: "Atlanta Falcons",
  CAR: "Carolina Panthers",
  CLE: "Cleveland Browns",
  DET: "Detroit Lions",
  GB: "Green Bay Packers",
  MIN: "Minnesota Vikings",
  NO: "New Orleans Saints",
  NYG: "New York Giants",
  NYJ: "New York Jets",
  PIT: "Pittsburgh Steelers",
  SF: "San Francisco 49ers",
  TB: "Tampa Bay Buccaneers",
  WAS: "Washington Commanders",
};

const VALUE_POSITION_LABELS: Record<string, string> = {
  QB: "Quarterback (QB)",
  RB: "Running Back (RB)",
  WR: "Wide Receiver (WR)",
  TE: "Tight End (TE)",
  K: "Kicker (K)",
  DEF: "Defense / Special Teams (DEF)",
};

function getAccentColor(profile: OwnerProfileViewModel) {
  const teamCode =
    profile.heroFranchise?.colorTeamCode ?? profile.owner.survey.favoriteNflTeam;
  return teamColors[teamCode ?? ""]?.primary ?? "#dc2626";
}

function getNflTeamLabel(teamCode?: string) {
  if (!teamCode) return "Not on file";
  return NFL_TEAM_NAMES[teamCode] ?? teamCode;
}

function getFavoritePlayerLabel(survey: OwnerSurveyProfile) {
  if (survey.favoritePlayerName) return survey.favoritePlayerName;
  if (survey.favoritePlayerId) return "Player on file";
  return "Not on file";
}

function getValuePositionLabel(valuePosition?: string) {
  if (!valuePosition) return "Not on file";
  return VALUE_POSITION_LABELS[valuePosition] ?? valuePosition;
}

function getStatLabel(summary: FranchiseStatSummary) {
  if (
    summary.accomplishmentAttribution ===
    AccomplishmentAttribution.SharedFranchise
  ) {
    return "Shared Franchise Record";
  }

  if (
    summary.accomplishmentAttribution === AccomplishmentAttribution.LegacyOwner
  ) {
    return "Retired Owner Legacy";
  }

  return "Franchise Record";
}

function getSharedStatCopy(summary: FranchiseStatSummary) {
  if (summary.franchiseId === "prestigio-mundial") {
    return "Prestigio Mundial record, shared by Ray Long and Jeffrey Hudgins.";
  }

  if (summary.franchiseId === "shake-n-bakers") {
    return "The Shake-N-Bakers record is attributed to Jordan Maslyn as primary owner.";
  }

  if (summary.franchiseId === "special-brownies") {
    return "Special Brownies remains Landon Elliott's retired-owner legacy.";
  }

  return summary.notes?.[0];
}

function StatTile({
  label,
  value,
  accentColor,
  icon,
}: {
  label: string;
  value: string | number;
  accentColor: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-h-24 rounded-lg border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#121212]">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-black/[0.04] dark:bg-white/[0.06]">
        <span style={{ color: accentColor }}>{icon}</span>
      </div>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
        {label}
      </p>
    </div>
  );
}

function SectionShell({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border border-black/10 bg-white p-5 dark:border-white/10 dark:bg-[#121212]">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-black text-white dark:bg-white dark:text-black">
          {icon}
        </div>
        <h2 className="text-sm font-black uppercase tracking-widest">
          {title}
        </h2>
      </div>
      {children}
    </section>
  );
}

function CoOwnerRelationshipCard({
  relationship,
  accentColor,
}: {
  relationship: ProfileRelationship;
  accentColor: string;
}) {
  const content = (
    <div
      className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-black/10 bg-black/[0.03] px-4 py-3 text-left transition hover:bg-black/[0.05] dark:border-white/10 dark:bg-white/[0.06] dark:hover:bg-white/[0.08]"
      style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-black/40 dark:text-white/40">
          {relationship.roleLabel}
        </p>
        <p className="mt-1 truncate text-sm font-black uppercase">
          {relationship.fullName}
        </p>
        <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-black/45 dark:text-white/45">
          {relationship.detail}
        </p>
      </div>
      {relationship.href && (
        <ArrowRight className="h-4 w-4 shrink-0 text-black/35 dark:text-white/35" />
      )}
    </div>
  );

  if (!relationship.href) return content;

  return (
    <Link
      href={relationship.href}
      aria-label={`View ${relationship.fullName} profile`}
      className="block min-w-0 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-4 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#121212]"
    >
      {content}
    </Link>
  );
}

function HeroSection({ profile }: { profile: OwnerProfileViewModel }) {
  const { owner } = profile;
  const accentColor = getAccentColor(profile);

  return (
    <section
      className="overflow-hidden rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-[#121212]"
      style={{ borderTopColor: accentColor, borderTopWidth: 6 }}
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(260px,360px)_1fr]">
        <div className="relative aspect-[4/5] bg-black/10 dark:bg-white/5 lg:aspect-auto lg:min-h-[420px]">
          {owner.photo ? (
            <Image
              src={owner.photo}
              alt={owner.fullName}
              fill
              sizes="(min-width: 1024px) 360px, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full items-center justify-center text-8xl font-black text-black/20 dark:text-white/20">
              {owner.shortName[0]}
            </div>
          )}
        </div>

        <div className="p-6 sm:p-8 lg:p-10">
          <Link
            href="/managers"
            className="mb-8 inline-flex items-center gap-2 rounded-md border border-black/10 bg-black/[0.03] px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black/55 transition hover:text-black dark:border-white/10 dark:bg-white/[0.06] dark:text-white/55 dark:hover:text-white"
          >
            <ArrowLeft size={13} />
            Back to Managers
          </Link>
          <div className="mb-5 flex flex-wrap gap-2">
            <span
              className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest"
              style={{
                backgroundColor: `${accentColor}1f`,
                color: accentColor,
              }}
            >
              {profile.statusLabel}
            </span>
            {owner.roles.map((role) => (
              <span
                key={role}
                className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:border-white/10 dark:text-white/50"
              >
                {role}
              </span>
            ))}
          </div>

          <h1 className="text-4xl font-black uppercase italic leading-none sm:text-5xl">
            {owner.fullName}
          </h1>
          <p className="mt-3 text-sm font-black uppercase tracking-[0.25em] text-black/45 dark:text-white/45">
            {profile.primaryTeamLabel}
          </p>

          {profile.coOwnerDisplay.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {profile.coOwnerDisplay.map((relationship) => (
                <CoOwnerRelationshipCard
                  key={`${relationship.ownerId}-${relationship.franchiseName}`}
                  relationship={relationship}
                  accentColor={accentColor}
                />
              ))}
            </div>
          )}

          {owner.survey.bio && (
            <p className="mt-8 max-w-3xl text-base font-medium leading-8 text-black/65 dark:text-white/65">
              {owner.survey.bio}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function CareerSnapshot({ profile }: { profile: OwnerProfileViewModel }) {
  const accentColor = getAccentColor(profile);
  const primarySummary = profile.statSummaries[0];

  return (
    <SectionShell title="Career Snapshot" icon={<Trophy size={16} />}>
      <div className="grid grid-cols-2 gap-3">
        <StatTile
          label="Titles"
          value={primarySummary?.championships ?? 0}
          accentColor={accentColor}
          icon={<Crown size={16} />}
        />
        <StatTile
          label="Podiums"
          value={primarySummary?.podiums ?? 0}
          accentColor={accentColor}
          icon={<Award size={16} />}
        />
        <StatTile
          label="Best Finish"
          value={primarySummary?.bestFinish ?? "N/A"}
          accentColor={accentColor}
          icon={<Medal size={16} />}
        />
        <StatTile
          label="Toilet Bowls"
          value={primarySummary?.toiletBowls ?? 0}
          accentColor={accentColor}
          icon={<Skull size={16} />}
        />
        <StatTile
          label="Years Active"
          value={profile.yearsActiveLabel}
          accentColor={accentColor}
          icon={<History size={16} />}
        />
        <StatTile
          label="Record"
          value={primarySummary?.displayedRecord ?? "N/A"}
          accentColor={accentColor}
          icon={<Shield size={16} />}
        />
      </div>
    </SectionShell>
  );
}

function TeamLegacy({ profile }: { profile: OwnerProfileViewModel }) {
  const tenureGroups = [...profile.currentTenures, ...profile.legacyTenures];

  return (
    <SectionShell title="Team Legacy" icon={<Shield size={16} />}>
      <div className="space-y-4">
        {tenureGroups.map((tenure) => (
          <LegacyRow key={tenure.id} tenure={tenure} />
        ))}
      </div>
    </SectionShell>
  );
}

function LegacyRow({ tenure }: { tenure: ProfileTenure }) {
  const summary = tenure.statSummary;

  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-lg font-black uppercase italic">
            {tenure.franchise?.currentTeamName ?? tenure.franchiseId}
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-widest text-black/40 dark:text-white/40">
            {tenure.roleLabel} | {tenure.yearLabel}
          </p>
        </div>
        {summary && (
          <span className="rounded-full border border-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:border-white/10 dark:text-white/50">
            {getStatLabel(summary)}
          </span>
        )}
      </div>

      {tenure.relatedOwnerLabels.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {tenure.relatedOwnerLabels.map((label) => (
            <span
              key={label}
              className="rounded-md bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-black/50 dark:bg-black/20 dark:text-white/50"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {summary ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <LegacyMetric label="Titles" value={summary.championships} />
          <LegacyMetric label="Podiums" value={summary.podiums} />
          <LegacyMetric label="Best" value={summary.bestFinish} />
          <LegacyMetric label="Toilets" value={summary.toiletBowls ?? 0} />
        </div>
      ) : (
        <p className="mt-4 text-sm font-medium leading-7 text-black/55 dark:text-white/55">
          Current ownership role on file. No separate stat attribution is
          attached to this owner for this franchise yet.
        </p>
      )}

      {summary && getSharedStatCopy(summary) && (
        <p className="mt-4 text-sm font-medium leading-7 text-black/55 dark:text-white/55">
          {getSharedStatCopy(summary)}
        </p>
      )}
    </div>
  );
}

function LegacyMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-md bg-white p-3 dark:bg-black/20">
      <p className="text-base font-black">{value}</p>
      <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
        {label}
      </p>
    </div>
  );
}

function Personality({ profile }: { profile: OwnerProfileViewModel }) {
  const { survey } = profile.owner;
  const accentColor = getAccentColor(profile);

  return (
    <SectionShell title="Owner Personality" icon={<UserRound size={16} />}>
      <div className="grid gap-3 sm:grid-cols-2">
        <PersonalityField
          label="Favorite NFL Team"
          value={getNflTeamLabel(survey.favoriteNflTeam)}
        />
        <PersonalityField
          label="Favorite Player"
          value={getFavoritePlayerLabel(survey)}
        />
        <PersonalityField
          label="Team Mode"
          value={survey.teamBuildingMode ?? "Not on file"}
        />
        <PersonalityField
          label="Draft Style"
          value={survey.draftPreference ?? "Not on file"}
        />
        <PersonalityField
          label="Value Position"
          value={getValuePositionLabel(survey.valuePosition)}
        />
        <PersonalityField
          label="Trade Aggression"
          value={
            typeof survey.tradeAggression === "number"
              ? `${survey.tradeAggression}/10`
              : "Not on file"
          }
        />
      </div>

      {typeof survey.tradeAggression === "number" && (
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, Math.max(0, survey.tradeAggression * 10))}%`,
              backgroundColor: accentColor,
            }}
          />
        </div>
      )}

      {survey.philosophy && (
        <div className="mt-6 border-l-4 pl-4" style={{ borderColor: accentColor }}>
          <div className="mb-3 flex items-center gap-2 text-black/35 dark:text-white/35">
            <Quote size={15} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Owner Quote
            </span>
          </div>
          <p className="text-lg font-black italic leading-8">
            "{survey.philosophy}"
          </p>
        </div>
      )}
    </SectionShell>
  );
}

function PersonalityField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <p className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
        {label}
      </p>
      <p className="mt-2 text-sm font-black">{value}</p>
    </div>
  );
}

function Rivalry({ profile }: { profile: OwnerProfileViewModel }) {
  const { rivalImage, rivalName } = profile.owner.survey;

  return (
    <SectionShell title="Rivalry" icon={<Swords size={16} />}>
      {rivalName ? (
        <div className="flex items-center gap-4 rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-black/10 bg-black/10 dark:border-white/10 dark:bg-white/10">
            {rivalImage ? (
              <Image
                src={rivalImage}
                alt={`${rivalName} profile photo`}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xl font-black text-black/30 dark:text-white/30">
                {rivalName[0]}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              Primary Rival
            </p>
            <p className="mt-1 truncate text-2xl font-black uppercase italic">
              {rivalName}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm font-medium leading-7 text-black/55 dark:text-white/55">
          No primary rival is on file yet.
        </p>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        {profile.rivalProfilePath && (
          <Link
            href={profile.rivalProfilePath}
            className="inline-flex items-center gap-2 rounded-md bg-black px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/80"
          >
            View Rival Profile
            <ArrowRight size={13} />
          </Link>
        )}
        <Link
          href="/league-info/rivalries"
          className="inline-flex rounded-md border border-black/10 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-black/50 transition hover:text-black dark:border-white/10 dark:text-white/50 dark:hover:text-white"
        >
          Rivalry Hub
        </Link>
      </div>
    </SectionShell>
  );
}

function Timeline({ profile }: { profile: OwnerProfileViewModel }) {
  return (
    <SectionShell title="Timeline" icon={<Flame size={16} />}>
      <div className="space-y-4">
        {profile.timeline.map((item, index) => (
          <div
            key={`${item.year}-${item.title}-${index}`}
            className="grid grid-cols-[72px_1fr] gap-4"
          >
            <p className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              {item.year}
            </p>
            <div className="border-l border-black/10 pb-4 pl-4 dark:border-white/10">
              <p className="text-sm font-black uppercase">{item.title}</p>
              {item.detail && (
                <p className="mt-1 text-sm font-medium leading-7 text-black/55 dark:text-white/55">
                  {item.detail}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export default function OwnerProfile({
  profile,
}: {
  profile: OwnerProfileViewModel;
}) {
  return (
    <main className="min-h-screen bg-white px-4 py-6 text-black dark:bg-[#0a0a0a] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <HeroSection profile={profile} />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-6">
            <TeamLegacy profile={profile} />
            <Timeline profile={profile} />
          </div>
          <aside className="space-y-6">
            <CareerSnapshot profile={profile} />
            <Personality profile={profile} />
            <Rivalry profile={profile} />
          </aside>
        </div>
      </div>
    </main>
  );
}
