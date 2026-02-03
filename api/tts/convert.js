/**
 * Vercel Serverless Function - ElevenLabs TTS Proxy
 * POST /api/tts/convert
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voiceId } = req.body;
    
    if (!text || text.length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
      console.error('ELEVENLABS_API_KEY not configured');
      return res.status(500).json({ error: 'API key not configured' });
    }
    
    const voice = voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel default
    
    // Truncate if too long
    const maxChars = 5000;
    const textToConvert = text.length > maxChars ? text.substring(0, maxChars) : text;

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: textToConvert,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs API error:', response.status, errorText);
      return res.status(response.status).json({ error: `ElevenLabs error: ${response.status}` });
    }

    // Convert to base64
    const audioBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(audioBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64Audio = Buffer.from(binary, 'binary').toString('base64');

    return res.status(200).json({
      audio: base64Audio,
      contentType: 'audio/mpeg',
    });
  } catch (error) {
    console.error('Function error:', error);
    return res.status(500).json({ error: error.message });
  }
}
