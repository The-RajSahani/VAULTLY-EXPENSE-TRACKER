// ============================================================
// FIREBASE CONFIG
// Replace the values below with your own Firebase project config.
// Get these from: Firebase Console → Project Settings → General → Your apps → SDK setup
// ============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// TODO: paste your Firebase project config here
const firebaseConfig = {
  apiKey: "AIzaSyDazZTY6lu4HUTjhUgVLNdmG9ozLptpHlw",
  authDomain: "vaultly-5434b.firebaseapp.com",
  projectId: "vaultly-5434b",
  storageBucket: "vaultly-5434b.firebasestorage.app",
  messagingSenderId: "859299843059",
  appId: "1:859299843059:web:6fc8fa88757c411ad52086"
  
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
export { setPersistence, browserLocalPersistence, browserSessionPersistence };
