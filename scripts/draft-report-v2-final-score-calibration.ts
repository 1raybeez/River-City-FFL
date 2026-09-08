import { firestore } from "../lib/firebaseAdmin";
import { buildCalibrationInputsFromFrozenReview, calibrateFinalScores, runSyntheticGuardrails } from "../lib/draftReportV2/finalScoreCalibration";

const SNAPSHOT_ID = "draft-report-v2-92cbc6b4607098d5";
const EXPECTED_CHECKSUM = "92cbc6b4607098d54e1b2a34fc2a31d06bd5d9c8503d3a7182f6927c34650662";
const EXPECTED_EVIDENCE_AS_OF = "2026-08-26T00:40:55.683Z";

async function main() {
  const document = await firestore.collection("draft_report_v2_review_snapshots").doc(SNAPSHOT_ID).get();
  if (!document.exists) throw new Error(`Frozen snapshot ${SNAPSHOT_ID} was not found.`);
  const persisted = document.data() as any;
  if (persisted.snapshot?.snapshotId !== SNAPSHOT_ID || persisted.snapshot?.inputChecksum !== EXPECTED_CHECKSUM || persisted.snapshot?.evidenceAsOf !== EXPECTED_EVIDENCE_AS_OF) throw new Error("Frozen snapshot metadata does not match the approved artifact; calibration stopped.");
  const inputs = buildCalibrationInputsFromFrozenReview(persisted);
  if (inputs.length !== 12) throw new Error(`Expected 12 frozen teams, found ${inputs.length}.`);
  const calibration = calibrateFinalScores(inputs);
  console.log(JSON.stringify({ snapshot: { snapshotId: SNAPSHOT_ID, inputChecksum: EXPECTED_CHECKSUM, evidenceAsOf: EXPECTED_EVIDENCE_AS_OF }, normalization: "min-max across the 12 frozen teams: (value - league minimum) / (league maximum - league minimum) * 100; equal values receive equal scores; all-equal dimensions receive 50", calibration, syntheticGuardrails: runSyntheticGuardrails() }, null, 2));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "Calibration failed."); process.exitCode = 1; });
