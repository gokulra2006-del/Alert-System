const incidentReports = require('../firebaseBridge/incidentReports');

/**
 * Marks a Silent Witness capture as retained evidence, stopping auto-delete
 */
async function flagAsEvidence(incidentId, userId) {
  console.log(`[EVIDENCE] User ${userId} flagged Incident ${incidentId} as retained evidence.`);
  
  await incidentReports.updateIncident(incidentId, {
    retainedEvidenceFlag: true,
    flaggedBy: userId,
    flaggedAt: new Date()
  });
  
  return true;
}

module.exports = { flagAsEvidence };
