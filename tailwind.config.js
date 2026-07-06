/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#A63A84',
        background: '#000000',
        textPrimary: '#FFFFFF',
        textSecondary: '#A3A3A3',
        backgroundSecondary: "#7A29AF"
      }
    },
  },
  plugins: [],
}

