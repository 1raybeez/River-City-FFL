import assert from "node:assert/strict";

import {
  adpSourceNeedsValidation,
  getAdpMaintenanceStatusLabel,
} from "../lib/auction/adpMaintenanceState";
import {
  buildAdpUnmatchedReview,
  sanitizeAdpFirestoreData,
} from "../lib/auction/adpReview";
import type {
  AuctionAdpSourceKey,
  AuctionAdpSourceRow,
  AuctionAdpSourceValuesFile,
} from "../lib/auction/adpTypes";

function makeRow(
  overrides: Partial<AuctionAdpSourceRow> & {
    sourceKey: AuctionAdpSourceKey;
    playerName: string;
    position: string;
  }
): AuctionAdpSourceRow {
  const { sourceKey, playerName, position, ...rest } = overrides;

  return {
    season: 2026,
    sourceKey,
    sourceName: sourceKey,
    sourceRowId: `${sourceKey}:${playerName}`,
    rowNumber: 1,
    playerId: null,
    playerName,
    position,
    nflTeam: overrides.nflTeam ?? null,
    overallAdp: 100,
    positionAdp: null,
    matchType: "unmatched",
    importedAt: "2026-07-14T00:00:00.000Z",
    warnings: [],
    errors: [],
    ...rest,
  };
}

function makeSourceFile(
  sourceKey: AuctionAdpSourceKey,
  rows: AuctionAdpSourceRow[]
): AuctionAdpSourceValuesFile {
  return {
    generatedAt: "2026-07-14T00:00:00.000Z",
    season: 2026,
    sourceKey,
    sourceName: sourceKey,
    sourceFile: `${sourceKey}.csv`,
    rowCount: rows.length,
    matchedRowCount: rows.filter((row) => row.playerId !== null).length,
    unmatchedRowCount: rows.filter((row) => row.playerId === null).length,
    warningCount: 0,
    errorCount: 0,
    rows,
  };
}

function assertSuggestionEvidence(
  review: ReturnType<typeof buildAdpUnmatchedReview>,
  evidence: string
) {
  assert.equal(review.unmatchedPlayers.length, 1);
  assert.equal(review.unmatchedPlayers[0].suggestedMatch?.confidence, "HIGH");
  assert.deepEqual(review.unmatchedPlayers[0].suggestedMatch?.evidence, [
    evidence,
  ]);
}

function assertNoUndefined(value: unknown, path = "value") {
  assert.notEqual(value, undefined, `${path} should not be undefined`);
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUndefined(item, `${path}.${index}`));
    return;
  }
  if (!value || typeof value !== "object") return;
  Object.entries(value).forEach(([key, nestedValue]) =>
    assertNoUndefined(nestedValue, `${path}.${key}`)
  );
}

assert.equal(
  getAdpMaintenanceStatusLabel({
    summary: { status: "validated" },
    hasSelectedFile: true,
    isUploading: false,
  }),
  "SELECTED · CLICK UPLOAD",
  "selected browser file should override older server status"
);

assert.equal(
  getAdpMaintenanceStatusLabel({
    summary: { status: "uploaded" },
    hasSelectedFile: false,
    isUploading: false,
  }),
  "UPLOADED · AWAITING VALIDATION",
  "fresh upload should read as awaiting validation"
);
assert.equal(
  adpSourceNeedsValidation({ status: "uploaded", contentHash: "abc" }),
  true,
  "uploaded replacement should require validation"
);

assert.equal(
  adpSourceNeedsValidation({
    status: "validated",
    contentHash: "abc",
    validatedContentHash: "abc",
  }),
  false,
  "matching uploaded/validated hashes should be publishable"
);

assert.equal(
  adpSourceNeedsValidation({
    status: "validated",
    contentHash: "new",
    validatedContentHash: "old",
  }),
  true,
  "stale validated hash should block publish"
);

const suffixUnmatched = makeSourceFile("fantasypros-adp", [
  makeRow({
    sourceKey: "fantasypros-adp",
    playerName: "Kenneth Gainwell",
    position: "RB",
    nflTeam: "TB",
  }),
]);
const suffixMatched = makeSourceFile("rotowire-adp", [
  makeRow({
    sourceKey: "rotowire-adp",
    playerId: "123",
    playerName: "Kenneth Gainwell Jr.",
    position: "RB",
    nflTeam: "TB",
    matchType: "name-position",
  }),
]);
assertSuggestionEvidence(
  buildAdpUnmatchedReview(suffixUnmatched, [suffixUnmatched, suffixMatched]),
  "suffix-only difference"
);

const punctuationUnmatched = makeSourceFile("fantasypros-adp", [
  makeRow({
    sourceKey: "fantasypros-adp",
    playerName: "DJ Moore",
    position: "WR",
    nflTeam: "CHI",
  }),
]);
const punctuationMatched = makeSourceFile("rotowire-adp", [
  makeRow({
    sourceKey: "rotowire-adp",
    playerId: "456",
    playerName: "D.J. Moore",
    position: "WR",
    nflTeam: "CHI",
    matchType: "name-position",
  }),
]);
assertSuggestionEvidence(
  buildAdpUnmatchedReview(punctuationUnmatched, [
    punctuationUnmatched,
    punctuationMatched,
  ]),
  "punctuation-only difference"
);

const ambiguousSource = makeSourceFile("fantasypros-adp", [
  makeRow({
    sourceKey: "fantasypros-adp",
    playerName: "Kyle Williams",
    position: "WR",
    nflTeam: "NE",
    matchType: "ambiguous",
    matchCandidates: [
      {
        sleeperPlayerId: "a",
        playerName: "Kyle Williams",
        position: "WR",
        nflTeam: "NE",
      },
      {
        sleeperPlayerId: "b",
        playerName: "Kyle Williams",
        position: "WR",
        nflTeam: "KC",
      },
    ],
  }),
]);
const ambiguousReview = buildAdpUnmatchedReview(ambiguousSource, [
  ambiguousSource,
]);
assert.equal(ambiguousReview.unmatchedPlayers[0].candidateCount, 2);
assert.equal(ambiguousReview.unmatchedPlayers[0].suggestedMatch, undefined);

const exactUnmatched = makeSourceFile("fantasypros-adp", [
  makeRow({
    sourceKey: "fantasypros-adp",
    playerName: "John Smith",
    position: "TE",
  }),
]);
const exactMatched = makeSourceFile("rotowire-adp", [
  makeRow({
    sourceKey: "rotowire-adp",
    playerId: "789",
    playerName: "John Smith",
    position: "TE",
    matchType: "name-position",
  }),
]);
assertSuggestionEvidence(
  buildAdpUnmatchedReview(exactUnmatched, [exactUnmatched, exactMatched]),
  "exact normalized name + position in another uploaded source"
);

const privateReviewJson = JSON.stringify(
  buildAdpUnmatchedReview(exactUnmatched, [exactUnmatched, exactMatched])
);
assert.equal(privateReviewJson.includes("overallAdp"), false);
assert.equal(privateReviewJson.includes("sourceRowId"), false);
assert.equal(privateReviewJson.includes("importedAt"), false);

const firestoreShape = sanitizeAdpFirestoreData({
  rows: [
    {
      playerName: "Example Player",
      position: null,
      nflTeam: null,
      matchCandidates: undefined,
      suggestedMatch: undefined,
      evidence: undefined,
    },
    {
      playerName: "Kyle Williams",
      position: "WR",
      nflTeam: "NE",
      matchCandidates: [
        {
          sleeperPlayerId: "a",
          playerName: "Kyle Williams",
          position: "WR",
          nflTeam: null,
        },
        {
          sleeperPlayerId: "b",
          playerName: "Kyle Williams",
          position: "WR",
          nflTeam: "NE",
        },
      ],
    },
  ],
});
assertNoUndefined(firestoreShape);
assert.equal("matchCandidates" in firestoreShape.rows[0], false);
assert.equal("suggestedMatch" in firestoreShape.rows[0], false);
assert.equal(firestoreShape.rows[0].position, null);
assert.equal(firestoreShape.rows[1].matchCandidates?.length, 2);
assert.equal(JSON.stringify(firestoreShape).includes("overallAdp"), false);

assert.equal(
  adpSourceNeedsValidation({ status: "validated" }),
  true,
  "older validated runs without hashes should load but require revalidation before publish"
);

console.log("ADP maintenance hotfix focused tests passed.");
