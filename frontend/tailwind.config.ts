import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f6",
          100: "#d5ebe9",
          500: "#14857f",
          600: "#0b6e69",
          700: "#085854",
        },
      },
      fontFamily: {
        sans: ["Inter", "Noto Sans Arabic", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [typography],
} satisfies Config;
