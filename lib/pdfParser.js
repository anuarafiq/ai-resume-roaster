import DOMMatrixShim from 'dommatrix';
import { PDFParse } from 'pdf-parse';

// Vercel's serverless bundler resolves pdf-parse to pdfjs-dist's legacy build,
// which references DOMMatrix (a browser Canvas API global). It's absent on
// Node, so polyfill it before pdf-parse touches it.
if (typeof globalThis.DOMMatrix === 'undefined') {
  globalThis.DOMMatrix = DOMMatrixShim;
}

export async function extractResumeText(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
