/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./pages/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'oklch(15% 0.014 45)',
        surface: 'oklch(20% 0.016 45)',
        surface2: 'oklch(25% 0.02 45)',
        ember: 'oklch(70% 0.17 42)',
        emberdim: 'oklch(70% 0.09 42)',
        paper: 'oklch(93% 0.012 60)',
        fog: 'oklch(70% 0.02 60)',
      },
      fontFamily: {
        display: ['var(--font-bricolage)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-public-sans)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
