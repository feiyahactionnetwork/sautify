/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./*.html', './js/*.js'],
  theme: {
    extend: {
      colors: {
        // High-contrast editorial palette. The single vibrant accent (flame)
        // is reserved exclusively for donation CTAs. Do not use it elsewhere.
        ink: '#211A13',
        paper: '#FAF7F2',
        sand: '#F1EAE0',
        stone: '#5C5245',
        line: '#DED4C6',
        flame: '#C2410C',
        flameDeep: '#9A3412',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      maxWidth: {
        prose: '68ch',
      },
    },
  },
  plugins: [],
}
