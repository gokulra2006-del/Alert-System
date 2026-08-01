const { calculateRiskScore } = require('./riskScoring');

/**
 * Uses AI to recommend patrol rotation changes based on risk scores
 */
async function recommendResourceAllocation(zones) {
  console.log('[PREDICTIVE SAFETY] Calculating resource allocation...');
  
  let allocations = [];
  
  for (const zone of zones) {
    const risk = await calculateRiskScore(zone);
    
    if (risk >= 4) {
      allocations.push({ zone, action: 'Double patrol frequency', priority: 'High' });
    } else if (risk >= 3) {
      allocations.push({ zone, action: 'Increase patrol frequency by 20%', priority: 'Medium' });
    } else {
      allocations.push({ zone, action: 'Maintain standard patrol', priority: 'Low' });
    }
  }

  console.log('[PREDICTIVE SAFETY] Recommended allocations:', allocations);
  return allocations;
}

module.exports = { recommendResourceAllocation };
