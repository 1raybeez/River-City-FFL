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
  MapPin,
  Medal,
  MessageCircle,
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
  OwnerProfileStatus,
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

type ContactMethodDisplay = {
  label: string;
  icon?: string;
};

const CONTACT_METHODS: Record<string, ContactMethodDisplay> = {
  Text: { label: "iMessage", icon: "/logos/iMessage.png" },
  WhatsApp: { label: "WhatsApp", icon: "/logos/WhatsApp.png" },
  Sleeper: { label: "Sleeper DM", icon: "/logos/Sleeper.png" },
};

function getAccentColor(profile: OwnerProfileViewModel) {
  const teamCode =
    profile.heroFranchise?.colorTeamCode ?? profile.owner.survey.favoriteNflTeam;
  return teamColors[teamCode ?? ""]?.primary ?? "#dc2626";
}

function getNflTeamLabel(teamCode?: string) {
  if (!teamCode) return undefined;
  return NFL_TEAM_NAMES[teamCode] ?? teamCode;
}

function getFavoritePlayerLabel(survey: OwnerSurveyProfile) {
  if (survey.favoritePlayerName) return survey.favoritePlayerName;
  return undefined;
}

function getValuePositionLabel(valuePosition?: string) {
  if (!valuePosition) return undefined;
  return VALUE_POSITION_LABELS[valuePosition] ?? valuePosition;
}

function getContactMethod(preferredContact?: string) {
  if (!preferredContact) return undefined;
  return CONTACT_METHODS[preferredContact] ?? { label: preferredContact };
}

function clampTradeAggression(value: number) {
  return Math.min(10, Math.max(0, value));
}

function getTradeAggressionColor(value: number) {
  const score = clampTradeAggression(value);

  if (score <= 2) return "#dc2626";
  if (score <= 4) return "#ea580c";
  if (score <= 7) return "#eab308";
  return "#16a34a";
}

function hasTradeReadinessData(survey: OwnerSurveyProfile) {
  return Boolean(
    survey.preferredContact ||
      typeof survey.tradeAggression === "number" ||
      survey.valuePosition ||
      survey.teamBuildingMode ||
      survey.draftPreference
  );
}

function shouldShowTradeCard(profile: OwnerProfileViewModel) {
  return (
    profile.owner.status === OwnerProfileStatus.Active &&
    hasTradeReadinessData(profile.owner.survey)
  );
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
      <div className="grid gap-0 lg:grid-cols-[minmax(280px,320px)_1fr]">
        <div className="relative h-[300px] max-h-[42vh] bg-black/10 dark:bg-white/5 sm:h-[340px] lg:h-auto lg:max-h-none lg:min-h-[360px]">
          {owner.photo ? (
            <Image
              src={owner.photo}
              alt={owner.fullName}
              fill
              sizes="(min-width: 1024px) 320px, 100vw"
              className="object-cover object-top"
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
            {owner.location && (
              <span className="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-black/50 dark:border-white/10 dark:text-white/50">
                <MapPin size={12} />
                {owner.location}
              </span>
            )}
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
  const tiles: Array<{
    label: string;
    value: string | number;
    icon: ReactNode;
  }> = [];

  if (primarySummary) {
    tiles.push(
      {
        label: "Titles",
        value: primarySummary.championships,
        icon: <Crown size={16} />,
      },
      {
        label: "Podiums",
        value: primarySummary.podiums,
        icon: <Award size={16} />,
      }
    );

    if (primarySummary.bestFinish && primarySummary.bestFinish !== "N/A") {
      tiles.push({
        label: "Best Finish",
        value: primarySummary.bestFinish,
        icon: <Medal size={16} />,
      });
    }

    if (typeof primarySummary.toiletBowls === "number") {
      tiles.push({
        label: "Toilet Bowls",
        value: primarySummary.toiletBowls,
        icon: <Skull size={16} />,
      });
    }
  }

  if (profile.yearsActiveLabel !== "N/A") {
    tiles.push({
      label: "Years Active",
      value: profile.yearsActiveLabel,
      icon: <History size={16} />,
    });
  }

  if (primarySummary?.displayedRecord) {
    tiles.push({
      label: "Record",
      value: primarySummary.displayedRecord,
      icon: <Shield size={16} />,
    });
  }

  if (tiles.length === 0) return null;

  return (
    <SectionShell title="Career Snapshot" icon={<Trophy size={16} />}>
      <div className="grid grid-cols-2 gap-3">
        {tiles.map((tile) => (
          <StatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            accentColor={accentColor}
            icon={tile.icon}
          />
        ))}
      </div>
    </SectionShell>
  );
}

function TeamLegacy({ profile }: { profile: OwnerProfileViewModel }) {
  const tenureGroups = [...profile.currentTenures, ...profile.legacyTenures];

  if (tenureGroups.length === 0) return null;

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

function getTenureFallbackCopy(tenure: ProfileTenure) {
  if (
    tenure.ownerId === "landon-elliott" &&
    tenure.franchiseId === "shake-n-bakers"
  ) {
    return "Current co-owner role; Shake-N-Bakers stats remain attributed to Jordan Maslyn.";
  }

  return undefined;
}

function LegacyRow({ tenure }: { tenure: ProfileTenure }) {
  const summary = tenure.statSummary;
  const fallbackCopy = getTenureFallbackCopy(tenure);
  const metrics: Array<{ label: string; value: string | number }> = [];

  if (summary) {
    metrics.push(
      { label: "Titles", value: summary.championships },
      { label: "Podiums", value: summary.podiums }
    );

    if (summary.bestFinish && summary.bestFinish !== "N/A") {
      metrics.push({ label: "Best", value: summary.bestFinish });
    }

    if (typeof summary.toiletBowls === "number") {
      metrics.push({ label: "Toilets", value: summary.toiletBowls });
    }
  }

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

      {summary && metrics.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          {metrics.map((metric) => (
            <LegacyMetric
              key={metric.label}
              label={metric.label}
              value={metric.value}
            />
          ))}
        </div>
      ) : fallbackCopy ? (
        <p className="mt-4 text-sm font-medium leading-7 text-black/55 dark:text-white/55">
          {fallbackCopy}
        </p>
      ) : null}

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
  const showTradeCard = shouldShowTradeCard(profile);
  const fields: Array<{ label: string; value: string }> = [];
  const favoriteNflTeam = getNflTeamLabel(survey.favoriteNflTeam);
  const favoritePlayer = getFavoritePlayerLabel(survey);
  const valuePosition = getValuePositionLabel(survey.valuePosition);

  if (favoriteNflTeam) {
    fields.push({ label: "Favorite NFL Team", value: favoriteNflTeam });
  }

  if (favoritePlayer) {
    fields.push({ label: "Favorite Player", value: favoritePlayer });
  }

  if (!showTradeCard) {
    if (survey.teamBuildingMode) {
      fields.push({ label: "Team Mode", value: survey.teamBuildingMode });
    }

    if (survey.draftPreference) {
      fields.push({ label: "Draft Style", value: survey.draftPreference });
    }

    if (valuePosition) {
      fields.push({ label: "Value Position", value: valuePosition });
    }
  }

  const showPersonalityTradeMeter =
    !showTradeCard && typeof survey.tradeAggression === "number";

  if (fields.length === 0 && !survey.philosophy && !showPersonalityTradeMeter) {
    return null;
  }

  return (
    <SectionShell
      title={
        profile.owner.status === OwnerProfileStatus.Staff
          ? "Profile Details"
          : "Owner Personality"
      }
      icon={<UserRound size={16} />}
    >
      {fields.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <PersonalityField
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </div>
      )}

      {showPersonalityTradeMeter && (
        <div className="mt-5">
          <TradeAggressionMeter value={survey.tradeAggression as number} />
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

function TradeReadinessField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
        {label}
      </p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}

function TradeAggressionMeter({ value }: { value: number }) {
  const score = clampTradeAggression(value);
  const meterColor = getTradeAggressionColor(score);
  const fillWidth = score === 0 ? 8 : score * 10;

  return (
    <div className="mb-4 rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
          Trade Aggression
        </p>
        <p className="text-sm font-black">{score}/10</p>
      </div>
      <div
        className="h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/15"
        aria-label={`Trade aggression ${score} out of 10`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={score}
      >
        <div
          className="h-full rounded-full transition-[width]"
          style={{
            width: `${fillWidth}%`,
            backgroundColor: meterColor,
          }}
        />
      </div>
    </div>
  );
}

function BestWayToTalkTrades({ profile }: { profile: OwnerProfileViewModel }) {
  if (!shouldShowTradeCard(profile)) return null;

  const { survey } = profile.owner;
  const accentColor = getAccentColor(profile);
  const contactMethod = getContactMethod(survey.preferredContact);
  const valuePosition = getValuePositionLabel(survey.valuePosition);
  const fields: Array<{ label: string; value: string }> = [];

  if (valuePosition) {
    fields.push({ label: "Value Position", value: valuePosition });
  }

  if (survey.teamBuildingMode) {
    fields.push({ label: "Team Mode", value: survey.teamBuildingMode });
  }

  if (survey.draftPreference) {
    fields.push({ label: "Draft Style", value: survey.draftPreference });
  }

  return (
    <SectionShell title="Best Way to Talk Trades" icon={<MessageCircle size={16} />}>
      {contactMethod && (
        <div
          className="mb-4 flex items-center gap-3 rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]"
          style={{ borderLeftColor: accentColor, borderLeftWidth: 4 }}
        >
          {contactMethod.icon && (
            <Image
              src={contactMethod.icon}
              alt={`${contactMethod.label} icon`}
              width={28}
              height={28}
              className="h-7 w-7 object-contain"
            />
          )}
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-black/35 dark:text-white/35">
              Preferred Contact
            </p>
            <p className="mt-1 truncate text-sm font-black">
              {contactMethod.label}
            </p>
          </div>
        </div>
      )}

      {typeof survey.tradeAggression === "number" && (
        <TradeAggressionMeter value={survey.tradeAggression} />
      )}

      {fields.length > 0 && (
        <div className="grid grid-cols-2 gap-4 rounded-lg border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
          {fields.map((field) => (
            <TradeReadinessField
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
        </div>
      )}
    </SectionShell>
  );
}

function Rivalry({ profile }: { profile: OwnerProfileViewModel }) {
  const { rivalImage, rivalName } = profile.owner.survey;

  if (!rivalName) return null;

  return (
    <SectionShell title="Rivalry" icon={<Swords size={16} />}>
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
  if (profile.timeline.length === 0) return null;

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
  const isStaff = profile.owner.status === OwnerProfileStatus.Staff;
  const hasTenures =
    profile.currentTenures.length > 0 || profile.legacyTenures.length > 0;
  const showTimeline = !isStaff && profile.timeline.length > 0;
  const showMainColumn = hasTenures || showTimeline;
  const sidebarContent = (
    <>
      <CareerSnapshot profile={profile} />
      <BestWayToTalkTrades profile={profile} />
      <Personality profile={profile} />
      <Rivalry profile={profile} />
    </>
  );

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-black dark:bg-[#0a0a0a] dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <HeroSection profile={profile} />

        {showMainColumn ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-6">
              <TeamLegacy profile={profile} />
              {showTimeline && <Timeline profile={profile} />}
            </div>
            <aside className="space-y-6">{sidebarContent}</aside>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {sidebarContent}
          </div>
        )}
      </div>
    </main>
  );
}
