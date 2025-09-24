/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Apple-inspired Liquid Glass color palette
        background: 'rgb(0 0 0)', // Pure black for depth
        foreground: 'rgb(255 255 255)', // Pure white for contrast
        border: 'rgb(58 58 60)', // Apple's subtle border
        
        primary: {
          DEFAULT: 'rgb(99 102 255)', // Apple blue with more vibrancy
          foreground: 'rgb(255 255 255)',
          light: 'rgb(149 155 255)',
          dark: 'rgb(64 68 204)',
        },
        
        secondary: {
          DEFAULT: 'rgb(28 28 30)', // Apple's dark surface
          foreground: 'rgb(229 229 234)',
          light: 'rgb(44 44 46)',
        },
        
        muted: {
          DEFAULT: 'rgb(44 44 46)',
          foreground: 'rgb(174 174 178)',
        },
        
        accent: {
          DEFAULT: 'rgb(255 149 0)', // Apple orange
          foreground: 'rgb(255 255 255)',
          light: 'rgb(255 179 64)',
          dark: 'rgb(204 119 0)',
        },
        
        surface: 'rgb(28 28 30)',
        card: 'rgb(44 44 46)',
        
        success: 'rgb(52 199 89)', // Apple green
        warning: 'rgb(255 204 0)', // Apple yellow
        destructive: {
          DEFAULT: 'rgb(255 69 58)', // Apple red
          foreground: 'rgb(255 255 255)',
        },
      },
      
      fontFamily: {
        sans: ['SF Pro', 'SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-primary': 'linear-gradient(135deg, rgb(99 102 255) 0%, rgb(175 82 222) 50%, rgb(255 149 0) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, rgb(28 28 30) 0%, rgb(44 44 46) 100%)',
        'gradient-card': 'linear-gradient(135deg, rgba(99 102 255, 0.03) 0%, rgba(255 149 0, 0.02) 100%)',
        'gradient-hero': 'linear-gradient(135deg, rgb(99 102 255) 0%, rgb(175 82 222) 30%, rgb(255 149 0) 70%, rgb(52 199 89) 100%)',
        'gradient-surface': 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
        'gradient-glass': 'linear-gradient(145deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
      },
      
      boxShadow: {
        'glow': '0 0 24px rgba(99, 102, 255, 0.25)',
        'glow-lg': '0 0 48px rgba(99, 102, 255, 0.3)',
        'glow-accent': '0 0 24px rgba(255, 149, 0, 0.25)',
        'card': '0 4px 16px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.15)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.35), 0 4px 16px rgba(0, 0, 0, 0.25)',
        'card-subtle': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.1)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3)',
        'glass-subtle': '0 2px 16px rgba(0, 0, 0, 0.2)',
      },
      
      borderRadius: {
        'xl': '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
      },
      
      animation: {
        'liquid-in': 'liquidIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'liquid-scale': 'liquidScale 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'liquid-slide': 'liquidSlide 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'liquid-glow': 'liquidGlow 3s ease-in-out infinite',
        'liquid-float': 'liquidFloat 4s ease-in-out infinite',
        'fade-in': 'fadeIn 0.4s ease-out forwards',
        'scale-in': 'scaleIn 0.3s ease-out forwards',
        'slide-in': 'slideIn 0.4s ease-out forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      
      keyframes: {
        liquidIn: {
          '0%': { 
            opacity: '0', 
            transform: 'translateY(24px) scale(0.95)',
            backdropFilter: 'blur(0px)',
          },
          '100%': { 
            opacity: '1', 
            transform: 'translateY(0) scale(1)',
            backdropFilter: 'blur(20px)',
          },
        },
        liquidScale: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        liquidSlide: {
          '0%': { opacity: '0', transform: 'translateX(-32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        liquidGlow: {
          '0%, 100%': { boxShadow: '0 0 24px rgba(99, 102, 255, 0.25)' },
          '50%': { boxShadow: '0 0 48px rgba(99, 102, 255, 0.4)' },
        },
        liquidFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(99, 102, 255, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(99, 102, 255, 0.6)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      
      backdropBlur: {
        xs: '2px',
        '3xl': '40px',
        '4xl': '80px',
      },
      
      // Enhanced spacing for liquid design
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      
      // Refined transitions
      transitionTimingFunction: {
        'liquid': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
    },
  },
  plugins: [],
}