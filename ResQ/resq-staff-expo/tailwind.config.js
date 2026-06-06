/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        "surface": "#121418",
        "surface-variant": "#334155",
        "surface-container-lowest": "#0f172a",
        "surface-container-low": "#1e293b",
        "surface-container-high": "#334155",
        "on-surface": "#ffffff",
        "on-surface-variant": "#cbd5e1",
        "primary": "#3b82f6",
        "primary-container": "#c2e7ff",
        "secondary": "#38bdf8",
        "tertiary": "#f43f5e",
      },
    },
  },
  plugins: [],
}
