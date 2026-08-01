const { processIntake } = require('../modules/incidentResponse/multiChannelIntake');

/**
 * Express route handler for Kiosk Webhook
 */
module.exports = async (req, res) => {
  try {
    const payload = req.body;
    console.log('[WEBHOOK] Received Kiosk report');
    
    await processIntake('KIOSK', payload);
    
    res.json({ success: true, message: 'Kiosk report processed.' });
  } catch (err) {
    console.error('[WEBHOOK] Error processing Kiosk:', err.message);
    res.status(500).json({ error: 'Internal error' });
  }
};
