import "dotenv/config";
import admin from "firebase-admin";

let app: admin.app.App | null = null;

const serviceAccount = {
  project_id: process.env.FIREBASE_PROJECT_ID,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

if (!admin.apps.length) {
  // This check fails if the names in .env don't match the names above
  if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error("❌ FIREBASE ERROR: Missing credentials in .env file.");
  }

  app = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
} else {
  app = admin.app();
}

export const firestore = admin.firestore();