/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Brand cyan (from the HAYAKU logo).
        brand: {
          50: '#ecfbff',
          100: '#d2f4fd',
          200: '#a8e9fb',
          300: '#6fd9f7',
          400: '#2fc4ef',
          500: '#12b3e3',
          600: '#0a93c2',
          700: '#0c759c',
          800: '#11627f',
          900: '#14536b',
        },
        ink: '#0b2330',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
