/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      extend: {
        fontFamily: {
          serif: ['"Noto Serif JP"', 'serif'],
          sans: ['"Noto Sans JP"', 'sans-serif'],
        },
        colors: {
          'zen-bg': '#FFFFFB',
          'zen-text': '#363636',
          'zen-red': '#B94047',
          'zen-green': '#6F8C68'
        }
      },
    },
    plugins: [],
  }