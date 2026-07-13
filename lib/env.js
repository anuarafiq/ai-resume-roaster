const REQUIRED_ENV_VARS = [
  'GROQ_API_KEY',
  'DATABASE_URL',
  'DIRECT_URL',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'NEXTAUTH_SECRET',
];

const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
}
