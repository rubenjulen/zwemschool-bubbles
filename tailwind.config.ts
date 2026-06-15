import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Bubbles huisstijl - water/pool tinten. Definitief vast te leggen in Fase 0.
        bubbles: {
          50: "#eff9ff",
          100: "#def2ff",
          200: "#b6e7ff",
          300: "#75d4ff",
          400: "#2cbeff",
          500: "#02a6f0",
          600: "#0084cd",
          700: "#0069a6",
          800: "#055989",
          900: "#0a4a71",
        },
      },
      // Grote tikvlakken voor badrandgebruik (NFR-7).
      minHeight: { tap: "44px" },
      minWidth: { tap: "44px" },
    },
  },
  plugins: [],
};

export default config;
