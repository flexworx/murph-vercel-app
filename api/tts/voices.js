/**
 * Vercel Serverless Function - Get ElevenLabs Voices
 * GET /api/tts/voices
 */

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
    
    if (!ELEVENLABS_API_KEY) {
      // Return default voices if API key not configured
      return res.status(200).json([
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', category: 'premade' },
        { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', category: 'premade' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', category: 'premade' },
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade' },
        { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', category: 'premade' },
      ]);
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error('ElevenLabs voices error:', response.status);
      // Return default voices on error
      return res.status(200).json([
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade' },
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', category: 'premade' },
        { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', category: 'premade' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', category: 'premade' },
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', category: 'premade' },
        { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', category: 'premade' },
      ]);
    }

    const data = await response.json();
    const voices = data.voices.map((v) => ({
      id: v.voice_id,
      name: v.name,
      category: v.category || 'custom',
    }));

    return res.status(200).json(voices);
  } catch (error) {
    console.error('Voices function error:', error);
    // Return default voices on error
    return res.status(200).json([
      { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', category: 'premade' },
      { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', category: 'premade' },
      { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella', category: 'premade' },
    ]);
  }
}
