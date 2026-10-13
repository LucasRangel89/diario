/** Configuração do Tailwind (build local — o app não usa CDN, precisa funcionar offline).
 *  Depois de criar classes novas em index.html ou js/*.js: `npm run build:css`. */
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  theme: {
    extend: {
      colors: {
        berzerker: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#FF6B00',
          600: '#e65c00',
          800: '#7c2d12',
          900: '#431407',
          dark: '#0a0a0a',
          card: '#161618',
          border: '#2a2a2e'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        oswald: ['Oswald', 'Impact', 'sans-serif'],
        teko: ['Teko', 'Impact', 'sans-serif']
      }
    }
  },
  plugins: []
};
