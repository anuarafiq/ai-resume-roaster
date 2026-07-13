import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { roastResume } from '../../lib/groq';
import { extractResumeText } from '../../lib/pdfParser';
import { db } from '../../lib/db';

const MIN_CHARS = 200;
const MAX_CHARS = 20000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress ?? null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileBase64 } = req.body || {};

  if (typeof fileBase64 !== 'string' || fileBase64.length === 0) {
    return res.status(400).json({ error: 'No PDF file received' });
  }

  const base64Payload = fileBase64.includes(',') ? fileBase64.split(',')[1] : fileBase64;
  const buffer = Buffer.from(base64Payload, 'base64');

  if (buffer.length > MAX_FILE_BYTES) {
    return res.status(400).json({ error: 'PDF must be under 5MB' });
  }

  const session = await getServerSession(req, res, authOptions);
  const userId = session?.user?.email ?? null;
  const ip = getClientIp(req);

  // Checked before the paid Groq call so abusive requests don't cost anything.
  const recentCount = await db.roast.count({
    where: {
      createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
      OR: userId ? [{ userId }, { ip }] : [{ ip }],
    },
  });
  if (recentCount >= RATE_LIMIT_MAX) {
    return res.status(429).json({ error: `Max ${RATE_LIMIT_MAX} roasts per hour. Try again later.` });
  }

  let resumeText;
  try {
    resumeText = await extractResumeText(buffer);
  } catch (err) {
    console.error('pdf parse failed', err);
    return res.status(400).json({
      error: "Couldn't read that PDF. Make sure it's not corrupted or password-protected.",
    });
  }

  if (resumeText.length < MIN_CHARS) {
    return res.status(400).json({
      error: `That PDF only had ${resumeText.length} characters of readable text (need at least ${MIN_CHARS}). If it's a scanned image, export it as a text-based PDF first.`,
    });
  }
  if (resumeText.length > MAX_CHARS) {
    return res.status(400).json({ error: `Extracted text must be under ${MAX_CHARS} characters` });
  }

  let feedback;
  try {
    feedback = await roastResume(resumeText);
  } catch (err) {
    console.error('roast failed', err);
    const message = err.name === 'AbortError' ? 'The roaster took too long to respond. Try again.' : 'Could not reach the roaster right now.';
    return res.status(502).json({ error: message });
  }

  let id = null;
  try {
    const roast = await db.roast.create({
      data: { resumeText, feedback, userId, ip },
    });
    id = roast.id;
  } catch (err) {
    console.error('failed to save roast', err);
  }

  return res.status(200).json({ id, feedback });
}
