import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        burgundy: {
          DEFAULT: "#490b1a",
          hover: "#3c0814",
          light: "#5a0f21",
        },
        navy: {
          DEFAULT: "#142841",
          hover: "#0f1f33",
          light: "#1c385c",
        },
        slate: {
          DEFAULT: "#798da6",
          dark: "#5e7188",
          light: "#a2b1c3",
        },
        cream: {
          DEFAULT: "#e5ded2",
          dark: "#d8cfc0",
          light: "#ede8df",
        },
        cardBg: "#f3eee6",
      },
    },
  },
  plugins: [],
};
export default config;
