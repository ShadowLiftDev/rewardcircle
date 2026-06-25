"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, onAuthStateChanged, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") {
    throw new Error(
      "getFirebaseApp() was called on the server. Use the Admin SDK on the server and firebase-client only in client components.",
    );
  }

  if (app) return app;

  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId =
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  const missing = [
    ["NEXT_PUBLIC_FIREBASE_API_KEY", apiKey],
    ["NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN", authDomain],
    ["NEXT_PUBLIC_FIREBASE_PROJECT_ID", projectId],
    ["NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET", storageBucket],
    ["NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID", messagingSenderId],
    ["NEXT_PUBLIC_FIREBASE_APP_ID", appId],
  ].filter(([, v]) => !v);

  if (missing.length > 0) {
    throw new Error(
      `Firebase client config missing env vars: ${missing
        .map(([k]) => k)
        .join(", ")}.`,
    );
  }

  const firebaseConfig = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };

  app = getApps().length ? getApp() : initializeApp(firebaseConfig);

  return app;
}

export function getClientAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getClientDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const auth = getClientAuth();

  if (auth.currentUser) {
    return auth.currentUser.getIdToken(forceRefresh);
  }

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();

      if (!user) {
        resolve(null);
        return;
      }

      try {
        const token = await user.getIdToken(forceRefresh);
        resolve(token);
      } catch {
        resolve(null);
      }
    });
  });
}