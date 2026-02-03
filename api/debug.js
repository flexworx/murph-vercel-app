/**
 * Debug endpoint to check environment variables
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  const apiKey = process.env.ELEVENLABS_API_KEY;
  
  return res.status(200).json({
    hasApiKey: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) + '...' : 'not set',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
}
