/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/App.jsx",
    "./src/main.jsx",
    "./src/components/**/*.{js,ts,jsx,tsx}", // Quét thư mục components
    "./src/pages/**/*.{js,ts,jsx,tsx}"       // 👇 QUAN TRỌNG: Quét thư mục pages
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}