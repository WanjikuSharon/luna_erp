// src/firebase/config.ts

// This code now reads from the Environment Variables you set in Vercel.
// It will fall back to your hard-coded keys ONLY when running locally (npm run dev).
export const firebaseConfig = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-8179379207-d2380",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:92501070043:web:8d57ae9e3bee20c168bcfe",
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDcmOudMleKIIFPLljU4Sr31W6DerISabg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-8179379207-d2380.firebaseapp.com",
  measurementId: "",
  messagingSenderId: "92501070043"
};