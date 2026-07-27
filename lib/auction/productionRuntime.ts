import { firestore, getFirebaseAdminDiagnostics, getFirebaseStorageBucket } from "../firebaseAdmin";
import { LEAGUE_IDS } from "../sleeper";
import { readAuctionAdpStatus } from "./adpRefreshService";
import { readAuctionValueStatus } from "./valueRefreshService";

export type AuctionProductionSourceMode = "firestore" | "local";
export type AuctionProductionOverallState = "READY" | "PARTIAL" | "BLOCKED";

export type AuctionProductionHealthResponse = {
  ok: boolean;
  environment: string;
  firebaseProjectId: string | null;
  storageBucket: string | null;
  firestoreReachable: boolean;
  storageReachable: boolean;
  auctionValueConfigReachable: boolean;
  auctionAdpConfigReachable: boolean;
  sleeperRouteReady: boolean;
  timestamp: string;
  season: number;
  valueSourceMode: AuctionProductionSourceMode;
  adpSourceMode: AuctionProductionSourceMode;
  issues: string[];
};

export type AuctionProductionEnvVarStatus = {
  name: string;
  requiredInProduction: boolean;
  present: boolean;
  public: boolean;
  description: string;
};

const DEFAULT_AUCTION_SEASON = 2026;
export const EXPECTED_AUCTION_STORAGE_BUCKET =
  "river-city-ffl.firebasestorage.app";

const AUCTION_PRODUCTION_ENV_SCHEMA: Omit<
  AuctionProductionEnvVarStatus,
  "present"
>[] = [
  {
    name: "FIREBASE_PROJECT_ID",
    requiredInProduction: true,
    public: false,
    description: "Firebase Admin project ID.",
  },
  {
    name: "FIREBASE_CLIENT_EMAIL",
    requiredInProduction: true,
    public: false,
    description: "Firebase Admin service account client email.",
  },
  {
    name: "FIREBASE_PRIVATE_KEY",
    requiredInProduction: true,
    public: false,
    description: "Firebase Admin service account private key.",
  },
  {
    name: "FIREBASE_STORAGE_BUCKET",
    requiredInProduction: false,
    public: false,
    description:
      "Optional server override for the authoritative Firebase Storage bucket.",
  },
  {
    name: "AUCTION_ALLOWED_EMAILS",
    requiredInProduction: true,
    public: false,
    description: "Comma-separated commissioner email allowlist.",
  },
  {
    name: "AUCTION_VALUES_SOURCE",
    requiredInProduction: false,
    public: false,
    description: "Use firestore in production to load published auction values.",
  },
  {
    name: "AUCTION_ADP_SOURCE",
    requiredInProduction: false,
    public: false,
    description: "Use firestore in production to load published ADP consensus.",
  },
  {
    name: "AUCTION_SEASON",
    requiredInProduction: false,
    public: false,
    description: "Auction season. Defaults to 2026.",
  },
  {
    name: "AUCTION_SESSION_COOKIE_NAME",
    requiredInProduction: false,
    public: false,
    description: "Optional override for the Firebase session cookie name.",
  },
  {
    name: "AUCTION_SESSION_MAX_AGE_DAYS",
    requiredInProduction: false,
    public: false,
    description: "Optional Firebase session cookie duration override.",
  },
  {
    name: "SCRAPER_SECRET_KEY",
    requiredInProduction: false,
    public: false,
    description: "Only required for legacy maintenance scraper endpoints.",
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_API_KEY",
    requiredInProduction: true,
    public: true,
    description: "Browser Firebase Auth API key.",
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    requiredInProduction: true,
    public: true,
    description: "Browser Firebase Auth domain.",
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    requiredInProduction: true,
    public: true,
    description: "Browser Firebase project ID.",
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    requiredInProduction: true,
    public: true,
    description:
      "Authoritative Firebase Storage bucket already used by browser config.",
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    requiredInProduction: false,
    public: true,
    description: "Browser Firebase app metadata.",
  },
  {
    name: "NEXT_PUBLIC_FIREBASE_APP_ID",
    requiredInProduction: true,
    public: true,
    description: "Browser Firebase app ID.",
  },
];

function hasValue(value: string | undefined) {
  return Boolean(value?.trim());
}

function isProductionEnvironment() {
  return process.env.NODE_ENV === "production";
}

function readConfiguredSourceMode(
  value: string | undefined
): AuctionProductionSourceMode {
  if (value === "local") return "local";
  if (value === "firestore") return "firestore";

  return isProductionEnvironment() ? "firestore" : "local";
}

export function getAuctionProductionSeason() {
  const parsedSeason = Number(process.env.AUCTION_SEASON ?? DEFAULT_AUCTION_SEASON);

  return Number.isInteger(parsedSeason) && parsedSeason > 0
    ? parsedSeason
    : DEFAULT_AUCTION_SEASON;
}

export function getAuctionProductionSourceModes() {
  return {
    valueSourceMode: readConfiguredSourceMode(process.env.AUCTION_VALUES_SOURCE),
    adpSourceMode: readConfiguredSourceMode(process.env.AUCTION_ADP_SOURCE),
  };
}

export function getAuctionProductionEnvStatus() {
  return AUCTION_PRODUCTION_ENV_SCHEMA.map((entry) => ({
    ...entry,
    present: hasValue(process.env[entry.name]),
  }));
}

export function getMissingAuctionProductionEnvVars() {
  return getAuctionProductionEnvStatus()
    .filter((entry) => entry.requiredInProduction && !entry.present)
    .map((entry) => entry.name);
}

async function checkFirestoreReachable() {
  try {
    await firestore.collection("_auction_health").limit(1).get();
    return true;
  } catch {
    return false;
  }
}

async function checkStorageReachable() {
  try {
    const [exists] = await getFirebaseStorageBucket().exists();
    return exists;
  } catch {
    return false;
  }
}

export async function readAuctionProductionHealth(): Promise<AuctionProductionHealthResponse> {
  const season = getAuctionProductionSeason();
  const diagnostics = getFirebaseAdminDiagnostics();
  const { valueSourceMode, adpSourceMode } = getAuctionProductionSourceModes();
  const [
    firestoreReachable,
    storageReachable,
    valueStatus,
    adpStatus,
  ] = await Promise.all([
    checkFirestoreReachable(),
    checkStorageReachable(),
    readAuctionValueStatus(season),
    readAuctionAdpStatus(season),
  ]);
  const missingEnvVars = isProductionEnvironment()
    ? getMissingAuctionProductionEnvVars()
    : [];
  const auctionValueConfigReachable = valueStatus.fallbackWarning === null;
  const auctionAdpConfigReachable = adpStatus.fallbackWarning === null;
  const sleeperRouteReady = Boolean(LEAGUE_IDS[season]);
  const issues = [
    ...missingEnvVars.map((name) => `Missing production env var: ${name}.`),
    ...(!firestoreReachable ? ["Firestore is not reachable."] : []),
    ...(!storageReachable ? ["Firebase Storage bucket is not reachable."] : []),
    ...(diagnostics.storageBucket !== EXPECTED_AUCTION_STORAGE_BUCKET
      ? [
          `Firebase Storage bucket should be ${EXPECTED_AUCTION_STORAGE_BUCKET}.`,
        ]
      : []),
    ...(!auctionValueConfigReachable
      ? ["Auction value config/status is not reachable."]
      : []),
    ...(!auctionAdpConfigReachable
      ? ["Auction ADP config/status is not reachable."]
      : []),
    ...(!sleeperRouteReady
      ? [`Sleeper league ID is not configured for ${season}.`]
      : []),
  ];

  return {
    ok: issues.length === 0,
    environment: diagnostics.environment,
    firebaseProjectId: diagnostics.projectId,
    storageBucket: diagnostics.storageBucket,
    firestoreReachable,
    storageReachable,
    auctionValueConfigReachable,
    auctionAdpConfigReachable,
    sleeperRouteReady,
    timestamp: new Date().toISOString(),
    season,
    valueSourceMode,
    adpSourceMode,
    issues,
  };
}
