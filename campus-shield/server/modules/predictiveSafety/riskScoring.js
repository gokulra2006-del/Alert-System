/**
 * Calculates a risk score for a given zone based on incidents, patrol gaps, and time.
 * @param {string} zone 
 * @returns {number} 1 to 5
 */
async function calculateRiskScore(zone) {
  // In a real implementation, this would fetch incidents and patrol logs for the zone
  // and run a heuristic or ML model to determine risk.
  
  const hour = new Date().getHours();
  let baseScore = 2; // Default low risk

  if (hour >= 22 || hour <= 4) {
    baseScore += 1.5; // Higher risk at night
  }

  if (zone === 'North Campus') {
    baseScore += 1; // Historically higher risk zone
  }

  const finalScore = Math.min(5, Math.max(1, Math.round(baseScore)));
  console.log(`[PREDICTIVE SAFETY] Risk score for ${zone}: ${finalScore}/5`);
  return finalScore;
}

module.exports = { calculateRiskScore };
