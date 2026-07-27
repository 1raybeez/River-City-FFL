import { config as loadDotenv } from "dotenv";
import admin from "firebase-admin";
import { getStorage } from "firebase-admin/storage";

loadDotenv({ path: ".env.local", quiet: true });
loadDotenv({ quiet: true });

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};
const firebaseRuntimeConfig = readFirebaseRuntimeConfig();
const configuredStorageBucket =
  process.env.FIREBASE_STORAGE_BUCKET ??
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
  firebaseRuntimeConfig?.storageBucket;

function readFirebaseRuntimeConfig() {
  if (!process.env.FIREBASE_CONFIG) return null;

  try {
    return JSON.parse(process.env.FIREBASE_CONFIG) as {
      projectId?: string;
      storageBucket?: string;
    };
  } catch {
    return null;
  }
}

function hasExplicitServiceAccount() {
  return Boolean(
    serviceAccount.project_id &&
      serviceAccount.client_email &&
      serviceAccount.private_key
  );
}

function hasFirebaseRuntimeCredentials() {
  return Boolean(
    process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      firebaseRuntimeConfig?.projectId
  );
}

function initializeFirebaseAdminApp() {
  try {
    return admin.app();
  } catch {
    if (!hasExplicitServiceAccount() && !hasFirebaseRuntimeCredentials()) {
      throw new Error("❌ FIREBASE ERROR: Missing credentials in .env file.");
    }

    return admin.initializeApp({
      ...(hasExplicitServiceAccount()
        ? {
            credential: admin.credential.cert({
              projectId: serviceAccount.project_id,
              clientEmail: serviceAccount.client_email,
              privateKey: serviceAccount.private_key,
            }),
          }
        : { credential: admin.credential.applicationDefault() }),
      ...(configuredStorageBucket
        ? { storageBucket: configuredStorageBucket }
        : {}),
    });
  }
}

const firebaseAdminApp = initializeFirebaseAdminApp();

export const firestore = firebaseAdminApp.firestore();
export const adminAuth = firebaseAdminApp.auth();

export function getFirebaseStorageBucket() {
  return configuredStorageBucket
    ? getStorage(firebaseAdminApp).bucket(configuredStorageBucket)
    : getStorage(firebaseAdminApp).bucket();
}

export function getFirebaseAdminDiagnostics() {
  const storageBucket =
    configuredStorageBucket ?? getStorage(firebaseAdminApp).bucket().name;

  return {
    projectId:
      firebaseAdminApp.options.projectId ??
      serviceAccount.project_id ??
      firebaseRuntimeConfig?.projectId ??
      null,
    storageBucket,
    environment: process.env.NODE_ENV ?? "development",
  };
}
