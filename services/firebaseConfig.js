import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  getAuth,
  initializeAuth,
  getReactNativePersistence,
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Firebase credentials read from EXPO_PUBLIC_* env vars at build time.
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_IOS_APP_ID 
};

// Reuse the existing app on Fast Refresh to avoid double-init errors.
const hasExistingApp = getApps().length > 0;
const app = hasExistingApp ? getApp() : initializeApp(firebaseConfig);

// This tells Firebase to "remember" the user even if the app closes
export const auth = hasExistingApp
  ? getAuth(app)
  : initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });

// Shared Firestore client for chats, messages, and user preferences.
export const db = getFirestore(app);
