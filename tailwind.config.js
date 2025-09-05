/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4CAF50',
        secondary: '#FF9800',
        brandBlue: '#03A9F4',
        brandYellow: '#FFC107',
        neutralLight: '#F5F5F5',
        neutralGray: '#9E9E9E',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'Noto Sans JP', 'Inter', 'Roboto', 'sans-serif'],
        en: ['var(--font-en)', 'Inter', 'Roboto', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
};
