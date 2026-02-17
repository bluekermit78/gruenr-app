/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",        // Sucht in Dateien wie App.tsx im Hauptordner
    "./services/**/*.{js,ts,jsx,tsx}", // Sucht im services Ordner
    "./components/**/*.{js,ts,jsx,tsx}" // Falls du einen components Ordner hast
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
