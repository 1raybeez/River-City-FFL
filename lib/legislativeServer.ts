import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebaseAdmin";
import { activeManagers } from "@/lib/managers/activeManagers";
import { ownerProfilesById } from "@/lib/managers/identityData";
import {
  hasAllEligibleVotes,
  isLegislativeVotingOpen,
  LEGISLATIVE_ELIGIBLE_VOTE_COUNT,
  proposalSessionTypeForNow,
  resolveLegislativeResult,
  resolveLegislativeSessionPhase,
} from "@/lib/legislativeSession";
import { readLegislativeSessionConfig } from "@/lib/legislativeSessionServer";
import { LEGISLATIVE_ARCHIVE } from "@/lib/legislativeArchive";
import {
  buildNormalizedLegislativeRecords,
} from "@/lib/legislativeReadModel";
import { isValidCurrentRuleId } from "@/lib/constitutionAuthority";
import { resolveExternalLegislativeResult } from "@/lib/legislativeExternalResult";

const legislativeManagers: Record<
  string,
  { name: string; image: string; partnerId?: string }
> = {
  "583513420586848256": { name: "Aaron Dogg", image: "Aaron.png" },
  "343129212162523136": { name: "Brian Stevens", image: "Brian.png" },
  "466663208728391680": { name: "David Besedich", image: "Dave.png" },
  "73400761740312576": { name: "Doug Fordham", image: "Doug.jpg" },
  "342850391018356736": { name: "JD Dowling", image: "JD.png" },
  "356621920969555968": {
    name: "Jeffrey Hudgins",
    image: "Ray.png",
    partnerId: "342828350391230464",
  },
  "341412060426436608": {
    name: "Jordan Maslyn",
    image: "Jordan.jpg",
    partnerId: "469199353672626176",
  },
  "469199353672626176": {
    name: "Landon Elliott",
    image: "Landon.png",
    partnerId: "341412060426436608",
  },
  "864186418971418624": { name: "Rashad Gresham", image: "Rashad.png" },
  "342828350391230464": {
    name: "Ray Long",
    image: "Ray.png",
    partnerId: "356621920969555968",
  },
  "1260048448384667648": { name: "Stan Schoppe", image: "Stan.jpg" },
  "342849293037608960": { name: "Tommy Moore", image: "Tommy.png" },
  "342831451382841344": { name: "Travis Miller", image: "Travis.png" },
  "342838548870762496": { name: "Wade Cameron", image: "Wade.png" },
};

function serializeFirestoreValue(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(serializeFirestoreValue);
  const timestamp = value as { toDate?: () => Date };
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      serializeFirestoreValue(item),
    ])
  );
}

function readText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function readVotes(value: unknown) {
  if (!value || typeof value !== "object") return { yes: [] as string[], no: [] as string[] };
  const votes = value as { yes?: unknown; no?: unknown };
  return {
    yes: Array.isArray(votes.yes)
      ? votes.yes.filter((item): item is string => typeof item === "string")
      : [],
    no: Array.isArray(votes.no)
      ? votes.no.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function getLegislativeManagerIdForCanonicalOwner(
  canonicalOwnerId: string
) {
  const owner = ownerProfilesById[canonicalOwnerId];
  if (!owner) return null;
  return (
    activeManagers.find((manager) => manager.fullName === owner.fullName)?.sleeperId ??
    null
  );
}

export async function readOwnerLegislativeState(canonicalOwnerId: string | null) {
  const [state, session] = await Promise.all([
    readLegislativeState(),
    readLegislativeSessionConfig(),
  ]);
  const now = new Date();
  const phase = resolveLegislativeSessionPhase(session, now);
  const isVotingOpen = isLegislativeVotingOpen(session, now, state.isOverrideOpen);
  const viewerManagerId = canonicalOwnerId
    ? getLegislativeManagerIdForCanonicalOwner(canonicalOwnerId)
    : null;
  const proposals = (state.proposals as Array<Record<string, unknown>>)
    .filter((proposal) => proposal.sessionYear === session.sessionYear)
    .map((proposal) => {
      const votes = readVotes(proposal.votes);
      const viewerVote = viewerManagerId
        ? votes.yes.includes(viewerManagerId)
          ? "yes"
          : votes.no.includes(viewerManagerId)
            ? "no"
            : null
        : null;
      return {
        id: proposal.id,
        submittedBy: proposal.submittedBy,
        managerImage: proposal.managerImage,
        sessionYear: proposal.sessionYear,
        section: proposal.section,
        title: proposal.title,
        description: proposal.description,
        status: proposal.status,
        voteTotals: { yes: votes.yes.length, no: votes.no.length },
        viewerVote,
      };
    });

  const normalizedRecords = buildNormalizedLegislativeRecords(
    (state.proposals as Array<Record<string, unknown>>).map((proposal) => ({
      id: String(proposal.id),
      sessionYear: typeof proposal.sessionYear === "number" ? proposal.sessionYear : undefined,
      sessionType: proposal.sessionType === "INTERIM" ? "INTERIM" : proposal.sessionType === "ANNUAL" ? "ANNUAL" : undefined,
      title: typeof proposal.title === "string" ? proposal.title : undefined,
      description: typeof proposal.description === "string" ? proposal.description : undefined,
      section: typeof proposal.section === "string" ? proposal.section : undefined,
      submittedBy: typeof proposal.submittedBy === "string" ? proposal.submittedBy : undefined,
      status: typeof proposal.status === "string" ? proposal.status : undefined,
      votes: proposal.votes as { yes?: unknown[]; no?: unknown[] } | undefined,
      viewerVote: (proposals.find((item) => item.id === proposal.id)?.viewerVote ?? null) as "yes" | "no" | null,
      createdAt: typeof proposal.createdAt === "string" ? proposal.createdAt : null,
      finalizedAt: typeof proposal.finalizedAt === "string" ? proposal.finalizedAt : null,
      passedAt: typeof proposal.passedAt === "string" ? proposal.passedAt : null,
      externalResult: proposal.externalResult as {
        yes?: number;
        no?: number;
        total?: number;
        recordedAt?: string | null;
        recordedBy?: string | null;
        sourceLabel?: string;
      } | null,
      resultSource: proposal.resultSource === "sleeper" || proposal.resultSource === "manual_external" || proposal.resultSource === "website"
        ? proposal.resultSource
        : undefined,
    })),
    LEGISLATIVE_ARCHIVE
  );
  const currentRecords = normalizedRecords.filter(
    (record) => record.sessionYear === session.sessionYear
  );
  const activeRecords = currentRecords.filter((record) => record.status === "active");
  const voteNow = activeRecords.filter(
    (record) => isVotingOpen && (!canonicalOwnerId || record.viewerVote === null)
  );
  const currentBusiness = activeRecords.filter(
    (record) => !voteNow.some((candidate) => candidate.id === record.id)
  );
  const recentResults = currentRecords.filter((record) =>
    record.status === "passed" || record.status === "failed" || record.status === "tied"
  );
  const historicalRecords = normalizedRecords.filter(
    (record) => record.sessionYear !== session.sessionYear
  );

  return {
    sessionYear: session.sessionYear,
    sessionPhase: phase,
    sessionSource: session.source,
    meetingDate: session.meetingDate,
    votingDeadline: session.annualVotingClosesAt,
    annualVotingOpensAt: session.annualVotingOpensAt,
    interimVotingOpensAt: session.interimVotingOpensAt,
    interimVotingClosesAt: session.interimVotingClosesAt,
    eligibleVoteCount: LEGISLATIVE_ELIGIBLE_VOTE_COUNT,
    isVotingOpen,
    allEligibleVotesCast: (state.proposals as Array<Record<string, unknown>>)
      .filter((proposal) => proposal.sessionYear === session.sessionYear)
      .some((proposal) => {
        const votes = readVotes(proposal.votes);
        return hasAllEligibleVotes(votes.yes.length, votes.no.length);
      }),
    isVotingFinished:
      !isVotingOpen && phase !== "COLLECTING" && phase !== "INTERIM",
    isPreMeeting: phase === "COLLECTING",
    authenticatedOwner: Boolean(canonicalOwnerId),
    voteNow,
    currentBusiness,
    recentResults,
    historicalRecords,
    archiveYears: Array.from(new Set(historicalRecords.map((record) => record.sessionYear).filter((year): year is number => year !== null))).sort((a, b) => b - a),
  };
}

export async function readLegislativeState() {
  const [proposalSnapshot, votingSnapshot] = await Promise.all([
    firestore.collection("proposals").get(),
    firestore.doc("league_settings/voting_state").get(),
  ]);

  const session = await readLegislativeSessionConfig();
  const now = new Date();
  const phase = resolveLegislativeSessionPhase(session, now);
  return {
    proposals: proposalSnapshot.docs.map((document) => ({
      id: document.id,
      ...(serializeFirestoreValue(document.data()) as Record<string, unknown>),
    })),
    isOverrideOpen:
      votingSnapshot.exists && votingSnapshot.get("isOverrideOpen") === true,
    sessionYear: session.sessionYear,
    sessionPhase: phase,
    sessionSource: session.source,
    meetingDate: session.meetingDate,
    annualVotingOpensAt: session.annualVotingOpensAt,
    annualVotingClosesAt: session.annualVotingClosesAt,
    interimVotingOpensAt: session.interimVotingOpensAt,
    interimVotingClosesAt: session.interimVotingClosesAt,
    eligibleVoteCount: LEGISLATIVE_ELIGIBLE_VOTE_COUNT,
    allEligibleVotesCast: proposalSnapshot.docs.some((document) => {
      const data = document.data();
      if (data.sessionYear !== session.sessionYear) return false;
      const votes = readVotes(data.votes);
      return hasAllEligibleVotes(votes.yes.length, votes.no.length);
    }),
  };
}

export async function createLegislativeProposal(
  input: Record<string, unknown>,
  actorEmail: string
) {
  const session = await readLegislativeSessionConfig();
  const sessionPhase = resolveLegislativeSessionPhase(session, new Date());
  if (sessionPhase === "CLOSED") {
    throw new Error("A new legislative session configuration is required.");
  }
  const managerId = readText(input.managerId, 32);
  const manager = legislativeManagers[managerId];
  const section = readText(input.section, 100);
  const title = readText(input.title, 180);
  const description = readText(input.description, 5000);

  if (!manager || !section || !title || !description) {
    throw new Error("A valid proposer, section, title, and description are required.");
  }

  const proposalRef = firestore.collection("proposals").doc();
  await proposalRef.set({
    managerId,
    section,
    title,
    description,
    submittedBy: manager.name,
    managerImage: `/managers/${manager.image}`,
    sleeperId: managerId,
    sessionYear: session.sessionYear,
    sessionType: proposalSessionTypeForNow(session),
    status: "active",
    votes: { yes: [], no: [] },
    createdAt: FieldValue.serverTimestamp(),
    createdBy: actorEmail,
  });

  return proposalRef.id;
}

export async function createOwnerLegislativeProposal(
  input: Record<string, unknown>,
  canonicalOwnerId: string,
  actorEmail: string
) {
  const managerId = getLegislativeManagerIdForCanonicalOwner(canonicalOwnerId);
  if (!managerId) throw new Error("A valid authenticated owner is required.");
  return createLegislativeProposal({ ...input, managerId }, actorEmail);
}

export async function setLegislativeVotingOverride(isOverrideOpen: boolean) {
  await firestore.doc("league_settings/voting_state").set(
    {
      isOverrideOpen,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function recordLegislativeVote(
  proposalIdValue: unknown,
  managerIdValue: unknown,
  voteTypeValue: unknown
) {
  const proposalId = readText(proposalIdValue, 128);
  const managerId = readText(managerIdValue, 32);
  const voteType = voteTypeValue === "yes" || voteTypeValue === "no" ? voteTypeValue : null;
  const manager = legislativeManagers[managerId];

  if (!proposalId || !manager || !voteType) {
    throw new Error("A valid proposal, manager, and vote are required.");
  }

  const proposalRef = firestore.collection("proposals").doc(proposalId);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(proposalRef);
    if (!snapshot.exists) throw new Error("Proposal was not found.");

    const votes = readVotes(snapshot.get("votes"));
    const selectedIds = [managerId, manager.partnerId].filter(
      (item): item is string => Boolean(item)
    );
    const oppositeType = voteType === "yes" ? "no" : "yes";
    const nextSelected = Array.from(new Set([...votes[voteType], ...selectedIds]));
    const nextOpposite = votes[oppositeType].filter(
      (item) => !selectedIds.includes(item)
    );

    transaction.update(proposalRef, {
      [`votes.${voteType}`]: nextSelected,
      [`votes.${oppositeType}`]: nextOpposite,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function recordOwnerLegislativeVote(
  proposalIdValue: unknown,
  voteTypeValue: unknown,
  canonicalOwnerId: string
) {
  const proposalId = readText(proposalIdValue, 128);
  const managerId = getLegislativeManagerIdForCanonicalOwner(canonicalOwnerId);
  const voteType = voteTypeValue === "yes" || voteTypeValue === "no" ? voteTypeValue : null;
  if (!proposalId || !managerId || !voteType) {
    throw new Error("A valid proposal and vote are required.");
  }

  const [votingSnapshot, session] = await Promise.all([
    firestore.doc("league_settings/voting_state").get(),
    readLegislativeSessionConfig(),
  ]);
  const isOverrideOpen = votingSnapshot.exists && votingSnapshot.get("isOverrideOpen") === true;
  if (!isLegislativeVotingOpen(session, new Date(), isOverrideOpen)) {
    throw new Error("Voting is not open.");
  }

  const proposalRef = firestore.collection("proposals").doc(proposalId);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(proposalRef);
    if (!snapshot.exists) throw new Error("Proposal was not found.");
    const data = snapshot.data() ?? {};
    if (
      data.sessionYear !== session.sessionYear ||
      String(data.status ?? "").toLowerCase() !== "active"
    ) {
      throw new Error("This proposal is no longer eligible for owner voting.");
    }
    const votes = readVotes(data.votes);
    const oppositeType = voteType === "yes" ? "no" : "yes";
    const nextSelected = Array.from(new Set([...votes[voteType], managerId]));
    const nextOpposite = votes[oppositeType].filter((item) => item !== managerId);
    transaction.update(proposalRef, {
      [`votes.${voteType}`]: nextSelected,
      [`votes.${oppositeType}`]: nextOpposite,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function finalizeLegislativeVoting(actorEmail: string) {
  const [snapshot, session] = await Promise.all([
    firestore.collection("proposals").get(),
    readLegislativeSessionConfig(),
  ]);
  const activeProposals = snapshot.docs.filter((document) => {
    const data = document.data();
    return (
      data.sessionYear === session.sessionYear &&
      String(data.status ?? "").toLowerCase() === "active"
    );
  });

  if (activeProposals.length === 0) {
    throw new Error("No active proposals are available to finalize.");
  }

  const batch = firestore.batch();
  const passedAt = new Date().toISOString();
  const date = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
  });
  let passedCount = 0;
  let failedCount = 0;
  let tiedCount = 0;

  activeProposals.forEach((document) => {
    const data = document.data();
    const votes = readVotes(data.votes);
    const result = resolveLegislativeResult(votes.yes.length, votes.no.length);
    batch.update(document.ref, {
      status: result,
      finalizedAt: FieldValue.serverTimestamp(),
      finalizedBy: actorEmail,
    });

    if (result === "failed") {
      failedCount += 1;
      return;
    }

    if (result === "tied") {
      tiedCount += 1;
      return;
    }

    passedCount += 1;
    const section = readText(data.section, 100);
    const sectionId = section.match(/^\d+(?:\.\d+)*/)?.[0] ?? section;
    const title = readText(data.title, 180);
    const description = readText(data.description, 5000);
    const voteTotals = { yes: votes.yes.length, no: votes.no.length };
    batch.set(
      firestore.collection("ratified_rules").doc(document.id),
      {
        proposalId: document.id,
        sectionId,
        title,
        content: [description],
        passedAt,
        voteTotals,
      },
      { merge: true }
    );
    batch.set(
      firestore.collection("version_history_updates").doc(document.id),
      {
        version: "Auto-Update",
        date,
        changes: [
          {
            rule: sectionId,
            description: `${title} (Passed ${voteTotals.yes}-${voteTotals.no})`,
          },
        ],
        proposalId: document.id,
      },
      { merge: true }
    );
  });

  await batch.commit();
  return {
    passedCount,
    failedCount,
    tiedCount,
    allEligibleVotesCast: activeProposals.every((document) => {
      const votes = readVotes(document.data().votes);
      return hasAllEligibleVotes(votes.yes.length, votes.no.length);
    }),
  };
}

export async function recordExternalLegislativeResult(input: {
  proposalId: string;
  yes: number;
  no: number;
  source: "sleeper" | "manual_external";
  sourceLabel: string;
  actorEmail: string;
}) {
  if (!Number.isInteger(input.yes) || input.yes < 0 || !Number.isInteger(input.no) || input.no < 0) {
    throw new Error("External vote totals must be non-negative integers.");
  }
  if (!input.sourceLabel.trim()) throw new Error("An external result source is required.");
  const total = input.yes + input.no;
  if (total === 0) throw new Error("An external result must include votes.");

  const proposalRef = firestore.collection("proposals").doc(input.proposalId);
  const result = resolveExternalLegislativeResult(input.yes, input.no);
  const recordedAt = new Date().toISOString();
  let outcome: "recorded" | "noop" = "recorded";

  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(proposalRef);
    if (!snapshot.exists) throw new Error("Proposal was not found.");
    const data = snapshot.data() ?? {};
    const currentStatus = String(data.status ?? "").toLowerCase();
    const currentExternal = data.externalResult as Record<string, unknown> | undefined;
    const sameResult =
      currentExternal?.yes === input.yes &&
      currentExternal?.no === input.no &&
      currentExternal?.total === total &&
      data.resultSource === input.source;

    if (sameResult && currentStatus === result) {
      outcome = "noop";
      return;
    }
    if (currentStatus !== "active") {
      throw new Error("Conflicting finalized result already exists.");
    }
    if ((readVotes(data.votes).yes.length + readVotes(data.votes).no.length) > 0) {
      throw new Error("Website votes already exist; external result cannot overwrite them.");
    }

    transaction.update(proposalRef, {
      status: result,
      resultSource: input.source,
      externalResult: {
        yes: input.yes,
        no: input.no,
        total,
        recordedAt: FieldValue.serverTimestamp(),
        recordedBy: input.actorEmail,
        sourceLabel: input.sourceLabel.trim(),
      },
      finalizedAt: FieldValue.serverTimestamp(),
      finalizedBy: input.actorEmail,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const sectionId = readText(data.section, 100).match(/^\d+(?:\.\d+)*/)?.[0] ?? null;
    if (result === "passed" && isValidCurrentRuleId(sectionId)) {
      const title = readText(data.title, 180);
      const description = readText(data.description, 5000);
      transaction.set(
        firestore.collection("ratified_rules").doc(input.proposalId),
        { proposalId: input.proposalId, sectionId, title, content: [description], passedAt: recordedAt, voteTotals: { yes: input.yes, no: input.no } },
        { merge: true }
      );
      transaction.set(
        firestore.collection("version_history_updates").doc(input.proposalId),
        { version: "Auto-Update", date: new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" }), changes: [{ rule: sectionId, description: `${title} (Passed ${input.yes}-${input.no})` }], proposalId: input.proposalId },
        { merge: true }
      );
    }
  });

  return { outcome, status: result, yes: input.yes, no: input.no, total, source: input.source };
}
