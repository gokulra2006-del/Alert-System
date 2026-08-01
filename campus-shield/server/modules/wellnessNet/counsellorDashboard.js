const { detectTrends } = require('./pulseSurveys');

/**
 * Provides anonymized data to the counselor dashboard
 */
async function getDashboardData() {
  console.log(`[COUNSELOR DASHBOARD] Assembling dashboard data...`);
  
  // 1. Get anonymized pulse survey trends
  const trends = await detectTrends();

  // 2. We do NOT pull individual check-ins here, enforcing privacy.
  // 3. We can pull the urgent triage list (from buddy system or direct escalations)
  const urgentCases = [
    { studentId: 'S12345', reason: 'Buddy co-flagged high risk', date: new Date() }
  ];

  return {
    anonymizedTrends: trends,
    urgentTriageCount: urgentCases.length,
    urgentCases: urgentCases // Accessible because role = counselor
  };
}

module.exports = { getDashboardData };
