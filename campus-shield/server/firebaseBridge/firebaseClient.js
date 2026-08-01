const admin = require('firebase-admin');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Try to initialize Firebase Admin SDK
try {
  // If you provide a serviceAccountKey.json later, it should be placed in the server directory
  // For now, we will attempt to initialize with default credentials or fallback to a mock mode
  // if no credentials are provided.
  if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
    const serviceAccount = require(path.resolve(__dirname, '..', process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('Firebase Admin initialized with service account.');
  } else {
    // Attempt default initialization (might fail if GOOGLE_APPLICATION_CREDENTIALS is not set)
    admin.initializeApp();
    console.log('Firebase Admin initialized with default credentials.');
  }
} catch (error) {
  console.warn('⚠️ Firebase Admin initialization failed. Check credentials.', error.message);
}

const db = admin.firestore ? admin.firestore() : null;

module.exports = { admin, db };
