import type { Config } from "tailwindcss"
import plugin from "tailwindcss/plugin"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      colors: {
        ocean: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c2d6b",
        },
      },

      backgroundImage: {
        "ocean-gradient":
          "linear-gradient(135deg, #0369a1 0%, #0284c7 50%, #0ea5e9 100%)",
        "ocean-wave":
          "radial-gradient(circle at 20% 50%, rgba(14, 165, 233, 0.3) 0%, transparent 50%)",
      },

      animation: {
        "pulse-slow":
          "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 6s ease-in-out infinite",
        blob: "blob 7s infinite",
      },

      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-20px)" },
        },
        blob: {
          "0%, 100%": {
            transform: "translate(0, 0) scale(1)",
          },
          "33%": {
            transform: "translate(30px, -50px) scale(1.1)",
          },
          "66%": {
            transform: "translate(-20px, 20px) scale(0.9)",
          },
        },
      },
    },
  },

  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".animation-delay-2000": {
          animationDelay: "2s",
        },
        ".animation-delay-4000": {
          animationDelay: "4s",
        },
      })
    }),
  ],
}

export default config