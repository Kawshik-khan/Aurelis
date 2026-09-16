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
        aurelis: {
          bg: '#050811',
          surface: 'rgba(10, 15, 29, 0.85)',
          'surface-subtle': '#0B1120',
          'surface-card': '#0B1120',
          'surface-hover': '#111A30',
          'surface-active': '#172340',
          border: 'rgba(0, 102, 255, 0.4)',
          'border-light': 'rgba(0, 102, 255, 0.2)',
          'border-dark': 'rgba(0, 102, 255, 0.6)',
          text: '#FFFFFF',
          muted: '#94A3B8',
          'muted-light': '#CBD5E1',
          'muted-dark': '#64748B',
          blue: {
            DEFAULT: '#0066FF',
            electric: '#0066FF',
            hover: '#0052CC',
            light: '#38BDF8',
            soft: 'rgba(0, 102, 255, 0.15)',
            glow: 'rgba(0, 102, 255, 0.35)',
            dark: '#071530',
          },
          forest: '#0066FF',
          'forest-dark': '#0052CC',
          'forest-light': '#38BDF8',
          'forest-soft': 'rgba(0, 102, 255, 0.15)',
          champagne: '#38BDF8',
          'champagne-dark': '#0284C7',
          'champagne-light': '#7DD3FC',
          'champagne-soft': 'rgba(56, 189, 248, 0.15)',
          success: '#10B981',
          'success-soft': 'rgba(16, 185, 129, 0.15)',
          error: '#EF4444',
          'error-soft': 'rgba(239, 68, 68, 0.15)',
          warning: '#F59E0B',
          'warning-soft': 'rgba(245, 158, 11, 0.15)',
        }
      },
      fontFamily: {
        serif: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'monospace'],
      },
      boxShadow: {
        'glass': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.15), 0 6px 24px -4px rgba(0, 102, 255, 0.18), 0 2px 6px 0 rgba(0, 0, 0, 0.4)',
        'glass-hover': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.25), 0 14px 36px -4px rgba(0, 102, 255, 0.35), 0 4px 12px 0 rgba(0, 0, 0, 0.5)',
        'glass-modal': '0 24px 80px -10px rgba(0, 102, 255, 0.35), 0 8px 32px -4px rgba(0, 0, 0, 0.7)',
        'glow-blue': '0 0 28px -2px rgba(0, 102, 255, 0.5)',
        'luxury': '0 2px 14px -2px rgba(0, 102, 255, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.4)',
        'luxury-md': '0 8px 28px -4px rgba(0, 102, 255, 0.2), 0 2px 6px -1px rgba(0, 0, 0, 0.5)',
        'luxury-lg': '0 16px 44px -8px rgba(0, 102, 255, 0.28), 0 4px 12px -2px rgba(0, 0, 0, 0.6)',
        'luxury-modal': '0 24px 80px -10px rgba(0, 102, 255, 0.35), 0 8px 32px -4px rgba(0, 0, 0, 0.7)',
        'card-glow': '0 0 0 2px rgba(0, 102, 255, 0.8), 0 12px 32px -4px rgba(0, 102, 255, 0.25)',
      },
      letterSpacing: {
        'luxury': '0.12em',
        'luxury-wide': '0.18em',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-subtle': 'pulseSubtle 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
}
