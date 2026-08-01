const incidentReports = require('../../firebaseBridge/incidentReports');

/**
 * Normalizes incoming payload from multiple channels into a single schema
 * @param {string} source - e.g., 'WHATSAPP', 'SMS', 'KIOSK'
 * @param {Object} payload - The raw payload from the webhook
 */
async function processIntake(source, payload) {
  let normalizedData = {
    source: source,
    reporterId: null,
    location: null,
    severity: 'unassigned', // AI can update this later
    status: 'new',
    description: '',
    rawPayload: payload // Store original for debugging
  };

  switch(source) {
    case 'WHATSAPP':
      normalizedData.reporterId = payload.From; // phone number
      normalizedData.description = payload.Body;
      break;
    case 'SMS':
      normalizedData.reporterId = payload.From;
      normalizedData.description = payload.Body;
      break;
    case 'KIOSK':
      normalizedData.location = payload.kioskLocation;
      normalizedData.description = payload.message;
      break;
    default:
      normalizedData.description = JSON.stringify(payload);
  }

  // Write to Firebase
  const incidentId = await incidentReports.createIncident(normalizedData);
  console.log(`[MULTI-CHANNEL INTAKE] Created Incident ${incidentId} from source ${source}`);
  
  return incidentId;
}

module.exports = { processIntake };
