const { db, admin } = require('./firebaseClient');

const COLLECTION = 'wellness_checkins';

/**
 * Create a new wellness check-in
 */
async function createCheckin(data) {
  if (!db) throw new Error('Firestore not initialized');
  
  // Note: Data is anonymized before reaching this point or stripped by caller
  const docRef = await db.collection(COLLECTION).add({
    ...data,
    timestamp: admin.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

/**
 * Get aggregated trends (anonymized)
 */
async function getAggregatedTrends(days = 7) {
  if (!db) return [];
  const dateLimit = new Date();
  dateLimit.setDate(dateLimit.getDate() - days);
  
  const snapshot = await db.collection(COLLECTION)
    .where('timestamp', '>=', dateLimit)
    .get();
    
  // Return just the relevant anonymized data
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      moodScore: data.moodScore,
      stressLevel: data.stressLevel,
      timestamp: data.timestamp
    };
  });
}

module.exports = {
  createCheckin,
  getAggregatedTrends
};
