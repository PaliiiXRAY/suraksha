/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design system from design.md
        surface: {
          DEFAULT: '#0f1117',
          1: '#161921',
          2: '#1c1f2b',
          3: '#252836',
        },
        accent: '#f4511e',
        'accent-dim': '#c43f16',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
}
