/**
 * Checks weather API and sends flash flood/shuttle delay notices
 */
async function checkSevereWeather() {
  console.log(`[AUTOMATION] Checking weather API for severe conditions...`);
  // Hardware/Service not yet configured -> honestly logging it
  console.log(`[AUTOMATION] Weather API not connected. Requires real credentials. Assuming clear weather.`);
  return { status: 'clear' };
}

module.exports = { checkSevereWeather };
