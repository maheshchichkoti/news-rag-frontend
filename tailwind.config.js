// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  // 🔥 Required to enable .dark-based theme switching
  darkMode: "class",

  // 👀 Tells Tailwind where to look for class names in your project
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // ✅ Necessary for React + TSX
  ],

  theme: {
    extend: {}, // You can extend your theme here later
  },

  plugins: [], // You can add Tailwind plugins later here
};
