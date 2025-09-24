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
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03))',
        'liquid-glass': 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
        'glass-shimmer': 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
      },
      
      boxShadow: {
        'glow': '0 0 20px rgba(147, 51, 234, 0.3)',
        'glow-lg': '0 0 40px rgba(147, 51, 234, 0.2)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        'glass-lg': '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.08)',
        'glass-xl': '0 35px 60px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'liquid': '0 8px 32px rgba(77, 77, 255, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        'liquid-hover': '0 20px 60px rgba(77, 77, 255, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.15)',
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
        'glass-shimmer': 'glassShimmer 2s ease-in-out infinite',
        'liquid-float': 'liquidFloat 4s ease-in-out infinite',
        'backdrop-blur': 'backdropBlur 0.3s ease-out',
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
        glassShimmer: {
          '0%, 100%': { 
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
            backgroundPosition: '0% 0%'
          },
          '50%': { 
            backgroundImage: 'linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2), rgba(255,255,255,0.1))',
            backgroundPosition: '100% 100%'
          },
        },
        liquidFloat: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-3px) rotate(1deg)' },
          '50%': { transform: 'translateY(-6px) rotate(0deg)' },
          '75%': { transform: 'translateY(-3px) rotate(-1deg)' },
        },
        backdropBlur: {
          '0%': { backdropFilter: 'blur(0px)' },
          '100%': { backdropFilter: 'blur(20px)' },
        },
      },
      
      backdropBlur: {
        xs: '2px',
        'ultra': '40px',
        '3xl': '64px',
      },
      
      backdropSaturate: {
        120: '1.2',
        150: '1.5',
        180: '1.8',
      },
      
      backdropContrast: {
        102: '1.02',
        105: '1.05',
        110: '1.1',
        120: '1.2',
      },
    },
  },
  plugins: [],
}