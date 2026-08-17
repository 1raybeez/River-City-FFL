import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const route = readFileSync("app/api/commish/post-draft/route.ts", "utf8");

assert.match(route, /requireAuctionAccess\("maintenance"\)/);
assert.match(route, /function unauthorized\(\)/);
assert.match(route, /return NextResponse\.json\(\{ error: "Commissioner access required\." \}, \{ status: 401 \}\)/);

const getStart = route.indexOf("export async function GET");
const postStart = route.indexOf("export async function POST");
assert.ok(getStart >= 0);
assert.ok(postStart > getStart);

const getBody = route.slice(getStart, postStart);
const postBody = route.slice(postStart);
for (const methodBody of [getBody, postBody]) {
  const guard = methodBody.indexOf("const actor = await getCommissionerActor()");
  const denial = methodBody.indexOf("if (!actor) return unauthorized()");
  assert.ok(guard >= 0, "protected route method must authenticate first");
  assert.ok(denial > guard, "protected route method must deny unauthorized callers");
  assert.ok(denial < methodBody.indexOf("try {"), "authorization must precede protected work");
}

assert.ok(
  getBody.indexOf("if (!actor) return unauthorized()") < getBody.indexOf("new URL(request.url)"),
  "GET must authorize before reading private request state"
);
assert.ok(
  postBody.indexOf("if (!actor) return unauthorized()") < postBody.indexOf("request.json()"),
  "POST must authorize before parsing mutation intent"
);

assert.match(postBody, /capture-snapshot/);
assert.match(postBody, /save-narrative/);
assert.match(postBody, /transition-narrative/);
assert.match(postBody, /publish-narrative/);
assert.match(postBody, /rollback-publication/);
assert.match(postBody, /unpublish-publication/);
assert.match(postBody, /publish-recap/);
assert.match(postBody, /rollback-recap/);
assert.doesNotMatch(
  route,
  /body\.(uid|email|role|owner|commissioner|capability|canAccess)\b/,
  "browser-supplied identity or capability fields must not authorize the route"
);
assert.match(route, /Cache-Control.*private, no-store/);

const publicSurfaces = [
  "app/league-info/page.tsx",
  "app/league-info/legislative/page.tsx",
  "app/league-info/payouts/page.tsx",
  "app/league-info/analyzer/page.tsx",
  "app/page.tsx",
];
for (const file of publicSurfaces) {
  readFileSync(file, "utf8");
}

console.log("Post-Draft API authorization checks passed.");
