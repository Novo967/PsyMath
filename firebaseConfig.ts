import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { initializeAuth } from 'firebase/auth';
// @ts-ignore - Ignore the TypeScript error, this function exists in the React Native bundle
import { getReactNativePersistence } from 'firebase/auth';

// ============================
// Primary App – psymath-1dd2b (Mobile / React Native)
// ============================
const firebaseConfig = {
  apiKey: "AIzaSyCq18HYBE02OUjrKlc5JgzmiMHOjMU6TjM",
  authDomain: "psymath-1dd2b.firebaseapp.com",
  projectId: "psymath-1dd2b",
  storageBucket: "psymath-1dd2b.firebasestorage.app",
  messagingSenderId: "493324822355",
  appId: "1:493324822355:web:5fa24fffe8067d4c0a63a6",
  measurementId: "G-WTR88S3H1R"
};

const app = initializeApp(firebaseConfig);

// משתמשים ב-initializeAuth יחד עם AsyncStorage
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app);

// ============================
// Secondary App – psymathweb (Web / Next.js project)
// ============================
const psyMathWebConfig = {
  apiKey: "AIzaSyA1_pkZw7Y5FGDd60HYJ_vJj6tCwhZjbLc",
  authDomain: "psymathweb.firebaseapp.com",
  projectId: "psymathweb",
  storageBucket: "psymathweb.firebasestorage.app",
  messagingSenderId: "611578804511",
  appId: "1:611578804511:web:0ec0bfd1c79497c319d82a"
};

const webApp = initializeApp(psyMathWebConfig, "PsyMathWebInstance");

export const webDb = getFirestore(webApp);
export const webAuth = getAuth(webApp);