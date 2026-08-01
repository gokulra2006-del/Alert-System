/**
 * Sends welcome message and safety resources link to new students
 */
async function sendOnboardingWelcome(studentId, phone) {
  console.log(`[AUTOMATION] Sending onboarding welcome SMS to ${phone} for student ${studentId}`);
  // Twilio integration goes here
}

module.exports = { sendOnboardingWelcome };
