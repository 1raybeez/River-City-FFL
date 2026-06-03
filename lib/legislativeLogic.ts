import { db } from "./firebase";
import { doc, updateDoc, collection, addDoc } from "firebase/firestore";
import { RuleProposal } from "./proposals";

export const ratifyProposal = async (proposal: RuleProposal) => {
  try {
    const passedAt = new Date().toISOString();
    const date = new Date().toLocaleDateString();
    const voteTotals = {
      yes: proposal.votes.yes.length,
      no: proposal.votes.no.length,
    };

    // 1. Mark the proposal as 'passed' in Firestore
    const proposalRef = doc(db, "proposals", proposal.id);
    await updateDoc(proposalRef, { status: "passed" });

    // 2. Add the rule to the live Constitution collection.
    await addDoc(collection(db, "ratified_rules"), {
      proposalId: proposal.id,
      sectionId: proposal.section,
      title: proposal.title,
      content: [proposal.description],
      passedAt,
      voteTotals,
    });

    // 3. Create a Version History entry
    await addDoc(collection(db, "version_history_updates"), {
      version: "Auto-Update",
      date,
      changes: [
        {
          rule: proposal.section,
          description: `${proposal.title} (Passed ${voteTotals.yes}-${voteTotals.no})`,
        },
      ],
      proposalId: proposal.id,
    });

    return { success: true };
  } catch (error) {
    console.error("Ratification failed:", error);
    return { success: false };
  }
};
