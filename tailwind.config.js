/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './public/**/*.{html,js}',
    './public/admin/**/*.{html,js}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF5A3C', // Your brand color
      },
    },
  },
  plugins: [],
};