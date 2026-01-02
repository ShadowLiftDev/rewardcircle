"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  // Safety: this should only ever run in the browser
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

  app = initializeApp({
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  });

  return app;
}

export function getClientAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export function getClientDb(): Firestore {
  return getFirestore(getFirebaseApp());
}