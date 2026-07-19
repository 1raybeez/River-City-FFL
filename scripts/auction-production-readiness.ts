import { access } from "node:fs/promises";

import {
  EXPECTED_AUCTION_STORAGE_BUCKET,
  getAuctionProductionEnvStatus,
  getAuctionProductionSeason,
  getAuctionProductionSourceModes,
  readAuctionProductionHealth,
} from "../lib/auction/productionRuntime";
import { readAuctionAdpStatus } from "../lib/auction/adpRefreshService";
import { readAuctionValueStatus } from "../lib/auction/valueRefreshService";

const DEFAULT_SESSION_COOKIE_NAME = "river_city_auction_session";

type DeployedCheck = {
  path: string;
  status: number | null;
  ok: boolean;
  detail: string;
};

async function fileExists(path: string) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function buildCookieHeader(rawCookie: string) {
  if (rawCookie.includes("=")) return rawCookie;

  const cookieName =
    process.env.AUCTION_SESSION_COOKIE_NAME?.trim() ||
    DEFAULT_SESSION_COOKIE_NAME;

  return `${cookieName}=${rawCookie}`;
}

function buildUrl(baseUrl: string, path: string) {
  return new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

async function fetchCheck({
  baseUrl,
  path,
  cookieHeader,
  expect,
  redirect = "follow",
}: {
  baseUrl: string;
  path: string;
  cookieHeader?: string;
  expect: (response: Response, payload: unknown) => boolean;
  redirect?: RequestRedirect;
}): Promise<DeployedCheck> {
  try {
    const response = await fetch(buildUrl(baseUrl, path), {
      headers: cookieHeader ? { cookie: cookieHeader } : undefined,
      redirect,
    });
    const contentType = response.headers.get("content-type") ?? "";
    const payload = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    return {
      path,
      status: response.status,
      ok: expect(response, payload),
      detail:
        typeof payload === "object" && payload !== null
          ? "JSON response received."
          : String(payload).slice(0, 120),
    };
  } catch (error) {
    return {
      path,
      status: null,
      ok: false,
      detail: error instanceof Error ? error.message : "Request failed.",
    };
  }
}

async function runDeployedChecks() {
  const baseUrl = process.env.AUCTION_PRODUCTION_BASE_URL?.trim();
  const sessionCookie = process.env.AUCTION_PRODUCTION_SESSION_COOKIE?.trim();

  if (!baseUrl) {
    return {
      mode: "not-supplied",
      checks: [] as DeployedCheck[],
      ok: true,
    };
  }

  const cookieHeader = sessionCookie ? buildCookieHeader(sessionCookie) : "";
  const checks: DeployedCheck[] = [];

  checks.push(
    await fetchCheck({
      baseUrl,
      path: "/commish/auction",
      redirect: "manual",
      expect: (response) =>
        response.status === 307 ||
        response.status === 308 ||
        response.status === 302 ||
        response.status === 303,
    })
  );
  checks.push(
    await fetchCheck({
      baseUrl,
      path: "/api/auction/health",
      expect: (response) => response.status === 401,
    })
  );

  if (cookieHeader) {
    checks.push(
      await fetchCheck({
        baseUrl,
        path: "/api/auction/health",
        cookieHeader,
        expect: (response) => response.ok,
      })
    );
    checks.push(
      await fetchCheck({
        baseUrl,
        path: "/api/auction/sleeper-snapshot?season=2026",
        cookieHeader,
        expect: (response) => response.status < 500,
      })
    );
    checks.push(
      await fetchCheck({
        baseUrl,
        path: "/api/auction/values/status?season=2026",
        cookieHeader,
        expect: (response) => response.ok,
      })
    );
    checks.push(
      await fetchCheck({
        baseUrl,
        path: "/api/auction/adp/status?season=2026",
        cookieHeader,
        expect: (response) => response.ok,
      })
    );
  }

  return {
    mode: cookieHeader ? "session-supplied" : "missing-session-cookie",
    checks,
    ok: checks.every((check) => check.ok) && Boolean(cookieHeader),
  };
}

function summarizeSourceStatus({
  activeRun,
  fallbackExists,
  fallbackWarning,
}: {
  activeRun: { runId: string; publishedAt: string | null } | null;
  fallbackExists: boolean;
  fallbackWarning: string | null;
}) {
  if (activeRun) {
    return {
      state: "firestore-active",
      activeRunId: activeRun.runId,
      publishedAt: activeRun.publishedAt,
      fallbackReady: fallbackExists,
      fallbackWarning,
    };
  }

  return {
    state: fallbackExists ? "local-fallback-ready" : "blocked",
    activeRunId: null,
    publishedAt: null,
    fallbackReady: fallbackExists,
    fallbackWarning,
  };
}

async function main() {
  const season = getAuctionProductionSeason();
  const envStatus = getAuctionProductionEnvStatus();
  const missingRequiredEnv = envStatus
    .filter((entry) => entry.requiredInProduction && !entry.present)
    .map((entry) => entry.name);
  const [
    health,
    valueStatus,
    adpStatus,
    valueFallbackExists,
    adpFallbackExists,
    deployed,
  ] = await Promise.all([
    readAuctionProductionHealth(),
    readAuctionValueStatus(season),
    readAuctionAdpStatus(season),
    fileExists("data/auction/generated/masterview-2026.json"),
    fileExists("data/auction/adp/generated/adp-consensus-2026.json"),
    runDeployedChecks(),
  ]);
  const valueRuntime = summarizeSourceStatus({
    activeRun: valueStatus.activeRun,
    fallbackExists: valueFallbackExists,
    fallbackWarning: valueStatus.fallbackWarning,
  });
  const adpRuntime = summarizeSourceStatus({
    activeRun: adpStatus.activeRun,
    fallbackExists: adpFallbackExists,
    fallbackWarning: adpStatus.fallbackWarning,
  });
  const bucketVerified =
    health.storageBucket === EXPECTED_AUCTION_STORAGE_BUCKET &&
    health.storageReachable;
  const ok =
    missingRequiredEnv.length === 0 &&
    health.firestoreReachable &&
    bucketVerified &&
    health.auctionValueConfigReachable &&
    health.auctionAdpConfigReachable &&
    health.sleeperRouteReady &&
    valueRuntime.state !== "blocked" &&
    adpRuntime.state !== "blocked" &&
    deployed.ok;

  console.log(
    JSON.stringify(
      {
        ok,
        season,
        deploymentModel:
          "Firebase Hosting framework integration with Next.js SSR backend.",
        environment: {
          nodeEnv: process.env.NODE_ENV ?? "development",
          ...getAuctionProductionSourceModes(),
          missingRequiredEnv,
          envStatus,
        },
        firebase: {
          projectId: health.firebaseProjectId,
          storageBucket: health.storageBucket,
          expectedStorageBucket: EXPECTED_AUCTION_STORAGE_BUCKET,
          bucketVerified,
          firestoreReachable: health.firestoreReachable,
          storageReachable: health.storageReachable,
        },
        values: valueRuntime,
        adp: adpRuntime,
        sleeper: {
          routeReady: health.sleeperRouteReady,
        },
        health,
        deployed,
      },
      null,
      2
    )
  );

  if (!ok) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
