/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          500: '#2f7df6',
          600: '#1f6ae0',
          700: '#1a55b3',
        },
      },
    },
  },
  plugins: [],
};
