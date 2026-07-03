/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep clinical dark palette
        'clinical-950': '#070b14',
        'clinical-900': '#0b1120',
        'clinical-850': '#0f1626',
        'clinical-800': '#131c30',
        'clinical-750': '#1a2440',
        'clinical-700': '#222d4a',
        'clinical-600': '#2d3a5c',
        'clinical-500': '#3b4a70',
        // Electric medical blues/teals
        'med-50': '#ecfeff',
        'med-100': '#cffafe',
        'med-200': '#a5f3fc',
        'med-300': '#67e8f9',
        'med-400': '#22d3ee',
        'med-500': '#06b6d4',
        'med-600': '#0891b2',
        'med-700': '#0e7490',
        // Accent electric blue
        'electric-400': '#38bdf8',
        'electric-500': '#0ea5e9',
        'electric-600': '#0284c7',
        // Status
        'success': '#10b981',
        'warning': '#f59e0b',
        'danger': '#ef4444',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scan': 'scan 2s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};
