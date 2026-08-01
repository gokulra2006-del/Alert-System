const { processIntake } = require('../modules/incidentResponse/multiChannelIntake');

/**
 * Express route handler for WhatsApp Webhook (e.g. via Twilio)
 */
module.exports = async (req, res) => {
  try {
    const payload = req.body;
    console.log('[WEBHOOK] Received WhatsApp message');
    
    await processIntake('WHATSAPP', payload);
    
    // Respond to Twilio
    res.set('Content-Type', 'text/xml');
    res.send('<Response><Message>Your report has been received by Campus Shield.</Message></Response>');
  } catch (err) {
    console.error('[WEBHOOK] Error processing WhatsApp:', err.message);
    res.status(500).send('Error');
  }
};
