/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Layered surfaces rather than pure black, driven by CSS variables so
        // the light theme reuses the same component classes.
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        elevated: 'rgb(var(--elevated) / <alpha-value>)',
        interactive: 'rgb(var(--interactive) / <alpha-value>)',
        hairline: 'rgb(var(--hairline) / <alpha-value>)',
        hairlineStrong: 'rgb(var(--hairline-strong) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--accent) / <alpha-value>)',
          soft: 'rgb(var(--accent-soft) / <alpha-value>)',
          contrast: 'rgb(var(--accent-contrast) / <alpha-value>)',
        },
        positive: 'rgb(var(--positive) / <alpha-value>)',
        caution: 'rgb(var(--caution) / <alpha-value>)',
        critical: 'rgb(var(--critical) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter var', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
      },
      borderRadius: {
        card: '14px',
        panel: '18px',
      },
      boxShadow: {
        // Restrained elevation: a hairline plus a soft drop, never a glow.
        card: '0 1px 2px rgb(0 0 0 / 0.16), 0 8px 24px -16px rgb(0 0 0 / 0.5)',
        lift: '0 2px 4px rgb(0 0 0 / 0.18), 0 16px 40px -22px rgb(0 0 0 / 0.55)',
        panel: '0 24px 64px -28px rgb(0 0 0 / 0.65)',
      },
      transitionTimingFunction: {
        subtle: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
      },
      keyframes: {
        'fade-rise': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'pulse-ring': {
          '0%': { opacity: '0.9', transform: 'scale(0.85)' },
          '70%, 100%': { opacity: '0', transform: 'scale(1.9)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.34s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'fade-in': 'fade-in 0.22s ease-out both',
        shimmer: 'shimmer 1.9s infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.22, 0.61, 0.36, 1) infinite',
      },
    },
  },
  plugins: [],
};
