const incidentReports = require('../../firebaseBridge/incidentReports');

/**
 * Intake for anonymous tips (photo/text)
 */
async function submitAnonymousTip(text, photoUrl) {
  console.log(`[STUDENT APP] Received Anonymous Tip: "${text}"`);
  
  // Strip any metadata (simulated here by not attaching reporterId)
  const incidentData = {
    source: 'ANONYMOUS_APP',
    description: text,
    photoUrl: photoUrl || null,
    severity: 'low', // default triage
    status: 'new'
  };

  const id = await incidentReports.createIncident(incidentData);
  console.log(`[STUDENT APP] Anonymous Tip routed to incident ${id}`);
  return id;
}

module.exports = { submitAnonymousTip };
