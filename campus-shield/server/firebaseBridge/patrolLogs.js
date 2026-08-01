const { db, admin } = require('./firebaseClient');

const COLLECTION = 'patrol_logs';

/**
 * Create a new patrol log
 */
async function createPatrolLog(data) {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = await db.collection(COLLECTION).add({
    ...data,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

/**
 * Get recent patrol logs for a zone
 */
async function getRecentPatrols(zone, limit = 50) {
  if (!db) return [];
  const snapshot = await db.collection(COLLECTION)
    .where('zone', '==', zone)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();
  
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  createPatrolLog,
  getRecentPatrols
};
