import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebaseAdmin";
import { activeManagers } from "@/lib/managers/activeManagers";
import { ownerProfilesById } from "@/lib/managers/identityData";

export const CURRENT_LEGISLATIVE_SESSION_YEAR = 2027;
export const LEGISLATIVE_MEETING_DATE = new Date(
  `${CURRENT_LEGISLATIVE_SESSION_YEAR}-03-20T20:30:00`
);
export const LEGISLATIVE_VOTING_DEADLINE = new Date(
  LEGISLATIVE_MEETING_DATE.getTime() + 7 * 24 * 60 * 60 * 1000
);

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

function isOwnerVotingOpen(now: Date, isOverrideOpen: boolean) {
  return (
    (now >= LEGISLATIVE_MEETING_DATE && now <= LEGISLATIVE_VOTING_DEADLINE) ||
    isOverrideOpen
  );
}

export async function readOwnerLegislativeState(canonicalOwnerId: string | null) {
  const state = await readLegislativeState();
  const now = new Date();
  const isVotingOpen = isOwnerVotingOpen(now, state.isOverrideOpen);
  const viewerManagerId = canonicalOwnerId
    ? getLegislativeManagerIdForCanonicalOwner(canonicalOwnerId)
    : null;
  const proposals = (state.proposals as Array<Record<string, unknown>>)
    .filter((proposal) => proposal.sessionYear === CURRENT_LEGISLATIVE_SESSION_YEAR)
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
        managerId: proposal.managerId,
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

  return {
    sessionYear: CURRENT_LEGISLATIVE_SESSION_YEAR,
    meetingDate: LEGISLATIVE_MEETING_DATE.toISOString(),
    votingDeadline: LEGISLATIVE_VOTING_DEADLINE.toISOString(),
    isVotingOpen,
    isVotingFinished: now > LEGISLATIVE_VOTING_DEADLINE && !state.isOverrideOpen,
    isPreMeeting: now < LEGISLATIVE_MEETING_DATE && !state.isOverrideOpen,
    authenticatedOwner: Boolean(canonicalOwnerId),
    proposals,
  };
}

export async function readLegislativeState() {
  const [proposalSnapshot, votingSnapshot] = await Promise.all([
    firestore.collection("proposals").get(),
    firestore.doc("league_settings/voting_state").get(),
  ]);

  return {
    proposals: proposalSnapshot.docs.map((document) => ({
      id: document.id,
      ...(serializeFirestoreValue(document.data()) as Record<string, unknown>),
    })),
    isOverrideOpen:
      votingSnapshot.exists && votingSnapshot.get("isOverrideOpen") === true,
  };
}

export async function createLegislativeProposal(
  input: Record<string, unknown>,
  actorEmail: string
) {
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
    sessionYear: CURRENT_LEGISLATIVE_SESSION_YEAR,
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

  const votingSnapshot = await firestore.doc("league_settings/voting_state").get();
  const isOverrideOpen = votingSnapshot.exists && votingSnapshot.get("isOverrideOpen") === true;
  if (!isOwnerVotingOpen(new Date(), isOverrideOpen)) {
    throw new Error("Voting is not open.");
  }

  const proposalRef = firestore.collection("proposals").doc(proposalId);
  await firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(proposalRef);
    if (!snapshot.exists) throw new Error("Proposal was not found.");
    const data = snapshot.data() ?? {};
    if (
      data.sessionYear !== CURRENT_LEGISLATIVE_SESSION_YEAR ||
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
  const snapshot = await firestore.collection("proposals").get();
  const activeProposals = snapshot.docs.filter((document) => {
    const data = document.data();
    return (
      data.sessionYear === CURRENT_LEGISLATIVE_SESSION_YEAR &&
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

  activeProposals.forEach((document) => {
    const data = document.data();
    const votes = readVotes(data.votes);
    const passed = votes.yes.length > votes.no.length;
    batch.update(document.ref, {
      status: passed ? "passed" : "failed",
      finalizedAt: FieldValue.serverTimestamp(),
      finalizedBy: actorEmail,
    });

    if (!passed) {
      failedCount += 1;
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
  return { passedCount, failedCount };
}
