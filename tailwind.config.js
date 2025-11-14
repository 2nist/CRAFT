/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // --- Custom Colors (Using HSL variables from index.css) ---
      colors: {
        sand: '#F5E5D0',
        slateish: '#4A5A63',
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))'
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          foreground: 'hsl(var(--danger-foreground))'
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))'
        },
        // These colors should now be defined in your index.css using HSL
        brown: 'hsl(var(--brown))',
        olive: 'hsl(var(--olive))',
        eggshell: '#F2EBE1',
        tea: '#D1DDBE',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        },
        // New Sidebar colors for Tailwind utility classes
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        }
      },
      // --- Custom Box Shadows (Mapping to your new CSS variables) ---
      boxShadow: {
        // Mappings for your new custom shadows:
        '2xs': 'var(--shadow-2xs)',
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'DEFAULT': 'var(--shadow)', // Maps the default 'shadow' class to your --shadow variable
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        
        // Keeping your old custom shadows for compatibility, if still used:
        'card': '0 1px 3px rgba(0,0,0,0.08)', 
        'panel': '0 8px 15px rgba(0,0,0,0.10)'
      },
      // --- Fonts ---
      fontFamily: {
        bungee: [
          'Bungee',
          'sans-serif'
        ],
        poppins: [
          'Poppins',
          'sans-serif'
        ],
        // Adding the generic font families you defined in CSS variables
        sans: ['var(--font-sans)'],
        serif: ['var(--font-serif)'],
        mono: ['var(--font-mono)']
      },
      // --- Border Radius ---
      borderRadius: {
        xs2: '0.4rem',
        sm2: '0.5rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Add new radiuses if you decide to use them
        // xl: 'calc(var(--radius) + 4px)',
      },
      // --- Font Sizes ---
      fontSize: {
        xs2: '0.65rem',
        sm: '0.75rem',
        basec: '0.8rem',
        lgc: '1.1rem',
        lgp: '1.3rem'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
}
