import { buildOperationalFinanceProposals } from "../lib/finance/operationalFinanceProposals";
import { acquireOperationalFinanceSleeperSnapshot } from "../lib/finance/operationalFinanceSleeperAdapter";

async function main() {
  const snapshot = await acquireOperationalFinanceSleeperSnapshot();
  const result = buildOperationalFinanceProposals(snapshot.proposalInput);

  console.log(
    JSON.stringify(
      {
        acquisition: snapshot.acquisition,
        proposalCounts: result.coverage,
        issues: result.issues,
        proposed: result.proposals
          .filter((proposal) => proposal.proposalState === "proposed")
          .map((proposal) => ({
            proposalKey: proposal.proposalKey,
            category: proposal.category,
            amountCents: proposal.amountCents,
            financialOwnerId: proposal.financialOwnerId,
            franchiseId: proposal.franchiseId,
            sourceRef: proposal.sourceRef,
          })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
