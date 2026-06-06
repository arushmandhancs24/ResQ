/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0a0f1e',
        primary: '#e63946',
        secondary: '#2ec4b6',
        tertiary: '#f4a261',
        surface: '#161c2d',
        border: '#2d3748',
      },
      fontFamily: {
        sans: ['Inter'],
        display: ['SpaceGrotesk'],
        mono: ['JetBrainsMono'],
      },
      borderRadius: {
        'none': '0px',
        'sm': '0px',
        DEFAULT: '0px',
        'md': '0px',
        'lg': '0px',
        'xl': '0px',
        '2xl': '0px',
        '3xl': '0px',
        'full': '0px',
      }
    },
  },
  plugins: [],
}
