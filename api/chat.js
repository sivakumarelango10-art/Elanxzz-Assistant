/**
 * Vercel Serverless Function — Unified AI Chat Handler
 * Handles Gemini (3.8 Flash), Groq (with multi-key rotation), and OpenRouter.
 */

const GROQ_MODELS = [
  'qwen/qwen3.8-27b',
  'groq/compound-mini',
  'qwen/qwen3.6-27b',
  'openai/gpt-oss-120b'
];

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

const OPENROUTER_MODELS = [
  'google/gemma-4-26b-a4b-it:free',
  'google/gemma-3-27b-it:free',
  'nvidia/nemotron-3-super:free',
  'openrouter/free'
];

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const { engine = 'gemini', messages = [] } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ success: false, error: 'Messages array is required' });
  }

  try {
    // ── 1. GEMINI HANDLER ──────────────────────────────────────────────────
    if (engine === 'gemini') {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'GEMINI_API_KEY is not configured on Vercel' });
      }

      const contents = messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content || "Result processed." }]
        }));

      const systemMessage = messages.find(m => m.role === 'system');
      const systemInstruction = systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined;

      let lastError = null;
      for (const model of GEMINI_MODELS) {
        try {
          const bodyPayload = { contents };
          if (systemInstruction) bodyPayload.systemInstruction = systemInstruction;

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(bodyPayload)
            }
          );

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            lastError = errData.error?.message || `Gemini status ${response.status}`;
            continue;
          }

          const data = await response.json();
          const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (reply) {
            return res.status(200).json({ success: true, reply, model });
          }
        } catch (err) {
          lastError = err.message;
        }
      }

      return res.status(502).json({ success: false, error: lastError || 'All Gemini models failed' });
    }

    // ── 2. GROQ HANDLER (Multi-Key Rotation Pool) ──────────────────────────
    if (engine === 'groq') {
      const keys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3
      ].filter(Boolean);

      if (keys.length === 0) {
        return res.status(500).json({ success: false, error: 'GROQ_API_KEY is not configured on Vercel' });
      }

      const cleanMessages = messages.map(m => ({ role: m.role, content: m.content }));
      let lastError = null;

      for (const key of keys) {
        for (const model of GROQ_MODELS) {
          try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model,
                messages: cleanMessages,
                temperature: 0.7
              })
            });

            if (!response.ok) {
              const errData = await response.json().catch(() => ({}));
              lastError = errData.error?.message || `Groq error ${response.status}`;
              if (response.status === 429 || response.status === 401) break; // rotate key
              continue;
            }

            const data = await response.json();
            const reply = data.choices?.[0]?.message?.content || "";
            return res.status(200).json({ success: true, reply, model });
          } catch (err) {
            lastError = err.message;
          }
        }
      }

      return res.status(502).json({ success: false, error: lastError || 'All Groq keys and models exhausted' });
    }

    // ── 3. OPENROUTER HANDLER ──────────────────────────────────────────────
    if (engine === 'openrouter') {
      const apiKey = process.env.OPENROUTER_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'OPENROUTER_API_KEY is not configured on Vercel' });
      }

      const cleanMessages = messages.map(m => ({ role: m.role, content: m.content }));
      let lastError = null;

      for (const model of OPENROUTER_MODELS) {
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://elanxzz-assistant.vercel.app',
              'X-Title': 'JARVIS Assistant'
            },
            body: JSON.stringify({
              model,
              messages: cleanMessages
            })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            lastError = errData.error?.message || `OpenRouter error ${response.status}`;
            continue;
          }

          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || "";
          return res.status(200).json({ success: true, reply, model });
        } catch (err) {
          lastError = err.message;
        }
      }

      return res.status(502).json({ success: false, error: lastError || 'All OpenRouter models failed' });
    }

    return res.status(400).json({ success: false, error: `Unsupported engine: ${engine}` });

  } catch (globalErr) {
    console.error('[API Chat] Fatal Error:', globalErr);
    return res.status(500).json({ success: false, error: globalErr.message });
  }
};
