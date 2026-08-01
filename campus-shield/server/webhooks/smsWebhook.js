const { processIntake } = require('../modules/incidentResponse/multiChannelIntake');

/**
 * Express route handler for SMS Webhook (e.g. via Twilio)
 */
module.exports = async (req, res) => {
  try {
    const payload = req.body;
    console.log('[WEBHOOK] Received SMS message');
    
    await processIntake('SMS', payload);
    
    // Respond to Twilio
    res.set('Content-Type', 'text/xml');
    res.send('<Response><Message>Your SMS report has been received by Campus Shield.</Message></Response>');
  } catch (err) {
    console.error('[WEBHOOK] Error processing SMS:', err.message);
    res.status(500).send('Error');
  }
};
