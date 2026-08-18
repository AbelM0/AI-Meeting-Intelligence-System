import type { Config } from 'tailwindcss';
import tailwindAnimate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        surface: 'hsl(var(--surface))',
        success: {
          DEFAULT: 'hsl(var(--success))',
          surface: 'hsl(var(--success-surface))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          surface: 'hsl(var(--warning-surface))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          surface: 'hsl(var(--info-surface))',
        },
      },
      boxShadow: {
        soft: '0 18px 50px -24px rgb(15 23 42 / 0.22)',
      },
    },
  },
  plugins: [tailwindAnimate],
};

export default config;
