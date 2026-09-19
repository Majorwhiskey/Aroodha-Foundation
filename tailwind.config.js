// Design tokens from the Stitch "Sacred Modernity" design.
// Rebuild assets/site.css after changing this or any page: ./build-css.ps1
module.exports = {
  content: ['./*.html', './assets/site.js', './assets/motion.js'],
  theme: {
    extend: {
      colors: {
        'primary': '#0f2b5c',
        'primary-dark': '#0a1936',
        'primary-deep': '#07132a',
        'primary-light': '#1e3d7a',
        'royal-blue': '#143575',
        'midnight-blue': '#08142b',
        'gold': {
          DEFAULT: '#c99a3e',
          light: '#dfb76c',
          soft: '#e9cca1',
          dim: '#b5872c',
          pale: '#f8f3ea'
        },
        'surface': '#f8fafc',
        'surface-pure': '#ffffff',
        'surface-warm': '#fbfbf8',
        'surface-muted': '#f1f4f8',
        'on-surface': '#191c21',
        'on-surface-variant': '#535967',
        'border-subtle': '#e2e6ed'
      },
      fontFamily: {
        'serif': ['EB Garamond', 'serif'],
        'display': ['Cormorant Garamond', 'EB Garamond', 'serif'],
        'sans': ['Plus Jakarta Sans', 'sans-serif']
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
