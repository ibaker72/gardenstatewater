import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4fa',
          100: '#dce6f2',
          200: '#bfd2e8',
          300: '#94b4d8',
          400: '#6390c4',
          500: '#4173ae',
          600: '#305a92',
          700: '#284a77',
          800: '#254063',
          900: '#0f2744',
          950: '#0a1a2f',
        },
        aqua: {
          50: '#eefafd',
          100: '#d4f1f9',
          200: '#aee4f3',
          300: '#76cfe9',
          400: '#38b1d7',
          500: '#1c94bd',
          600: '#1a769f',
          700: '#1c6081',
          800: '#1f506b',
          900: '#1e435b',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
