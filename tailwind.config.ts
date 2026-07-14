import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        'sercal-red': '#E31E24',
        'sercal-navy': '#1A2B4C',
        'caliani-blue': '#0F2B4B',
        'caliani-green': '#8BC34A',
        'caixa-sjc': '#059669',
        'caixa-sercal': '#1A2B4C',
        'caixa-ratinho': '#D97706',
        'caixa-mibi': '#7C3AED',
        'negative': '#DC2626',
        'positive': '#16A34A',
      },
    },
  },
  plugins: [],
}

export default config