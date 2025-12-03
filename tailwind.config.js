/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/react-app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        primary: "hsl(217, 91%, 60%)",
        secondary: "hsl(217, 19%, 27%)",
        destructive: "hsl(0, 84%, 60%)",
        accent: "hsl(217, 19%, 27%)",
        background: "hsl(222, 84%, 5%)",
        foreground: "hsl(210, 40%, 98%)",
        card: "hsl(222, 84%, 5%)",
        border: "hsl(217, 19%, 27%)",
        input: "hsl(217, 19%, 27%)",
        ring: "hsl(217, 91%, 60%)",
      },
      borderRadius: {
        'none': '0',
      }
    },
  },
  plugins: [],
};
