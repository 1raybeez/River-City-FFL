import { db } from "./firebase";
import { doc, updateDoc, arrayUnion, collection, addDoc } from "firebase/firestore";
import { RuleProposal } from "./proposals";

export const ratifyProposal = async (proposal: RuleProposal) => {
  try {
    // 1. Mark the proposal as 'passed' in Firestore
    const proposalRef = doc(db, "proposals", proposal.id);
    await updateDoc(proposalRef, { status: 'passed' });

    // 2. Add the rule to a 'passedRules' collection in Firestore
    // Your Constitution page will fetch from here to show live updates
    await addDoc(collection(db, "ratified_rules"), {
      title: proposal.title,
      content: proposal.description,
      section: proposal.section,
      ratifiedAt: new Date().toISOString(),
      votes: proposal.votes
    });

    // 3. Create a Version History entry
    await addDoc(collection(db, "version_history_updates"), {
      version: "Auto-Update", // You can calculate this based on count
      date: new Date().toLocaleDateString(),
      change: `${proposal.section}: ${proposal.title} (Passed ${proposal.votes.yes.length}-${proposal.votes.no.length})`
    });

    return { success: true };
  } catch (error) {
    console.error("Ratification failed:", error);
    return { success: false };
  }
};