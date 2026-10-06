/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        detective: {
          950: '#06070a',
          900: '#0c0e15',
          850: '#121520',
          800: '#181c2b',
          700: '#23293d',
          600: '#343e5c',
        },
        alexa: {
          cyan: '#00d2ff',
          blue: '#0070f3',
          purple: '#7928ca',
          glow: 'rgba(0, 210, 255, 0.35)',
        }
      },
      animation: {
        'pulse-glow': 'pulse-glow 2.5s infinite ease-in-out',
        'orb-spin': 'orb-spin 8s linear infinite',
        'fade-in': 'fade-in 0.4s ease-out forwards',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.85', filter: 'drop-shadow(0 0 18px rgba(0,210,255,0.45))' },
          '50%': { transform: 'scale(1.05)', opacity: '1', filter: 'drop-shadow(0 0 35px rgba(0,210,255,0.85))' },
        },
        'orb-spin': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
