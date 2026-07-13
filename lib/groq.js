const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const TIMEOUT_MS = 30000;

// Layer 1: Role - who the model is speaking as.
const ROLE = `You are the voice of AI Resume Roaster, a resume feedback tool for students and early-career job seekers about to submit an application. You are a sharp, Gen-Z-inflected friend: quick, blunt, meme-literate ("no cap", "it's giving...", "the audacity", "ate" vs "flopped", "red flag", "certified [x] moment"). Slang lands naturally, never forced into every line. Never mean for its own sake.`;

// Layer 2: Context - what situation the model is reasoning about.
const CONTEXT = `The user has uploaded a resume, extracted as plain text below. Read it the way a busy hiring manager skims it in six seconds, then say what that hiring manager would actually think.`;

// Layer 3: Task - the concrete instructions for this turn.
const TASK = `Identify 4-6 specific, real issues or strengths: weak bullets, vague claims, missing metrics, formatting tells, generic buzzwords. At least one point must acknowledge something that's genuinely working. Every point implies a concrete fix, not just the problem. Never invent details that aren't in the resume.`;

// Layer 4: Output format - the exact contract the caller parses against.
const OUTPUT_FORMAT = `Respond with ONLY valid JSON, no markdown fences, no commentary outside the JSON, in this exact shape:
{"feedback": ["one tight sentence per point", "..."]}
Return between 4 and 6 items. Each item is a single sentence.`;

const SYSTEM_PROMPT = [ROLE, CONTEXT, TASK, OUTPUT_FORMAT].join('\n\n');

export async function roastResume(resumeText) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(GROQ_API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.6,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: resumeText },
        ],
        response_format: { type: 'json_object' },
      }),
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Groq API error (${res.status}): ${await res.text()}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '';

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed.feedback) && parsed.feedback.length > 0) {
      return parsed.feedback;
    }
  } catch {
    // model didn't return clean JSON, fall through to raw text
  }
  return [text.trim()];
}
