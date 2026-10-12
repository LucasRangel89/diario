/** Configuração do Tailwind (build local — o app não usa CDN, precisa funcionar offline).
 *  Depois de criar classes novas em index.html ou js/*.js: `npm run build:css`. */
module.exports = {
  content: ['./index.html', './js/**/*.js', './sw.js'],
  theme: {
    extend: {
      colors: {
        berzerker: {
          dark: '#08080a',
          card: '#121216',
          border: '#272730',
          500: '#ef4444',
          600: '#dc2626',
          800: '#991b1b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        oswald: ['Oswald', 'sans-serif'],
        teko: ['Teko', 'sans-serif']
      }
    }
  },
  plugins: []
};
