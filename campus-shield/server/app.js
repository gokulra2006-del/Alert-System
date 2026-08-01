const express = require('express');
const cors = require('cors');
const { startEscalationQueue } = require('./modules/incidentResponse/autoEscalation');
const { startRetentionJob } = require('./silentWitness/secureBucket');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Start background jobs
startEscalationQueue();
startRetentionJob();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Campus Shield Server is running' });
});

// We will add webhook routes and API endpoints in subsequent phases
// Example placeholders for Phase 5 webhooks:
// app.post('/webhooks/whatsapp', require('./webhooks/whatsappWebhook'));
// app.post('/webhooks/sms', require('./webhooks/smsWebhook'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Campus Shield API running on port ${PORT}`);
});
