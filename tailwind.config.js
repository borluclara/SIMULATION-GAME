/** @type {import('tailwindcss').Config} */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#22c55e', // Vibrant green
        'primary-dark': '#16a34a', // Darker green for hover states
        'background-light': '#1a1f1a', // Slight green tint to dark background
        'background-dark': '#0f110f', // Darker green-tinted background
        'accent-green': '#4ade80', // Bright green accent
        'success': '#22c55e', // Success green
        'lime': '#84cc16', // Lime green variant
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-custom': 'linear-gradient(to right, #22c55e, #16a34a, #15803d)', // Green gradient
      }
    },
  },
  plugins: [],
}