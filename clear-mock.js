import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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
const db = getFirestore(app);

async function clearMockData() {
  console.log('Fetching incidents...');
  const snapshot = await getDocs(collection(db, 'incidents'));
  let deleted = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    // Delete if it's from the Simulator OR if it's a massive spam (keep only real student ones)
    if (data.reportedBy === 'Simulator' || data.isDemoInjected || !data.reportedBy) {
      await deleteDoc(doc(db, 'incidents', docSnap.id));
      console.log(`Deleted mock incident: ${docSnap.id}`);
      deleted++;
    }
  }

  console.log(`Successfully deleted ${deleted} mock incidents!`);
  process.exit(0);
}

clearMockData();
