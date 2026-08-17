/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'var(--color-ink)',
        paper: 'var(--color-paper)',
        surface: 'var(--color-surface)',
        rule: 'var(--color-rule)',
        muted: 'var(--color-muted)',
        crest: 'var(--color-crest)',
        crestSoft: 'var(--color-crest-soft)',
        forest: 'var(--color-forest)',
        forestSoft: 'var(--color-forest-soft)',
        amber: 'var(--color-amber)',
        amberSoft: 'var(--color-amber-soft)'
      },
      borderRadius: {
        card: 'var(--radius-card)'
      },
      fontFamily: {
        display: ['"Source Serif 4"', 'serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      }
    }
  },
  plugins: []
}
