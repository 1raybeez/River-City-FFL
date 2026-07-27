import assert from 'node:assert/strict';
import {
  buildSoldPlayerState,
  getSoldPlayerPrimaryState,
  suppressSoldPlayerLiveWarnings,
} from '../lib/auction/soldPlayerState';
import {
  buildDraftCoachResponse,
  type DraftCoachInput,
} from '../lib/auction/draftCoach';

const manualSale = buildSoldPlayerState({
  isKeeper: false,
  teamName: 'River Rats',
  managerName: 'Commissioner',
  price: 38,
  sourceLabel: 'Manual local sale',
  marketValue: 35,
  expectedSale: 36,
  recommendationCeiling: 40,
});
const sleeperSale = buildSoldPlayerState({
  isKeeper: false,
  teamName: 'River Rats',
  managerName: null,
  price: 38,
  sourceLabel: 'Sleeper draft',
  marketValue: 35,
  expectedSale: 36,
  recommendationCeiling: 40,
});
const sleeperKeeper = buildSoldPlayerState({
  isKeeper: true,
  teamName: 'River Rats',
  managerName: null,
  price: 12,
  sourceLabel: 'Sleeper keeper',
  marketValue: 35,
  expectedSale: 36,
  recommendationCeiling: 40,
});

assert.equal(getSoldPlayerPrimaryState(manualSale, 'BID NOW'), 'SOLD');
assert.equal(getSoldPlayerPrimaryState(sleeperSale, 'WAIT'), 'SOLD');
assert.equal(getSoldPlayerPrimaryState(sleeperKeeper, 'DO NOT BID'), 'KEEPER');
assert.equal(getSoldPlayerPrimaryState(null, 'BID NOW'), 'BID NOW');

const liveWarnings = [
  'ADP wait risk is high.',
  'Likely sale may exceed the ceiling.',
  'Current bid is above the ceiling.',
];
assert.deepEqual(suppressSoldPlayerLiveWarnings(manualSale, liveWarnings), []);
assert.deepEqual(suppressSoldPlayerLiveWarnings(null, liveWarnings), liveWarnings);

const coachInput: DraftCoachInput = {
  selectedPlayer: {
    playerName: 'Example Player',
    position: 'WR',
    nflTeam: 'BUF',
    preference: 'target',
    rosterNeedLevel: 'need',
    status: 'Drafted',
  },
  currentBid: null,
  marketValue: 35,
  predictedWinningBid: 36,
  ownerMaxBid: 40,
  confidence: 'high',
  confidenceScore: 90,
  recommendation: 'BID',
  intelligenceReasons: ['Live bidding reason'],
  intelligenceWarnings: liveWarnings,
  roomReasons: ['Nomination pressure'],
  roomWarnings: liveWarnings,
  historicalPricing: null,
  competitionContext: null,
  budget: null,
  roster: null,
  positionContext: null,
  kDefStrategy: null,
  draftProgress: null,
  completedPurchase: manualSale,
};
const soldCoachResponse = buildDraftCoachResponse(coachInput);

assert.equal(soldCoachResponse.decision, 'SOLD');
assert.match(soldCoachResponse.buddyMessage, /already sold/i);
assert.match(soldCoachResponse.buddyMessage, /do not bid on or nominate/i);
assert.equal(soldCoachResponse.spendGuidance.suggestedNextBid, undefined);
assert.deepEqual(soldCoachResponse.warnings, []);

console.log('Sold-player state assertions passed.');
