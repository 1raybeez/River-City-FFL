"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";

import { ModeToggle } from "@/components/ModeToggle";
import type {
  AuctionDraftGoal,
  AuctionKickerDefenseStrategy,
  AuctionKeeperFocus,
  AuctionNominationStyle,
  AuctionOwnerProfileSettings,
  AuctionPositionPriority,
  AuctionRiskTolerance,
  AuctionRookiePreference,
  AuctionRosterConstruction,
} from "@/lib/auction/ownerProfileSettingsTypes";

type OnboardingProfile = {
  ownerProfileId: string;
  displayName: string;
  teamName: string;
  avatarUrl: string | null;
};

type OnboardingAnswers = {
  rosterConstruction: AuctionRosterConstruction;
  riskTolerance: AuctionRiskTolerance;
  keeperFocus: AuctionKeeperFocus;
  rookiePreference: AuctionRookiePreference;
  positionPriorities: AuctionPositionPriority[];
  nominationStyle: AuctionNominationStyle;
  kickerDefenseStrategy: AuctionKickerDefenseStrategy;
  draftGoal: AuctionDraftGoal;
  additionalNotes: string;
};

type SingleChoiceOption<T extends string> = {
  label: string;
  value: T;
};

const defaultAnswers: OnboardingAnswers = {
  rosterConstruction: "balanced",
  riskTolerance: "balanced",
  keeperFocus: "medium",
  rookiePreference: "medium",
  positionPriorities: [],
  nominationStyle: "ai",
  kickerDefenseStrategy: "minimum",
  draftGoal: "balanced",
  additionalNotes: "",
};

const rosterConstructionOptions: SingleChoiceOption<AuctionRosterConstruction>[] = [
  { label: "Balanced", value: "balanced" },
  { label: "Stars and Scrubs", value: "stars-and-scrubs" },
  { label: "Value Heavy", value: "value-heavy" },
  { label: "Hero RB", value: "hero-rb" },
  { label: "Zero RB", value: "zero-rb" },
  { label: "Custom / Unsure", value: "custom" },
];

const riskToleranceOptions: SingleChoiceOption<AuctionRiskTolerance>[] = [
  { label: "Conservative", value: "conservative" },
  { label: "Balanced", value: "balanced" },
  { label: "Aggressive", value: "aggressive" },
];

const keeperFocusOptions: SingleChoiceOption<AuctionKeeperFocus>[] = [
  { label: "Very little - win now", value: "low" },
  { label: "Some", value: "medium" },
  { label: "A lot - prioritize keeper upside", value: "high" },
];

const rookiePreferenceOptions: SingleChoiceOption<AuctionRookiePreference>[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

const positionPriorityOptions: AuctionPositionPriority[] = ["QB", "RB", "WR", "TE"];

const nominationStyleOptions: SingleChoiceOption<AuctionNominationStyle>[] = [
  { label: "Nominate my targets", value: "targets" },
  { label: "Nominate players I do not want", value: "decoys" },
  { label: "Mix both", value: "mixed" },
  { label: "Let the War Room decide", value: "ai" },
];

const kickerDefenseOptions: SingleChoiceOption<AuctionKickerDefenseStrategy>[] = [
  { label: "Minimum $1 only", value: "minimum" },
  { label: "Small premium for elite option", value: "elite-small-premium" },
  { label: "Flexible", value: "flexible" },
];

const draftGoalOptions: SingleChoiceOption<AuctionDraftGoal>[] = [
  { label: "Win now", value: "win-now" },
  { label: "Balanced win-now and keeper value", value: "balanced" },
  { label: "Build future keeper value", value: "keeper-build" },
  { label: "Learn the tool / no strong preference", value: "learning" },
];

const coreStepCount = 8;

function getInitialAnswers(
  settings: AuctionOwnerProfileSettings | null | undefined
): OnboardingAnswers {
  if (!settings) return defaultAnswers;

  return {
    rosterConstruction: settings.rosterConstruction,
    riskTolerance: settings.riskTolerance,
    keeperFocus: settings.keeperFocus,
    rookiePreference: settings.rookiePreference,
    positionPriorities: settings.positionPriorities,
    nominationStyle: settings.nominationStyle,
    kickerDefenseStrategy: settings.kickerDefenseStrategy,
    draftGoal: settings.draftGoal,
    additionalNotes: settings.additionalNotes ?? "",
  };
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function SingleChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: SingleChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`min-h-14 rounded-2xl border px-4 py-3 text-left text-sm font-black uppercase tracking-widest transition ${
              isActive
                ? "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                : "border-black/10 bg-white text-gray-700 hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-700 dark:border-white/10 dark:bg-[#121212] dark:text-gray-200 dark:hover:text-orange-300"
            }`}
          >
            <span className="flex items-center justify-between gap-3">
              <span>{option.label}</span>
              {isActive ? <Check className="h-4 w-4 shrink-0" /> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingClient({
  profile,
  initialSettings,
}: {
  profile: OnboardingProfile;
  initialSettings?: AuctionOwnerProfileSettings | null;
}) {
  const router = useRouter();
  const storageKey = `auction-onboarding-${profile.ownerProfileId}`;
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<OnboardingAnswers>(() =>
    getInitialAnswers(initialSettings)
  );
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const totalSteps = coreStepCount + 1;
  const isFinalStep = stepIndex === totalSteps - 1;
  const coreProgress = Math.min(stepIndex + 1, coreStepCount);
  const boardTitle = `${profile.teamName} Draft Board`;

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(storageKey);
      if (!storedValue) return;

      setAnswers({
        ...defaultAnswers,
        ...JSON.parse(storedValue),
      } as OnboardingAnswers);
    } catch {
      window.localStorage.removeItem(storageKey);
    } finally {
      setDraftLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!draftLoaded) return;
    window.localStorage.setItem(storageKey, JSON.stringify(answers));
  }, [answers, draftLoaded, storageKey]);

  const question = useMemo(() => {
    if (stepIndex === 0) {
      return {
        title: "How do you usually want to build your auction roster?",
        body: (
          <SingleChoice
            options={rosterConstructionOptions}
            value={answers.rosterConstruction}
            onChange={(value) =>
              setAnswers((current) => ({
                ...current,
                rosterConstruction: value,
              }))
            }
          />
        ),
      };
    }

    if (stepIndex === 1) {
      return {
        title: "How aggressive should the War Room be when recommending bids?",
        body: (
          <SingleChoice
            options={riskToleranceOptions}
            value={answers.riskTolerance}
            onChange={(value) =>
              setAnswers((current) => ({ ...current, riskTolerance: value }))
            }
          />
        ),
      };
    }

    if (stepIndex === 2) {
      return {
        title: "How much should future keeper value matter?",
        body: (
          <SingleChoice
            options={keeperFocusOptions}
            value={answers.keeperFocus}
            onChange={(value) =>
              setAnswers((current) => ({ ...current, keeperFocus: value }))
            }
          />
        ),
      };
    }

    if (stepIndex === 3) {
      return {
        title: "How interested are you in rookies and breakout players?",
        body: (
          <SingleChoice
            options={rookiePreferenceOptions}
            value={answers.rookiePreference}
            onChange={(value) =>
              setAnswers((current) => ({ ...current, rookiePreference: value }))
            }
          />
        ),
      };
    }

    if (stepIndex === 4) {
      return {
        title: "Which positions do you want to prioritize?",
        body: (
          <div className="grid gap-2 sm:grid-cols-2">
            {positionPriorityOptions.map((position) => {
              const isActive = answers.positionPriorities.includes(position);

              return (
                <button
                  key={position}
                  type="button"
                  onClick={() =>
                    setAnswers((current) => {
                      const nextPriorities = current.positionPriorities.includes(
                        position
                      )
                        ? current.positionPriorities.filter(
                            (priority) => priority !== position
                          )
                        : [...current.positionPriorities, position].slice(0, 2);

                      return {
                        ...current,
                        positionPriorities: nextPriorities,
                      };
                    })
                  }
                  className={`min-h-16 rounded-2xl border px-4 py-3 text-center text-lg font-black uppercase italic tracking-widest transition ${
                    isActive
                      ? "border-orange-600 bg-orange-600 text-white shadow-lg shadow-orange-600/20"
                      : "border-black/10 bg-white text-gray-700 hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-700 dark:border-white/10 dark:bg-[#121212] dark:text-gray-200 dark:hover:text-orange-300"
                  }`}
                >
                  {position}
                </button>
              );
            })}
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 sm:col-span-2">
              Choose none, one, or two.
            </p>
          </div>
        ),
      };
    }

    if (stepIndex === 5) {
      return {
        title: "How do you prefer to nominate players?",
        body: (
          <SingleChoice
            options={nominationStyleOptions}
            value={answers.nominationStyle}
            onChange={(value) =>
              setAnswers((current) => ({ ...current, nominationStyle: value }))
            }
          />
        ),
      };
    }

    if (stepIndex === 6) {
      return {
        title: "How should we handle K and DEF?",
        body: (
          <SingleChoice
            options={kickerDefenseOptions}
            value={answers.kickerDefenseStrategy}
            onChange={(value) =>
              setAnswers((current) => ({
                ...current,
                kickerDefenseStrategy: value,
              }))
            }
          />
        ),
      };
    }

    if (stepIndex === 7) {
      return {
        title: "What matters most this season?",
        body: (
          <SingleChoice
            options={draftGoalOptions}
            value={answers.draftGoal}
            onChange={(value) =>
              setAnswers((current) => ({ ...current, draftGoal: value }))
            }
          />
        ),
      };
    }

    return {
      title: "Anything else the War Room should know?",
      body: (
        <textarea
          value={answers.additionalNotes}
          maxLength={500}
          rows={5}
          onChange={(event) =>
            setAnswers((current) => ({
              ...current,
              additionalNotes: event.target.value,
            }))
          }
          placeholder="Optional note"
          className="min-h-36 w-full resize-none rounded-2xl border border-black/10 bg-white px-4 py-3 text-base font-bold outline-none transition focus:border-orange-600 dark:border-white/10 dark:bg-[#121212]"
        />
      ),
    };
  }, [answers, stepIndex]);

  const saveAndEnter = async () => {
    setStatus("saving");
    setError(null);

    try {
      const response = await fetch("/api/auction/onboarding", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to save draft settings.");
      }

      window.localStorage.removeItem(storageKey);
      router.push("/commish/auction");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save draft settings."
      );
      setStatus("error");
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans text-black transition-colors duration-300 dark:bg-[#0a0a0a] dark:text-white">
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/90">
        <button
          type="button"
          onClick={() => router.push("/commish/auction/login")}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-orange-600 dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <ModeToggle />
      </nav>

      <main className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-3xl content-center px-4 py-8">
        <section className="rounded-3xl border border-black/10 bg-black/[0.03] p-4 shadow-2xl dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-600 text-xl font-black uppercase italic text-white shadow-lg">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                getInitials(profile.teamName || profile.displayName)
              )}
            </div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-black uppercase tracking-[0.25em] text-orange-600">
                Pilot Setup
              </p>
              <h1 className="text-3xl font-black uppercase italic leading-none tracking-tight sm:text-5xl">
                Set Up {boardTitle}
              </h1>
              <p className="mt-3 text-sm font-bold leading-relaxed text-gray-600 dark:text-gray-300">
                Answer a few questions so the War Room can tailor recommendations to your draft style.
              </p>
            </div>
          </div>

          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400">
              <span>{isFinalStep ? "Optional Note" : `${coreProgress} of ${coreStepCount}`}</span>
              <span>{profile.displayName}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
              <div
                className="h-full rounded-full bg-orange-600 transition-all"
                style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-[#121212] sm:p-5">
            <h2 className="mb-4 text-xl font-black uppercase italic tracking-tight">
              {question.title}
            </h2>
            {question.body}
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl border border-rose-600/20 bg-rose-600/10 px-4 py-3 text-sm font-bold text-rose-700 dark:text-rose-300">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0 || status === "saving"}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-4 text-[10px] font-black uppercase tracking-widest text-gray-600 transition hover:border-orange-600/30 hover:bg-orange-600/10 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-[#121212] dark:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" />
              Back
            </button>

            {isFinalStep ? (
              <button
                type="button"
                onClick={saveAndEnter}
                disabled={status === "saving"}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "saving" ? "Saving" : "Save and Enter War Room"}
                <Check className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  setStepIndex((current) =>
                    Math.min(totalSteps - 1, current + 1)
                  )
                }
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
