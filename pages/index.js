import { useState } from 'react';
import { Bricolage_Grotesque, Public_Sans } from 'next/font/google';

const display = Bricolage_Grotesque({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-bricolage',
});

const body = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-public-sans',
});

const MIN_CHARS = 200;

export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const charCount = resumeText.length;
  const isValid = charCount >= MIN_CHARS;
  const isLoading = status === 'loading';

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isValid || isLoading) return;

    setStatus('loading');
    setResult(null);

    try {
      const res = await fetch('/api/roast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'roast failed');
      setResult(data);
      setStatus('done');
    } catch (err) {
      setErrorMessage(err.message);
      setStatus('error');
    }
  }

  return (
    <main
      className={`${display.variable} ${body.variable} min-h-screen bg-ink font-sans text-paper`}
    >
      <div className="mx-auto max-w-2xl px-6 py-20 sm:py-28">
        <p className="text-sm font-medium tracking-wide text-emberdim">
          For anyone about to hit &ldquo;apply&rdquo;
        </p>
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          AI Resume Roaster
        </h1>
        <p className="mt-5 max-w-md text-lg text-fog">
          Paste your resume. We&rsquo;ll tell you what a hiring manager would
          actually think, before they do.
        </p>

        <form onSubmit={handleSubmit} className="mt-12">
          <label htmlFor="resume" className="mb-2 block text-sm font-medium text-fog">
            Your resume
          </label>
          <textarea
            id="resume"
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Paste the whole thing, we can take it."
            rows={12}
            className="w-full resize-y rounded-lg border border-surface2 bg-surface p-4 text-paper placeholder:text-fog/50 focus:border-ember focus:outline-none focus:ring-1 focus:ring-ember"
          />

          <div className="mt-2 flex items-center justify-between">
            <span
              aria-live="polite"
              className={`text-sm ${isValid ? 'text-ember' : 'text-fog'}`}
            >
              {isValid
                ? `${charCount} characters — ready to roast`
                : `${MIN_CHARS - charCount} more characters to go`}
            </span>
          </div>

          <button
            type="submit"
            disabled={!isValid || isLoading}
            aria-busy={isLoading}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-ember px-6 py-3 font-display font-bold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" />
            )}
            {isLoading ? 'Reading between the lines…' : 'Roast My Resume'}
          </button>

          {status === 'error' && (
            <p role="alert" className="mt-4 text-sm text-emberdim">
              {errorMessage || 'Something broke on our end. Try again in a second.'}
            </p>
          )}
        </form>

        {status === 'done' && result && (
          <section className="animate-roast-in mt-14 border-t border-surface2 pt-10">
            <h2 className="font-display text-2xl font-bold text-ember">The verdict</h2>
            <div className="mt-4 space-y-3 text-fog">
              {Array.isArray(result.feedback) ? (
                result.feedback.map((point, i) => (
                  <p key={i} className="leading-relaxed">
                    {point}
                  </p>
                ))
              ) : (
                <p className="leading-relaxed">
                  {result.message || result.feedback || 'No notes. That never happens.'}
                </p>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
