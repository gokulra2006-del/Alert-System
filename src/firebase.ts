import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBDnkDGCILPF7A0Hc6MBb9VS4q36LHENV8",
  authDomain: "alert-system-8033b.firebaseapp.com",
  projectId: "alert-system-8033b",
  storageBucket: "alert-system-8033b.firebasestorage.app",
  messagingSenderId: "761056483768",
  appId: "1:761056483768:web:41cfe2c2f9b9f8ef53d74d",
  measurementId: "G-FJKJW188MM"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
