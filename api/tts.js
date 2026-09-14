/**
 * Vercel Serverless Function — Audio & Text-to-Speech Handler
 * Handles Sarvam (Bulbul v3) and Groq (Orpheus) speech synthesis.
 */

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

  const { engine = 'sarvam', text = '' } = req.body || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'Valid text is required for TTS' });
  }

  const cleanText = text.trim().substring(0, 1000); // Safety limit

  try {
    // ── 1. SARVAM TTS ──────────────────────────────────────────────────────
    if (engine === 'sarvam') {
      const apiKey = process.env.SARVAM_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ success: false, error: 'SARVAM_API_KEY is not configured on Vercel' });
      }

      const response = await fetch('https://api.sarvam.ai/text-to-speech', {
        method: 'POST',
        headers: {
          'api-subscription-key': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: cleanText,
          speaker: 'simran',
          target_language_code: 'en-IN',
          model: 'bulbul:v3',
          audio_format: 'wav'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          success: false,
          error: errorData.message || errorData.error || `Sarvam error: ${response.statusText}`
        });
      }

      const data = await response.json();
      if (!data.audios || !data.audios[0]) {
        return res.status(502).json({ success: false, error: 'Sarvam returned empty audio data' });
      }

      return res.status(200).json({ success: true, audio: data.audios[0] });
    }

    // ── 2. GROQ ORPHEUS TTS ────────────────────────────────────────────────
    if (engine === 'groq') {
      const keys = [
        process.env.GROQ_API_KEY,
        process.env.GROQ_API_KEY_2,
        process.env.GROQ_API_KEY_3
      ].filter(Boolean);

      if (keys.length === 0) {
        return res.status(500).json({ success: false, error: 'GROQ_API_KEY is not configured on Vercel' });
      }

      let lastError = null;
      for (const key of keys) {
        try {
          const response = await fetch('https://api.groq.com/openai/v1/audio/speech', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${key}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: 'canopylabs/orpheus-v1-english',
              voice: 'hannah',
              input: cleanText,
              response_format: 'wav'
            })
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            lastError = errData.error?.message || `Groq TTS status ${response.status}`;
            if (response.status === 429 || response.status === 401) continue; // rotate
            continue;
          }

          const arrayBuffer = await response.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          return res.status(200).json({ success: true, audio: base64 });
        } catch (err) {
          lastError = err.message;
        }
      }

      return res.status(502).json({ success: false, error: lastError || 'All Groq TTS keys exhausted' });
    }

    return res.status(400).json({ success: false, error: `Unsupported TTS engine: ${engine}` });

  } catch (globalErr) {
    console.error('[API TTS] Fatal Error:', globalErr);
    return res.status(500).json({ success: false, error: globalErr.message });
  }
};
