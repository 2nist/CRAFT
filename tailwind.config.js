/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sand: '#F5E5D0',
        slateish: '#4A5A63',
        accent: '#D67F5C',
        eggshell: '#F2EBE1',
        tea: '#D1DDBE',
      },
      fontFamily: {
        bungee: ['Bungee', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        'xs2': '0.4rem',
        'sm2': '0.5rem',
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08)',
        panel: '0 8px 15px rgba(0,0,0,0.10)',
      },
      fontSize: {
        xs2: '0.65rem',
        sm: '0.75rem',
        basec: '0.8rem',
        lgc: '1.1rem',
        lgp: '1.3rem',
      },
    },
  },
  plugins: [],
}
