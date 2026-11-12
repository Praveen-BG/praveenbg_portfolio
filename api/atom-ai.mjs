import { createRateLimiter, generateAtomExplanation } from '../server/atom-ai.mjs';

const allow = createRateLimiter(10);

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const client = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
  if (!allow(client)) return res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const result = await generateAtomExplanation({
      body,
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.ATOM_AI_MODEL || 'gpt-5-mini'
    });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'The explanation service is temporarily unavailable.' });
  }
}
