/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-20px) scale(1.05)' },
        },
        floatDelayed: {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '50%': { transform: 'translateY(-15px) scale(1.03)' },
        },
        pingSlow: {
          '0%': { transform: 'scale(1)', opacity: '0.15' },
          '50%': { transform: 'scale(1.3)', opacity: '0.08' },
          '100%': { transform: 'scale(1)', opacity: '0.15' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.3s ease-in-out',
        float: 'float 12s ease-in-out infinite',
        'float-delayed': 'floatDelayed 15s ease-in-out infinite',
        'ping-slow': 'pingSlow 3.5s cubic-bezier(0, 0, 0.2, 1) infinite'
      },
      boxShadow: {
        glow: '0 0 15px rgba(99, 102, 241, 0.4)',
        'glow-lg': '0 0 25px rgba(99, 102, 241, 0.5)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

