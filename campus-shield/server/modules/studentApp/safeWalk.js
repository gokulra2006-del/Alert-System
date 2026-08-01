/**
 * Request a virtual escort (SafeWalk)
 */
async function requestSafeWalk(studentId, startLocation, endLocation) {
  console.log(`[STUDENT APP] SafeWalk requested by ${studentId} from ${JSON.stringify(startLocation)} to ${JSON.stringify(endLocation)}`);
  
  // Create a tracking session in Firebase
  const sessionId = `SW_${Date.now()}`;
  return { sessionId, status: 'tracking_active' };
}

/**
 * Track route deviation or stop-motion
 */
async function updateSafeWalkLocation(sessionId, currentLocation) {
  // Logic to detect if user stopped moving for too long or deviated from route
  // If anomaly detected -> triggerSOS()
  console.log(`[STUDENT APP] SafeWalk ${sessionId} updated location: ${JSON.stringify(currentLocation)}`);
  return { status: 'ok' };
}

module.exports = { requestSafeWalk, updateSafeWalkLocation };
