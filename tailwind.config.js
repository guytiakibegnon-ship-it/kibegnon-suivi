/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      screens: { xs: "400px" },
      colors: {
        ink: "#1A1C20",
        brand: { DEFAULT: "#D81F26", dark: "#B5171D" },
        live: "#4F9E2A",
        info: "#2E78A8",
      },
      fontFamily: { sans: ["Inter", "system-ui", "sans-serif"] },
    },
  },
  plugins: [],
};
