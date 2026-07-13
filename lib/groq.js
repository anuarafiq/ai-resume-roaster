const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

const SYSTEM_PROMPT = `You are the voice of AI Resume Roaster, a tool for students and early-career job seekers about to submit a resume. Your tone is wry and encouraging: a sharp friend who tells the truth but still wants them to get the job. Never mean for its own sake, always specific and actionable.

Read the resume text and return 4-6 short, punchy roast points. Each one should call out something real, a weak bullet, a vague claim, a missing metric, a formatting tell, and imply the fix. At least one point should acknowledge something that's actually working.

Respond with ONLY valid JSON in this exact shape, no markdown fences, no extra text:
{"feedback": ["point one", "point two"]}`;

export async function roastResume(resumeText) {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: resumeText },
      ],
      response_format: { type: 'json_object' },
    }),
  });

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
