import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';
import { roastResume } from '../../lib/groq';
import { extractResumeText } from '../../lib/pdfParser';
import { db } from '../../lib/db';

const MIN_CHARS = 200;
const MAX_CHARS = 20000;
const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const config = {
  api: { bodyParser: { sizeLimit: '8mb' } },
};

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

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'Server is missing GROQ_API_KEY' });
  }

  let feedback;
  try {
    feedback = await roastResume(resumeText);
  } catch (err) {
    console.error('roast failed', err);
    const message = err.name === 'AbortError' ? 'The roaster took too long to respond. Try again.' : 'Could not reach the roaster right now.';
    return res.status(502).json({ error: message });
  }

  const session = await getServerSession(req, res, authOptions);

  let id = null;
  try {
    const roast = await db.roast.create({
      data: { resumeText, feedback, userId: session?.user?.email ?? null },
    });
    id = roast.id;
  } catch (err) {
    console.error('failed to save roast', err);
  }

  return res.status(200).json({ id, feedback });
}
