const { db } = require('./firebaseClient');

const COLLECTION = 'safety_resources';

/**
 * Get all safety resources
 */
async function getSafetyResources() {
  if (!db) return [];
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get specific safety resource by category
 */
async function getResourcesByCategory(category) {
  if (!db) return [];
  const snapshot = await db.collection(COLLECTION)
    .where('category', '==', category)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  getSafetyResources,
  getResourcesByCategory
};
