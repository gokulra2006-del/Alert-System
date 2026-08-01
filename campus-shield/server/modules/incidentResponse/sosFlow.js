const incidentReports = require('../../firebaseBridge/incidentReports');

/**
 * Handle SOS trigger from mobile app
 * @param {Object} data - Contains studentId, location {lat, lng}, audioUrl, etc.
 */
async function triggerSOS(data) {
  console.log(`[SOS TRIGGERED] Received SOS from student ${data.studentId}`);
  
  // 1. Create incident in Firebase (replaces Taskade)
  const incidentData = {
    source: 'APP_SOS',
    reporterId: data.studentId,
    location: data.location || null,
    severity: 'critical', // Default for SOS
    status: 'new',
    description: 'Emergency SOS activated via Panic Button',
    audioBufferUrl: data.audioUrl || null
  };
  
  const incidentId = await incidentReports.createIncident(incidentData);
  console.log(`[SOS TRIGGERED] Created Incident ${incidentId} with Critical Severity.`);

  // 2. Notify security + nearest patrol officer (Simulated push/SMS here)
  await notifySecurity(incidentId, incidentData);
  
  return { success: true, incidentId };
}

async function notifySecurity(incidentId, data) {
  // Mock notifying security and nearest patrol
  console.log(`[NOTIFY] Alerting Campus Security & nearest patrol for Incident ${incidentId} at ${JSON.stringify(data.location)}`);
  // Real implementation would use Firebase Cloud Messaging or Twilio here.
}

module.exports = { triggerSOS };
