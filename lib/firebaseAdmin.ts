import "dotenv/config";
import admin from "firebase-admin";

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

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
  });
}

const firebaseAdminApp = admin.app();

export const firestore = firebaseAdminApp.firestore();
export const adminAuth = firebaseAdminApp.auth();
