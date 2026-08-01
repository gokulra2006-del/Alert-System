const incidentReports = require('../../firebaseBridge/incidentReports');

/**
 * Perform a post-mortem on a resolved incident using AI
 * @param {string} incidentId 
 */
async function performPostMortem(incidentId) {
  try {
    const incident = await incidentReports.getIncident(incidentId);
    if (!incident) return;
    
    if (incident.status !== 'resolved') {
      console.log(`[AUDIT] Incident ${incidentId} is not resolved yet.`);
      return;
    }

    console.log(`[AUDIT] Generating AI post-mortem for resolved incident ${incidentId}...`);
    
    // In a real implementation, this would call OpenRouter/Gemini API
    // with the incident description, resolution notes, and timeline.
    const aiSummary = await mockAiCall(incident);
    
    // Archive to lessons learned (Update incident with AI summary)
    await incidentReports.updateIncident(incidentId, {
      postMortemSummary: aiSummary,
      archivedToLessonsLearned: true
    });
    
    console.log(`[AUDIT] Post-mortem saved for Incident ${incidentId}`);
  } catch (err) {
    console.error('[AUDIT] Failed to perform post-mortem:', err.message);
  }
}

async function mockAiCall(incident) {
  return `AI Analysis: The incident reported as "${incident.description}" was resolved. Recommendation: Increase patrol frequency in the reported zone during evening hours.`;
}

module.exports = { performPostMortem };
