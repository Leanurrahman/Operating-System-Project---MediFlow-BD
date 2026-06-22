// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";
// import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
// import { getStorage } from "firebase/storage";
// import { getAnalytics, isSupported } from "firebase/analytics";
// import firebaseConfig from "../firebase-applet-config.json";

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);

// // Initialize Services with crucial databaseId specification
// export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
// export const auth = getAuth(app);
// export const storage = getStorage(app);

// // Safe Analytics Initialization for server-side or sandbox frame compatibility
// export let analytics = null;
// isSupported().then((supported) => {
//   if (supported) {
//     analytics = getAnalytics(app);
//   }
// }).catch((err) => {
//   console.log("Analytics loading bypassed in current sandbox context.", err);
// });

// /**
//  * Connection Validation (Skill Directive)
//  * Verifies connection dynamically on initial load.
//  */
// async function testConnection() {
//   try {
//     await getDocFromServer(doc(db, "test", "connection"));
//   } catch (error) {
//     if (error instanceof Error && error.message.includes("client is offline")) {
//       console.error("Please check your Firebase configuration or connection.");
//     }
//   }
// }
// testConnection();

// // --- FIRESTORE CUSTOM REACTIONARY ERROR HANDLER ---
// export const OperationType = {
//   CREATE: "create",
//   UPDATE: "update",
//   DELETE: "delete",
//   LIST: "list",
//   GET: "get",
//   WRITE: "write",
// };

// /**
//  * Handles Firestore error by packaging with context metadata and throwing JSON string error
//  */
// export function handleFirestoreError(error, operationType, path) {
//   const errInfo = {
//     error: error instanceof Error ? error.message : String(error),
//     authInfo: {
//       userId: auth.currentUser?.uid,
//       email: auth.currentUser?.email,
//       emailVerified: auth.currentUser?.emailVerified,
//       isAnonymous: auth.currentUser?.isAnonymous,
//       tenantId: auth.currentUser?.tenantId,
//       providerInfo: auth.currentUser?.providerData?.map(provider => ({
//         providerId: provider.providerId,
//         email: provider.email,
//       })) || []
//     },
//     operationType,
//     path
//   };
//   console.error("Firestore Error: ", JSON.stringify(errInfo));
//   throw new Error(JSON.stringify(errInfo));
// }

// export default app;


import { getAnalytics, isSupported } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { doc, getDocFromServer, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export let analytics = null;

isSupported()
  .then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  })
  .catch(() => {
    console.log("Analytics loading bypassed.");
  });

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    console.error("Firebase connection check failed:", error);
  }
}

testConnection();

export const OperationType = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LIST: "list",
  GET: "get",
  WRITE: "write",
};

export function handleFirestoreError(error, operationType, path) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };

  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default app;