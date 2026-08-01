const { triggerSOS } = require('../incidentResponse/sosFlow');

/**
 * Handles a panic button press from the mobile app
 */
async function handlePanicButton(studentId, location, audioUrl) {
  console.log(`[STUDENT APP] Panic Button pressed by ${studentId} at ${JSON.stringify(location)}`);
  
  // Triggers the central SOS flow
  return await triggerSOS({ studentId, location, audioUrl });
}

module.exports = { handlePanicButton };
