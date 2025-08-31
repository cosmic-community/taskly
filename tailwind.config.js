/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Modern gradient-friendly color palette
        background: 'hsl(225 15% 6%)', // Deep dark background
        foreground: 'hsl(225 20% 98%)', // Light text
        border: 'hsl(225 20% 20%)', // Subtle borders
        
        primary: {
          DEFAULT: 'hsl(262 83% 65%)', // Beautiful purple
          foreground: 'hsl(225 20% 98%)',
          light: 'hsl(262 83% 75%)',
          dark: 'hsl(262 83% 55%)',
        },
        
        secondary: {
          DEFAULT: 'hsl(225 15% 12%)', // Dark cards
          foreground: 'hsl(225 15% 85%)',
          light: 'hsl(225 15% 18%)',
        },
        
        muted: {
          DEFAULT: 'hsl(225 15% 15%)',
          foreground: 'hsl(225 10% 65%)',
        },
        
        accent: {
          DEFAULT: 'hsl(195 100% 50%)', // Bright cyan
          foreground: 'hsl(225 20% 98%)',
        },
        
        success: 'hsl(142 76% 60%)',
        warning: 'hsl(45 93% 65%)',
        destructive: {
          DEFAULT: 'hsl(0 84% 65%)',
          foreground: 'hsl(225 20% 98%)',
        },
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, hsl(262 83% 65%) 0%, hsl(195 100% 50%) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, hsl(225 15% 12%) 0%, hsl(225 15% 18%) 100%)',
        'gradient-card': 'linear-gradient(135deg, hsl(225 15% 10%) 0%, hsl(225 15% 14%) 100%)',
        'gradient-hero': 'linear-gradient(135deg, hsl(262 83% 65%) 0%, hsl(195 100% 50%) 50%, hsl(142 76% 60%) 100%)',
      },
      
      boxShadow: {
        'glow': '0 0 20px rgba(147, 51, 234, 0.3)',
        'glow-lg': '0 0 40px rgba(147, 51, 234, 0.2)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(147, 51, 234, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(147, 51, 234, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}