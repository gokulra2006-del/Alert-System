/**
 * Sends a thank-you + satisfaction survey after incident resolution
 */
async function sendResolutionThankYou(studentId, incidentId) {
  console.log(`[AUTOMATION] Sending thank-you and survey for resolved Incident ${incidentId} to user ${studentId}`);
  // In reality, send an email or SMS via Twilio
}

module.exports = { sendResolutionThankYou };
