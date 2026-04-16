/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Background colors
        "bg-primary": '#1A1D28',      // Main dark background
        "bg-secondary": '#212530',     // Card/panel backgrounds
        "bg-hover": '#2A2E3B',         // Hover states
        "bg-accent": '#3A3F4B',        // Borders and dividers
        
        // Text colors
        "text-primary": '#FFFFFF',     // Primary text (white)
        "text-secondary": '#A0A4B2',   // Secondary text (light grey)
        "text-tertiary": '#6C707F',    // Tertiary text (darker grey)
        
        // Accent colors
        "accent-cyan": '#00E0FF',      // Primary accent (bright cyan)
        "accent-green": '#00FF80',     // Success/positive
        "accent-red": '#FF4D4D',       // Error/negative
        "accent-orange": '#FF9900',    // Secondary accent
        "accent-blue": '#00BFFF',      // Secondary accent
        "accent-purple": '#8A2BE2',    // Secondary accent
        
        // Legacy gray colors for compatibility
        "gray-700": '#3A3F4B',
        "gray-800": '#212530',
        "gray-900": '#1A1D28',
      },
      width: {
        '280': '280px',
      },
      backgroundImage: {
        'vert-dark-gradient': 'linear-gradient(180deg, rgba(26, 29, 40, 0), #1A1D28 58.85%)',
        'accent-gradient': 'linear-gradient(135deg, #00E0FF 0%, #00BFFF 100%)',
      }
    },
  },
  plugins: [],
}
