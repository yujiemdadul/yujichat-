import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAMWlepchHXxVIh9IxuixAgqeKvOx9h7Y0",
  authDomain: "weebchat-9bdac.firebaseapp.com",
  databaseURL: "https://weebchat-9bdac-default-rtdb.firebaseio.com",
  projectId: "weebchat-9bdac",
  storageBucket: "weebchat-9bdac.firebasestorage.app",
  messagingSenderId: "522128818928",
  appId: "1:522128818928:web:0335e7dd7f027b707ab835",
  measurementId: "G-RCNH2Q4YN1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const storage = getStorage(app);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
