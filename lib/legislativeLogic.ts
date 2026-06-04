import { db } from "./firebase";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { RuleProposal } from "./proposals";

export function getSectionId(section: string): string {
  const match = section.trim().match(/^\d+(?:\.\d+)*/);
  return match?.[0] ?? section.trim();
}

export const ratifyProposal = async (proposal: RuleProposal) => {
  try {
    const passedAt = new Date().toISOString();
    const date = new Date().toLocaleDateString();
    const sectionId = getSectionId(proposal.section);
    const voteTotals = {
      yes: proposal.votes.yes.length,
      no: proposal.votes.no.length,
    };

    // 1. Mark the proposal as 'passed' in Firestore
    const proposalRef = doc(db, "proposals", proposal.id);
    await updateDoc(proposalRef, { status: "passed" });

    // 2. Add the rule to the live Constitution collection.
    await setDoc(doc(db, "ratified_rules", proposal.id), {
      proposalId: proposal.id,
      sectionId,
      title: proposal.title,
      content: [proposal.description],
      passedAt,
      voteTotals,
    }, { merge: true });

    // 3. Create a Version History entry
    await setDoc(doc(db, "version_history_updates", proposal.id), {
      version: "Auto-Update",
      date,
      changes: [
        {
          rule: sectionId,
          description: `${proposal.title} (Passed ${voteTotals.yes}-${voteTotals.no})`,
        },
      ],
      proposalId: proposal.id,
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error("Ratification failed:", error);
    return { success: false };
  }
};
