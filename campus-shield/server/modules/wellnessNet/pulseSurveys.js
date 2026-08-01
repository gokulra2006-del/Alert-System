const wellnessCheckins = require('../../firebaseBridge/wellnessCheckins');

/**
 * Handle submission of a weekly pulse survey (1 question check-in)
 */
async function submitPulseSurvey(studentId, moodScore, stressLevel) {
  console.log(`[PULSE] Received pulse survey from anonymized source.`);
  
  // Create an anonymized check-in (strip studentId)
  const id = await wellnessCheckins.createCheckin({
    moodScore,
    stressLevel,
    isAnonymized: true
  });

  return id;
}

/**
 * Detects trends in aggregated pulse surveys
 */
async function detectTrends() {
  console.log(`[PULSE] Detecting trends in wellness data...`);
  
  const trends = await wellnessCheckins.getAggregatedTrends(7); // Last 7 days
  
  let totalMood = 0;
  let totalStress = 0;

  for (const t of trends) {
    totalMood += t.moodScore;
    totalStress += t.stressLevel;
  }

  const avgMood = trends.length > 0 ? (totalMood / trends.length).toFixed(1) : 0;
  const avgStress = trends.length > 0 ? (totalStress / trends.length).toFixed(1) : 0;

  console.log(`[PULSE] Over last 7 days: Avg Mood = ${avgMood}/5, Avg Stress = ${avgStress}/5 (Based on ${trends.length} check-ins)`);
  
  return { avgMood, avgStress, count: trends.length };
}

module.exports = { submitPulseSurvey, detectTrends };
