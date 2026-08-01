const cron = require('node-cron');
const incidentReports = require('../../firebaseBridge/incidentReports');

// Track escalation attempts to avoid infinite loops
const escalationMap = new Map();

/**
 * Starts the real timer queue to check for unassigned/new incidents > 5m
 * Runs every minute
 */
function startEscalationQueue() {
  console.log('[AUTO-ESCALATION] Starting escalation background job (every minute)');
  
  cron.schedule('* * * * *', async () => {
    try {
      const newIncidents = await incidentReports.getIncidentsByStatus('new');
      const now = new Date();
      
      for (const incident of newIncidents) {
        // If the incident has a createdAt timestamp
        if (incident.createdAt && incident.createdAt.toDate) {
          const createdTime = incident.createdAt.toDate();
          const diffMinutes = Math.floor((now - createdTime) / 60000);
          
          if (diffMinutes >= 5) {
            await escalateIncident(incident);
          }
        }
      }
    } catch (err) {
      console.error('[AUTO-ESCALATION] Error running queue:', err.message);
    }
  });
}

async function escalateIncident(incident) {
  if (escalationMap.get(incident.id)) return; // Already escalated
  
  console.log(`[AUTO-ESCALATION] Incident ${incident.id} is "New" for > 5 minutes. Escalating severity...`);
  
  // Bump severity
  const newSeverity = incident.severity === 'critical' ? 'critical' : 'high';
  
  await incidentReports.updateIncident(incident.id, {
    severity: newSeverity,
    escalated: true,
    escalationTime: new Date()
  });
  
  escalationMap.set(incident.id, true);
  console.log(`[AUTO-ESCALATION] Incident ${incident.id} escalated. Retrying notification...`);
  // Here we would re-trigger Twilio/FCM to security supervisor
}

module.exports = { startEscalationQueue, escalateIncident };
