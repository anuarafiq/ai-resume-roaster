import { roastResume } from '../../lib/groq';

const MIN_CHARS = 200;
const MAX_CHARS = 20000;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { resumeText } = req.body || {};

  if (typeof resumeText !== 'string' || resumeText.length < MIN_CHARS) {
    return res.status(400).json({ error: `resumeText must be at least ${MIN_CHARS} characters` });
  }
  if (resumeText.length > MAX_CHARS) {
    return res.status(400).json({ error: `resumeText must be under ${MAX_CHARS} characters` });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });
  }

  try {
    const feedback = await roastResume(resumeText);
    return res.status(200).json({ feedback });
  } catch (err) {
    console.error('roast failed', err);
    return res.status(502).json({ error: 'Could not reach the roaster right now' });
  }
}
