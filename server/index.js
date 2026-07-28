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

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', models: AI_MODELS, hasKey: !!OPENROUTER_API_KEY });
});

app.listen(port, () => {
  console.log(`\n🚨 Campus Alert Backend on port ${port}`);
  console.log(`   OpenRouter Key: ${OPENROUTER_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
  console.log(`   AI Models (in priority): ${AI_MODELS.join(' → ')}\n`);
});

export default app;
