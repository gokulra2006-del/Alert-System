/**
 * Optional wearable data integration
 * Returns 'not connected' honestly as per requirements.
 */
async function fetchWearableData(studentId) {
  console.log(`[WEARABLE] Attempting to fetch sleep/stress correlation data for ${studentId}...`);
  
  // Hardware/Service not yet configured
  return {
    status: 'error',
    message: 'Wearable integration not connected. Requires real API credentials.'
  };
}

module.exports = { fetchWearableData };
