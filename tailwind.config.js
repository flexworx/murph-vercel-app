/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        foreground: '#ffffff',
        primary: '#00d4ff',
        'primary-foreground': '#000000',
        muted: '#1a1a2e',
        'muted-foreground': '#a0a0b0',
      },
    },
  },
  plugins: [],
}
