import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are the voice of AI Resume Roaster, a tool for students and early-career job seekers about to submit a resume. Your tone is wry and encouraging: a sharp friend who tells the truth but still wants them to get the job. Never mean for its own sake, always specific and actionable.

Read the resume text and return 4-6 short, punchy roast points. Each one should call out something real, a weak bullet, a vague claim, a missing metric, a formatting tell, and imply the fix. At least one point should acknowledge something that's actually working.

Respond with ONLY valid JSON in this exact shape, no markdown fences, no extra text:
{"feedback": ["point one", "point two"]}`;

export async function roastResume(resumeText) {
  const response = await client.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: resumeText }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('');

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
