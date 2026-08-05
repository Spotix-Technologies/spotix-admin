import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Optinex Africa — Blue & White palette
        ink: '#0A1F3C',        // deep navy — headings, primary text
        brand: {
          50: '#EAF1FF',
          100: '#D6E4FF',
          200: '#ADC8FF',
          300: '#7FA4FF',
          400: '#4A79FF',
          500: '#1C54F5',      // primary blue
          600: '#123FCB',
          700: '#0E30A0',
          800: '#0A2478',
          900: '#081A56'
        },
        sky: '#4FD1F5',        // cyan accent — rewards / positive states
        frost: '#F4F8FF',      // app background tint
        mist: 'rgba(255,255,255,0.6)'
      },
      fontFamily: {
        display: ['var(--font-sora)', 'sans-serif'],
        body: ['var(--font-inter)', 'sans-serif']
      },
      backdropBlur: {
        xs: '2px'
      },
      boxShadow: {
        glass: '0 8px 32px rgba(10, 31, 60, 0.12)',
        card: '0 2px 16px rgba(10, 31, 60, 0.08)'
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem'
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      },
      animation: {
        'fade-up': 'fade-up 0.4s ease-out both',
        shimmer: 'shimmer 1.6s linear infinite'
      }
    }
  },
  plugins: []
};

export default config;
