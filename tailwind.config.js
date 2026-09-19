// Design tokens from the Stitch "Sacred Modernity" design. Surface and text tokens are
// CSS variables (src/input.css) so the evening theme can swap them.
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
        'surface': 'rgb(var(--c-surface) / <alpha-value>)',
        'surface-pure': 'rgb(var(--c-surface-pure) / <alpha-value>)',
        'surface-warm': 'rgb(var(--c-surface-warm) / <alpha-value>)',
        'surface-muted': 'rgb(var(--c-surface-muted) / <alpha-value>)',
        'on-surface': 'rgb(var(--c-on-surface) / <alpha-value>)',
        'on-surface-variant': 'rgb(var(--c-on-surface-variant) / <alpha-value>)',
        'border-subtle': 'rgb(var(--c-border-subtle) / <alpha-value>)'
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
