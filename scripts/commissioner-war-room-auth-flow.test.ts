import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveAuthorizedEmailMapping, assertWarRoomScope } from '../lib/auth/canonicalAuctionAuthorization';

const home = readFileSync('app/HomeClient.tsx', 'utf8');
const commish = readFileSync('app/commish/page.tsx', 'utf8');
const commissionerLogin = readFileSync('app/commish/login/page.tsx', 'utf8');
const warRoomLogin = readFileSync('app/commish/auction/login/page.tsx', 'utf8');
const auctionPage = readFileSync('app/commish/auction/page.tsx', 'utf8');
const access = readFileSync('lib/auth/auctionAccess.ts', 'utf8');

assert.match(home, /href="\/commish"/);
assert.match(home, /href="\/commish\/auction"/);
assert.match(commish, /redirect\('\/commish\/login\?returnTo=%2Fcommish'\)/);
assert.match(commissionerLogin, /River City Commissioner Hub/);
assert.match(commissionerLogin, /authorized commissioner account/);
assert.doesNotMatch(commissionerLogin, /Auction War Room/);
assert.match(commissionerLogin, /router\.replace\(returnTo\)/);
assert.match(commissionerLogin, /getSafeReturnTo/);
assert.match(commissionerLogin, /requestedReturnTo\.startsWith\('\/commish'\)/);
assert.match(warRoomLogin, /River City Auction War Room/);
assert.match(warRoomLogin, /Back to Home/);
assert.match(warRoomLogin, /href="\/"[\s\S]*Back to Home/);
assert.match(warRoomLogin, /router\.replace\(returnTo\)/);
assert.match(warRoomLogin, /getSafeReturnTo/);
assert.match(auctionPage, /returnTo=%2Fcommish%2Fauction/);
assert.match(access, /canAccessMaintenance: false/);
assert.match(access, /canRecordSales: false/);

const mappings = [
  { normalizedEmail: 'ray@example.invalid', canonicalOwnerId: 'ray-long' },
  { normalizedEmail: 'jeffrey@example.invalid', canonicalOwnerId: 'jeffrey-hudgins' },
];
const ray = resolveAuthorizedEmailMapping('ray@example.invalid', mappings)!;
const jeffrey = resolveAuthorizedEmailMapping('jeffrey@example.invalid', mappings)!;
assert.equal(ray.warRoomId, '2026:prestigio-mundial');
assert.equal(jeffrey.warRoomId, ray.warRoomId);
assert.notEqual(ray.canonicalOwnerId, jeffrey.canonicalOwnerId);
assert.doesNotThrow(() => assertWarRoomScope(ray, ray.warRoomId));
assert.throws(() => assertWarRoomScope(ray, '2026:shake-n-bakers'));

console.log('Commissioner/War Room auth-flow checks passed.');
