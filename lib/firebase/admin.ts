// Firebase admin SDK for server-side operations
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
};

export function initAdmin() {
  if (getApps().length <= 0) {
    initializeApp({
      credential: cert(firebaseAdminConfig),
    });
  }
}

export const adminDb = () => {
  initAdmin();
  return getFirestore();
};

export const adminAuth = () => {
  initAdmin();
  return getAuth();
};
