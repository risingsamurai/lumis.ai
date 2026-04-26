/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: "#6C47FF",
          secondary: "#00C2A8",
          danger: "#FF4D6D",
          warning: "#FFB740",
          success: "#22C55E",
          bg: "#0A0A0F",
          surface: "#12121A",
          border: "rgba(255,255,255,0.08)"
        }
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 32px rgba(108,71,255,0.45)"
      }
    }
  },
  plugins: []
};
