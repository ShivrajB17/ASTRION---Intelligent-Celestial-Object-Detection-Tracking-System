/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        space: {
          950: '#03050c',
          900: '#050816', // Primary background near-black navy
          850: '#080d1d',
          800: '#0B1020', // Secondary background deep navy
          750: '#0f172c',
          700: '#141E38', // Elevated cards / panels
          600: '#1e2c4f',
          500: '#2a3d6d',
        },
        astro: {
          blue: '#3B82F6',    // Electric blue primary
          cyan: '#22D3EE',    // Cyan secondary
          violet: '#8B5CF6',  // Violet accent
          amber: '#F59E0B',   // Warning / Alert
          emerald: '#10B981', // Validated / Connected
          rose: '#F43F5E',    // Anomaly / Flagged
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.35)',
        'glow-cyan': '0 0 25px -5px rgba(34, 211, 238, 0.35)',
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'orbit-slow': 'spin 60s linear infinite',
        'orbit-reverse': 'spin 45s linear infinite reverse',
        'shimmer': 'shimmer 2.5s infinite',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}
