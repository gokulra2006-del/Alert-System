/**
 * Processes 1s-interval GPS captures during an active incident
 */
async function appendGPSStream(incidentId, locationArray) {
  console.log(`[SILENT WITNESS] Appended ${locationArray.length} GPS points to incident ${incidentId}`);
  // In reality, this appends to a subcollection in Firestore to build a track history
  return true;
}

module.exports = { appendGPSStream };
