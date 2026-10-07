/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        fk: {
          base: '#07090C',
          surface: '#0D1117',
          surface2: '#121821',
          border: '#202A35',
          text: '#F5F7FA',
          muted: '#8B98A8',
          accent: 'var(--challenge-accent, #5EC8FF)',
          cyan: '#5EC8FF',
          ice: '#7DD3FC',
          success: '#4ADE80',
          warning: '#FBBF24',
          danger: '#FF5C5C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"Space Grotesk"', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 24px -4px rgba(94, 200, 255, 0.35)',
        'glow-accent': '0 0 24px -4px var(--challenge-accent-glow, rgba(94, 200, 255, 0.35))',
        'card': '0 8px 30px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
