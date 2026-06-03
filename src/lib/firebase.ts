import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyDDRI-rT-x9JBd3eslsuUrepmGw2ewWrKg",
  authDomain: "abrahemhotel.firebaseapp.com",
  projectId: "abrahemhotel",
  storageBucket: "abrahemhotel.firebasestorage.app",
  messagingSenderId: "168583384448",
  appId: "1:168583384448:web:16ffaed08d2f953fb80565"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
