/**
 * Adjusts security posture based on the academic calendar
 */
function getSemesterPosture() {
  const now = new Date();
  const month = now.getMonth(); // 0 = Jan, 11 = Dec

  let posture = 'Normal';

  // Example logic: May (4) and December (11) are exam weeks
  if (month === 4 || month === 11) {
    posture = 'Elevated - Exam Week';
    console.log(`[SEMESTER AWARENESS] Current posture is ${posture}. Recommending extended library patrol hours.`);
  } 
  // Example logic: October (9) is festival season
  else if (month === 9) {
    posture = 'Elevated - Festival Season';
    console.log(`[SEMESTER AWARENESS] Current posture is ${posture}. Recommending extra crowd control patrols.`);
  } else {
    console.log(`[SEMESTER AWARENESS] Current posture is ${posture}. Standard operating procedures apply.`);
  }

  return posture;
}

module.exports = { getSemesterPosture };
