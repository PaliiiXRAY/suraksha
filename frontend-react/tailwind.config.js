/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system from FireSense & SURAKSHA design.md
        surface: {
          DEFAULT: '#0f1117',
          1: '#161921',
          2: '#1c1f2b',
          3: '#252836',
        },
        brand: {
          orange: '#f97316',
          red: '#ef4444',
          blue: '#2563eb',
          amber: '#f59e0b',
          green: '#10b981'
        },
        accent: '#f4511e',
        'accent-dim': '#c43f16',
      },
      fontFamily: {
        sans: ['Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Cascadia Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
