import "server-only";

import { FieldValue } from "firebase-admin/firestore";
import { firestore } from "@/lib/firebaseAdmin";

export const CURRENT_LEGISLATIVE_SESSION_YEAR = 2027;

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
