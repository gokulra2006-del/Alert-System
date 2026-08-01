const { db, admin } = require('./firebaseClient');

const COLLECTION = 'incident_reports';

/**
 * Create a new incident report
 */
async function createIncident(data) {
  if (!db) throw new Error('Firestore not initialized');
  const docRef = await db.collection(COLLECTION).add({
    ...data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return docRef.id;
}

/**
 * Get an incident by ID
 */
async function getIncident(id) {
  if (!db) throw new Error('Firestore not initialized');
  const doc = await db.collection(COLLECTION).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

/**
 * Update an incident
 */
async function updateIncident(id, updates) {
  if (!db) throw new Error('Firestore not initialized');
  await db.collection(COLLECTION).doc(id).update({
    ...updates,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
}

/**
 * Get incidents by status
 */
async function getIncidentsByStatus(status) {
  if (!db) return [];
  const snapshot = await db.collection(COLLECTION).where('status', '==', status).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

module.exports = {
  createIncident,
  getIncident,
  updateIncident,
  getIncidentsByStatus
};
