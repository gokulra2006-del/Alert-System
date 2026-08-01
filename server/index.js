import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ── Twilio Config ─────────────────────────────────────────────────────────────
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;

let twilioClient = null;
if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
  const twilio = await import('twilio');
  twilioClient = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  console.log('   Twilio: ✅ Loaded');
} else {
  console.warn('   Twilio: ⚠️  Keys not set in server/.env (SMS disabled)');
}

async function sendSMS(to, body) {
  if (!twilioClient) {
    console.warn('[SMS] Twilio not configured — skipping SMS:', body);
    return;
  }
  if (!to || !to.startsWith('+')) {
    console.warn('[SMS] Invalid phone number format (must be E.164 like +91...):', to);
    return;
  }
  try {
    const msg = await twilioClient.messages.create({
      body,
      from: TWILIO_FROM_NUMBER,
      to,
    });
    console.log(`[SMS] ✅ Sent to ${to}: ${msg.sid}`);
  } catch (e) {
    console.error(`[SMS] ❌ Failed to send to ${to}:`, e.message);
  }
}

// ── Firebase Admin SDK for Polling ────────────────────────────────────────
let adminDb = null;
try {
  const admin = await import('firebase-admin');
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
    : path.join(__dirname, 'firebase-service-account.json');

  const { createRequire } = await import('module');
  const require = createRequire(import.meta.url);
  const serviceAccount = require(serviceAccountPath);

  if (!admin.default.apps.length) {
    admin.default.initializeApp({
      credential: admin.default.credential.cert(serviceAccount),
    });
  }
  adminDb = admin.default.firestore();
  console.log('   Firebase Admin: ✅ Connected');
} catch (e) {
  console.warn('   Firebase Admin: ⚠️  Not configured (SMS polling disabled). Add firebase-service-account.json.');
}

// ── SMS Notification Polling ──────────────────────────────────────────────────
// In-memory sets to track already-notified incidents (prevents duplicate SMS)
const notifiedNewIncidents = new Set();
const notifiedEscalations = new Set();
const notifiedLockdowns = new Set();

async function pollFirestoreForNotifications() {
  if (!adminDb || !twilioClient) return;

  try {
    // 1. New incidents → SMS to zone wardens
    const incSnap = await adminDb.collection('incidents')
      .where('status', '==', 'active')
      .get();

    for (const doc of incSnap.docs) {
      const inc = doc.data();
      if (!notifiedNewIncidents.has(doc.id)) {
        notifiedNewIncidents.add(doc.id);
        // Find wardens for this zone
        const wardensSnap = await adminDb.collection('users')
          .where('role', '==', 'warden')
          .where('zone', '==', inc.zone)
          .get();
        for (const wSnap of wardensSnap.docs) {
          const warden = wSnap.data();
          if (warden.phoneNumber) {
            await sendSMS(
              warden.phoneNumber,
              `🚨 Campus Alert: New ${inc.type} incident reported in ${inc.zone} zone. Severity: ${inc.severity}. Open the app to respond immediately.`
            );
          }
        }
      }

      // 2. Escalations → SMS to admins
      if (inc.isEscalated && !notifiedEscalations.has(doc.id)) {
        notifiedEscalations.add(doc.id);
        const adminsSnap = await adminDb.collection('users')
          .where('role', '==', 'admin')
          .get();
        for (const aSnap of adminsSnap.docs) {
          const admin = aSnap.data();
          if (admin.phoneNumber) {
            await sendSMS(
              admin.phoneNumber,
              `⚡ ESCALATION ALERT: A ${inc.type} incident in ${inc.zone} zone has been escalated to CRITICAL by the Warden. Immediate Admin action required.`
            );
          }
        }
      }
    }

    // 3. Lockdowns → SMS to students in that zone
    const zonesSnap = await adminDb.collection('zones')
      .where('isLockdown', '==', true)
      .get();

    for (const zDoc of zonesSnap.docs) {
      const zoneId = zDoc.id;
      if (!notifiedLockdowns.has(zoneId)) {
        notifiedLockdowns.add(zoneId);
        const studentsSnap = await adminDb.collection('users')
          .where('role', '==', 'student')
          .where('zone', '==', zoneId)
          .get();
        for (const sSnap of studentsSnap.docs) {
          const student = sSnap.data();
          if (student.phoneNumber) {
            await sendSMS(
              student.phoneNumber,
              `🔒 LOCKDOWN ALERT [★ ${zoneId.toUpperCase()} ZONE]: Campus lockdown in effect. Stay in place, lock doors, do not leave until all-clear. Open the Campus Alert app for updates.`
            );
          }
        }
      } 
    }

    // Clear resolved lockdown notifications (so re-locking will re-notify)
    const allZonesSnap = await adminDb.collection('zones').get();
    for (const zDoc of allZonesSnap.docs) {
      if (!zDoc.data().isLockdown) {
        notifiedLockdowns.delete(zDoc.id);
      }
    }

  } catch (e) {
    console.error('[SMS Polling] Error:', e.message);
  }
}

// Poll every 5 seconds
if (adminDb && twilioClient) {
  setInterval(pollFirestoreForNotifications, 5000);
  console.log('   SMS Polling: ✅ Active (every 5s)');
}

// ── Manual SMS Trigger Endpoints ─────────────────────────────────────────────
app.post('/api/notify/test-sms', async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'phoneNumber required' });
  await sendSMS(phoneNumber, '🚨 TEST SMS: Campus Alert System is connected and working!');
  res.json({ sent: true });
});


// ── OpenRouter Config ─────────────────────────────────────────────────────────
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE = 'https://openrouter.ai/api/v1/chat/completions';

// 4 AI models in priority order — if one fails, the next is tried automatically
const AI_MODELS = [
  'anthropic/claude-3.5-sonnet',
  'openai/gpt-4o-mini',
  'google/gemini-flash-1.5',
  'meta-llama/llama-3.1-8b-instruct',
];

/**
 * Calls OpenRouter with automatic model fallback.
 * Tries each model in AI_MODELS until one succeeds.
 */
async function callAI({ systemPrompt, userPrompt, jsonMode = false }) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured in server/.env');
  }

  let lastError;
  for (const model of AI_MODELS) {
    try {
      console.log(`[AI] Trying model: ${model}`);
      const body = {
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 512,
      };

      if (jsonMode) {
        body.response_format = { type: 'json_object' };
      }

      const resp = await fetch(OPENROUTER_BASE, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://vit-campus-alert.local',
          'X-Title': 'VIT Campus Emergency Command Center',
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`${resp.status}: ${errText}`);
      }

      const data = await resp.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error('Empty response from model');

      console.log(`[AI] Success with model: ${model}`);
      return { content, model };
    } catch (err) {
      console.warn(`[AI] Model ${model} failed: ${err.message}`);
      lastError = err;
    }
  }
  throw new Error(`All AI models failed. Last error: ${lastError?.message}`);
}

// ── POST /api/ai/classify ────────────────────────────────────────────────────
app.post('/api/ai/classify', async (req, res) => {
  try {
    const { reportText } = req.body;
    if (!reportText) return res.status(400).json({ error: 'reportText is required' });

    const { content, model } = await callAI({
      systemPrompt: `You are an emergency triage AI for a university campus.
Classify the student report into emergency type and severity.
Return ONLY a valid JSON object with keys: type, severity, confidence (0.0-1.0), reasoning.
type must be one of: fire, medical, security, hazmat, elevator, other
severity must be one of: low, medium, high, critical`,
      userPrompt: `Student Report: "${reportText}"`,
      jsonMode: true,
    });

    const result = JSON.parse(content);
    res.json({ ...result, model });
  } catch (error) {
    console.error('classify error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/ai/summarize ───────────────────────────────────────────────────
app.post('/api/ai/summarize', async (req, res) => {
  try {
    const { incidentsData } = req.body;

    const { content, model } = await callAI({
      systemPrompt: `You are an emergency command center AI for a university campus.
Write a concise, professional 3-sentence situation report for the Chief Security Officer.
Focus on critical hotspots, ongoing operations, and overall campus stability.
Do NOT use bullet points or markdown lists. Plain text only.`,
      userPrompt: `Active Incidents:\n${JSON.stringify(incidentsData, null, 2)}`,
    });

    res.json({ summary: content, model });
  } catch (error) {
    console.error('summarize error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/ai/precautions ────────────────────────────────────────────────
app.post('/api/ai/precautions', async (req, res) => {
  try {
    const { emergencyType } = req.body;

    const { content, model } = await callAI({
      systemPrompt: `You are an emergency safety AI for a university campus.
A student just triggered a ${emergencyType} emergency.
Return ONLY a valid JSON object with key "precautions" containing an array of exactly 3 strings.
Each string must be a short, actionable safety instruction (max 15 words).
Example: {"precautions": ["Stay low and move toward exits.", "Do not use elevators.", "Call for help loudly."]}`,
      userPrompt: `Generate 3 immediate safety precautions for a ${emergencyType} emergency.`,
      jsonMode: true,
    });

    const parsed = JSON.parse(content);
    const precautions = Array.isArray(parsed) ? parsed : (parsed.precautions || []);
    res.json({ precautions, model });
  } catch (error) {
    console.error('precautions error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/ai/risk-analysis ──────────────────────────────────────────────
app.post('/api/ai/risk-analysis', async (req, res) => {
  try {
    const { zone, incidents, pressure } = req.body;

    const { content, model } = await callAI({
      systemPrompt: `You are a campus safety risk analyst AI.
Analyze a campus zone and its current incidents.
Return ONLY a valid JSON object with keys:
- riskLevel: "low" | "medium" | "high" | "critical"
- recommendation: a single actionable recommendation sentence (max 20 words)
- estimatedResolutionMinutes: number (estimated minutes to resolve)`,
      userPrompt: `Zone: ${zone}\nPressure: ${Math.round(pressure * 100)}%\nActive Incidents: ${JSON.stringify(incidents)}`,
      jsonMode: true,
    });

    const result = JSON.parse(content);
    res.json({ ...result, model });
  } catch (error) {
    console.error('risk-analysis error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/ai/action-plan ────────────────────────────────────────────────
app.post('/api/ai/action-plan', async (req, res) => {
  try {
    const { incident } = req.body;

    const { content, model } = await callAI({
      systemPrompt: `You are an elite tactical AI for campus emergencies.
Generate a 3-step action plan for a campus Warden addressing this incident.
Return ONLY a valid JSON object with a "steps" array containing 3 objects: { title, detail }.
Make it sound highly professional, urgent, and specific.`,
      userPrompt: `Incident Data: ${JSON.stringify(incident)}`,
      jsonMode: true,
    });

    const result = JSON.parse(content);
    res.json({ ...result, model });
  } catch (error) {
    console.error('action-plan error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/ai/draft-broadcast ────────────────────────────────────────────
app.post('/api/ai/draft-broadcast', async (req, res) => {
  try {
    const { prompt, type } = req.body;
    if (!prompt) return res.status(400).json({ error: 'prompt is required' });

    const { content, model } = await callAI({
      systemPrompt: `You are the automated emergency communications AI for a university campus.
Your job is to take a rough prompt from a security warden and turn it into a calm, professional, and clear emergency SMS broadcast.
Keep it under 160 characters if possible. It must sound highly official.
Return ONLY a valid JSON object with key "draft" containing the text string.`,
      userPrompt: `Warden Prompt: "${prompt}"\nBroadcast Type: ${type}`,
      jsonMode: true,
    });

    const result = JSON.parse(content);
    res.json({ draft: result.draft, model });
  } catch (error) {
    console.error('draft-broadcast error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/ai/generate-report ────────────────────────────────────────────
app.post('/api/ai/generate-report', async (req, res) => {
  try {
    const { incident } = req.body;
    if (!incident) return res.status(400).json({ error: 'incident data is required' });

    const { content, model } = await callAI({
      systemPrompt: `You are the automated compliance AI for a university campus.
Write a formal, comprehensive Post-Incident Report based on the provided incident data.
The report should include:
- Executive Summary
- Incident Timeline
- Impact & Response
- Recommended Preventative Measures
Format the response in cleanly structured Markdown. Do not use JSON.`,
      userPrompt: `Incident Data:\n${JSON.stringify(incident, null, 2)}`,
      jsonMode: false,
    });

    res.json({ report: content, model });
  } catch (error) {
    console.error('generate-report error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── POST /api/iot/sos ───────────────────────────────────────────────────────
app.post('/api/iot/sos', async (req, res) => {
  try {
    const { poleId, zone, coordinates } = req.body;
    // In a real deployment, this pushes a critical incident to Firestore
    console.log(`[IoT] 🚨 Emergency triggered at Smart Pole ${poleId} in ${zone} zone.`);
    res.json({ success: true, message: 'IoT SOS registered and dispatched.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', models: AI_MODELS, hasKey: !!OPENROUTER_API_KEY });
});

app.listen(port, () => {
  console.log(`\n🚨 Campus Alert Backend on port ${port}`);
  console.log(`   OpenRouter Key: ${OPENROUTER_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`   Twilio SMS: ${twilioClient ? '✅ Enabled' : '⚠️  Disabled (add keys to server/.env)'}`);
  console.log(`   AI Models (in priority): ${AI_MODELS.join(' → ')}\n`);
});

export default app;
