import pdf from 'pdf-parse';

export async function extractResumeText(buffer) {
  const result = await pdf(buffer);
  return result.text.trim();
}
