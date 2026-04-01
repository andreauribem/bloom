import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        petal: {
          50:  '#fff0f6',
          100: '#ffe0ee',
          200: '#ffc2dd',
          300: '#ff94c2',
          400: '#ff5ca0',
          500: '#ff2d7e',
          600: '#f0006a',
        },
        lavender: {
          50:  '#f5f0ff',
          100: '#ede5ff',
          200: '#ddd0ff',
          300: '#c4adff',
          400: '#a780ff',
          500: '#8b4fff',
        },
        mint: {
          50:  '#f0fdf6',
          100: '#dcfce9',
          200: '#bbf7d4',
          300: '#86efb2',
        },
        cream: '#fdf8f0',
        blush: '#fce8f0',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        round: ['"Nunito"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 2px 20px rgba(255, 45, 126, 0.08)',
        card: '0 4px 24px rgba(139, 79, 255, 0.08)',
        glow: '0 0 20px rgba(255, 45, 126, 0.3)',
      },
      animation: {
        'bounce-soft': 'bounce 2s infinite',
        'pulse-slow': 'pulse 3s infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }: any) {
      addUtilities({
        '.pb-safe': { paddingBottom: 'env(safe-area-inset-bottom, 0px)' },
        '.h-dvh': { height: '100dvh' },
      })
    }
  ],
}

export default config
